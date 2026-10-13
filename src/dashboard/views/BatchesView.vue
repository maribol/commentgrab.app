<template>
  <div class="animate-fade-up">
    <!-- ===================== DETAIL ===================== -->
    <template v-if="id">
      <div v-if="batch">
        <header class="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div class="min-w-0 grow basis-[420px]">
            <h1 class="text-[20px] font-semibold leading-snug tracking-tight text-ink">{{ batch.query }}</h1>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-faint">
              <span class="inline-flex items-center gap-1.5 rounded-md bg-canvas-2 py-0.5 pl-1 pr-1.5 font-medium text-ink-soft">
                <PlatformGlyph :platform="batch.platform" :size="16" /> {{ platformLabel(batch.platform) }}
              </span>
              <span v-if="batch.source" class="rounded-md bg-canvas-2 px-1.5 py-0.5 font-medium text-ink-soft">{{ batch.source }}</span>
              <span>{{ rows.length }} {{ t('batch.posts') }}</span>
              <span class="text-line-strong">/</span>
              <span>{{ relativeTime(batch.createdAt) }}</span>
              <span v-if="batch.analysis" class="inline-flex items-center gap-1 rounded-md bg-commentgrab-soft px-1.5 py-0.5 font-medium text-commentgrab-violet">
                <Sparkles class="h-3 w-3" /> {{ t('ins.combined') }}
              </span>
            </div>
          </div>
          <div class="flex flex-none items-center gap-2">
            <a v-if="batch.url" :href="batch.url" target="_blank" rel="noopener" class="btn-secondary btn-sm">
              <ExternalLink class="h-3.5 w-3.5" /> {{ t('batch.openList') }}
            </a>
            <SpButton v-if="!batch.analysis" size="sm" :icon="WandSparkles" :disabled="!rows.length" @click="analyzeCombined()">{{ t('ins.combined') }}</SpButton>
            <button class="icon-btn hover:!bg-rose-500/10 hover:!text-rose-600" :title="t('batch.deleteWithPosts')" @click="removeBatch()">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </header>

        <TabBar
          class="mt-5"
          :model-value="activeTab"
          :tabs="[
            { id: 'posts', label: t('tab.posts'), icon: Layers, badge: String(rows.length) },
            { id: 'insights', label: t('ins.combined'), icon: Sparkles },
          ]"
          @update:model-value="setTab"
        />

        <div class="mt-5">
          <!-- posts table -->
          <div v-if="activeTab === 'posts'" class="overflow-hidden rounded-xl border border-line bg-surface">
            <div class="post-grid border-b border-line bg-canvas px-4 py-2">
              <input type="checkbox" class="cg-check" :aria-label="t('batch.selectAll')" :checked="allSelected" :indeterminate.prop="someSelected && !allSelected" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
              <span class="col-label !mb-0">#</span>
              <span class="col-label !mb-0">{{ t('tab.posts') }}</span>
              <span class="col-label !mb-0 hidden text-center sm:block" :title="t('an.analyzedLabel')"><Sparkles class="mx-auto h-3 w-3" /></span>
              <span class="col-label !mb-0 text-right">{{ t('col.comments') }}</span>
              <span />
            </div>

            <div class="divide-y divide-line">
              <div
                v-for="(c, i) in rows"
                :key="c.id"
                class="post-grid group px-4 py-2.5 transition-colors hover:bg-canvas"
                :class="selected[c.id] ? '!bg-brand-500/[0.06]' : ''"
              >
                <input type="checkbox" class="cg-check" :checked="!!selected[c.id]" @change="toggle(c.id, ($event.target as HTMLInputElement).checked)" />
                <span class="font-mono text-[11.5px] text-faint">{{ i + 1 }}</span>
                <div class="flex min-w-0 items-center gap-2">
                  <button class="truncate text-left text-[13.5px] font-medium text-ink transition-colors hover:text-commentgrab-violet" @click="navigate(`/saved/${c.id}`)">
                    {{ c.title }}
                  </button>
                  <span class="hidden max-w-[160px] shrink-0 truncate text-[12.5px] text-faint lg:inline">{{ c.source || platformLabel(c.platform) }}</span>
                </div>
                <span class="hidden justify-center sm:flex">
                  <Sparkles v-if="c.analysis" class="h-3.5 w-3.5 text-commentgrab-violet" :aria-label="t('an.analyzedLabel')" />
                </span>
                <span class="text-right font-mono text-[12.5px] text-ink-soft">{{ c.commentCount.toLocaleString() }}</span>
                <span class="flex justify-end">
                  <button class="flex h-7 w-7 items-center justify-center rounded-md text-faint opacity-0 transition hover:bg-canvas-2 hover:text-ink group-hover:opacity-100" :title="t('common.analyze')" @click="navigate(`/saved/${c.id}/insights`)">
                    <WandSparkles class="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <SpEmpty v-if="!rows.length" :icon="Layers" :title="t('common.notFound')" :description="t('common.notFoundBody')" class="m-4" />
          </div>

          <InsightsPanel
            v-else
            ref="panel"
            :analysis="batch.analysis ?? null"
            :load="loadSource"
            :save="saveAnalysis"
            :threads="rows.length"
            :meta="{ title: batch.query, platform: batch.platform, url: batch.url, commentCount: totalComments }"
          />
        </div>
      </div>

      <SpEmpty v-else-if="loaded" :icon="Layers" :title="t('common.notFound')" :description="t('common.notFoundBody')" />

      <!-- sticky bulk bar, centered within the content column -->
      <Transition name="cg-slide-up">
        <div v-if="selectedRows.length && activeTab === 'posts'" class="pointer-events-none sticky bottom-5 z-30 mt-6 flex justify-center">
          <div class="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-2.5 py-2 shadow-widget">
            <span class="px-1.5 text-[13px] font-semibold text-ink-soft">{{ t('batch.selected', { count: selectedRows.length }) }}</span>
            <SpButton size="sm" :class="analyzing ? 'disabled:!cursor-progress disabled:!opacity-100' : ''" :icon="Sparkles" :loading="analyzing" @click="analyzeSelected()">
              {{ analyzing ? t('batch.analyzing', { done: analyzeDone, total: analyzeTotal }) : t('batch.analyzeSelected') }}
            </SpButton>
            <label class="flex cursor-pointer items-center gap-1.5 pr-1 text-[12px] font-medium text-muted" :title="t('batch.withAnglesTip')">
              <input v-model="withAngles" type="checkbox" class="cg-check" />
              {{ t('batch.withAngles') }}
            </label>
            <div class="inline-flex items-center overflow-hidden rounded-md border border-line-strong">
              <span class="flex h-[30px] items-center border-r border-line-strong bg-canvas px-2 text-[11.5px] font-semibold text-faint">{{ t('batch.expComments') }}</span>
              <button class="batch-fmt" :disabled="exporting" @click="exportSelected('csv')"><FileSpreadsheet class="h-3.5 w-3.5" /> CSV</button>
              <button class="batch-fmt border-l border-line-strong" :disabled="exporting" @click="exportSelected('json')"><FileJson class="h-3.5 w-3.5" /> JSON</button>
              <button class="batch-fmt border-l border-line-strong" :disabled="exporting" @click="exportSelected('markdown')"><FileText class="h-3.5 w-3.5" /> MD</button>
            </div>
            <div class="inline-flex items-center overflow-hidden rounded-md border border-line-strong" :title="analyzedCount ? '' : t('batch.noAnalyses')">
              <span class="flex h-[30px] items-center border-r border-line-strong bg-canvas px-2 text-[11.5px] font-semibold text-faint">{{ t('batch.expAnalyses') }}</span>
              <button class="batch-fmt" :disabled="exporting || !analyzedCount" @click="exportAnalyses('markdown')"><Sparkles class="h-3.5 w-3.5" /> MD</button>
              <button class="batch-fmt border-l border-line-strong" :disabled="exporting || !analyzedCount" @click="exportAnalyses('json')"><FileJson class="h-3.5 w-3.5" /> JSON</button>
            </div>
            <button class="inline-flex h-[30px] items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600" @click="deleteSelected()">
              <Trash2 class="h-3.5 w-3.5" /> {{ t('batch.deleteSelected') }}
            </button>
          </div>
        </div>
      </Transition>
    </template>

    <!-- ===================== LIST ===================== -->
    <template v-else>
      <p class="mb-4 text-[13.5px] text-muted">{{ t('batch.subtitle') }}</p>

      <div v-if="batches.length" class="overflow-hidden rounded-xl border border-line bg-surface">
        <div class="batch-grid border-b border-line bg-canvas px-4 py-2">
          <span class="col-label !mb-0">{{ t('col.batch') }}</span>
          <span class="col-label !mb-0 hidden text-center sm:block" :title="t('ins.combined')"><Sparkles class="mx-auto h-3 w-3" /></span>
          <span class="col-label !mb-0 hidden text-right sm:block">{{ t('col.posts') }}</span>
          <span class="col-label !mb-0 hidden text-right sm:block">{{ t('col.updated') }}</span>
          <span />
        </div>
        <div class="divide-y divide-line">
          <div
            v-for="b in batches"
            :key="b.id"
            class="batch-grid group cursor-pointer px-4 py-2.5 transition-colors hover:bg-canvas"
            role="link"
            tabindex="0"
            @click="navigate(`/batch/${b.id}`)"
            @keydown.enter="navigate(`/batch/${b.id}`)"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <PlatformGlyph :platform="b.platform" :size="20" class="shrink-0" />
              <span class="truncate text-[13.5px] font-medium text-ink">{{ b.query }}</span>
              <span class="hidden max-w-[180px] shrink-0 truncate text-[12.5px] text-faint lg:inline">{{ b.source }}</span>
            </div>
            <span class="hidden justify-center sm:flex">
              <Sparkles v-if="b.analysis" class="h-3.5 w-3.5 text-commentgrab-violet" />
            </span>
            <span class="hidden text-right font-mono text-[12.5px] text-ink-soft sm:block">{{ b.collectionIds.length }}</span>
            <span class="hidden text-right text-[12.5px] text-faint sm:block">{{ relativeTime(b.updatedAt) }}</span>
            <span class="flex justify-end text-faint transition-colors group-hover:text-ink"><ChevronRight class="h-4 w-4" /></span>
          </div>
        </div>
      </div>

      <SpEmpty v-else-if="loaded" :icon="Layers" :title="t('batch.nothing')" :description="t('batch.nothingBody')" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import {
  ExternalLink, WandSparkles, Sparkles, Layers, Trash2, ChevronRight,
  FileSpreadsheet, FileJson, FileText,
} from 'lucide-vue-next';
import type { AnalysisResult, AppSettings, BatchRun, ExportFormat, SavedCollection } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings, listBatches, getBatch, upsertBatch, deleteBatch, getCollection, updateCollection, deleteCollection } from '@/shared/storage';
import { platformLabel } from '@/shared/platform';
import { analyzeComments, generateAdAngles } from '@/shared/openai';
import { exportCollectionsCombined, exportAnalysesCombined } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import { relativeTime, reportProblemUrl } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate, pendingRuns, setCrumb } from '../router';
import { combinedSource, type InsightsSource } from '@/shared/insights';
import { estimateRun, sumEstimates } from '@/shared/estimate';
import { confirmRun } from '../confirm';
import { useToast } from '@/ui/composables/useToast';
import SpButton from '@/ui/components/SpButton.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import InsightsPanel from '../components/InsightsPanel.vue';
import TabBar from '../components/TabBar.vue';

