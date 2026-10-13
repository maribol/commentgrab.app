<template>
  <!-- Newest announcement, inline in the sidebar (people rarely open What's new). -->
  <section
    v-if="item"
    class="relative rounded-xl border border-line bg-surface p-3.5"
    :aria-label="t('wn.title')"
    data-testid="latest-announcement"
  >
    <button
      class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-faint transition hover:bg-canvas-2 hover:text-ink"
      :aria-label="t('wn.dismiss')"
      :title="t('wn.dismiss')"
      @click="dismissCard(item.id)"
    >
      <X class="h-3.5 w-3.5" />
    </button>

    <div class="flex items-center gap-2 pr-6 text-[11px] text-faint">
      <span class="chip" :class="tagClass(item.tag)">{{ t(`wn.tag.${item.tag}`) }}</span>
      <time :datetime="item.date">{{ formatDate(item.date) }}</time>
    </div>

    <h3 class="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{{ item.title }}</h3>

    <ul v-if="bullets.length" class="mt-2 space-y-1.5 text-[12.5px] leading-snug text-ink-soft">
      <li v-for="(b, i) in bullets" :key="i" class="flex gap-2">
        <span class="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
        <span class="line-clamp-2">{{ b }}</span>
      </li>
    </ul>
    <p v-else-if="lead" class="mt-2 line-clamp-3 text-[12.5px] leading-snug text-ink-soft">{{ lead }}</p>

    <div class="mt-3 flex items-center gap-3 text-[12px] font-semibold">
      <button class="text-commentgrab-violet hover:underline" @click="store.panelOpen = true">{{ t('wn.allUpdates') }}</button>
      <a
        v-if="item.url"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="ml-auto inline-flex items-center gap-0.5 text-muted transition hover:text-ink"
      >
        {{ t('wn.readMore') }} <ArrowUpRight class="h-3.5 w-3.5" />
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, ArrowUpRight } from 'lucide-vue-next';
import { t } from '@/shared/i18n';
import { dismissCard, store } from '@/shared/announcements';
import { formatDate, parseBody, tagClass } from './announcementUi';

/** store.items is already newest first with drafts and out-of-range versions removed. */
const item = computed(() => {
  const latest = store.items[0];
  return store.loaded && latest && !store.cardDismissed.includes(latest.id) ? latest : null;
});

const blocks = computed(() => (item.value ? parseBody(item.value.body) : []));
const bullets = computed(() => blocks.value.flatMap((b) => (b.kind === 'list' ? b.items : [])).slice(0, 3));
const lead = computed(() => {
  const p = blocks.value.find((b) => b.kind === 'p');
  return p && p.kind === 'p' ? p.text : '';
});
</script>
