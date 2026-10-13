<template>
  <div class="animate-fade-up">
    <!-- ===================== DETAIL ===================== -->
    <template v-if="id">
      <div v-if="collection">
        <!-- header -->
        <header class="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div class="min-w-0 grow basis-[420px]">
            <h1 class="text-[20px] font-semibold leading-snug tracking-tight text-ink">{{ collection.title }}</h1>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-faint">
              <span class="inline-flex items-center gap-1.5 rounded-md bg-canvas-2 py-0.5 pl-1 pr-1.5 font-medium text-ink-soft">
                <PlatformGlyph :platform="collection.platform" :size="16" /> {{ platformLabel(collection.platform) }}
              </span>
              <span v-if="collection.source" class="rounded-md bg-canvas-2 px-1.5 py-0.5 font-medium text-ink-soft">{{ collection.source }}</span>
              <span>{{ collection.commentCount.toLocaleString() }} {{ t('common.comments') }}</span>
              <span class="text-line-strong">/</span>
              <span>{{ t('sv.savedPrefix') }} {{ relativeTime(collection.createdAt) }}</span>
              <span v-if="collection.analysis" class="inline-flex items-center gap-1 rounded-md bg-commentgrab-soft px-1.5 py-0.5 font-medium text-commentgrab-violet">
                <Sparkles class="h-3 w-3" /> {{ t('an.analyzedLabel') }}
              </span>
            </div>
          </div>
          <div class="flex flex-none flex-wrap items-center gap-2">
            <SpButton size="sm" :icon="WandSparkles" @click="analyzeNow()">{{ t('common.analyze') }}</SpButton>
            <div class="inline-flex overflow-hidden rounded-md border border-line-strong bg-surface">
              <button class="seg-btn" @click="exportAs('csv')"><FileSpreadsheet class="h-3.5 w-3.5" /> CSV</button>
              <button class="seg-btn border-l border-line-strong" @click="exportAs('json')"><FileJson class="h-3.5 w-3.5" /> JSON</button>
              <button class="seg-btn border-l border-line-strong" @click="exportAs('markdown')"><FileText class="h-3.5 w-3.5" /> Markdown</button>
              <button class="seg-btn border-l border-line-strong" @click="exportAs('clipboard')"><Copy class="h-3.5 w-3.5" /> Copy</button>
            </div>
            <div class="flex items-center">
              <button class="icon-btn" :title="collection.pinned ? 'Unpin' : 'Pin'" :aria-pressed="!!collection.pinned" @click="togglePin()">
                <Star class="h-4 w-4" :class="collection.pinned ? 'fill-commentgrab-amber text-commentgrab-amber' : ''" />
              </button>
              <button class="icon-btn hover:!bg-rose-500/10 hover:!text-rose-600" :title="t('common.delete')" @click="remove(collection.id)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <TabBar
          class="mt-5"
          :model-value="activeTab"
          :tabs="[
            { id: 'comments', label: t('tab.comments'), icon: MessageSquare, badge: collection.commentCount.toLocaleString() },
            { id: 'insights', label: t('tab.insights'), icon: Sparkles },
          ]"
          @update:model-value="setTab"
        />

        <div class="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <!-- main column -->
          <div class="min-w-0">
            <CommentsTable v-if="activeTab === 'comments'" :comments="collection.comments" />
            <InsightsPanel
              v-else
              ref="panel"
              :analysis="collection.analysis ?? null"
              :load="loadSource"
              :save="saveAnalysis"
              :meta="{ title: collection.title, platform: collection.platform, url: collection.url, commentCount: collection.commentCount }"
            />
          </div>

          <!-- right rail: details, boards, note -->
          <aside class="order-first lg:sticky lg:top-[76px] lg:order-none">
            <div class="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
              <section class="p-4">
                <h2 class="col-label">{{ t('sv.details') }}</h2>
                <dl class="space-y-1.5 text-[12.5px]">
                  <div class="flex items-center gap-3">
                    <dt class="w-20 shrink-0 text-faint">{{ t('sv.platform') }}</dt>
                    <dd class="min-w-0 truncate text-ink-soft">{{ platformLabel(collection.platform) }}</dd>
                  </div>
                  <div v-if="collection.source" class="flex items-center gap-3">
                    <dt class="w-20 shrink-0 text-faint">{{ t('sv.source') }}</dt>
                    <dd class="min-w-0 truncate text-ink-soft">{{ collection.source }}</dd>
                  </div>
                  <div v-if="collection.url" class="flex items-center gap-3">
                    <dt class="w-20 shrink-0 text-faint">{{ t('sv.link') }}</dt>
                    <dd class="min-w-0">
                      <a :href="collection.url" target="_blank" rel="noopener" class="inline-flex max-w-full items-center gap-1 font-medium text-commentgrab-violet hover:underline">
                        <span class="truncate">{{ t('sv.original') }}</span> <ExternalLink class="h-3 w-3 shrink-0" />
                      </a>
                    </dd>
                  </div>
                  <div class="flex items-center gap-3">
                    <dt class="w-20 shrink-0 text-faint">{{ t('col.comments') }}</dt>
                    <dd class="font-mono text-ink-soft">{{ collection.commentCount.toLocaleString() }}</dd>
                  </div>
                  <div class="flex items-center gap-3">
                    <dt class="w-20 shrink-0 text-faint">{{ t('sv.savedOn') }}</dt>
                    <dd class="text-ink-soft" :title="formatDateTime(collection.createdAt)">{{ formatDate(collection.createdAt) }}</dd>
                  </div>
                  <div v-if="collection.analysis" class="flex items-center gap-3">
                    <dt class="w-20 shrink-0 text-faint">{{ t('an.analyzedLabel') }}</dt>
                    <dd class="text-ink-soft">{{ relativeTime(collection.analysis.createdAt) }}</dd>
                  </div>
                </dl>
              </section>

              <section class="p-4">
                <h2 class="col-label">{{ t('common.boards') }}</h2>
                <BoardPicker bare :model-value="detailBoards" @update:model-value="setDetailBoards" />
              </section>

              <section class="p-4">
                <div class="mb-1.5 flex h-5 items-center justify-between gap-3">
                  <label for="note" class="col-label !mb-0">{{ t('sv.note') }}</label>
                  <button v-if="noteDirty" class="inline-flex h-6 items-center gap-1 rounded-md bg-brand-500 px-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-600" @click="saveNote()">
                    <Check class="h-3 w-3" /> {{ t('sv.saveNote') }}
                  </button>
                  <span v-else-if="note" class="text-[11.5px] text-faint">Saved</span>
                </div>
                <textarea
                  id="note"
                  ref="noteEl"
                  v-model="note"
                  rows="2"
                  :placeholder="t('sv.notePlaceholder')"
                  class="input min-h-[64px] resize-none overflow-hidden !px-3 !py-2 text-[13px] leading-relaxed"
                  @input="autosize()"
                />
              </section>
            </div>
          </aside>
        </div>
      </div>

      <SpEmpty v-else-if="loaded" :icon="SearchX" :title="t('common.notFound')" :description="t('common.notFoundBody')" />
    </template>

    <!-- ===================== LIST ===================== -->
    <template v-else>
      <p class="mb-4 text-[13.5px] text-muted">{{ t('sv.subtitle') }}</p>

      <template v-if="collections.length">
        <!-- toolbar: one row of 36px controls -->
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <div class="relative w-full max-w-xs">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input v-model="query" type="text" :placeholder="t('sv.search')" class="input h-9 !py-0 !pl-9 text-[13px]" />
          </div>
          <SelectField v-if="platformFilters.length > 2" v-model="platformFilter" :aria-label="t('sv.platform')">
            <option v-for="f in platformFilters" :key="f.id" :value="f.id">{{ f.id === 'all' ? t('sv.allPlatforms') : f.label }}</option>
          </SelectField>
          <SelectField v-if="boardFilters.length > 1" v-model="boardFilter" :aria-label="t('common.boards')">
            <option v-for="b in boardFilters" :key="b.id" :value="b.id">{{ b.id === 'all' ? t('sv.allBoards') : b.label }}</option>
          </SelectField>
          <button
            class="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors"
            :class="analyzedOnly ? 'border-brand-400/50 bg-commentgrab-soft text-commentgrab-violet' : 'border-line-strong bg-surface text-muted hover:bg-canvas-2 hover:text-ink'"
            :aria-pressed="analyzedOnly"
            @click="analyzedOnly = !analyzedOnly"
          >
            <Sparkles class="h-3.5 w-3.5" /> {{ t('sv.analyzedOnly') }}
          </button>

          <div class="ml-auto flex items-center gap-3">
            <span class="text-[12.5px] text-faint">{{ t('sv.count', { n: visibleCollections.length, total: collections.length }) }}</span>
            <template v-if="activeBoard">
              <SpButton v-if="activeBoard.analysis" variant="secondary" size="sm" :icon="Sparkles" @click="navigate(`/board/${activeBoard.id}`)">{{ t('ins.boardInsights') }}</SpButton>
              <SpButton v-else size="sm" :icon="WandSparkles" @click="analyzeBoard(activeBoard.id)">{{ t('ins.analyzeBoard') }}</SpButton>
            </template>
          </div>
        </div>

        <CollectionTable v-if="visibleCollections.length" :collections="visibleCollections" :boards="boards" show-boards removable @remove="remove" />
        <div v-else class="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-[13.5px] text-muted">{{ t('sv.noMatch') }}</div>
      </template>

      <SpEmpty
        v-else-if="loaded"
        :icon="Bookmark"
        :title="t('sv.nothing')"
        :description="t('sv.nothingBody')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  ExternalLink, WandSparkles, FileSpreadsheet, FileJson, FileText, Copy,
  Star, Trash2, Search, SearchX, Bookmark, Sparkles, Check, MessageSquare,
} from 'lucide-vue-next';
import type { AnalysisResult, AppSettings, Board, ExportFormat, PlatformId, SavedCollection } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings, listCollections, getCollection, updateCollection, deleteCollection, listBoards, takeAutoAnalyze } from '@/shared/storage';
import { platformLabel, PLATFORM_META } from '@/shared/platform';
import { exportComments } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import type { InsightsSource } from '@/shared/insights';
import { relativeTime, formatDate, formatDateTime } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate, setCrumb, pendingRuns } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpButton from '@/ui/components/SpButton.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import BoardPicker from '@/ui/components/BoardPicker.vue';
import CommentsTable from '../components/CommentsTable.vue';
import CollectionTable from '../components/CollectionTable.vue';
import InsightsPanel from '../components/InsightsPanel.vue';
import SelectField from '../components/SelectField.vue';
import TabBar from '../components/TabBar.vue';