const props = defineProps<{ id?: string; tab?: string }>();
const toast = useToast();

const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const batches = ref<BatchRun[]>([]);
const batch = ref<BatchRun | null>(null);
const rows = ref<SavedCollection[]>([]);
const selected = reactive<Record<string, boolean>>({});

const analyzing = ref(false);
const analyzeDone = ref(0);
const analyzeTotal = ref(0);
const withAngles = ref(false);
const exporting = ref(false);
const loaded = ref(false);
const panel = ref<InstanceType<typeof InsightsPanel> | null>(null);

const activeTab = computed(() => (props.tab === 'insights' ? 'insights' : 'posts'));
const totalComments = computed(() => rows.value.reduce((n, c) => n + (c.commentCount || 0), 0));

const selectedRows = computed(() => rows.value.filter((c) => selected[c.id]));
const someSelected = computed(() => selectedRows.value.length > 0);
const allSelected = computed(() => rows.value.length > 0 && rows.value.every((c) => selected[c.id]));
const analyzedCount = computed(() => selectedRows.value.filter((c) => c.analysis).length);

function toggle(id: string, on: boolean): void {
  selected[id] = on;
}
function toggleAll(on: boolean): void {
  rows.value.forEach((c) => (selected[c.id] = on));
}

async function load(): Promise<void> {
  loaded.value = false;
  settings.value = await getSettings();
  if (props.id) {
    batch.value = (await getBatch(props.id)) ?? null;
    for (const k of Object.keys(selected)) delete selected[k];
    if (batch.value) {
      const loaded = await Promise.all(batch.value.collectionIds.map((cid) => getCollection(cid)));
      rows.value = loaded.filter((c): c is SavedCollection => !!c);
    } else {
      rows.value = [];
    }
    if (batch.value) setCrumb(`/batch/${props.id}`, batch.value.query);
  } else {
    batches.value = await listBatches();
  }
  loaded.value = true;
}

