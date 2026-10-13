<template>
  <section v-if="items.length" class="overflow-hidden rounded-xl border border-line bg-surface">
    <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
      <h3 class="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        <component :is="icon" class="h-4 w-4 text-commentgrab-violet" />
        {{ title }}
        <span class="rounded-md bg-canvas-2 px-1.5 py-0.5 text-[11px] font-semibold text-faint">{{ items.length }}</span>
      </h3>
      <div class="flex items-center gap-1">
        <button
          v-if="regenerable"
          class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted transition-colors hover:bg-canvas-2 hover:text-ink disabled:opacity-50"
          :disabled="regenerating"
          @click="$emit('regenerate')"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="regenerating ? 'animate-spin-slow' : ''" /> {{ regenerating ? 'Regenerating…' : 'Regenerate' }}
        </button>
        <button class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted transition-colors hover:bg-canvas-2 hover:text-ink" @click="copyAll()">
          <Copy class="h-3.5 w-3.5" /> Copy all
        </button>
      </div>
    </header>
    <ul class="divide-y divide-line">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-canvas"
      >
        <span v-if="numbered" class="mt-px w-5 shrink-0 font-mono text-[11.5px] text-faint">{{ String(i + 1).padStart(2, '0') }}</span>
        <span v-else class="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-faint" />
        <span class="flex-1 text-[13.5px] leading-relaxed text-ink-soft">{{ item }}</span>
        <button
          class="mt-0.5 shrink-0 text-faint opacity-0 transition hover:text-commentgrab-violet group-hover:opacity-100"
          :title="t('common.copy')"
          @click="copy(item)"
        >
          <Copy class="h-3.5 w-3.5" />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { type Component } from 'vue';
import { Copy, RefreshCw } from 'lucide-vue-next';
import { t } from '@/shared/i18n';
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
