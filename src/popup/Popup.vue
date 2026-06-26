<template>
  <div class="commentgrab-bg relative flex w-[384px] flex-col font-sans text-ink-900">
    <!-- header -->
    <header class="flex items-center justify-between px-5 pt-4">
      <div class="flex items-center gap-2">
        <BrandMark :size="28" class="shadow-glow" />
        <div class="leading-none">
          <div class="text-[15px] font-bold tracking-tight"><span class="commentgrab-text">CommentGrab</span></div>
          <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">{{ t('nav.commentExporter') }}</div>
        </div>
      </div>
      <button class="btn-ghost h-8 rounded-lg px-2.5 text-xs font-semibold" :title="t('common.openDashboardTip')" @click="openDashboard()">
        <LayoutDashboard class="h-4 w-4" />
        <span>{{ t('common.dashboard') }}</span>
      </button>
    </header>

    <main class="px-5 py-4">
      <!-- detected / unsupported -->
      <SpCard v-if="platform" class="!p-4">
        <div class="flex items-start gap-3">
          <PlatformGlyph :platform="platform" :size="40" />
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('pop.detected', { platform: platformLabel(platform) }) }}</div>
            <div class="line-clamp-2 text-sm font-medium leading-snug text-ink-900">{{ pageTitle }}</div>
          </div>
        </div>

        <!-- idle -->
        <template v-if="status === 'idle'">
          <div v-if="existing" class="mt-3 flex items-center justify-between rounded-xl bg-commentgrab-soft px-3 py-2 text-xs">
            <span class="font-semibold text-commentgrab-violet">{{ t('pop.savedUnit', { count: existing.commentCount.toLocaleString(), unit }) }}</span>
            <button class="font-semibold text-commentgrab-violet hover:underline" @click="openDashboard(`/saved/${existing.id}`)">{{ t('common.open') }}</button>
          </div>
          <SpButton class="mt-3 w-full" :icon="existing ? RefreshCw : Sparkles" @click="scrape()">{{ existing ? t('common.rescrape') : t('pop.scrape', { unit }) }}</SpButton>
        </template>

        <!-- scraping -->
        <template v-else-if="status === 'scraping'">
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-ink-700">
            <Loader2 class="h-4 w-4 animate-spin-slow text-commentgrab-violet" />
            <span class="truncate">{{ progress.message || t('pop.working') }}</span>
          </div>
          <SpProgress class="mt-2.5" :value="progress.percent" :indeterminate="progress.percent <= 5" />
          <SpButton variant="secondary" size="sm" class="mt-3 w-full" :icon="Square" :disabled="stopping" @click="stop()">
            {{ stopping ? t('pop.stopping') : t('pop.stopKeep') }}
          </SpButton>
        </template>

        <!-- done -->
        <template v-else-if="status === 'done' && result">
          <div class="mt-4 mb-3 flex items-baseline gap-2">
            <span class="text-3xl font-bold tracking-tight commentgrab-text">{{ result.comments.length.toLocaleString() }}</span>
            <span class="text-sm text-ink-500">{{ t('pop.ready', { unit }) }}</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button v-for="f in formats" :key="f.id" class="export-chip" @click="exportAs(f.id)">
              <component :is="f.icon" class="h-[18px] w-[18px]" />
              <span>{{ f.label }}</span>
            </button>
          </div>
          <div class="mt-2.5 grid grid-cols-2 gap-2">
            <button class="action-btn" :class="savedId ? 'action-btn--saved' : ''" @click="openPicker('save')">
              <component :is="savedId ? BookmarkCheck : Bookmark" class="h-4 w-4" />
              <span>{{ savedId ? t('common.saved') : t('common.save') }}</span>
            </button>
            <button class="action-btn" @click="analyze()">
              <WandSparkles class="h-4 w-4" />
              <span>{{ t('common.analyze') }}</span>
            </button>
          </div>
          <div class="mt-2.5 flex items-center justify-center gap-4 text-xs font-medium">
            <button v-if="savedId" class="flex items-center gap-1.5 text-commentgrab-violet transition hover:underline" @click="openDashboard(`/saved/${savedId}`)">
              <ExternalLink class="h-3 w-3" /> {{ t('common.openInDashboard') }}
            </button>
            <button class="flex items-center gap-1.5 text-ink-400 transition hover:text-ink-700" @click="scrape()">
              <RefreshCw class="h-3 w-3" /> {{ t('common.rescrape') }}
            </button>
          </div>
        </template>

        <!-- error -->
        <template v-else-if="status === 'error'">
          <div class="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
            <span>{{ error }}</span>
          </div>
          <SpButton variant="secondary" class="mt-2.5 w-full" :icon="RefreshCw" @click="scrape()">{{ t('pop.tryAgain') }}</SpButton>
        </template>
      </SpCard>

      <!-- unsupported -->
      <div v-else>
        <SpEmpty
          :icon="Compass"
          :title="t('pop.noComments')"
          :description="t('pop.noCommentsBody')"
        />
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div v-for="p in supported" :key="p.id" class="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2">
            <PlatformGlyph :platform="p.id" :size="26" />
            <span class="text-xs font-medium text-ink-700">{{ p.label }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- footer: mini stats -->
    <footer class="mt-auto grid grid-cols-3 gap-px border-t border-black/5 bg-black/5 text-center">
      <div class="bg-white px-3 py-3">
        <div class="text-lg font-bold text-ink-900">{{ formatNumber(stats.totalComments) }}</div>
        <div class="text-[10px] font-medium uppercase tracking-wide text-ink-400">{{ t('pop.statComments') }}</div>
      </div>
      <div class="bg-white px-3 py-3">
        <div class="text-lg font-bold text-ink-900">{{ formatNumber(stats.totalScrapes) }}</div>
        <div class="text-[10px] font-medium uppercase tracking-wide text-ink-400">{{ t('pop.statScrapes') }}</div>
      </div>
      <button class="bg-white px-3 py-3 transition hover:bg-slate-50" @click="openDashboard('/saved')">
        <div class="text-lg font-bold commentgrab-text">{{ formatNumber(savedCount) }}</div>
        <div class="text-[10px] font-medium uppercase tracking-wide text-ink-400">{{ t('pop.statSaved') }}</div>
      </button>
    </footer>

    <!-- board picker overlay -->
    <div
      v-if="boardPickerOpen"
      class="absolute inset-0 z-30 flex items-center justify-center bg-ink-900/25 p-5"
      @click.self="boardPickerOpen = false"
    >
      <div class="w-full max-w-[300px]">
        <BoardPicker ref="picker" v-model="pickedBoards" />
        <button class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700" @click="confirmSave()">
          <WandSparkles v-if="pickerMode === 'analyze'" class="h-4 w-4" />
          {{ pickerMode === 'analyze' ? t('common.saveAndAnalyze') : savedId ? t('common.updateBoards') : t('common.save') }}
        </button>
      </div>
    </div>

    <SpToaster />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import {
  Sparkles, LayoutDashboard, Loader2, Square, Bookmark, BookmarkCheck, RefreshCw, AlertCircle, Compass,
  FileSpreadsheet, FileJson, FileText, Copy, WandSparkles, ExternalLink,
} from 'lucide-vue-next';
import type { AppSettings, ExportFormat, PlatformId, ScrapeResult, SavedCollection, Stats } from '@/shared/types';
import { DEFAULT_SETTINGS, EMPTY_STATS } from '@/shared/types';
import { detectPlatform, usesBackgroundFetch, PLATFORM_META, platformLabel } from '@/shared/platform';
import { getSettings, getStats, listCollections, updateCollection, setAutoAnalyze, findCollectionByUrl } from '@/shared/storage';
import { onProgress, ensureContentScript, cancelBackgroundScrape, cancelContentScrape } from '@/shared/messaging';
import { t } from '@/shared/i18n';
import { runScrape, finalizeScrape, saveAndLink } from '@/shared/scrape';
import { exportComments } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import { formatNumber } from '@/shared/util';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import SpProgress from '@/ui/components/SpProgress.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import SpToaster from '@/ui/components/SpToaster.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import BrandMark from '@/ui/components/BrandMark.vue';
import BoardPicker from '@/ui/components/BoardPicker.vue';
import { useToast } from '@/ui/composables/useToast';

const toast = useToast();
const platform = ref<PlatformId | null>(null);
const pageTitle = ref('');
const tabId = ref<number | undefined>(undefined);
const tabUrl = ref('');
const existing = ref<SavedCollection | null>(null);
const boardPickerOpen = ref(false);
const pickerMode = ref<'save' | 'analyze'>('save');
const pickedBoards = ref<string[]>([]);
const picker = ref<{ flush: () => Promise<void> } | null>(null);
const status = ref<'idle' | 'scraping' | 'done' | 'error'>('idle');
const progress = reactive({ message: '', percent: 0 });
const result = ref<ScrapeResult | null>(null);
const savedId = ref<string | null>(null);
const historyId = ref<string | null>(null);
const stopping = ref(false);
const error = ref('');
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const stats = ref<Stats>({ ...EMPTY_STATS });
const savedCount = ref(0);

const unit = computed(() => (platform.value ? PLATFORM_META[platform.value].unit : 'comments'));
const supported = [
  PLATFORM_META.reddit, PLATFORM_META.youtube, PLATFORM_META.hackernews, PLATFORM_META.steam,
];
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
  unsub = onProgress((p) => bumpProgress(p.message, p.percent));
  settings.value = await getSettings();
  stats.value = await getStats();
  savedCount.value = (await listCollections()).length;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId.value = tab?.id;
  tabUrl.value = tab?.url ?? '';
  pageTitle.value = tab?.title ?? '';
  platform.value = detectPlatform(tabUrl.value);
  existing.value = (await findCollectionByUrl(tabUrl.value)) ?? null;
});
onUnmounted(() => unsub?.());

