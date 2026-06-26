<template>
  <div class="animate-fade-up">
    <header class="mb-6 flex items-end justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('hi.title') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('hi.subtitle') }}</p>
      </div>
      <button
        v-if="entries.length"
        class="btn-secondary btn-sm hover:!text-rose-600"
        @click="clear()"
      >
        <Trash2 class="h-3.5 w-3.5" /> {{ t('hi.clear') }}
      </button>
    </header>

    <SpCard v-if="entries.length" class="!p-2">
      <div class="divide-y divide-black/[0.05]">
        <div
          v-for="h in entries"
          :key="h.id"
          class="group flex items-center gap-3 rounded-xl px-2.5 py-3 transition"
          :class="h.savedCollectionId ? 'cursor-pointer hover:bg-black/[0.03]' : ''"
          @click="h.savedCollectionId && navigate(`/saved/${h.savedCollectionId}`)"
        >
          <img v-if="faviconUrl(h.url)" :src="faviconUrl(h.url, 64)" alt="" class="h-[34px] w-[34px] shrink-0 rounded-xl border border-black/[0.06] bg-white p-1.5" />
          <PlatformGlyph v-else :platform="h.platform" :size="34" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-ink-900">{{ h.title || h.source || t('hi.scrape') }}</div>
            <div class="flex items-center gap-2 text-xs text-ink-400">
              <span>{{ h.commentCount.toLocaleString() }} {{ t('common.comments') }}</span>
              <span>· {{ formatDateTime(h.scrapedAt) }}</span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <span
              v-if="h.savedCollectionId"
              class="chip bg-commentgrab-soft text-commentgrab-violet"
            >
              <Eye class="h-3.5 w-3.5" /> {{ t('hi.viewComments') }}
            </span>
            <span v-else class="chip bg-black/[0.04] text-ink-400">{{ t('hi.notSaved') }}</span>
            <a
              v-if="h.url"
              :href="h.url"
              target="_blank"
              rel="noopener"
              class="btn-ghost h-8 w-8 rounded-lg p-0"
              :title="t('common.openOriginal')"
              @click.stop
            >
              <ExternalLink class="h-4 w-4" />
            </a>
            <button
              class="btn-ghost h-8 w-8 rounded-lg p-0 hover:!text-rose-600"
              :title="t('common.removeFromHistory')"
              @click.stop="remove(h.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </SpCard>

    <SpEmpty
      v-else
      :icon="History"
      :title="t('hi.empty')"
      :description="t('hi.emptyBody')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Trash2, ExternalLink, Eye, History } from 'lucide-vue-next';
import type { HistoryEntry } from '@/shared/types';
import { listHistory, clearHistory, removeHistory } from '@/shared/storage';
import { unrecordScrape } from '@/shared/stats';
import { formatDateTime, faviconUrl } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpCard from '@/ui/components/SpCard.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';

const toast = useToast();
const entries = ref<HistoryEntry[]>([]);

async function clear(): Promise<void> {
  // Reverse each entry's contribution to the all-time stats, then clear.
  for (const h of entries.value) await unrecordScrape(h.platform, h.commentCount, h.scrapedAt);
  await clearHistory();
  entries.value = [];
  toast.success('History cleared');
}

async function remove(id: string): Promise<void> {
  const entry = entries.value.find((h) => h.id === id);
  if (entry) await unrecordScrape(entry.platform, entry.commentCount, entry.scrapedAt);
  await removeHistory(id);
  entries.value = entries.value.filter((h) => h.id !== id);
  toast.success('Removed from history');
}

onMounted(async () => {
  entries.value = await listHistory();
});
</script>
