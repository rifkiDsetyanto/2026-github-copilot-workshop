<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to purchase orders" aria-label="Back to purchase orders">&#8592;</RouterLink>
        <div>
          <h2>Purchase Order Detail</h2>
          <p class="muted">{{ purchaseOrder?.poNumber || '-' }} &mdash; Purchase Order information detail</p>
        </div>
      </div>
      <div v-if="purchaseOrder" class="btn-group">
        <button v-if="purchaseOrder.status === 'DRAFT'" class="btn btn-primary" :disabled="isSubmitting" @click="submitPurchaseOrder">
          {{ isSubmitting ? 'Submitting...' : 'Submit PO' }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="purchaseOrder" class="card-panel">
      <p class="form-section-title">PO Header</p>
      <div class="form-row">
        <div class="form-group">
          <label>PO Number</label>
          <input :value="purchaseOrder.poNumber" disabled />
        </div>
        <div class="form-group">
          <label>Vendor Name</label>
          <input :value="purchaseOrder.vendorName" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <span class="status-badge" :class="purchaseOrder.status.toLowerCase()">{{ purchaseOrder.status }}</span>
        </div>
        <div class="form-group">
          <label>Created At</label>
          <input :value="formatDate(purchaseOrder.createdAt)" disabled />
        </div>
      </div>
    </div>

    <div v-if="purchaseOrder" class="card-panel">
      <p class="form-section-title">PO Lines</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Qty Ordered</th>
              <th>Qty Received</th>
              <th>Open Qty</th>
              <th>UOM</th>
              <th>Unit Price</th>
              <th>Site</th>
              <th>Source PR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in purchaseOrder.lines" :key="line.id">
              <td>{{ line.lineNo }}</td>
              <td>{{ line.itemCode }}</td>
              <td>{{ line.itemName }}</td>
              <td>{{ line.qtyOrdered }}</td>
              <td>{{ line.qtyReceived }}</td>
              <td>{{ line.qtyOpenForGr }}</td>
              <td>{{ line.uom }}</td>
              <td>{{ formatAmount(line.unitPrice) }}</td>
              <td>{{ line.siteCode }}</td>
              <td>{{ formatAllocations(line.allocations) }}</td>
            </tr>
            <tr v-if="!purchaseOrder.lines.length">
              <td colspan="10" class="empty-state">No purchase order lines found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const purchaseOrder = ref(null);
const errorMessage = ref('');
const isSubmitting = ref(false);

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-US') : '-';
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAllocations(allocations = []) {
  return allocations.length
    ? allocations.map((allocation) => `${allocation.prNumber} (${allocation.allocatedQty})`).join(', ')
    : '-';
}

async function load() {
  errorMessage.value = '';
  try {
    purchaseOrder.value = await api.getPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function submitPurchaseOrder() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    purchaseOrder.value = await api.submitPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.form-group input:disabled { background: var(--white); color: var(--text); cursor: default; opacity: 1; }
.table-wrap { overflow-x: auto; }
table { min-width: 1100px; }
.empty-state { color: var(--text-muted); text-align: center; padding: 24px; }
.btn:disabled { cursor: wait; opacity: 0.65; }
</style>
