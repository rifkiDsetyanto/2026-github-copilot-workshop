<script setup>
defineProps({
  vendorName: {
    type: String,
    required: true,
  },
  purchaseOrderDate: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:vendorName', 'update:purchaseOrderDate']);
</script>

<template>
  <section class="card-panel" aria-labelledby="po-header-title">
    <p id="po-header-title" class="form-section-title">PO Header</p>
    <div class="form-row">
      <div class="form-group">
        <label for="vendor-name">Vendor Name</label>
        <input
          id="vendor-name"
          :value="vendorName"
          placeholder="Select or type vendor..."
          required
          @input="emit('update:vendorName', $event.target.value)"
        />
      </div>
      <div class="form-group">
        <label for="purchase-order-date">PO Date</label>
        <input
          id="purchase-order-date"
          type="date"
          :value="purchaseOrderDate"
          @input="emit('update:purchaseOrderDate', $event.target.value)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.form-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 620px;
}
</style>