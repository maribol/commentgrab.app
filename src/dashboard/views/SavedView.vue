<template>
  <div class="animate-fade-up">
    <!-- ===================== DETAIL ===================== -->
    <template v-if="id">
      <button class="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900" @click="navigate('/saved')">
        <ArrowLeft class="h-4 w-4" /> {{ t('common.allCollections') }}
      </button>

      <div v-if="collection">
        <div class="flex items-start gap-4">
          <img v-if="faviconUrl(collection.url)" :src="faviconUrl(collection.url, 128)" alt="" class="h-12 w-12 shrink-0 rounded-xl border border-black/[0.06] bg-white p-2" />
          <PlatformGlyph v-else :platform="collection.platform" :size="48" />
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-bold leading-tight tracking-tight text-ink-900">{{ collection.title }}</h1>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
              <span>{{ platformLabel(collection.platform) }}</span>
              <span v-if="collection.source">· {{ collection.source }}</span>
              <span>· {{ collection.commentCount.toLocaleString() }} {{ t('common.comments') }}</span>
              <span>· {{ t('sv.savedPrefix') }} {{ relativeTime(collection.createdAt) }}</span>
              <a v-if="collection.url" :href="collection.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-medium text-commentgrab-violet hover:underline">
                {{ t('sv.original') }} <ExternalLink class="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <SpButton size="sm" :icon="WandSparkles" @click="navigate(`/analyze/${collection.id}`)">{{ t('common.analyze') }}</SpButton>
          <SpButton variant="secondary" size="sm" :icon="FileSpreadsheet" @click="exportAs('csv')">CSV</SpButton>
          <SpButton variant="secondary" size="sm" :icon="FileJson" @click="exportAs('json')">JSON</SpButton>
          <SpButton variant="secondary" size="sm" :icon="FileText" @click="exportAs('markdown')">Markdown</SpButton>
          <SpButton variant="secondary" size="sm" :icon="Copy" @click="exportAs('clipboard')">Copy</SpButton>
          <div class="ml-auto flex items-center gap-2">
            <button class="btn-ghost h-9 w-9 rounded-lg p-0" :title="collection.pinned ? 'Unpin' : 'Pin'" @click="togglePin()">
              <Star class="h-4 w-4" :class="collection.pinned ? 'fill-commentgrab-amber text-commentgrab-amber' : ''" />
            </button>
            <button class="btn-ghost h-9 w-9 rounded-lg p-0 hover:!text-rose-600" :title="t('common.delete')" @click="remove(collection.id)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="mt-4 max-w-md">
          <BoardPicker :model-value="detailBoards" @update:model-value="setDetailBoards" />
        </div>

        <SpCard class="mt-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <label for="note" class="label !mb-0">{{ t('sv.note') }}</label>
            <SpButton v-if="noteDirty" size="sm" :icon="Check" @click="saveNote()">{{ t('sv.saveNote') }}</SpButton>
            <span v-else-if="note" class="text-xs font-medium text-ink-300">Saved</span>
          </div>
          <textarea
            id="note"
            v-model="note"
            rows="2"
            :placeholder="t('sv.notePlaceholder')"
            class="input resize-none !py-2.5"
          />
        </SpCard>

        <SpCard class="mt-4">
          <CommentsTable :comments="collection.comments" />
        </SpCard>
      </div>

      <SpEmpty v-else :icon="SearchX" :title="t('common.notFound')" :description="t('common.notFoundBody')" />
    </template>

    <!-- ===================== LIST ===================== -->
    <template v-else>
      <header class="mb-6 flex items-end justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('sv.title') }}</h1>
          <p class="mt-1 text-sm text-ink-500">{{ t('sv.subtitle') }}</p>
        </div>
      </header>

      <div v-if="collections.length" class="mb-5 flex flex-wrap items-center gap-2">
        <div class="relative min-w-[220px] flex-1 max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input v-model="query" type="text" :placeholder="t('sv.search')" class="input !py-2 !pl-9" />
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="f in platformFilters"
            :key="f.id"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
            :class="platformFilter === f.id
              ? 'border-commentgrab-fuchsia/30 bg-commentgrab-soft text-commentgrab-violet'
              : 'border-black/[0.08] bg-white text-ink-500 hover:border-black/[0.16] hover:text-ink-900'"
            @click="platformFilter = f.id"
          >
            <PlatformGlyph v-if="f.id !== 'all'" :platform="(f.id as PlatformId)" :size="15" />
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="collections.length && boardFilters.length > 1" class="mb-5 flex flex-wrap items-center gap-1.5">
        <span class="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">{{ t('common.boards') }}</span>
        <button
          v-for="b in boardFilters"
          :key="b.id"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
          :class="boardFilter === b.id
            ? 'border-commentgrab-fuchsia/30 bg-commentgrab-soft text-commentgrab-violet'
            : 'border-black/[0.08] bg-white text-ink-500 hover:border-black/[0.16] hover:text-ink-900'"
          @click="boardFilter = b.id"
        >{{ b.label }}</button>
      </div>

      <div v-if="visibleCollections.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="c in visibleCollections"
          :key="c.id"
          class="group relative flex flex-col rounded-2xl border border-black/[0.07] bg-white p-4 text-left transition hover:border-black/[0.16] hover:shadow-sm"
          @click="navigate(`/saved/${c.id}`)"
        >
          <div class="flex items-start gap-3">
            <img v-if="faviconUrl(c.url)" :src="faviconUrl(c.url, 64)" alt="" class="h-10 w-10 shrink-0 rounded-xl border border-black/[0.06] bg-white p-1.5" />
            <PlatformGlyph v-else :platform="c.platform" :size="40" />
            <div class="min-w-0 flex-1">
              <div class="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{{ c.title }}</div>
              <div class="mt-0.5 truncate text-xs text-ink-400">{{ c.source || platformLabel(c.platform) }}</div>
              <div v-if="c.boardIds?.length" class="mt-1.5 flex flex-wrap gap-1">
                <span v-for="bid in c.boardIds.slice(0, 2)" :key="bid" class="rounded-md bg-commentgrab-soft px-1.5 py-0.5 text-[10px] font-semibold text-commentgrab-violet">{{ boardName(bid) }}</span>
                <span v-if="c.boardIds.length > 2" class="text-[10px] font-semibold text-ink-400">+{{ c.boardIds.length - 2 }}</span>
              </div>
            </div>
            <Star v-if="c.pinned" class="h-4 w-4 shrink-0 fill-commentgrab-amber text-commentgrab-amber" />
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-black/[0.05] pt-3 text-xs">
            <span class="font-semibold text-ink-700">{{ c.commentCount.toLocaleString() }} {{ t('common.comments') }}</span>
            <span class="flex items-center gap-2 text-ink-400">
              <span v-if="c.analysis" class="flex items-center gap-1 text-commentgrab-violet" :title="t('an.analyzedLabel')"><Sparkles class="h-3 w-3" /></span>
              {{ relativeTime(c.updatedAt) }}
            </span>
          </div>
          <span
            class="absolute right-2.5 top-2.5 hidden rounded-lg p-1.5 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600 group-hover:block"
            :title="t('common.delete')"
            @click.stop="remove(c.id)"
          ><Trash2 class="h-3.5 w-3.5" /></span>
        </button>
      </div>

      <SpEmpty
        v-else
        :icon="Bookmark"
        :title="t('sv.nothing')"
        :description="t('sv.nothingBody')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ArrowLeft, ExternalLink, WandSparkles, FileSpreadsheet, FileJson, FileText, Copy,
  Star, Trash2, Search, SearchX, Bookmark, Sparkles, Check,
} from 'lucide-vue-next';
import type { AppSettings, Board, ExportFormat, PlatformId, SavedCollection } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings, listCollections, getCollection, updateCollection, deleteCollection, listBoards } from '@/shared/storage';
import { platformLabel, PLATFORM_META } from '@/shared/platform';
import { exportComments } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import { relativeTime, faviconUrl } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import BoardPicker from '@/ui/components/BoardPicker.vue';
import CommentsTable from '../components/CommentsTable.vue';

