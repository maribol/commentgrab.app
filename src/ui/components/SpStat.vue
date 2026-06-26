<template>
  <div class="commentgrab-card p-5">
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{{ label }}</span>
      <component v-if="icon" :is="icon" class="h-4 w-4 text-ink-300" />
    </div>
    <div class="mt-4 text-[28px] font-bold leading-none tracking-tight text-ink-900">
      <slot>{{ value }}</slot>
    </div>
    <p v-if="hint" class="mt-1.5 text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ label: string; value?: string | number; hint?: string; icon?: Component }>();
</script>
