<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-commentgrab-soft">
      <component :is="icon" class="h-6 w-6 text-commentgrab-violet" />
    </div>
    <h3 class="text-base font-semibold text-ink">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-[13.5px] text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ icon: Component; title: string; description?: string }>();
</script>
