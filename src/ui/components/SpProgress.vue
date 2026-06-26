<template>
  <div class="relative h-[8px] w-full overflow-hidden rounded-full bg-slate-100">
    <!-- indeterminate: a pill that slides across -->
    <div
      v-if="indeterminate"
      class="absolute inset-y-0 left-0 w-1/3 rounded-full bg-commentgrab animate-indeterminate"
    />
    <!-- determinate: width tracks value -->
    <div
      v-else
      class="h-full rounded-full bg-commentgrab transition-[width] duration-500 ease-out"
      :style="{ width: `${clamped}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ value?: number; indeterminate?: boolean }>(), {
  value: 0,
  indeterminate: false,
});

const clamped = computed(() => Math.max(0, Math.min(100, props.value)));
</script>
