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

// Soft pastel chips (gtm-sites admin). Dark variants keep the hue on a dim tint.
const toneClass = computed(() => {
  if (props.color) return '';
  return {
    neutral: 'bg-[#f1f1f3] text-[#52525b] dark:bg-canvas-2 dark:text-muted',
    violet: 'bg-[#efecfe] text-[#5a45e8] dark:bg-commentgrab-soft dark:text-commentgrab-violet',
    green: 'bg-[#e7f5ec] text-[#1f7a45] dark:bg-[#1f7a45]/20 dark:text-[#6fcf97]',
    amber: 'bg-[#fdeede] text-[#b5651d] dark:bg-[#b5651d]/20 dark:text-[#f0b070]',
    rose: 'bg-[#fdeaea] text-[#c23a3a] dark:bg-[#c23a3a]/20 dark:text-[#f08a8a]',
  }[props.tone];
});

const styleVars = computed(() =>
  props.color ? { backgroundColor: `${props.color}1a`, color: props.color } : undefined,
);
</script>