async function maybeAutoRun(): Promise<void> {
  if (!props.id || activeTab.value !== 'insights' || !pendingRuns.has(props.id)) return;
  pendingRuns.delete(props.id);
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
  navigate(tab === 'insights' ? `/batch/${props.id}/insights` : `/batch/${props.id}`);
}

function analyzeCombined(): void {
  if (!props.id) return;
  pendingRuns.add(props.id);
  if (activeTab.value === 'insights') void maybeAutoRun();
  else setTab('insights');
}

function loadSource(): Promise<InsightsSource> {
  return combinedSource(batch.value?.query ?? 'batch', rows.value.map((c) => c.id), getCollection);
}

async function saveAnalysis(a: AnalysisResult): Promise<void> {
  if (!batch.value) return;
  batch.value = { ...batch.value, analysis: a };
  await upsertBatch(batch.value);
}

/** A post needs work if it isn't analyzed, or angles are on and it has none yet. */
function needsAnalysis(c: SavedCollection): boolean {
  if (!c.analysis) return true;
  return withAngles.value && !c.analysis.adAngles?.length;
}

async function analyzeSelected(): Promise<void> {
  if (!settings.value.openAiKey) {
    toast.error(t('batch.needKey'));
    navigate('/settings');
    return;
  }
  const targets = selectedRows.value.filter(needsAnalysis);
  if (!targets.length) {
    toast.success(t('batch.analyzeDone', { count: selectedRows.value.length }));
    return;
  }
  const opts = {
    apiKey: settings.value.openAiKey,
    model: settings.value.openAiModel,
    instructions: settings.value.analysisInstructions,
  };
  // One confirm for the whole set: every analysis (and angles pass) it will send.
  const estimates = targets.flatMap((c) => {
    const list = [];
    if (!c.analysis) list.push(estimateRun('analysis', c.comments, c.post, opts));
    if (withAngles.value && !c.analysis?.adAngles?.length) list.push(estimateRun('angles', c.comments, c.post, { ...opts, prior: c.analysis ?? null }));
    return list;
  });
  const total = sumEstimates(estimates);
  if (total && !(await confirmRun(total))) return;
  analyzing.value = true;
  analyzeTotal.value = targets.length;
  analyzeDone.value = 0;
  let ok = 0;
  for (const c of targets) {
    try {
      let analysis = c.analysis ?? (await analyzeComments(c.comments, c.post, opts));
      // Optionally generate ad angles in the same pass (extra tokens per post).
      if (withAngles.value && !analysis.adAngles?.length) {
        const res = await generateAdAngles(c.comments, c.post, analysis, opts);
        analysis = {
          ...analysis,
          adAngles: res.adAngles,
          tokensIn: (analysis.tokensIn ?? 0) + res.tokensIn,
          tokensOut: (analysis.tokensOut ?? 0) + res.tokensOut,
        };
      }
      await updateCollection(c.id, { analysis });
      c.analysis = analysis; // reflect in the row immediately
      ok++;
    } catch (e) {
      const msg = (e as Error).message || 'Analysis failed.';
      toast.errorWithReport(msg, reportProblemUrl({ where: 'dashboard', platform: c.platform, error: msg, page: c.url }));
    }
    analyzeDone.value++;
  }
  analyzing.value = false;
  if (ok) toast.success(t('batch.analyzeDone', { count: ok }));
}

