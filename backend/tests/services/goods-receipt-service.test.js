import { jest, describe, expect, test, beforeEach } from '@jest/globals';
import {
  createGoodsReceipt,
  getGoodsReceiptById,
  postGoodsReceipt,
} from '../../src/services/goods-receipt-service.js';

const payload = {
  poId: 'po-1',
  receiptDate: '2026-09-03',
  lines: [{ poLineId: 'po-line-1', qtyReceived: 5, actualSiteCode: 'WH-JKT' }],
};

function makeClient(handler) {
  return { query: jest.fn(handler), release: jest.fn() };
}

function makeDb(client, queryHandler) {
  return {
    pool: { connect: jest.fn(() => Promise.resolve(client)) },
    query: jest.fn(queryHandler || (() => ({ rows: [], rowCount: 0 }))),
  };
}

function detailQueries() {
  return (sql) => {
    if (sql.includes('FROM goods_receipts gr')) return {
      rows: [{ id: 'gr-1', gr_number: 'GR-2026-0001', po_id: 'po-1', po_number: 'PO-2026-0001', status: 'DRAFT', receipt_date: '2026-09-03', notes: null }], rowCount: 1,
    };
    if (sql.includes('FROM gr_lines')) return {
      rows: [{ id: 'gr-line-1', po_line_id: 'po-line-1', line_no: 1, item_code: 'A', item_name: 'Item A', qty_ordered: 10, qty_received: 5, uom: 'PCS', actual_site_code: 'WH-JKT' }], rowCount: 1,
    };
    return { rows: [], rowCount: 0 };
  };
}

describe('createGoodsReceipt', () => {
  test('rejects an empty payload before connecting to the database', async () => {
    const db = makeDb(null);
    await expect(createGoodsReceipt(db, null)).rejects.toMatchObject({
      message: 'Body is required', statusCode: 422,
    });
    expect(db.pool.connect).not.toHaveBeenCalled();
  });

  test('rejects a PO that is not submitted and rolls back', async () => {
    const client = makeClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('purchase_orders')) return { rows: [{ id: 'po-1', status: 'DRAFT' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const db = makeDb(client);

    await expect(createGoodsReceipt(db, payload)).rejects.toMatchObject({
      message: 'Only SUBMITTED purchase order can receive goods', statusCode: 422,
    });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects quantity above the PO open quantity', async () => {
    const client = makeClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('purchase_orders')) return { rows: [{ id: 'po-1', status: 'SUBMITTED' }], rowCount: 1 };
      return { rows: [{ id: 'po-line-1', qty_ordered: 10, qty_received: 8 }], rowCount: 1 };
    });
    const db = makeDb(client);

    await expect(createGoodsReceipt(db, { ...payload, lines: [{ ...payload.lines[0], qtyReceived: 3 }] }))
      .rejects.toMatchObject({ message: 'lines[0]: receive qty 3 exceeds open 2', statusCode: 422 });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('creates a draft GR in one transaction', async () => {
    const client = makeClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('purchase_orders')) return { rows: [{ id: 'po-1', status: 'SUBMITTED' }], rowCount: 1 };
      if (sql.includes('po_lines')) return { rows: [{ id: 'po-line-1', qty_ordered: 10, qty_received: 0 }], rowCount: 1 };
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const db = makeDb(client, detailQueries());

    const result = await createGoodsReceipt(db, payload);
    expect(result.grNumber).toBe('GR-2026-0001');
    expect(result.status).toBe('DRAFT');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('postGoodsReceipt', () => {
  beforeEach(() => jest.clearAllMocks());

  test('posts a draft and updates PO and PR received quantities', async () => {
    const client = makeClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('goods_receipts WHERE')) return { rows: [{ id: 'gr-1', po_id: 'po-1', status: 'DRAFT' }], rowCount: 1 };
      if (sql.includes('FROM gr_lines')) return { rows: [{ po_line_id: 'po-line-1', receipt_qty: 5, qty_ordered: 10, posted_qty: 0 }], rowCount: 1 };
      if (sql.includes('pr_line_allocations')) return { rows: [{ pr_line_id: 'pr-line-1', allocated_qty: 10 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const db = makeDb(client, detailQueries());

    const result = await postGoodsReceipt(db, 'gr-1');
    expect(result).toBeDefined();
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE po_lines'),
      [5, 'po-line-1'],
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE pr_lines'),
      [5, 'pr-line-1'],
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rejects posting a receipt that is already posted', async () => {
    const client = makeClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('goods_receipts WHERE')) return { rows: [{ id: 'gr-1', po_id: 'po-1', status: 'POSTED' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const db = makeDb(client);

    await expect(postGoodsReceipt(db, 'gr-1')).rejects.toMatchObject({
      message: 'Only DRAFT goods receipt can be posted', statusCode: 422,
    });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
