<script setup>
defineProps({
  lines: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['update-quantity', 'update-site']);
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Line</th>
          <th>Item Code</th>
          <th>Item Name</th>
          <th>Ordered</th>
          <th>Received</th>
          <th>Open</th>
          <th>Receive Qty</th>
          <th>UOM</th>
          <th>Actual Site</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, index) in lines" :key="line.id">
          <td>{{ line.lineNo }}</td>
          <td>{{ line.itemCode }}</td>
          <td>{{ line.itemName }}</td>
          <td>{{ line.qtyOrdered }}</td>
          <td>{{ line.qtyReceived }}</td>
          <td>{{ line.qtyOpenForGr }}</td>
          <td>
            <input
              :value="line.receiveQty"
              type="number"
              min="0.01"
              :max="line.qtyOpenForGr"
              step="0.01"
              aria-label="Receive quantity"
              :data-testid="`receive-qty-${line.id}`"
              @input="emit('update-quantity', index, $event.target.value)"
            />
          </td>
          <td>{{ line.uom }}</td>
          <td>
            <input
              :value="line.actualSiteCode"
              type="text"
              aria-label="Actual site"
              :data-testid="`actual-site-${line.id}`"
              @input="emit('update-site', index, $event.target.value)"
            />
          </td>
        </tr>
        <tr v-if="!lines.length">
          <td colspan="9" class="empty-state">No open purchase order lines found.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
table { min-width: 1000px; }
input { width: 100%; min-width: 86px; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-input); font: inherit; font-size: 13px; }
input:focus { border-color: var(--primary); outline: none; }
.empty-state { color: var(--text-muted); text-align: center; padding: 24px; }
</style>
