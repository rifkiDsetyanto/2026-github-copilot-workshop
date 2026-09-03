import { v4 as uuidv4 } from 'uuid';

function mapHeader(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
    poNumber: row.po_number,
    status: row.status,
    receiptDate: row.receipt_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  return {
    id: row.id,
    poLineId: row.po_line_id,
    lineNo: row.line_no,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyOrdered: Number(row.qty_ordered),
    qtyReceived: Number(row.qty_received),
    qtyOpenForGr: Number(row.qty_ordered) - Number(row.qty_received),
    uom: row.uom,
    actualSiteCode: row.actual_site_code,
  };
}

function createGrNumber(count) {
  return `GR-2026-${String(Number(count) + 1).padStart(4, '0')}`;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 422;
  return error;
}

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Body is required';
  if (!payload.poId) return 'poId is required';
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  const lineIds = new Set();
  for (let index = 0; index < payload.lines.length; index++) {
    const line = payload.lines[index];
    if (!line.poLineId) return `lines[${index}].poLineId is required`;
    if (lineIds.has(line.poLineId)) return `lines[${index}].poLineId must not be duplicated`;
    lineIds.add(line.poLineId);
    if (!Number(line.qtyReceived) || Number(line.qtyReceived) <= 0) {
      return `lines[${index}].qtyReceived must be greater than 0`;
    }
    if (!line.actualSiteCode || typeof line.actualSiteCode !== 'string' || !line.actualSiteCode.trim()) {
      return `lines[${index}].actualSiteCode is required`;
    }
  }
  return null;
}

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, po.po_number, gr.status,
            gr.receipt_date, gr.notes, gr.created_at, gr.updated_at
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );
  return rows.map(mapHeader);
}

export async function getGoodsReceiptById(db, id) {
  const headerResult = await db.query(
    `SELECT gr.*, po.po_number
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     WHERE gr.id = $1`,
    [id]
  );
  if (headerResult.rowCount === 0) return null;

  const linesResult = await db.query(
    `SELECT gl.*, pl.item_code, pl.item_name, pl.qty_ordered, pl.uom, pl.qty_received
     FROM gr_lines gl
     JOIN po_lines pl ON pl.id = gl.po_line_id
     WHERE gl.gr_id = $1
     ORDER BY gl.line_no ASC`,
    [id]
  );

  return { ...mapHeader(headerResult.rows[0]), lines: linesResult.rows.map(mapLine) };
}

export async function createGoodsReceipt(db, payload) {
  const payloadError = validateCreatePayload(payload);
  if (payloadError) throw validationError(payloadError);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const poResult = await client.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
      [payload.poId]
    );
    if (poResult.rowCount === 0) throw validationError('Purchase order not found');
    if (poResult.rows[0].status !== 'SUBMITTED') {
      throw validationError('Only SUBMITTED purchase order can receive goods');
    }

    const lineValues = [];
    for (let index = 0; index < payload.lines.length; index++) {
      const line = payload.lines[index];
      const lineResult = await client.query(
        `SELECT id, qty_ordered, qty_received
         FROM po_lines
         WHERE id = $1 AND po_id = $2
         FOR UPDATE`,
        [line.poLineId, payload.poId]
      );
      if (lineResult.rowCount === 0) throw validationError(`lines[${index}]: PO line not found`);
      const poLine = lineResult.rows[0];
      const openQty = Number(poLine.qty_ordered) - Number(poLine.qty_received);
      if (Number(line.qtyReceived) > openQty) {
        throw validationError(`lines[${index}]: receive qty ${line.qtyReceived} exceeds open ${openQty}`);
      }
      lineValues.push({ ...line, lineNo: index + 1 });
    }

    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM goods_receipts`);
    const grId = uuidv4();
    const grNumber = createGrNumber(countResult.rows[0].total);
    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [grId, grNumber, payload.poId, payload.receiptDate || null, payload.notes || null]
    );

    for (const line of lineValues) {
      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), grId, line.poLineId, line.lineNo, Number(line.qtyReceived), line.actualSiteCode.trim()]
      );
    }

    await client.query('COMMIT');
    return getGoodsReceiptById(db, grId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const grResult = await client.query(
      `SELECT id, po_id, status FROM goods_receipts WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (grResult.rowCount === 0) return null;
    if (grResult.rows[0].status !== 'DRAFT') {
      throw validationError('Only DRAFT goods receipt can be posted');
    }

    const linesResult = await client.query(
      `SELECT gl.id, gl.po_line_id, gl.qty_received AS receipt_qty,
              pl.qty_ordered, pl.qty_received AS posted_qty
       FROM gr_lines gl
       JOIN po_lines pl ON pl.id = gl.po_line_id
       WHERE gl.gr_id = $1
       ORDER BY gl.line_no ASC
       FOR UPDATE OF gl, pl`,
      [id]
    );
    if (linesResult.rowCount === 0) throw validationError('Goods receipt must contain at least one line');

    for (const line of linesResult.rows) {
      const openQty = Number(line.qty_ordered) - Number(line.posted_qty);
      if (Number(line.receipt_qty) > openQty) {
        throw validationError(`PO line ${line.po_line_id}: receive qty ${line.receipt_qty} exceeds open ${openQty}`);
      }

      await client.query(
        `UPDATE po_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`,
        [Number(line.receipt_qty), line.po_line_id]
      );

      const allocations = await client.query(
        `SELECT pr_line_id, allocated_qty
         FROM pr_line_allocations WHERE po_line_id = $1`,
        [line.po_line_id]
      );
      const totalAllocated = allocations.rows.reduce((total, allocation) => total + Number(allocation.allocated_qty), 0);
      for (const allocation of allocations.rows) {
        const prQty = Number(line.receipt_qty) * Number(allocation.allocated_qty) / totalAllocated;
        await client.query(
          `UPDATE pr_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`,
          [prQty, allocation.pr_line_id]
        );
      }
    }

    await client.query(
      `UPDATE goods_receipts SET status = 'POSTED', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    await client.query('COMMIT');
    return getGoodsReceiptById(db, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