const props = defineProps<{ id?: string; tab?: string }>();
const toast = useToast();

const collections = ref<SavedCollection[]>([]);
const collection = ref<SavedCollection | null>(null);
const loaded = ref(false);
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const note = ref('');
const noteEl = ref<HTMLTextAreaElement | null>(null);
const query = ref('');
const platformFilter = ref<PlatformId | 'all'>('all');
const boards = ref<Board[]>([]);
const boardFilter = ref<string>('all');
const analyzedOnly = ref(false);
const detailBoards = ref<string[]>([]);
const panel = ref<InstanceType<typeof InsightsPanel> | null>(null);

const activeTab = computed(() => (props.tab === 'insights' ? 'insights' : 'comments'));
const noteDirty = computed(() => !!collection.value && note.value !== (collection.value.note ?? ''));
const activeBoard = computed(() => boards.value.find((b) => b.id === boardFilter.value) ?? null);

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
    if (analyzedOnly.value && !c.analysis) return false;
    if (q && !(`${c.title} ${c.source}`.toLowerCase().includes(q))) return false;
    return true;
  });
});

async function load(): Promise<void> {
  loaded.value = false;
  settings.value = await getSettings();
  boards.value = await listBoards();
  if (props.id) {
    collection.value = (await getCollection(props.id)) ?? null;
    note.value = collection.value?.note ?? '';
    detailBoards.value = collection.value?.boardIds ?? [];
    if (collection.value) setCrumb(`/saved/${props.id}`, collection.value.title);
    void nextTick(autosize);
  } else {
    collections.value = await listCollections();
  }
  loaded.value = true;
}

