<template>
  <div v-if="show" class="relative rounded-2xl border border-[#da552f]/25 bg-[#fff5f1] p-3.5">
    <button class="absolute right-2 top-2 text-ink-300 transition hover:text-ink-600" :title="t('common.dismiss')" @click="dismiss">
      <X class="h-3.5 w-3.5" />
    </button>
    <div class="flex items-center gap-2 text-sm font-semibold text-ink-900">
      <svg viewBox="0 0 40 40" class="h-6 w-6 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#da552f" />
        <path d="M22 12h-7v16h3.2v-4.6H22a5.7 5.7 0 0 0 0-11.4zm0 8.2h-3.8v-4.9H22a2.45 2.45 0 0 1 0 4.9z" fill="#fff" />
      </svg>
      Live on Product Hunt
    </div>
    <p class="mt-2 text-xs leading-relaxed text-ink-500">If CommentGrab saved you time, an upvote means a lot.</p>
    <a
      :href="url"
      target="_blank"
      rel="noopener"
      class="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#da552f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#c2461f]"
    >
      <svg viewBox="0 0 12 12" class="h-3 w-3" fill="currentColor" aria-hidden="true"><path d="M6 2.5 10.5 9h-9z" /></svg>
      See us on Product Hunt
    </a>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { t } from '@/shared/i18n';
import { usePromo } from '@/ui/composables/usePromo';

const { show, dismiss, url } = usePromo();
</script>
