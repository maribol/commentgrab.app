<template>
  <div class="animate-fade-up">
    <!-- ===================== DETAIL ===================== -->
    <template v-if="id">
      <button class="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900" @click="navigate('/batch')">
        <ArrowLeft class="h-4 w-4" /> {{ t('batch.allPosts') }}
      </button>

      <div v-if="batch">
        <div class="flex items-start gap-4">
          <PlatformGlyph :platform="batch.platform" :size="48" />
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-bold leading-tight tracking-tight text-ink-900">{{ batch.query }}</h1>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
              <span>{{ batch.source }}</span>
              <span>· {{ rows.length }} {{ t('batch.posts') }}</span>
              <span>· {{ relativeTime(batch.createdAt) }}</span>
              <a v-if="batch.url" :href="batch.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-medium text-commentgrab-violet hover:underline">
                {{ t('batch.openList') }} <ExternalLink class="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <button class="btn-ghost h-9 w-9 rounded-lg p-0 hover:!text-rose-600" :title="t('batch.deleteWithPosts')" @click="removeBatch()">
            <Trash2 class="h-4 w-4" />
          </button>
        </div>

        <!-- table -->
        <SpCard class="mt-5 !p-0 overflow-hidden">
          <div class="flex items-center gap-3 border-b border-black/[0.06] px-4 py-2.5 text-xs font-semibold text-ink-500">
            <input type="checkbox" class="cg-check" :checked="allSelected" :indeterminate.prop="someSelected && !allSelected" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
            <span>{{ t('batch.selectAll') }}</span>
            <span class="ml-auto">{{ t('common.comments') }}</span>
          </div>

          <div
            v-for="(c, i) in rows"
            :key="c.id"
            class="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3 transition last:border-0 hover:bg-slate-50/70"
            :class="selected[c.id] ? 'bg-commentgrab-soft/40' : ''"
          >
            <input type="checkbox" class="cg-check" :checked="!!selected[c.id]" @change="toggle(c.id, ($event.target as HTMLInputElement).checked)" />
            <span class="w-5 shrink-0 text-right text-xs font-semibold text-ink-300">{{ i + 1 }}</span>
            <div class="min-w-0 flex-1">
              <button class="line-clamp-1 text-left text-sm font-semibold text-ink-900 transition hover:text-commentgrab-violet" @click="navigate(`/saved/${c.id}`)">
                {{ c.title }}
              </button>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                <span>{{ c.source || platformLabel(c.platform) }}</span>
                <span v-if="c.analysis" class="inline-flex items-center gap-1 text-commentgrab-violet" :title="t('an.analyzedLabel')"><Sparkles class="h-3 w-3" /> {{ t('an.analyzedLabel') }}</span>
              </div>
            </div>
            <span class="shrink-0 text-sm font-semibold text-ink-700">{{ c.commentCount.toLocaleString() }}</span>
            <button class="btn-ghost h-8 w-8 rounded-lg p-0" :title="t('common.analyze')" @click="navigate(`/analyze/${c.id}`)">
              <WandSparkles class="h-4 w-4" />
            </button>
          </div>

          <SpEmpty v-if="!rows.length" :icon="Layers" :title="t('common.notFound')" :description="t('common.notFoundBody')" class="py-10" />
        </SpCard>
      </div>

      <SpEmpty v-else :icon="Layers" :title="t('common.notFound')" :description="t('common.notFoundBody')" />

      <!-- sticky bulk bar — centered within the content column -->
      <Transition name="cg-slide-up">
        <div v-if="selectedRows.length" class="pointer-events-none sticky bottom-5 z-30 mt-6 flex justify-center">
          <div class="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xl">
            <span class="px-1.5 text-sm font-semibold text-ink-700">{{ t('batch.selected', { count: selectedRows.length }) }}</span>
            <SpButton size="sm" :icon="Sparkles" :loading="analyzing" @click="analyzeSelected()">
              {{ analyzing ? t('batch.analyzing', { done: analyzeDone, total: analyzeTotal }) : t('batch.analyzeSelected') }}
            </SpButton>
            <div class="flex items-center gap-1 rounded-xl border border-black/[0.08] bg-white px-1.5 py-1">
              <span class="px-1 text-xs font-semibold text-ink-400">{{ t('batch.exportSelected') }}</span>
              <button class="batch-fmt" :disabled="exporting" @click="exportSelected('csv')"><FileSpreadsheet class="h-3.5 w-3.5" /> CSV</button>
              <button class="batch-fmt" :disabled="exporting" @click="exportSelected('json')"><FileJson class="h-3.5 w-3.5" /> JSON</button>
              <button class="batch-fmt" :disabled="exporting" @click="exportSelected('markdown')"><FileText class="h-3.5 w-3.5" /> MD</button>
            </div>
            <button class="btn-ghost h-8 rounded-lg px-2 text-xs font-semibold hover:!text-rose-600" @click="deleteSelected()">
              <Trash2 class="h-3.5 w-3.5" /> {{ t('batch.deleteSelected') }}
            </button>
          </div>
        </div>
      </Transition>
    </template>

    <!-- ===================== LIST ===================== -->
    <template v-else>
      <header class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('batch.title') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('batch.subtitle') }}</p>
      </header>

      <div v-if="batches.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="b in batches"
          :key="b.id"
          class="group flex flex-col rounded-2xl border border-black/[0.07] bg-white p-4 text-left transition hover:border-black/[0.16] hover:shadow-sm"
          @click="navigate(`/batch/${b.id}`)"
        >
          <div class="flex items-start gap-3">
            <PlatformGlyph :platform="b.platform" :size="40" />
            <div class="min-w-0 flex-1">
              <div class="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{{ b.query }}</div>
              <div class="mt-0.5 truncate text-xs text-ink-400">{{ b.source }}</div>
            </div>
            <Layers class="h-4 w-4 shrink-0 text-ink-300" />
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-black/[0.05] pt-3 text-xs">
            <span class="font-semibold text-ink-700">{{ b.collectionIds.length }} {{ t('batch.posts') }}</span>
            <span class="text-ink-400">{{ relativeTime(b.updatedAt) }}</span>
          </div>
        </button>
      </div>

      <SpEmpty v-else :icon="Layers" :title="t('batch.nothing')" :description="t('batch.nothingBody')" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  ArrowLeft, ExternalLink, WandSparkles, Sparkles, Layers, Trash2,
  FileSpreadsheet, FileJson, FileText,
} from 'lucide-vue-next';
import type { AppSettings, BatchRun, ExportFormat, SavedCollection } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings, listBatches, getBatch, upsertBatch, deleteBatch, getCollection, updateCollection, deleteCollection } from '@/shared/storage';
import { platformLabel } from '@/shared/platform';
import { analyzeComments } from '@/shared/openai';
import { exportCollectionsCombined } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import { relativeTime } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';

