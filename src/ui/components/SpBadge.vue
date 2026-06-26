<template>
  <span class="chip" :style="styleVars" :class="toneClass">
    <slot name="icon" />
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ tone?: 'neutral' | 'violet' | 'green' | 'amber' | 'rose'; color?: string }>(),
  { tone: 'neutral' },
);

const toneClass = computed(() => {
  if (props.color) return '';
  return {
    neutral: 'bg-slate-100 text-ink-500',
    violet: 'bg-violet-50 text-violet-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }[props.tone];
});

const styleVars = computed(() =>
  props.color ? { backgroundColor: `${props.color}1a`, color: props.color } : undefined,
);
</script>
