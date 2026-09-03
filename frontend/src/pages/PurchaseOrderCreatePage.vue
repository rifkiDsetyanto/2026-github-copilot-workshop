<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PurchaseOrderHeaderForm from '../components/purchase-orders/PurchaseOrderHeaderForm.vue';
import LineAllocationTable from '../components/purchase-orders/LineAllocationTable.vue';
import { api } from '../api';

const purchaseOrder = reactive({
  vendorName: '',
  purchaseOrderDate: new Date().toISOString().slice(0, 10),
  lines: [],
});
const availableLines = ref([]);
const errorMessage = ref('');
const successMessage = ref('');
const isLoadingLines = ref(false);
const isSaving = ref(false);

const totalAmount = computed(() => purchaseOrder.lines.reduce(
  (total, line) => total + (Number(line.allocatedQty) || 0) * (Number(line.unitPrice) || 0),
  0,
));

function removeLine(index) {
  purchaseOrder.lines.splice(index, 1);
}

function updateLine(index, field, value) {
  purchaseOrder.lines[index][field] = Number(value);
}

function selectLine(line) {
  if (purchaseOrder.lines.some((selectedLine) => selectedLine.prLineId === line.id)) {
    return;
  }

  purchaseOrder.lines.push({
    ...line,
    allocatedQty: line.remainingQty,
    unitPrice: line.estUnitPrice,
  });
  availableLines.value = availableLines.value.filter((availableLine) => availableLine.id !== line.id);
}

async function loadAvailableLines() {
  isLoadingLines.value = true;
  errorMessage.value = '';

  try {
    const { items } = await api.listRequisitions();
    const approvedRequisitions = items.filter((requisition) => requisition.status === 'APPROVED');
    const payloads = await Promise.all(
      approvedRequisitions.map((requisition) => api.getRequisitionOpenLines(requisition.id)),
    );

    availableLines.value = payloads.flatMap(({ requisition, openLines }) =>
      openLines.map((line) => ({
        ...line,
        prNumber: requisition.prNumber,
        prLineId: line.id,
        remainingQty: line.qtyOpenForPo,
      })),
    );
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoadingLines.value = false;
  }
}

async function saveDraft() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!purchaseOrder.lines.length) {
    errorMessage.value = 'Select at least one approved PR line.';
    return;
  }

  const invalidLine = purchaseOrder.lines.find((line) =>
    !Number(line.allocatedQty) || Number(line.allocatedQty) > line.remainingQty,
  );
  if (invalidLine) {
    errorMessage.value = `${invalidLine.itemCode}: allocation quantity must be greater than 0 and cannot exceed the remaining quantity of ${invalidLine.remainingQty}.`;
    return;
  }

  isSaving.value = true;
  try {
    const created = await api.createPurchaseOrder({
      vendorName: purchaseOrder.vendorName,
      lines: purchaseOrder.lines.map((line) => ({
        prLineId: line.prLineId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        qtyOrdered: Number(line.allocatedQty),
        unitPrice: Number(line.unitPrice) || 0,
        uom: line.uom,
        siteCode: line.siteCode,
        requiredDate: line.requiredDate || null,
      })),
    });
    successMessage.value = `Purchase order ${created.poNumber} was saved as a draft.`;
    purchaseOrder.lines.splice(0);
    await loadAvailableLines();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadAvailableLines);
</script>

<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/requisitions" class="back-btn" title="Back to requisitions" aria-label="Back to requisitions">&#8592;</RouterLink>
        <div>
          <h2>Create Purchase Order</h2>
          <p class="muted">Create a PO by allocating approved purchase requisition lines.</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error" data-testid="po-error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success" data-testid="po-success">{{ successMessage }}</p>

    <form data-testid="po-create-form" @submit.prevent="saveDraft">
      <PurchaseOrderHeaderForm
        v-model:vendor-name="purchaseOrder.vendorName"
        v-model:purchase-order-date="purchaseOrder.purchaseOrderDate"
      />

      <LineAllocationTable
        :lines="purchaseOrder.lines"
        :available-lines="availableLines"
        :is-loading="isLoadingLines"
        @remove="removeLine"
        @select="selectLine"
        @update-line="updateLine"
      />

      <div class="order-summary">
        <span>Total PO Amount</span>
        <strong>${{ totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
      </div>

      <div class="btn-group">
        <RouterLink to="/requisitions" class="btn btn-outline">Cancel</RouterLink>
        <button type="submit" class="btn btn-primary" data-testid="save-po" :disabled="isSaving">{{ isSaving ? 'Saving...' : 'Save As Draft' }}</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.order-summary { display: flex; justify-content: flex-end; align-items: center; gap: 16px; margin: -8px 0 24px; font-size: 14px; }
.order-summary strong { color: var(--primary); font-size: 18px; }
.success { color: #2e7d32; font-size: 13px; }
.btn:disabled { cursor: wait; opacity: 0.65; }
</style>