const props = defineProps<{ id?: string }>();
const toast = useToast();

const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const batches = ref<BatchRun[]>([]);
const batch = ref<BatchRun | null>(null);
const rows = ref<SavedCollection[]>([]);
const selected = reactive<Record<string, boolean>>({});

const analyzing = ref(false);
const analyzeDone = ref(0);
const analyzeTotal = ref(0);
const exporting = ref(false);

const selectedRows = computed(() => rows.value.filter((c) => selected[c.id]));
const someSelected = computed(() => selectedRows.value.length > 0);
const allSelected = computed(() => rows.value.length > 0 && rows.value.every((c) => selected[c.id]));

function toggle(id: string, on: boolean): void {
  selected[id] = on;
}
function toggleAll(on: boolean): void {
  rows.value.forEach((c) => (selected[c.id] = on));
}

async function load(): Promise<void> {
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
  } else {
    batches.value = await listBatches();
  }
}

watch(() => props.id, load, { immediate: true });

async function analyzeSelected(): Promise<void> {
  if (!settings.value.openAiKey) {
    toast.error(t('batch.needKey'));
    navigate('/settings');
    return;
  }
  const targets = selectedRows.value.filter((c) => !c.analysis);
  if (!targets.length) {
    toast.success(t('batch.analyzeDone', { count: selectedRows.value.length }));
    return;
  }
  analyzing.value = true;
  analyzeTotal.value = targets.length;
  analyzeDone.value = 0;
  let ok = 0;
  for (const c of targets) {
    try {
      const result = await analyzeComments(c.comments, c.post, {
        apiKey: settings.value.openAiKey,
        model: settings.value.openAiModel,
        instructions: settings.value.analysisInstructions,
      });
      await updateCollection(c.id, { analysis: result });
      c.analysis = result; // reflect in the row immediately
      ok++;
    } catch (e) {
      toast.error((e as Error).message || 'Analysis failed.');
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
      toast.error('Export failed.');
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
  accent-color: #7c3aed;
}
.batch-fmt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 0.55rem;
  padding: 0.3rem 0.5rem;
  font-size: 11px;
  font-weight: 600;
  color: #1e2435;
  transition: all 0.15s ease;
}
.batch-fmt:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.08);
  color: #7c3aed;
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
