<template>
  <div class="animate-fade-up">
    <div class="mb-4 flex items-center justify-between gap-3">
      <p class="text-[13.5px] text-muted">{{ t('hi.subtitle') }}</p>
      <button
        v-if="entries.length"
        class="btn-secondary btn-sm hover:!text-rose-600"
        @click="clear()"
      >
        <Trash2 class="h-3.5 w-3.5" /> {{ t('hi.clear') }}
      </button>
    </div>

    <div v-if="entries.length" class="overflow-hidden rounded-xl border border-line bg-surface">
      <div class="hist-grid border-b border-line bg-canvas px-4 py-2">
        <span class="col-label !mb-0">{{ t('hi.scrape') }}</span>
        <span class="col-label !mb-0 hidden text-right sm:block">{{ t('col.comments') }}</span>
        <span class="col-label !mb-0 hidden text-right sm:block">{{ t('col.when') }}</span>
        <span class="col-label !mb-0 hidden sm:block">{{ t('col.status') }}</span>
        <span />
      </div>
      <div class="divide-y divide-line">
        <div
          v-for="h in entries"
          :key="h.id"
          class="hist-grid group px-4 py-2.5 transition-colors"
          :class="h.savedCollectionId ? 'cursor-pointer hover:bg-canvas' : ''"
          @click="h.savedCollectionId && navigate(`/saved/${h.savedCollectionId}`)"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <PlatformGlyph :platform="h.platform" :size="20" class="shrink-0" />
            <span class="truncate text-[13.5px] font-medium text-ink">{{ h.title || h.source || t('hi.scrape') }}</span>
            <span v-if="h.title && h.source" class="hidden max-w-[160px] shrink-0 truncate text-[12.5px] text-faint xl:inline">{{ h.source }}</span>
          </div>
          <span class="hidden text-right font-mono text-[12.5px] text-ink-soft sm:block">{{ h.commentCount.toLocaleString() }}</span>
          <span class="hidden text-right text-[12.5px] text-faint sm:block" :title="formatDateTime(h.scrapedAt)">{{ relativeTime(h.scrapedAt) }}</span>
          <span class="hidden sm:block">
            <span v-if="h.savedCollectionId" class="inline-flex items-center gap-1 rounded-md bg-commentgrab-soft px-1.5 py-0.5 text-[11.5px] font-medium text-commentgrab-violet">
              <Eye class="h-3 w-3" /> {{ t('hi.viewComments') }}
            </span>
            <span v-else class="inline-flex rounded-md bg-canvas-2 px-1.5 py-0.5 text-[11.5px] font-medium text-faint">{{ t('hi.notSaved') }}</span>
          </span>
          <span class="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <a
              v-if="h.url"
              :href="h.url"
              target="_blank"
              rel="noopener"
              class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-canvas-2 hover:text-ink"
              :title="t('common.openOriginal')"
              @click.stop
            >
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-rose-500/10 hover:text-rose-600"
              :title="t('common.removeFromHistory')"
              @click.stop="remove(h.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      </div>
    </div>

    <SpEmpty
      v-else-if="loaded"
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
import { formatDateTime, relativeTime } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';

const toast = useToast();
const entries = ref<HistoryEntry[]>([]);
const loaded = ref(false);

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
  loaded.value = true;
});
</script>

<style scoped>
.hist-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  align-items: center;
  column-gap: 12px;
}
@media (min-width: 640px) {
  .hist-grid {
    grid-template-columns: minmax(0, 1fr) 84px 96px 128px 64px;
  }
}
</style>