const props = defineProps<{ id?: string }>();
const toast = useToast();

const collections = ref<SavedCollection[]>([]);
const collection = ref<SavedCollection | null>(null);
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const note = ref('');
const query = ref('');
const platformFilter = ref<PlatformId | 'all'>('all');
const boards = ref<Board[]>([]);
const boardFilter = ref<string>('all');
const detailBoards = ref<string[]>([]);

const noteDirty = computed(() => !!collection.value && note.value !== (collection.value.note ?? ''));

const boardName = (id: string): string => boards.value.find((b) => b.id === id)?.name ?? '';

const boardFilters = computed(() => {
  const list: Array<{ id: string; label: string }> = [{ id: 'all', label: t('sv.all') }];
  if (collections.value.some((c) => !c.boardIds?.length)) list.push({ id: 'unsorted', label: t('sv.unsorted') });
  boards.value.forEach((b) => {
    if (collections.value.some((c) => c.boardIds?.includes(b.id))) list.push({ id: b.id, label: b.name });
  });
  return list;
});

const platformFilters = computed(() => {
  const present = new Set(collections.value.map((c) => c.platform));
  const list: Array<{ id: PlatformId | 'all'; label: string }> = [{ id: 'all', label: t('sv.all') }];
  (Object.keys(PLATFORM_META) as PlatformId[]).forEach((p) => {
    if (present.has(p)) list.push({ id: p, label: platformLabel(p) });
  });
  return list;
});

