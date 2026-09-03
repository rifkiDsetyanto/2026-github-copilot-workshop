import { describe, test, expect, jest } from '@jest/globals';
import {
  listRequisitions,
  getRequisitionById,
  getRequisitionOpenLines,
} from '../../src/services/requisition-service.js';

function mockDb(queryImpl) {
  return { query: jest.fn(queryImpl) };
}

describe('requisition-service list functions', () => {
  test('listRequisitions returns mapped header fields', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'pr-1',
          pr_number: 'PR-2026-0001',
          status: 'APPROVED',
          requester_name: 'Rina',
          department_name: 'Ops',
          title: 'Spare parts',
          needed_by_date: '2026-06-15',
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z',
        },
      ],
    }));

    const result = await listRequisitions(db);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        status: 'APPROVED',
        requesterName: 'Rina',
        departmentName: 'Ops',
        title: 'Spare parts',
        notes: undefined,
        neededByDate: '2026-06-15',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
    ]);
  });

  test('getRequisitionById returns mapped header and line fields', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{
            id: 'pr-1',
            pr_number: 'PR-2026-0001',
            status: 'APPROVED',
            requester_name: 'Rina',
            department_name: 'Ops',
            title: 'Spare parts',
            notes: 'For maintenance',
            needed_by_date: '2026-06-15',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          }],
          rowCount: 1,
        };
      }
      return {
        rows: [{
          id: 'line-1',
          line_no: 1,
          item_code: 'BRG-6205',
          item_name: 'Bearing 6205',
          qty_requested: '10',
          qty_allocated: '7',
          qty_received: '0',
          uom: 'PCS',
          est_unit_price: '85000',
          site_code: 'JKT',
          required_date: '2026-06-15',
          budget_center: 'MNT-001',
        }],
        rowCount: 1,
      };
    });

    const result = await getRequisitionById(db, 'pr-1');

    expect(result.prNumber).toBe('PR-2026-0001');
    expect(result.lines).toEqual([{
      id: 'line-1',
      lineNo: 1,
      itemCode: 'BRG-6205',
      itemName: 'Bearing 6205',
      qtyRequested: 10,
      qtyAllocated: 7,
      qtyReceived: 0,
      qtyOpenForPo: 3,
      uom: 'PCS',
      estUnitPrice: 85000,
      siteCode: 'JKT',
      requiredDate: '2026-06-15',
      budgetCenter: 'MNT-001',
    }]);
  });

  test('getRequisitionOpenLines returns null when requisition not found', async () => {
    const db = mockDb(() => ({ rows: [], rowCount: 0 }));

    const result = await getRequisitionOpenLines(db, 'missing-id');

    expect(result).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('getRequisitionOpenLines filters only qtyOpenForPo greater than 0', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{ id: 'pr-1', status: 'APPROVED', pr_number: 'PR-2026-0001' }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          {
            id: 'l-1',
            line_no: 1,
            item_code: 'A',
            item_name: 'Item A',
            qty_requested: 10,
            qty_allocated: 7,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 1000,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
          {
            id: 'l-2',
            line_no: 2,
            item_code: 'B',
            item_name: 'Item B',
            qty_requested: 5,
            qty_allocated: 5,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 2000,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
        ],
        rowCount: 2,
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    expect(result.requisition).toEqual({
      id: 'pr-1',
      prNumber: 'PR-2026-0001',
      status: 'APPROVED',
    });
    expect(result.openLines).toHaveLength(1);
    expect(result.openLines[0].id).toBe('l-1');
    expect(result.openLines[0].qtyOpenForPo).toBe(3);
  });
});