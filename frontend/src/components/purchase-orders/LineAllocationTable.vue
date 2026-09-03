<script setup>
defineProps({
  lines: {
    type: Array,
    required: true,
  },
  availableLines: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['remove', 'select', 'update-line']);
</script>

<template>
  <section class="card-panel" aria-labelledby="allocation-title">
    <div class="card-panel-header">
      <div>
        <p id="allocation-title" class="form-section-title">Line Allocation</p>
        <p class="muted">Allocate quantities from approved requisition lines.</p>
      </div>
      <span v-if="isLoading" class="muted">Loading approved PR lines...</span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>PR Number</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Remaining Qty</th>
            <th>Allocate Qty</th>
            <th>UOM</th>
            <th>Unit Price</th>
            <th aria-label="Action"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in lines" :key="line.id">
            <td>{{ line.prNumber }}</td>
            <td>{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.remainingQty }}</td>
            <td>
              <input
                :value="line.allocatedQty"
                type="number"
                min="0.01"
                :max="line.remainingQty"
                step="0.01"
                aria-label="Allocate quantity"
                @input="emit('update-line', index, 'allocatedQty', $event.target.value)"
              />
            </td>
            <td>{{ line.uom }}</td>
            <td>
              <input :value="line.unitPrice" type="number" min="0" step="0.01" aria-label="Unit price" @input="emit('update-line', index, 'unitPrice', $event.target.value)" />
            </td>
            <td class="action-cell">
              <button type="button" class="btn-danger-icon" title="Remove line" aria-label="Remove line" @click="emit('remove', index)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5.5 1.5h5M2 3.5h12M3.5 3.5l.75 9.5a1.5 1.5 0 0 0 1.5 1.5h4.5a1.5 1.5 0 0 0 1.5-1.5l.75-9.5M6.5 6.5v4.5M9.5 6.5v4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </td>
          </tr>
          <tr v-if="lines.length === 0">
            <td colspan="8" class="empty-state">No requisition lines selected.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="availableLines.length" class="available-lines">
      <p class="form-section-title">Available PR Lines</p>
      <button
        v-for="line in availableLines"
        :key="line.id"
        type="button"
        class="available-line"
        @click="emit('select', line)"
      >
        <span>{{ line.prNumber }} - {{ line.itemCode }} - {{ line.itemName }}</span>
        <strong>{{ line.remainingQty }} {{ line.uom }} available</strong>
      </button>
    </div>
  </section>
</template>

<style scoped>
.form-section-title { margin-bottom: 4px; }
.card-panel-header { align-items: flex-start; }
.table-wrap { overflow-x: auto; }
table { min-width: 900px; }
input { width: 100%; min-width: 86px; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-input); font: inherit; font-size: 13px; }
input:focus { border-color: var(--primary); outline: none; }
.action-cell { text-align: center; }
.empty-state { color: var(--text-muted); text-align: center; padding: 24px; }
.available-lines { border-top: 1px solid var(--border); margin-top: 20px; padding-top: 16px; }
.available-line { width: 100%; display: flex; justify-content: space-between; gap: 16px; text-align: left; padding: 10px 0; background: none; border: 0; border-bottom: 1px solid var(--border); color: var(--text); cursor: pointer; font: inherit; font-size: 13px; }
.available-line:hover { color: var(--primary); }
.available-line strong { white-space: nowrap; }
</style>