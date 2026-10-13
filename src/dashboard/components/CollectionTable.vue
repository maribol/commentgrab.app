<template>
  <div class="overflow-hidden rounded-xl border border-line bg-surface">
    <div class="row-grid border-b border-line bg-canvas px-4 py-2">
      <span class="col-label !mb-0">{{ t('col.collection') }}</span>
      <span class="col-label !mb-0 hidden text-center sm:block" :title="t('an.analyzedLabel')"><Sparkles class="mx-auto h-3 w-3" /></span>
      <span class="col-label !mb-0 hidden text-right sm:block">{{ t('col.comments') }}</span>
      <span class="col-label !mb-0 hidden text-right sm:block">{{ t('col.updated') }}</span>
      <span />
    </div>
    <div class="divide-y divide-line">
      <div
        v-for="c in collections"
        :key="c.id"
        class="row-grid group cursor-pointer px-4 py-2.5 transition-colors hover:bg-canvas"
        role="link"
        tabindex="0"
        @click="navigate(`/saved/${c.id}`)"
        @keydown.enter="navigate(`/saved/${c.id}`)"
      >
        <div class="flex min-w-0 items-center gap-2.5">
          <PlatformGlyph :platform="c.platform" :size="20" class="shrink-0" />
          <Star v-if="c.pinned" class="h-3.5 w-3.5 shrink-0 fill-commentgrab-amber text-commentgrab-amber" />
          <span class="truncate text-[13.5px] font-medium text-ink">{{ c.title }}</span>
          <span class="hidden max-w-[160px] shrink-0 truncate text-[12.5px] text-faint lg:inline">{{ c.source || platformLabel(c.platform) }}</span>
          <span v-if="showBoards && c.boardIds?.length" class="hidden shrink-0 items-center gap-1 lg:flex">
            <span v-for="bid in c.boardIds.slice(0, 2)" :key="bid" class="max-w-[110px] truncate rounded-md bg-canvas-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">{{ boardName(bid) }}</span>
            <span v-if="c.boardIds.length > 2" class="text-[11px] font-medium text-faint">+{{ c.boardIds.length - 2 }}</span>
          </span>
        </div>
        <span class="hidden justify-center sm:flex">
          <Sparkles v-if="c.analysis" class="h-3.5 w-3.5 text-commentgrab-violet" :aria-label="t('an.analyzedLabel')" />
        </span>
        <span class="hidden text-right font-mono text-[12.5px] text-ink-soft sm:block">{{ c.commentCount.toLocaleString() }}</span>
        <span class="hidden text-right text-[12.5px] text-faint sm:block">{{ relativeTime(c.updatedAt) }}</span>
        <span class="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <a
            v-if="c.url"
            :href="c.url"
            target="_blank"
            rel="noopener"
            class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-canvas-2 hover:text-ink"
            :title="t('common.openOriginal')"
            @click.stop
          ><ExternalLink class="h-3.5 w-3.5" /></a>
          <button
            v-if="removable"
            class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-rose-500/10 hover:text-rose-600"
            :title="t('common.delete')"
            @click.stop="$emit('remove', c.id)"
          ><Trash2 class="h-3.5 w-3.5" /></button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink, Sparkles, Star, Trash2 } from 'lucide-vue-next';
import type { Board, SavedCollection } from '@/shared/types';
import { platformLabel } from '@/shared/platform';
import { relativeTime } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';

const props = defineProps<{ collections: SavedCollection[]; boards?: Board[]; showBoards?: boolean; removable?: boolean }>();
defineEmits<{ remove: [id: string] }>();

const boardName = (id: string): string => props.boards?.find((b) => b.id === id)?.name ?? '';
</script>

<style scoped>
.row-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  align-items: center;
  column-gap: 12px;
}
@media (min-width: 640px) {
  .row-grid {
    grid-template-columns: minmax(0, 1fr) 24px 84px 96px 64px;
  }
}
</style>
