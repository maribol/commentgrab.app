<template>
  <div
    v-if="open && !blocked"
    role="region"
    :aria-label="t('review.title')"
    class="rounded-xl border border-line bg-surface p-[14px] text-left text-ink"
    :class="floating ? 'fixed bottom-[20px] right-[20px] z-40 w-[340px]' : ''"
  >
    <div class="flex items-start gap-[10px]">
      <div class="mt-[1px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-commentgrab-soft text-commentgrab-violet">
        <Star class="h-[15px] w-[15px]" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[14px] font-semibold leading-snug text-ink">{{ t('review.title') }}</div>
        <p class="mt-[3px] text-[13px] leading-[1.45] text-muted">{{ t('review.body') }}</p>
        <div class="mt-[10px] flex flex-wrap items-center gap-[6px]">
          <button type="button" class="btn-primary btn-sm gap-[6px] rounded-[6px] px-[12px] py-[7px] text-[13px]" @click="review()">
            <ExternalLink class="h-[13px] w-[13px]" />
            <span>{{ t('review.cta') }}</span>
          </button>
          <button type="button" class="btn-ghost btn-sm rounded-[6px] px-[10px] py-[7px] text-[13px]" @click="notNow()">
            {{ t('review.notNow') }}
          </button>
        </div>
        <button type="button" class="mt-[8px] text-[12px] text-faint underline-offset-2 outline-none transition hover:text-muted hover:underline focus-visible:underline" @click="never()">
          {{ t('review.never') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Inline "rate CommentGrab" card. Mount it where exports happen; it stays
 * hidden until recordExport() (via noteEngagedAction) says the prompt is due
 * in this page, then appears in place. A plain request, nothing gated.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { ExternalLink, Star } from 'lucide-vue-next';
import { t } from '@/shared/i18n';
import { REVIEW_URL, onReviewDue, markReviewed, markNeverAsk, snoozeReview } from '@/shared/review';

withDefaults(
  defineProps<{
    /** Hide while a scrape runs or an error is on screen. */
    blocked?: boolean;
    /** Pin to the bottom-right corner (dashboard). */
    floating?: boolean;
  }>(),
  { blocked: false, floating: false },
);

const open = ref(false);
let off: (() => void) | undefined;
onMounted(() => {
  off = onReviewDue(() => (open.value = true));
});
onUnmounted(() => off?.());

function openStore(): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url: REVIEW_URL }).catch(() => window.open(REVIEW_URL, '_blank', 'noopener'));
  } else {
    window.open(REVIEW_URL, '_blank', 'noopener');
  }
}

async function review(): Promise<void> {
  open.value = false;
  openStore();
  await markReviewed();
}
async function notNow(): Promise<void> {
  open.value = false;
  await snoozeReview();
}
async function never(): Promise<void> {
  open.value = false;
  await markNeverAsk();
}
</script>
