<template>
  <div>
    <div class="flex h-3 w-full overflow-hidden rounded-full bg-canvas-2">
      <div class="h-full bg-emerald-400" :style="{ width: `${sentiment.positive}%` }" />
      <div class="h-full bg-faint/50" :style="{ width: `${sentiment.neutral}%` }" />
      <div class="h-full bg-rose-400" :style="{ width: `${sentiment.negative}%` }" />
    </div>
    <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium">
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Positive {{ sentiment.positive }}%</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-faint/50" /> Neutral {{ sentiment.neutral }}%</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-rose-400" /> Negative {{ sentiment.negative }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SentimentBreakdown } from '@/shared/types';

defineProps<{ sentiment: SentimentBreakdown }>();
</script>
