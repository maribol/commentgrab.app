<template>
  <div
    v-if="visible"
    class="fixed bottom-[16px] z-[2147483000] font-sans"
    :class="widgetState.position === 'bottom-right' ? 'right-[16px]' : 'left-[16px]'"
    @click.stop
  >
    <!-- Expanded panel -->
    <Transition name="panel">
      <div
        v-if="open"
        class="relative mb-[12px] w-[336px] overflow-hidden rounded-[18px] border border-black/[0.07] bg-white text-ink-900 shadow-widget"
      >
        <!-- header -->
        <div class="flex items-center justify-between border-b border-black/[0.06] px-[16px] py-[12px]">
          <div class="flex items-center gap-[8px]">
            <BrandMark :size="28" />
            <span class="text-[15px] font-bold tracking-tight"><span class="commentgrab-text">CommentGrab</span></span>
          </div>
          <div class="flex items-center gap-[2px]">
            <button class="rounded-[8px] p-[6px] text-ink-400 outline-none transition hover:bg-black/[0.05] hover:text-ink-700" :title="t('common.minimize')" @click="open = false">
              <ChevronDown class="h-[16px] w-[16px]" />
            </button>
            <button class="rounded-[8px] p-[6px] text-ink-400 outline-none transition hover:bg-black/[0.05] hover:text-ink-700" :title="t('common.hide')" @click="hidden = true">
              <X class="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>

        <ProductHuntBanner compact />

        <!-- detected -->
        <div class="flex items-start gap-[12px] px-[16px] pb-[12px] pt-[14px]">
          <PlatformGlyph :platform="platform!" :size="38" />
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{{ platformLabel(platform!) }}</div>
            <div class="line-clamp-2 text-[14px] font-medium leading-snug text-ink-900">{{ widgetState.pageTitle }}</div>
          </div>
        </div>

        <!-- body -->
        <div class="px-[16px] pb-[16px]">
          <!-- idle -->
          <template v-if="status === 'idle'">
            <button class="flex w-full items-center justify-center gap-[8px] rounded-[12px] bg-ink-900 py-[11px] text-[14px] font-semibold text-white outline-none transition hover:bg-ink-700 active:scale-[0.99]" @click="doScrape()">
              <Sparkles class="h-[16px] w-[16px]" />
              <span>{{ t('pop.scrape', { unit }) }}</span>
            </button>
            <p class="mt-[8px] text-center text-[11px] text-ink-400">Runs on this page · stays on your device</p>
          </template>

          <!-- scraping -->
          <template v-else-if="status === 'scraping'">
            <div class="flex items-center gap-[8px] text-[14px] font-medium text-ink-700">
              <Loader2 class="h-[16px] w-[16px] animate-spin-slow text-commentgrab-violet" />
              <span class="truncate">{{ progress.message || t('pop.working') }}</span>
            </div>
            <div class="mt-[10px]">
              <SpProgress :value="progress.percent" :indeterminate="progress.percent <= 5" />
            </div>
            <button
              class="mt-[12px] flex w-full items-center justify-center gap-[6px] rounded-[12px] border border-black/[0.1] bg-white py-[9px] text-[13px] font-semibold text-ink-700 outline-none transition hover:bg-slate-50 disabled:opacity-50"
              :disabled="stopping"
              @click="stop()"
            >
              <Square class="h-[14px] w-[14px]" />
              <span>{{ stopping ? t('pop.stopping') : t('pop.stopKeep') }}</span>
            </button>
          </template>

          <!-- done -->
          <template v-else-if="status === 'done' && result">
            <div class="mb-[12px] flex items-baseline gap-[8px]">
              <span class="text-[24px] font-bold tracking-tight commentgrab-text">{{ result.comments.length.toLocaleString() }}</span>
              <span class="text-[14px] text-ink-500">{{ t('pop.ready', { unit }) }}</span>
            </div>

            <div class="grid grid-cols-4 gap-[8px]">
              <button
                v-for="f in formats"
                :key="f.id"
                class="flex flex-col items-center gap-[5px] rounded-[12px] border border-black/[0.08] bg-white py-[10px] text-[11px] font-semibold text-ink-700 outline-none transition hover:border-commentgrab-violet/45 hover:bg-violet-50 hover:text-commentgrab-violet"
                @click="exportAs(f.id)"
              >
                <component :is="f.icon" class="h-[18px] w-[18px]" />
                <span>{{ f.label }}</span>
              </button>
            </div>

            <div class="mt-[10px] grid grid-cols-2 gap-[8px]">
              <button
                class="inline-flex w-full items-center justify-center gap-[6px] rounded-[12px] border py-[9px] text-[13px] font-semibold outline-none transition"
                :class="savedId
                  ? 'border-emerald-500/35 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-black/[0.08] bg-white text-ink-700 hover:bg-slate-50'"
                @click="openPicker('save')"
              >
                <component :is="savedId ? BookmarkCheck : Bookmark" class="h-[16px] w-[16px]" />
                <span>{{ savedId ? t('common.saved') : t('common.save') }}</span>
              </button>
              <button class="inline-flex items-center justify-center gap-[6px] rounded-[12px] border border-black/[0.08] bg-white py-[9px] text-[13px] font-semibold text-ink-700 outline-none transition hover:bg-slate-50" @click="analyze()">
                <Wand class="h-[16px] w-[16px]" />
                <span>{{ t('common.analyze') }}</span>
              </button>
            </div>

            <div class="mt-[10px] flex items-center justify-center gap-[14px] text-[12px] font-medium">
              <button v-if="savedId" class="flex items-center gap-[6px] text-commentgrab-violet outline-none transition hover:underline" @click="openDashboard(`/saved/${savedId}`)">
                <ExternalLink class="h-[12px] w-[12px]" />
                <span>{{ t('common.openInDashboard') }}</span>
              </button>
              <button class="flex items-center gap-[6px] text-ink-400 outline-none transition hover:text-ink-700" @click="doScrape()">
                <RefreshCw class="h-[12px] w-[12px]" />
                <span>{{ t('common.rescrape') }}</span>
              </button>
            </div>
          </template>

          <!-- error -->
          <template v-else-if="status === 'error'">
            <div class="flex items-start gap-[8px] rounded-[12px] bg-rose-50 px-[12px] py-[10px] text-[14px] text-rose-700">
              <AlertCircle class="mt-[2px] h-[16px] w-[16px] shrink-0" />
              <span>{{ error }}</span>
            </div>
            <button class="mt-[10px] flex w-full items-center justify-center gap-[6px] rounded-[12px] border border-black/[0.08] bg-white py-[10px] text-[14px] font-semibold text-ink-700 outline-none transition hover:bg-slate-50" @click="doScrape()">
              <RefreshCw class="h-[16px] w-[16px]" />
              <span>{{ t('pop.tryAgain') }}</span>
            </button>
          </template>

          <!-- inline flash -->
          <Transition name="panel">
            <div v-if="flashMsg" class="mt-[10px] flex items-center gap-[6px] text-[12px] font-medium" :class="flashErr ? 'text-rose-600' : 'text-emerald-600'">
              <CheckCircle2 v-if="!flashErr" class="h-[14px] w-[14px]" />
              <AlertCircle v-else class="h-[14px] w-[14px]" />
              <span>{{ flashMsg }}</span>
            </div>
          </Transition>
        </div>

        <!-- footer -->
        <div class="flex items-center justify-between border-t border-black/[0.06] bg-slate-50/70 px-[16px] py-[10px]">
          <button class="flex items-center gap-[6px] text-[12px] font-medium text-ink-500 outline-none transition hover:text-ink-900" @click="openDashboard()">
            <LayoutDashboard class="h-[14px] w-[14px]" />
            <span>{{ t('common.dashboard') }}</span>
          </button>
          <span class="flex items-center gap-[4px] text-[11px] text-ink-300">
            <Lock class="h-[12px] w-[12px]" />
            {{ t('pop.localOnly') }}
          </span>
        </div>

        <!-- board picker overlay -->
        <div
          v-if="boardPickerOpen"
          class="absolute inset-0 z-30 flex items-center justify-center bg-ink-900/25 p-[16px]"
          @click.self="boardPickerOpen = false"
        >
          <div class="w-full max-w-[280px]">
            <BoardPicker ref="picker" v-model="pickedBoards" />
            <button class="mt-[8px] flex w-full items-center justify-center gap-[6px] rounded-[12px] bg-ink-900 px-[12px] py-[9px] text-[13px] font-semibold text-white transition hover:bg-ink-700" @click="confirmSave()">
              <Wand v-if="pickerMode === 'analyze'" class="h-[15px] w-[15px]" />
              {{ pickerMode === 'analyze' ? t('common.saveAndAnalyze') : savedId ? t('common.updateBoards') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Collapsed launcher -->
    <button
      v-if="!open"
      class="group flex items-center gap-[8px] rounded-full bg-ink-900 py-[10px] pl-[10px] pr-[16px] text-white shadow-widget outline-none transition hover:bg-ink-700 active:scale-95"
      @click="open = true"
    >
      <BrandMark :size="24" />
      <span class="text-[14px] font-semibold">Export {{ unit }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  Sparkles,
  ChevronDown,
  X,
  Loader2,
  Square,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Lock,
  ExternalLink,
  FileSpreadsheet,
  FileJson,
  FileText,
  Copy,
  WandSparkles as Wand,
} from 'lucide-vue-next';
import type { AppSettings, ExportFormat, ScrapeResult } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { PLATFORM_META, platformLabel, usesBackgroundFetch } from '@/shared/platform';
import { getSettings, setAutoAnalyze, updateCollection } from '@/shared/storage';
import { onProgress, openDashboardTab, cancelBackgroundScrape } from '@/shared/messaging';
import { t } from '@/shared/i18n';
import { finalizeScrape, saveAndLink } from '@/shared/scrape';
import { exportComments } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import SpProgress from '@/ui/components/SpProgress.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import BrandMark from '@/ui/components/BrandMark.vue';
import ProductHuntBanner from '@/ui/components/ProductHuntBanner.vue';
import BoardPicker from '@/ui/components/BoardPicker.vue';
import { widgetState } from '../state';
import { scrapeLocal } from '../scrape-local';

const open = ref(false);
const hidden = ref(false);
const status = ref<'idle' | 'scraping' | 'done' | 'error'>('idle');
const progress = reactive({ message: '', percent: 0 });
const result = ref<ScrapeResult | null>(null);
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const savedId = ref<string | null>(null);
const boardPickerOpen = ref(false);
const pickerMode = ref<'save' | 'analyze'>('save');
const pickedBoards = ref<string[]>([]);
const picker = ref<{ flush: () => Promise<void> } | null>(null);
const historyId = ref<string | null>(null);
const stopping = ref(false);
const error = ref('');
const flashMsg = ref('');
const flashErr = ref(false);

const platform = computed(() => widgetState.platform);
const visible = computed(() => !hidden.value && widgetState.enabled && !!platform.value);
const unit = computed(() => (platform.value ? PLATFORM_META[platform.value].unit : 'comments'));

const formats: Array<{ id: ExportFormat; label: string; icon: typeof FileSpreadsheet }> = [
  { id: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { id: 'json', label: 'JSON', icon: FileJson },
  { id: 'markdown', label: 'MD', icon: FileText },
  { id: 'clipboard', label: 'Copy', icon: Copy },
];

/** Progress only ever moves forward within a scrape, so the bar never jumps back. */
function bumpProgress(message: string, percent: number): void {
  if (status.value !== 'scraping') return;
  progress.message = message;
  progress.percent = Math.max(progress.percent, percent);
}

let unsub: (() => void) | undefined;
onMounted(async () => {
  settings.value = await getSettings();
  unsub = onProgress((p) => bumpProgress(p.message, p.percent));
});
onUnmounted(() => unsub?.());

watch(
  () => widgetState.url,
  () => {
    result.value = null;
    status.value = 'idle';
    savedId.value = null;
    historyId.value = null;
    error.value = '';
    progress.message = '';
    progress.percent = 0;
  },
);

function flash(message: string, isError = false): void {
  flashMsg.value = message;
  flashErr.value = isError;
  window.setTimeout(() => (flashMsg.value = ''), 2600);
}

async function doScrape(): Promise<ScrapeResult | null> {
  if (!platform.value) return null;
  status.value = 'scraping';
  stopping.value = false;
  widgetState.stopRequested = false;
  error.value = '';
  savedId.value = null;
  historyId.value = null;
  progress.percent = 0;
  progress.message = 'Starting…';
  const res = await scrapeLocal(
    platform.value,
    widgetState.url,
    { maxComments: 1200, expandReplies: true },
    bumpProgress,
    () => widgetState.stopRequested,
  );
  if (res.success) {
    result.value = res;
    status.value = 'done';
    try {
      const fin = await finalizeScrape(res, widgetState.url, settings.value);
      historyId.value = fin.historyId ?? null;
      if (fin.collectionId) savedId.value = fin.collectionId;
    } catch {
      flash('Saved scrape, but logging history failed', true);
    }
  } else {
    status.value = 'error';
    error.value = res.error || 'Scrape failed.';
  }
  stopping.value = false;
  return res.success ? res : null;
}

/** Ask the in-flight scrape to stop and keep whatever it has collected. */
function stop(): void {
  stopping.value = true;
  widgetState.stopRequested = true;
  // Background scrapes (reddit/HN/steam) run in the service worker.
  if (platform.value && usesBackgroundFetch(platform.value)) cancelBackgroundScrape();
}

async function ensureResult(): Promise<ScrapeResult | null> {
  if (result.value?.success) return result.value;
  return doScrape();
}

async function exportAs(format: ExportFormat): Promise<void> {
  const res = await ensureResult();
  if (!res) return;
  const outcome = await exportComments(format, res.comments, res.post, settings.value.export, res.platform);
  if (outcome.ok) {
    await recordExport(format, 1);
    flash(format === 'clipboard' ? 'Copied to clipboard' : `Exported ${outcome.count.toLocaleString()} ${unit.value}`);
  } else {
    flash('Export failed', true);
  }
}

function openPicker(mode: 'save' | 'analyze'): void {
  pickerMode.value = mode;
  pickedBoards.value = savedId.value ? pickedBoards.value : [];
  boardPickerOpen.value = true;
}

async function confirmSave(): Promise<void> {
  const res = await ensureResult();
  if (!res) return;
  await picker.value?.flush(); // commit a half-typed board name
  try {
    let id = savedId.value;
    if (id) {
      await updateCollection(id, { boardIds: pickedBoards.value });
    } else {
      const col = await saveAndLink(res, widgetState.url, historyId.value, pickedBoards.value);
      id = col.id;
      savedId.value = id;
    }
    boardPickerOpen.value = false;
    if (pickerMode.value === 'analyze') {
      await setAutoAnalyze(id);
      openDashboard(`/analyze/${id}`);
    } else {
      flash(savedId.value ? `Saved ${res.comments.length.toLocaleString()} ${unit.value} to your library` : 'Boards updated');
    }
  } catch {
    flash('Could not save — local storage may be full', true);
  }
}

async function analyze(): Promise<void> {
  const res = await ensureResult();
  if (!res) return;
  // Already saved: skip the board picker and go straight to analysis.
  if (savedId.value) {
    await setAutoAnalyze(savedId.value);
    openDashboard(`/analyze/${savedId.value}`);
    return;
  }
  openPicker('analyze');
}

function openDashboard(path = ''): void {
  openDashboardTab(path);
}
</script>
