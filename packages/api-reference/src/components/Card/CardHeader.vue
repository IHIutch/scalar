<script lang="ts" setup>
import CardContent from './CardContent.vue'
</script>
<template>
  <CardContent class="scalar-card-header">
    <div class="scalar-card-header-slots">
      <div class="scalar-card-header-slot scalar-card-header-title">
        <slot />
      </div>
      <div class="scalar-card-header-slot scalar-card-header-actions">
        <slot name="actions" />
      </div>
    </div>
  </CardContent>
</template>
<style scoped>
.scalar-card-header {
  font-weight: var(--theme-semibold, var(--default-theme-semibold));
  font-size: var(--theme-mini, var(--default-theme-mini));
  color: var(--theme-color-3, var(--default-theme-color-3));
  flex-shrink: 0;
}
.scalar-card-header-slots {
  display: flex;
  justify-content: space-between;
  margin: 9px 0 9px 12px;
  line-height: 1.35;
}

.scalar-card-header-title {
  text-transform: uppercase;
  word-break: break-all;
}

.scalar-card-header-actions {
  display: flex;
}
</style>
