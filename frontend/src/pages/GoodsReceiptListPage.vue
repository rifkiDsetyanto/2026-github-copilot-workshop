<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const items = ref([]);
const errorMessage = ref('');
const isLoading = ref(true);

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-US') : '-';
}

onMounted(async () => {
  try {
    const payload = await api.listGoodsReceipts();
    items.value = payload.items || [];
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
        <RouterLink to="/" class="back-btn" title="Back to Dashboard" aria-label="Back to Dashboard">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipts</h2>
          <p class="muted">Track received items against submitted purchase orders.</p>
        </div>
      </div>
      <RouterLink class="btn btn-outline" to="/goods-receipts/new">+ New GR</RouterLink>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel">
      <p v-if="isLoading" class="muted">Loading goods receipts...</p>
      <table v-else>
        <thead>
          <tr>
            <th>GR Number</th>
            <th>PO Number</th>
            <th>Status</th>
            <th>Receipt Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><RouterLink :to="`/goods-receipts/${item.id}`">{{ item.grNumber }}</RouterLink></td>
            <td>{{ item.poNumber || item.poId }}</td>
            <td><span class="status-badge" :class="item.status.toLowerCase()">{{ item.status }}</span></td>
            <td>{{ formatDate(item.receiptDate) }}</td>
          </tr>
          <tr v-if="!items.length && !errorMessage">
            <td colspan="4" class="empty-state">No goods receipts found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.empty-state { color: var(--text-muted); text-align: center; padding: 24px; }
</style>