/** Run insights on arrival when asked to: header "Analyze", or the widget/popup hand-off. */
async function maybeAutoRun(): Promise<void> {
  if (!props.id || activeTab.value !== 'insights' || !collection.value) return;
  const auto = await takeAutoAnalyze();
  const asked = pendingRuns.delete(props.id) || auto === props.id;
  if (!asked || collection.value.analysis) return;
  await nextTick();
  if (panel.value && (await panel.value.hasKey())) void panel.value.run();
}

watch(
  () => [props.id, props.tab] as const,
  async ([id], prev) => {
    if (!prev || id !== prev[0]) await load();
    await maybeAutoRun();
  },
  { immediate: true },
);

function setTab(tab: string): void {
  if (!props.id) return;
  navigate(tab === 'insights' ? `/saved/${props.id}/insights` : `/saved/${props.id}`);
}

function analyzeNow(): void {
  if (!collection.value) return;
  if (!collection.value.analysis) pendingRuns.add(collection.value.id);
  if (activeTab.value === 'insights') void maybeAutoRun();
  else setTab('insights');
}

function analyzeBoard(id: string): void {
  pendingRuns.add(id);
  navigate(`/board/${id}`);
}

async function loadSource(): Promise<InsightsSource> {
  return { comments: collection.value?.comments ?? [], post: collection.value?.post ?? null };
}

async function saveAnalysis(a: AnalysisResult): Promise<void> {
  if (!collection.value) return;
  const updated = await updateCollection(collection.value.id, { analysis: a });
  collection.value = updated ?? { ...collection.value, analysis: a };
}

async function setDetailBoards(ids: string[]): Promise<void> {
  if (!collection.value) return;
  detailBoards.value = ids;
  const updated = await updateCollection(collection.value.id, { boardIds: ids });
  if (updated) collection.value = updated;
  boards.value = await listBoards();
}

function autosize(): void {
  const el = noteEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight + 2, 320)}px`;
}

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

<style scoped>
.seg-btn {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--cg-ink));
  background: rgb(var(--cg-surface));
  transition: background-color 0.14s ease;
}
.seg-btn:hover {
  background: rgb(var(--cg-canvas-2));
}
.icon-btn {
  display: inline-flex;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: rgb(var(--cg-muted));
  transition: background-color 0.14s ease, color 0.14s ease;
}
.icon-btn:hover {
  background: rgb(var(--cg-canvas-2));
  color: rgb(var(--cg-ink));
}
</style>