async function exportSelected(format: ExportFormat): Promise<void> {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const name = batch.value?.query || 'batch';
    const res = await exportCollectionsCombined(format, selectedRows.value, settings.value.export, name);
    if (res.ok) {
      await recordExport(format, 1);
      toast.success(t('batch.exported', { count: res.count }));
    } else {
      toast.errorWithReport('Export failed.', reportProblemUrl({ where: 'dashboard', platform: batch.value?.platform, error: 'Export failed.', page: batch.value?.url }));
    }
  } finally {
    exporting.value = false;
  }
}

/** Export the AI analyses of the selected posts as one combined file. */
async function exportAnalyses(format: 'markdown' | 'json'): Promise<void> {
  if (exporting.value) return;
  if (!analyzedCount.value) {
    toast.error(t('batch.noAnalyses'));
    return;
  }
  exporting.value = true;
  try {
    const name = batch.value?.query || 'batch';
    const res = await exportAnalysesCombined(format, selectedRows.value, name);
    if (res.ok) {
      await recordExport(format, 1);
      toast.success(t('batch.analysesExported', { count: res.count }));
    } else {
      toast.error(t('batch.noAnalyses'));
    }
  } finally {
    exporting.value = false;
  }
}

async function deleteSelected(): Promise<void> {
  if (!batch.value) return;
  const ids = selectedRows.value.map((c) => c.id);
  for (const cid of ids) await deleteCollection(cid).catch(() => {});
  const remaining = batch.value.collectionIds.filter((cid) => !ids.includes(cid));
  batch.value = { ...batch.value, collectionIds: remaining };
  await upsertBatch(batch.value);
  ids.forEach((cid) => delete selected[cid]);
  rows.value = rows.value.filter((c) => !ids.includes(c.id));
  toast.success('Deleted');
}

