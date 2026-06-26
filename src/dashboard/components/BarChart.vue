<template>
  <div>
    <div class="flex h-[230px] items-end justify-between gap-3 sm:gap-5">
      <div
        v-for="(pt, i) in points"
        :key="pt.key"
        class="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end"
        @mouseenter="hover = i"
        @mouseleave="hover = null"
      >
        <!-- tooltip — only on real hover, never sticky -->
        <div
          v-if="hover === i && maxValue > 0"
          class="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-xl border border-black/[0.07] bg-white px-3.5 py-2.5 text-left"
        >
          <div class="text-[11px] font-medium text-ink-400">Monthly {{ metric }}</div>
          <div class="text-lg font-bold tracking-tight text-ink-900">{{ valueOf(pt).toLocaleString() }}</div>
          <div v-if="deltaOf(i) !== null" class="mt-0.5 flex items-center gap-1 text-[11px] font-semibold" :class="deltaOf(i)! >= 0 ? 'text-emerald-600' : 'text-rose-500'">
            <component :is="deltaOf(i)! >= 0 ? ArrowUp : ArrowDown" class="h-3 w-3" />
            {{ Math.abs(deltaOf(i)!) }}% vs last month
          </div>
        </div>

        <!-- bar -->
        <div class="relative w-full max-w-[60px]" :style="{ height: heightOf(pt) }">
          <div
            class="h-full w-full rounded-xl transition-colors duration-200"
            :class="activeIndex === i ? 'bg-commentgrab-violet' : 'dotted'"
          />
        </div>

        <span class="mt-3 text-[11px] font-semibold tracking-wide" :class="activeIndex === i ? 'text-ink-900' : 'text-ink-300'">
          {{ pt.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowUp, ArrowDown } from 'lucide-vue-next';
import type { MonthlyPoint } from '@/shared/stats';

const props = withDefaults(
  defineProps<{ points: MonthlyPoint[]; metric?: 'comments' | 'scrapes' }>(),
  { metric: 'comments' },
);

const hover = ref<number | null>(null);

function valueOf(pt: MonthlyPoint): number {
  return props.metric === 'scrapes' ? pt.scrapes : pt.comments;
}

const maxValue = computed(() => Math.max(0, ...props.points.map(valueOf)));

const peakIndex = computed(() => {
  let idx = props.points.length - 1;
  let best = -1;
  props.points.forEach((p, i) => {
    if (valueOf(p) >= best) {
      best = valueOf(p);
      idx = i;
    }
  });
  return idx;
});

const activeIndex = computed(() => (hover.value !== null ? hover.value : peakIndex.value));

function heightOf(pt: MonthlyPoint): string {
  if (maxValue.value <= 0) return '14%';
  const ratio = valueOf(pt) / maxValue.value;
  return `${Math.max(8, Math.round(ratio * 100))}%`;
}

function deltaOf(i: number): number | null {
  if (i === 0) return null;
  const prev = valueOf(props.points[i - 1]);
  const cur = valueOf(props.points[i]);
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}
</script>

<style scoped>
.dotted {
  background-color: #f1f2f7;
  background-image: radial-gradient(circle, rgba(11, 16, 32, 0.12) 1.4px, transparent 1.4px);
  background-size: 9px 9px;
}
</style>
