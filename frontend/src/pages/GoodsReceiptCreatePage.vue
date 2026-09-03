<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import GoodsReceiptLineTable from '../components/goods-receipts/GoodsReceiptLineTable.vue';
import { api } from '../api';

const route = useRoute();
const router = useRouter();
const purchaseOrders = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const selectedPoId = ref(route.query.poId || '');
const receipt = reactive({ receiptDate: new Date().toISOString().slice(0, 10), notes: '', lines: [] });

const selectedPo = computed(() => purchaseOrders.value.find((po) => po.id === selectedPoId.value));
const totalQuantity = computed(() => receipt.lines.reduce((total, line) => total + (Number(line.receiveQty) || 0), 0));

function selectPurchaseOrder() {
  const po = selectedPo.value;
  receipt.lines = [];
  if (!po) return;
  loadOpenLines(po.id);
}

async function loadOpenLines(poId) {
  errorMessage.value = '';
  try {
    const payload = await api.getPurchaseOrderOpenLines(poId);
    receipt.lines = (payload.openLines || []).map((line) => ({
      ...line,
      receiveQty: line.qtyOpenForGr,
      actualSiteCode: line.siteCode,
    }));
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function updateQuantity(index, value) {
  receipt.lines[index].receiveQty = value;
}

function updateSite(index, value) {
  receipt.lines[index].actualSiteCode = value;
}

async function saveDraft() {
  errorMessage.value = '';
  if (!selectedPoId.value) {
    errorMessage.value = 'Select a submitted purchase order.';
    return;
  }
  if (!receipt.lines.length) {
    errorMessage.value = 'No open purchase order lines are available.';
    return;
  }
  const invalidLine = receipt.lines.find((line) =>
    !Number(line.receiveQty) || Number(line.receiveQty) <= 0 || Number(line.receiveQty) > line.qtyOpenForGr || !line.actualSiteCode?.trim(),
  );
  if (invalidLine) {
    errorMessage.value = `${invalidLine.itemCode}: receive quantity must be greater than 0, cannot exceed open quantity, and actual site is required.`;
    return;
  }

  isSaving.value = true;
  try {
    const created = await api.createGoodsReceipt({
      poId: selectedPoId.value,
      receiptDate: receipt.receiptDate || null,
      notes: receipt.notes || null,
      lines: receipt.lines.map((line) => ({
        poLineId: line.id,
        qtyReceived: Number(line.receiveQty),
        actualSiteCode: line.actualSiteCode.trim(),
      })),
    });
    await router.push(`/goods-receipts/${created.id}`);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSaving.value = false;
  }
}

onMounted(async () => {
  try {
    const payload = await api.listPurchaseOrders();
    purchaseOrders.value = (payload.items || []).filter((po) => po.status === 'SUBMITTED');
    if (selectedPoId.value) {
      await loadOpenLines(selectedPoId.value);
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to goods receipts" aria-label="Back to goods receipts">&#8592;</RouterLink>
        <div>
          <h2>Create Goods Receipt</h2>
          <p class="muted">Record delivered quantities against a submitted purchase order.</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error" data-testid="gr-error">{{ errorMessage }}</p>

    <form class="card-panel" data-testid="gr-create-form" @submit.prevent="saveDraft">
      <p class="form-section-title">Receipt Header</p>
      <div class="form-row">
        <div class="form-group">
          <label for="po-select">Purchase Order</label>
          <select id="po-select" v-model="selectedPoId" :disabled="isLoading" @change="selectPurchaseOrder">
            <option value="">Select submitted PO</option>
            <option v-for="po in purchaseOrders" :key="po.id" :value="po.id">{{ po.poNumber }} - {{ po.vendorName }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="receipt-date">Receipt Date</label>
          <input id="receipt-date" v-model="receipt.receiptDate" type="date" />
        </div>
        <div class="form-group full">
          <label for="receipt-notes">Notes</label>
          <textarea id="receipt-notes" v-model="receipt.notes" rows="2" placeholder="Optional delivery notes"></textarea>
        </div>
      </div>

      <GoodsReceiptLineTable :lines="receipt.lines" @update-quantity="updateQuantity" @update-site="updateSite" />

      <div class="order-summary"><span>Total Receiving Qty</span><strong>{{ totalQuantity }}</strong></div>
      <div class="btn-group">
        <RouterLink to="/goods-receipts" class="btn btn-outline">Cancel</RouterLink>
        <button type="submit" class="btn btn-primary" data-testid="save-gr" :disabled="isSaving">{{ isSaving ? 'Saving...' : 'Save GR Draft' }}</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.order-summary { display: flex; justify-content: flex-end; gap: 16px; margin: 20px 0; font-size: 14px; }
.order-summary strong { color: var(--primary); font-size: 18px; }
.btn:disabled { cursor: wait; opacity: 0.65; }
</style>
