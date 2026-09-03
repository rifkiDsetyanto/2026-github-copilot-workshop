import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import GoodsReceiptCreatePage from './GoodsReceiptCreatePage.vue';
import { api } from '../api';

const push = vi.fn();

vi.mock('../api', () => ({
  api: {
    listPurchaseOrders: vi.fn(),
    getPurchaseOrderOpenLines: vi.fn(),
    createGoodsReceipt: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push }),
}));

const openLine = {
  id: 'po-line-1',
  lineNo: 1,
  itemCode: 'BRG-6205',
  itemName: 'Bearing 6205',
  qtyOrdered: 10,
  qtyReceived: 2,
  qtyOpenForGr: 8,
  uom: 'PCS',
  siteCode: 'JKT-PLANT',
};

beforeEach(() => {
  vi.clearAllMocks();
  api.listPurchaseOrders.mockResolvedValue({
    items: [
      { id: 'po-draft', poNumber: 'PO-2026-0001', vendorName: 'Draft Vendor', status: 'DRAFT' },
      { id: 'po-1', poNumber: 'PO-2026-0002', vendorName: 'PT Maju', status: 'SUBMITTED' },
    ],
  });
  api.getPurchaseOrderOpenLines.mockResolvedValue({ openLines: [openLine] });
  api.createGoodsReceipt.mockResolvedValue({ id: 'gr-1' });
});

function mountPage() {
  return mount(GoodsReceiptCreatePage, {
    global: { stubs: { RouterLink: true } },
  });
}

describe('GoodsReceiptCreatePage', () => {
  test('offers submitted purchase orders and loads open lines', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('#po-select').text()).toContain('PO-2026-0002 - PT Maju');
    expect(wrapper.find('#po-select').text()).not.toContain('PO-2026-0001');

    await wrapper.find('#po-select').setValue('po-1');
    await flushPromises();

    expect(wrapper.text()).toContain('Bearing 6205');
    expect(wrapper.get('[data-testid="receive-qty-po-line-1"]').element.value).toBe('8');
  });

  test('blocks a receive quantity above the open quantity', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('#po-select').setValue('po-1');
    await flushPromises();
    await wrapper.get('[data-testid="receive-qty-po-line-1"]').setValue('9');

    await wrapper.get('[data-testid="gr-create-form"]').trigger('submit.prevent');

    expect(wrapper.get('[data-testid="gr-error"]').text()).toContain('cannot exceed open quantity');
    expect(api.createGoodsReceipt).not.toHaveBeenCalled();
  });

  test('creates a GR draft with the selected open line', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('#po-select').setValue('po-1');
    await flushPromises();
    await wrapper.get('[data-testid="gr-create-form"]').trigger('submit.prevent');

    expect(api.createGoodsReceipt).toHaveBeenCalledWith({
      poId: 'po-1',
      receiptDate: expect.any(String),
      notes: null,
      lines: [{ poLineId: 'po-line-1', qtyReceived: 8, actualSiteCode: 'JKT-PLANT' }],
    });
    expect(push).toHaveBeenCalledWith('/goods-receipts/gr-1');
  });
});
