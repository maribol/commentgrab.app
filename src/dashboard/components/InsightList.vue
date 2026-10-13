<template>
  <SpCard v-if="items.length">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-ink">
        <component :is="icon" class="h-4 w-4 text-brand-600" />
        {{ title }}
        <span class="rounded-md bg-canvas-2 px-2 py-0.5 text-[11px] font-semibold text-faint">{{ items.length }}</span>
      </h3>
      <div class="flex items-center gap-3">
        <button
          v-if="regenerable"
          class="flex items-center gap-1 text-xs font-semibold text-faint transition hover:text-brand-600 disabled:opacity-50"
          :disabled="regenerating"
          @click="$emit('regenerate')"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="regenerating ? 'animate-spin-slow' : ''" /> {{ regenerating ? 'Regenerating…' : 'Regenerate' }}
        </button>
        <button class="text-xs font-semibold text-faint transition hover:text-brand-600" @click="copyAll()">
          Copy all
        </button>
      </div>
    </div>
    <ul class="space-y-1.5">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-canvas-2"
      >
        <span v-if="numbered" class="mt-0.5 w-5 shrink-0 text-xs font-bold text-faint">{{ String(i + 1).padStart(2, '0') }}</span>
        <span v-else class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
        <span class="flex-1 text-sm leading-relaxed text-ink-soft">{{ item }}</span>
        <button
          class="shrink-0 text-faint opacity-0 transition hover:text-brand-600 group-hover:opacity-100"
          :title="t('common.copy')"
          @click="copy(item)"
        >
          <Copy class="h-3.5 w-3.5" />
        </button>
      </li>
    </ul>
  </SpCard>
</template>

<script setup lang="ts">
import { type Component } from 'vue';
import { Copy, RefreshCw } from 'lucide-vue-next';
import { t } from '@/shared/i18n';
import SpCard from '@/ui/components/SpCard.vue';
import { useToast } from '@/ui/composables/useToast';

const props = defineProps<{
  title: string;
  icon: Component;
  items: string[];
  numbered?: boolean;
  regenerable?: boolean;
  regenerating?: boolean;
}>();
defineEmits<{ regenerate: [] }>();
const toast = useToast();

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  toast.success('Copied');
}
async function copyAll(): Promise<void> {
  await navigator.clipboard.writeText(props.items.map((s, i) => (props.numbered ? `${i + 1}. ${s}` : `- ${s}`)).join('\n'));
  toast.success(`Copied ${props.items.length} items`);
}
</script>