const visibleCollections = computed(() => {
  const q = query.value.trim().toLowerCase();
  const bf = boardFilter.value;
  return collections.value.filter((c) => {
    if (platformFilter.value !== 'all' && c.platform !== platformFilter.value) return false;
    if (bf === 'unsorted' && (c.boardIds?.length ?? 0) > 0) return false;
    if (bf !== 'all' && bf !== 'unsorted' && !c.boardIds?.includes(bf)) return false;
    if (q && !(`${c.title} ${c.source}`.toLowerCase().includes(q))) return false;
    return true;
  });
});

async function load(): Promise<void> {
  settings.value = await getSettings();
  boards.value = await listBoards();
  if (props.id) {
    collection.value = (await getCollection(props.id)) ?? null;
    note.value = collection.value?.note ?? '';
    detailBoards.value = collection.value?.boardIds ?? [];
  } else {
    collections.value = await listCollections();
  }
}

async function setDetailBoards(ids: string[]): Promise<void> {
  if (!collection.value) return;
  detailBoards.value = ids;
  const updated = await updateCollection(collection.value.id, { boardIds: ids });
  if (updated) collection.value = updated;
  boards.value = await listBoards();
}

watch(() => props.id, load, { immediate: true });

async function exportAs(format: ExportFormat): Promise<void> {
  if (!collection.value) return;
  const outcome = await exportComments(format, collection.value.comments, collection.value.post, settings.value.export, collection.value.platform);
  if (outcome.ok) {
    await recordExport(format, 1);
    toast.success(format === 'clipboard' ? 'Copied to clipboard' : `Exported ${outcome.count.toLocaleString()} comments`);
  } else {
    toast.error('Export failed.');
  }
}

async function togglePin(): Promise<void> {
  if (!collection.value) return;
  const updated = await updateCollection(collection.value.id, { pinned: !collection.value.pinned });
  if (updated) collection.value = updated;
}

async function saveNote(): Promise<void> {
  if (!collection.value || !noteDirty.value) return;
  await updateCollection(collection.value.id, { note: note.value });
  collection.value = { ...collection.value, note: note.value };
  toast.success('Note saved');
}

async function remove(id: string): Promise<void> {
  await deleteCollection(id);
  toast.success('Deleted');
  if (props.id) navigate('/saved');
  else collections.value = await listCollections();
}
</script>
