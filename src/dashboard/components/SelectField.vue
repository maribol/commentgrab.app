<template>
  <div class="relative inline-flex" :class="block ? 'w-full' : ''">
    <select
      v-model="model"
      class="h-9 w-full cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-8 text-[13px] font-medium text-ink outline-none transition-colors hover:border-faint/60 focus:border-brand-400"
      v-bind="$attrs"
    >
      <slot />
    </select>
    <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { ChevronDown } from 'lucide-vue-next';

defineOptions({ inheritAttrs: false });
defineProps<{ block?: boolean }>();
const model = defineModel<T>();
</script>