async function scrape(): Promise<ScrapeResult | null> {
  if (!platform.value) return null;
  status.value = 'scraping';
  stopping.value = false;
  error.value = '';
  savedId.value = null;
  historyId.value = null;
  progress.percent = 0;
  progress.message = 'Starting…';

  if (!usesBackgroundFetch(platform.value)) {
    if (typeof tabId.value !== 'number') {
      status.value = 'error';
      error.value = 'No active tab found.';
      return null;
    }
    progress.message = 'Connecting to page…';
    const ready = await ensureContentScript(tabId.value);
    if (!ready) {
      status.value = 'error';
      error.value = 'Reload this page once so CommentGrab can read it, then try again.';
      return null;
    }
  }

  const res = await runScrape(platform.value, tabUrl.value, tabId.value, { maxComments: 1200, expandReplies: true });
  if (res.success) {
    result.value = res;
    status.value = 'done';
    const fin = await finalizeScrape(res, tabUrl.value, settings.value);
    historyId.value = fin.historyId ?? null;
    if (fin.collectionId) savedId.value = fin.collectionId;
    stats.value = await getStats();
  } else {
    status.value = 'error';
    error.value = res.error || 'Scrape failed.';
  }
  stopping.value = false;
  return res.success ? res : null;
}

/** Ask the in-flight scrape to stop and keep whatever it has collected. */
function stop(): void {
  if (!platform.value) return;
  stopping.value = true;
  if (usesBackgroundFetch(platform.value)) cancelBackgroundScrape();
  else if (typeof tabId.value === 'number') cancelContentScrape(tabId.value);
}

