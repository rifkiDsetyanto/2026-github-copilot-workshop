import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import LineAllocationTable from '../components/purchase-orders/LineAllocationTable.vue';
import PurchaseOrderHeaderForm from '../components/purchase-orders/PurchaseOrderHeaderForm.vue';
import PurchaseOrderCreatePage from './PurchaseOrderCreatePage.vue';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    listRequisitions: vi.fn(),
    getRequisitionOpenLines: vi.fn(),
    createPurchaseOrder: vi.fn(),
  },
}));

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

const sampleLine = {
  id: 'line-1',
  prNumber: 'PR-2026-0001',
  itemCode: 'BRG-6205',
  itemName: 'Bearing 6205',
  allocatedQty: 8,
  remainingQty: 8,
  uom: 'PCS',
  unitPrice: 85000,
};

const apiOpenLine = {
  id: 'line-1',
  itemCode: 'BRG-6205',
  itemName: 'Bearing 6205',
  qtyOpenForPo: 8,
  uom: 'PCS',
  estUnitPrice: 85000,
  siteCode: 'JKT-PLANT',
  requiredDate: '2026-09-10',
};

beforeEach(() => {
  vi.clearAllMocks();
  api.listRequisitions.mockResolvedValue({
    items: [{ id: 'pr-1', status: 'APPROVED', prNumber: 'PR-2026-0001' }],
  });
  api.getRequisitionOpenLines.mockResolvedValue({
    requisition: { id: 'pr-1', prNumber: 'PR-2026-0001', status: 'APPROVED' },
    openLines: [apiOpenLine],
  });
  api.createPurchaseOrder.mockResolvedValue({ poNumber: 'PO-2026-0002' });
});

describe('PurchaseOrderHeaderForm', () => {
  test('renders header fields and emits edited values', async () => {
    const wrapper = mount(PurchaseOrderHeaderForm, {
      props: { vendorName: 'PT Maju', purchaseOrderDate: '2026-09-03' },
    });

    expect(wrapper.get('#vendor-name').element.value).toBe('PT Maju');
    expect(wrapper.get('#purchase-order-date').element.value).toBe('2026-09-03');

    await wrapper.get('#vendor-name').setValue('PT Baru');
    expect(wrapper.emitted('update:vendorName')).toEqual([['PT Baru']]);
  });
});

describe('LineAllocationTable', () => {
  test('renders selected lines and emits line actions', async () => {
    const wrapper = mount(LineAllocationTable, {
      props: {
        lines: [sampleLine],
        availableLines: [{ ...sampleLine, id: 'line-2', itemCode: 'GLV-IND' }],
      },
    });

    expect(wrapper.text()).toContain('Bearing 6205');
    expect(wrapper.text()).toContain('GLV-IND');

    await wrapper.get('input[aria-label="Allocate quantity"]').setValue('6');
    expect(wrapper.emitted('update-line')).toEqual([[0, 'allocatedQty', '6']]);

    await wrapper.get('.available-line').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);

    await wrapper.get('.btn-danger-icon').trigger('click');
    expect(wrapper.emitted('remove')).toEqual([[0]]);
  });

  test('shows an empty state when no lines are selected', () => {
    const wrapper = mount(LineAllocationTable, { props: { lines: [] } });

    expect(wrapper.get('.empty-state').text()).toBe('No requisition lines selected.');
  });
});

describe('PurchaseOrderCreatePage', () => {
  function mountPage() {
    return mount(PurchaseOrderCreatePage, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
  }

  test('renders the PO form from local sample data', () => {
    const wrapper = mountPage();

    expect(wrapper.get('h2').text()).toBe('Create Purchase Order');
    expect(wrapper.get('#vendor-name').element.value).toBe('');
  });

  test('shows validation when saving without lines', async () => {
    const wrapper = mountPage();
    await flushPromises();
    wrapper.vm.purchaseOrder.lines.splice(0);

    await wrapper.get('form').trigger('submit.prevent');

    expect(wrapper.get('.error').text()).toBe('Select at least one approved PR line.');
  });

  test('loads approved PR lines and creates a draft through the API', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Bearing 6205');
    await wrapper.get('#vendor-name').setValue('PT Test Supplier');
    await wrapper.get('.available-line').trigger('click');
    await wrapper.get('form').trigger('submit.prevent');

    expect(api.createPurchaseOrder).toHaveBeenCalledWith({
      vendorName: 'PT Test Supplier',
      lines: [{
        prLineId: 'line-1',
        itemCode: 'BRG-6205',
        itemName: 'Bearing 6205',
        qtyOrdered: 8,
        unitPrice: 85000,
        uom: 'PCS',
        siteCode: 'JKT-PLANT',
        requiredDate: '2026-09-10',
      }],
    });
    expect(wrapper.get('.success').text()).toBe('Purchase order PO-2026-0002 was saved as a draft.');
  });

  test('blocks an allocation above the PR remaining quantity', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.get('.available-line').trigger('click');
    wrapper.vm.purchaseOrder.lines[0].allocatedQty = 9;

    await wrapper.get('form').trigger('submit.prevent');

    expect(wrapper.get('.error').text()).toBe(
      'BRG-6205: allocation quantity must be greater than 0 and cannot exceed the remaining quantity of 8.',
    );
    expect(api.createPurchaseOrder).not.toHaveBeenCalled();
  });

  test('shows a clear server validation message when the API rejects the draft', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.get('#vendor-name').setValue('PT Test Supplier');
    await wrapper.get('.available-line').trigger('click');
    api.createPurchaseOrder.mockRejectedValueOnce(new Error(
      'lines[0]: allocation qty 9 exceeds remaining 8',
    ));

    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.get('.error').text()).toBe('lines[0]: allocation qty 9 exceeds remaining 8');
  });
});
