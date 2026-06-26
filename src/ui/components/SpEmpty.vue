<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
      <component :is="icon" class="h-6 w-6 text-commentgrab-violet" />
    </div>
    <h3 class="text-base font-semibold text-ink-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-ink-500">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ icon: Component; title: string; description?: string }>();
</script>