async function removeBatch(): Promise<void> {
  if (!batch.value) return;
  await deleteBatch(batch.value.id, { withCollections: true });
  toast.success('Batch deleted');
  navigate('/batch');
}
</script>

<style scoped>
.cg-check {
  height: 15px;
  width: 15px;
  cursor: pointer;
  accent-color: #6d5ef6;
}
.post-grid {
  display: grid;
  grid-template-columns: 16px 20px minmax(0, 1fr) 72px 40px;
  align-items: center;
  column-gap: 12px;
}
@media (min-width: 640px) {
  .post-grid {
    grid-template-columns: 16px 20px minmax(0, 1fr) 24px 84px 40px;
  }
}
.batch-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px;
  align-items: center;
  column-gap: 12px;
}
@media (min-width: 640px) {
  .batch-grid {
    grid-template-columns: minmax(0, 1fr) 24px 64px 96px 24px;
  }
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
.batch-fmt {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: rgb(var(--cg-ink));
  background: rgb(var(--cg-surface));
  transition: background-color 0.14s ease;
}
.batch-fmt:hover:not(:disabled) {
  background: rgb(var(--cg-canvas-2));
}
.batch-fmt:disabled {
  opacity: 0.5;
  cursor: default;
}
.cg-slide-up-enter-active,
.cg-slide-up-leave-active {
  transition: all 0.2s ease;
}
.cg-slide-up-enter-from,
.cg-slide-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
