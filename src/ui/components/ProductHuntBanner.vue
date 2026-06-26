<template>
  <div
    v-if="show"
    class="flex items-center gap-3 border-b border-black/[0.06] bg-gradient-to-r from-[#fff3ee] to-[#fdf1f7]"
    :class="compact ? 'px-[14px] py-[9px] text-[12px]' : 'px-8 py-3 text-sm'"
  >
    <!-- Product Hunt mark -->
    <svg viewBox="0 0 40 40" class="shrink-0" :class="compact ? 'h-[18px] w-[18px]' : 'h-6 w-6'" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#da552f" />
      <path d="M22 12h-7v16h3.2v-4.6H22a5.7 5.7 0 0 0 0-11.4zm0 8.2h-3.8v-4.9H22a2.45 2.45 0 0 1 0 4.9z" fill="#fff" />
    </svg>

    <span class="min-w-0 truncate font-medium text-ink-700">CommentGrab is live on Product Hunt</span>

    <a
      :href="url"
      target="_blank"
      rel="noopener"
      class="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#da552f] px-3 py-1.5 font-semibold text-white transition hover:bg-[#c2461f]"
      :class="compact ? 'text-[11px]' : 'text-xs'"
    >
      <svg viewBox="0 0 12 12" class="h-3 w-3" fill="currentColor" aria-hidden="true"><path d="M6 2.5 10.5 9h-9z" /></svg>
      {{ compact ? 'View' : 'See us on Product Hunt' }}
    </a>

    <button class="shrink-0 text-ink-400 transition hover:text-ink-700" :title="t('common.dismiss')" @click="dismiss">
      <X :class="compact ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { usePromo } from '@/ui/composables/usePromo';
import { t } from '@/shared/i18n';

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });
const { show, dismiss, url } = usePromo();
</script>
