<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="block h-full w-full overflow-visible">
    <defs>
      <linearGradient :id="`spark-${uid}`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path v-if="area" :d="area" :fill="`url(#spark-${uid})`" />
    <path
      v-if="line"
      :d="line"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(defineProps<{ points: number[]; color?: string }>(), { color: '#7c3aed' });
const uid = useId();
const W = 100;
const H = 36;

function path(pts: number[]): string {
  if (!pts?.length) return '';
  const max = Math.max(1, ...pts);
  const min = Math.min(0, ...pts);
  const span = max - min || 1;
  const stepX = pts.length > 1 ? W / (pts.length - 1) : 0;
  return pts
    .map((v, i) => {
      const x = i * stepX;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

const line = computed(() => path(props.points));
const area = computed(() => (line.value ? `${line.value} L ${W} ${H} L 0 ${H} Z` : ''));
</script>