async function ensureResult(): Promise<ScrapeResult | null> {
  if (result.value?.success) return result.value;
  return scrape();
}

async function exportAs(format: ExportFormat): Promise<void> {
  const res = await ensureResult();
  if (!res) return;
  const outcome = await exportComments(format, res.comments, res.post, settings.value.export, res.platform);
  if (outcome.ok) {
    await recordExport(format, 1);
    stats.value = await getStats();
    toast.success(format === 'clipboard' ? 'Copied to clipboard' : `Exported ${outcome.count.toLocaleString()} ${unit.value}`);
  } else {
    toast.error('Export failed.');
  }
}

function openPicker(mode: 'save' | 'analyze'): void {
  pickerMode.value = mode;
  if (!savedId.value) pickedBoards.value = [];
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
      const col = await saveAndLink(res, tabUrl.value, historyId.value, pickedBoards.value);
      id = col.id;
      savedId.value = id;
      savedCount.value = (await listCollections()).length;
    }
    boardPickerOpen.value = false;
    if (pickerMode.value === 'analyze') {
      await setAutoAnalyze(id);
      openDashboard(`/analyze/${id}`);
    } else {
      toast.success(savedId.value ? `Saved ${res.comments.length.toLocaleString()} ${unit.value} to your library` : 'Boards updated');
    }
  } catch {
    toast.error('Could not save — local storage may be full.');
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
  const url = chrome.runtime.getURL('src/dashboard/index.html') + (path ? `#${path}` : '');
  chrome.tabs.create({ url });
}
</script>

<style scoped>
.export-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  border-radius: 0.85rem;
  border: 1px solid rgba(11, 16, 32, 0.08);
  background: #fff;
  padding: 0.6rem 0;
  font-size: 11px;
  font-weight: 600;
  color: #1e2435;
  outline: none;
  transition: all 0.15s ease;
}
.export-chip:hover {
  border-color: rgba(124, 58, 237, 0.45);
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.05);
  transform: translateY(-1px);
}
.export-chip:active {
  transform: translateY(0);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 0.85rem;
  border: 1px solid rgba(11, 16, 32, 0.08);
  background: #fff;
  padding: 0.55rem 0;
  font-size: 13px;
  font-weight: 600;
  color: #1e2435;
  outline: none;
  transition: all 0.15s ease;
}
.action-btn:hover {
  background: #f8fafc;
  border-color: rgba(11, 16, 32, 0.14);
}
.action-btn:active {
  transform: scale(0.985);
}
.action-btn--saved {
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}
.action-btn--saved:hover {
  background: rgba(16, 185, 129, 0.16);
  border-color: rgba(16, 185, 129, 0.45);
}
</style>
