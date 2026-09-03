<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const receipt = ref(null);
const errorMessage = ref('');
const isPosting = ref(false);

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-US') : '-';
}

async function load() {
  try {
    receipt.value = await api.getGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function postReceipt() {
  errorMessage.value = '';
  isPosting.value = true;
  try {
    receipt.value = await api.postGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isPosting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to goods receipts" aria-label="Back to goods receipts">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipt Detail</h2>
          <p class="muted">{{ receipt?.grNumber || '-' }} - Receipt information detail</p>
        </div>
      </div>
      <button v-if="receipt?.status === 'DRAFT'" class="btn btn-primary" :disabled="isPosting" data-testid="post-gr" @click="postReceipt">
        {{ isPosting ? 'Posting...' : 'Post GR' }}
      </button>
    </div>

    <p v-if="errorMessage" class="error" data-testid="gr-detail-error">{{ errorMessage }}</p>

    <template v-if="receipt">
      <div class="card-panel">
        <p class="form-section-title">Receipt Header</p>
        <div class="form-row">
          <div class="form-group"><label>GR Number</label><input :value="receipt.grNumber" disabled /></div>
          <div class="form-group"><label>PO Number</label><RouterLink class="value-link" :to="`/purchase-orders/${receipt.poId}`">{{ receipt.poNumber || receipt.poId }}</RouterLink></div>
          <div class="form-group"><label>Status</label><span class="status-badge" :class="receipt.status.toLowerCase()">{{ receipt.status }}</span></div>
          <div class="form-group"><label>Receipt Date</label><input :value="formatDate(receipt.receiptDate)" disabled /></div>
          <div class="form-group full"><label>Notes</label><textarea :value="receipt.notes || '-'" disabled rows="2"></textarea></div>
        </div>
      </div>

      <div class="card-panel">
        <p class="form-section-title">Received Lines</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Line</th><th>Item Code</th><th>Item Name</th><th>Qty Received</th><th>UOM</th><th>Actual Site</th></tr></thead>
            <tbody>
              <tr v-for="line in receipt.lines" :key="line.id">
                <td>{{ line.lineNo }}</td><td>{{ line.itemCode }}</td><td>{{ line.itemName }}</td><td>{{ line.qtyReceived }}</td><td>{{ line.uom }}</td><td>{{ line.actualSiteCode }}</td>
              </tr>
              <tr v-if="!receipt.lines?.length"><td colspan="6" class="empty-state">No receipt lines found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
table { min-width: 760px; }
.value-link { padding: 10px 0; font-size: 13px; font-weight: 600; }
.form-group input:disabled, .form-group textarea:disabled { background: var(--white); color: var(--text); cursor: default; opacity: 1; }
.empty-state { color: var(--text-muted); text-align: center; padding: 24px; }
.btn:disabled { cursor: wait; opacity: 0.65; }
</style>
