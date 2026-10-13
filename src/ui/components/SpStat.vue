<template>
  <div class="commentgrab-card p-5">
    <div class="flex items-center justify-between">
      <span class="col-label !mb-0">{{ label }}</span>
      <component v-if="icon" :is="icon" class="h-4 w-4 text-faint" />
    </div>
    <div class="mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink">
      <slot>{{ value }}</slot>
    </div>
    <p v-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ label: string; value?: string | number; hint?: string; icon?: Component }>();
</script>
