<template>
  <div class="commentgrab-bg relative flex w-[384px] flex-col font-sans text-ink">
    <!-- header -->
    <header class="flex items-center justify-between px-5 pt-4">
      <div class="flex items-center gap-2">
        <BrandMark :size="28" />
        <div class="leading-none">
          <div class="text-[15px] font-semibold tracking-tight text-ink">CommentGrab</div>
          <div class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-faint">{{ t('nav.commentExporter') }}</div>
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
            <div class="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{{ t('pop.detected', { platform: platformLabel(platform) }) }}</div>
            <div class="line-clamp-2 text-sm font-medium leading-snug text-ink">{{ pageTitle }}</div>
          </div>
        </div>

        <!-- idle -->
        <template v-if="status === 'idle'">
          <div v-if="existing" class="mt-3 flex items-center justify-between rounded-lg bg-commentgrab-soft px-3 py-2 text-xs">
            <span class="font-semibold text-commentgrab-violet">{{ t('pop.savedUnit', { count: existing.commentCount.toLocaleString(), unit }) }}</span>
            <button class="font-semibold text-commentgrab-violet hover:underline" @click="openDashboard(`/saved/${existing.id}`)">{{ t('common.open') }}</button>
          </div>
          <SpButton class="mt-3 w-full" :icon="existing ? RefreshCw : Sparkles" @click="scrape()">{{ existing ? t('common.rescrape') : t('pop.scrape', { unit }) }}</SpButton>
        </template>

        <!-- scraping -->
        <template v-else-if="status === 'scraping'">
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-ink-soft">
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
            <span class="text-3xl font-semibold tracking-tight text-ink">{{ result.comments.length.toLocaleString() }}</span>
            <span class="text-sm text-muted">{{ t('pop.ready', { unit }) }}</span>
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
            <button class="flex items-center gap-1.5 text-muted transition hover:text-ink" @click="scrape()">
              <RefreshCw class="h-3 w-3" /> {{ t('common.rescrape') }}
            </button>
          </div>
        </template>

        <!-- error -->
        <template v-else-if="status === 'error'">
          <div class="mt-4 flex items-start gap-2 rounded-lg bg-[#fdeaea] px-3 py-2.5 text-sm text-[#c23a3a] dark:bg-[#c23a3a]/20 dark:text-[#f08a8a]">
            <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
            <span>{{ error }}</span>
          </div>
          <ReportProblemLink v-if="errorReportable" class="mt-1.5" where="popup" :platform="platform" :error="error" :page="tabUrl" />
          <SpButton variant="secondary" class="mt-2.5 w-full" :icon="RefreshCw" @click="scrape()">{{ t('pop.tryAgain') }}</SpButton>
        </template>
      </SpCard>

      <!-- reddit list page (batch) -->
      <SpCard v-else-if="listTarget" class="!p-4">
        <div class="flex items-start gap-3">
          <PlatformGlyph platform="reddit" :size="40" />
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{{ t('pop.batchDetected') }}</div>
            <div class="line-clamp-2 text-sm font-medium leading-snug text-ink">{{ listLabel }}</div>
          </div>
        </div>

        <!-- idle -->
        <template v-if="status === 'idle'">
          <div class="mt-3 flex items-center justify-between rounded-lg bg-commentgrab-soft px-3 py-2">
            <label for="topN" class="text-xs font-semibold text-commentgrab-violet">{{ t('pop.topPosts') }}</label>
            <input
              id="topN"
              v-model.number="topN"
              type="number"
              min="1"
              max="25"
              class="w-16 rounded-lg border border-line-strong bg-surface px-2 py-1 text-center text-sm font-semibold text-ink outline-none focus:border-brand-400"
            />
          </div>
          <label class="mt-2.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-muted">
            <input v-model="skipExisting" type="checkbox" class="h-3.5 w-3.5 accent-commentgrab-violet" />
            {{ t('pop.skipExisting') }}
          </label>
          <SpButton class="mt-3 w-full" :icon="Layers" @click="runBatch()">{{ t('pop.scrapeTop', { count: clampN(topN) }) }}</SpButton>
        </template>

        <!-- scraping -->
        <template v-else-if="status === 'scraping'">
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-ink-soft">
            <Loader2 class="h-4 w-4 animate-spin-slow text-commentgrab-violet" />
            <span class="truncate">{{ progress.message || t('pop.working') }}</span>
          </div>
          <SpProgress class="mt-2.5" :value="progress.percent" :indeterminate="progress.percent <= 5" />
          <SpButton variant="secondary" size="sm" class="mt-3 w-full" :icon="Square" :disabled="stopping" @click="stop()">
            {{ stopping ? t('pop.stopping') : t('pop.stopKeep') }}
          </SpButton>
        </template>

        <!-- error -->
        <template v-else-if="status === 'error'">
          <div class="mt-4 flex items-start gap-2 rounded-lg bg-[#fdeaea] px-3 py-2.5 text-sm text-[#c23a3a] dark:bg-[#c23a3a]/20 dark:text-[#f08a8a]">
            <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
            <span>{{ error }}</span>
          </div>
          <ReportProblemLink v-if="errorReportable" class="mt-1.5" where="popup" platform="reddit" :error="error" :page="tabUrl" />
          <SpButton variant="secondary" class="mt-2.5 w-full" :icon="RefreshCw" @click="runBatch()">{{ t('pop.tryAgain') }}</SpButton>
        </template>
      </SpCard>

      <!-- unsupported -->
      <div v-else>
        <div class="flex flex-col items-center rounded-xl border border-line bg-surface px-5 pb-6 pt-5 text-center">
          <SpIllustration :src="heroIllustration" :size="128" />
          <h3 class="mt-3 text-base font-semibold text-ink">{{ t('pop.noComments') }}</h3>
          <p class="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{{ t('pop.noCommentsBody') }}</p>
        </div>
        <div class="mt-2.5 grid grid-cols-4 gap-2">
          <div v-for="p in supported" :key="p.id" class="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-surface px-1 pb-2 pt-1.5">
            <SpIllustration :src="platformIllustrations[p.id]!" :size="56" />
            <span class="text-[11px] font-medium leading-tight text-ink-soft">{{ p.label }}</span>
          </div>
        </div>
      </div>

      <ReviewPrompt class="mt-3" :blocked="status === 'scraping' || status === 'error'" />
    </main>

    <!-- footer: mini stats -->
    <footer class="mt-auto grid grid-cols-3 gap-px border-t border-line bg-line text-center">
      <div class="bg-surface px-3 py-3">
        <div class="text-lg font-semibold text-ink">{{ formatNumber(stats.totalComments) }}</div>
        <div class="text-[10px] font-medium uppercase tracking-[0.06em] text-faint">{{ t('pop.statComments') }}</div>
      </div>
      <div class="bg-surface px-3 py-3">
        <div class="text-lg font-semibold text-ink">{{ formatNumber(stats.totalScrapes) }}</div>
        <div class="text-[10px] font-medium uppercase tracking-[0.06em] text-faint">{{ t('pop.statScrapes') }}</div>
      </div>
      <button class="bg-surface px-3 py-3 transition hover:bg-canvas-2" @click="openDashboard('/saved')">
        <div class="text-lg font-semibold text-commentgrab-violet">{{ formatNumber(savedCount) }}</div>
        <div class="text-[10px] font-medium uppercase tracking-[0.06em] text-faint">{{ t('pop.statSaved') }}</div>
      </button>
    </footer>

    <!-- board picker overlay -->
    <div
      v-if="boardPickerOpen"
      class="absolute inset-0 z-30 flex items-center justify-center bg-ink/20 p-5"
      @click.self="boardPickerOpen = false"
    >
      <div class="w-full max-w-[300px]">
        <BoardPicker ref="picker" v-model="pickedBoards" />
        <button class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600" @click="confirmSave()">
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
  Sparkles, LayoutDashboard, Loader2, Square, Bookmark, BookmarkCheck, RefreshCw, AlertCircle,
  FileSpreadsheet, FileJson, FileText, Copy, WandSparkles, ExternalLink, Layers,
} from 'lucide-vue-next';
import type { AppSettings, ExportFormat, PlatformId, ScrapeResult, SavedCollection, Stats } from '@/shared/types';
import { DEFAULT_SETTINGS, EMPTY_STATS } from '@/shared/types';
import { detectPlatform, detectRedditList, redditListLabel, usesBackgroundFetch, PLATFORM_META, platformLabel, type RedditListTarget } from '@/shared/platform';
import { getSettings, getStats, listCollections, updateCollection, setAutoAnalyze, findCollectionByUrl } from '@/shared/storage';
import { onProgress, ensureContentScript, cancelBackgroundScrape, cancelContentScrape, requestListScrape, requestBatchScrape } from '@/shared/messaging';
import { t } from '@/shared/i18n';
import { runScrape, finalizeScrape, saveAndLink, saveBatch } from '@/shared/scrape';
import { exportComments } from '@/shared/export';
import { recordExport } from '@/shared/stats';
import { formatNumber, reportProblemUrl } from '@/shared/util';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import SpProgress from '@/ui/components/SpProgress.vue';
import SpIllustration from '@/ui/components/SpIllustration.vue';
import { heroIllustration, platformIllustrations } from '@/assets/illustrations';
import SpToaster from '@/ui/components/SpToaster.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import BrandMark from '@/ui/components/BrandMark.vue';
import BoardPicker from '@/ui/components/BoardPicker.vue';
import ReviewPrompt from '@/ui/components/ReviewPrompt.vue';
import ReportProblemLink from '@/ui/components/ReportProblemLink.vue';
import { useToast } from '@/ui/composables/useToast';

const toast = useToast();
const platform = ref<PlatformId | null>(null);
const listTarget = ref<RedditListTarget | null>(null);
const topN = ref(10);
const skipExisting = ref(true);
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
// Not a failure (the user's own filter skipped everything), so no report link for it.
const ALL_SKIPPED_MSG = 'Every top post here is already in your library. Uncheck “Skip already-scraped” to re-scrape.';
const errorReportable = computed(() => !!error.value && error.value !== ALL_SKIPPED_MSG);
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
  listTarget.value = platform.value ? null : detectRedditList(tabUrl.value);
  existing.value = (await findCollectionByUrl(tabUrl.value)) ?? null;
});

const listLabel = computed(() => (listTarget.value ? redditListLabel(listTarget.value) : ''));
function clampN(n: number): number {
  return Math.min(25, Math.max(1, Math.round(Number(n) || 10)));
}

/** Stable de-dupe key for a Reddit thread (its comments id), slug-independent. */
function threadKey(url: string): string {
  const m = (url || '').match(/\/comments\/([a-z0-9]+)/i);
  return m ? m[1].toLowerCase() : (url || '').toLowerCase();
}

/**
 * Batch-scrape the top N posts off a Reddit list page: read the ranked post
 * list from the page's own DOM (so results match what Reddit shows), then have
 * the service worker pull each thread's comments. Finally open the dashboard.
 */
async function runBatch(): Promise<void> {
  if (!listTarget.value) return;
  if (typeof tabId.value !== 'number') {
    status.value = 'error';
    error.value = 'No active tab found.';
    return;
  }
  status.value = 'scraping';
  stopping.value = false;
  error.value = '';
  progress.percent = 0;
  progress.message = 'Connecting to page…';

  const ready = await ensureContentScript(tabId.value);
  if (!ready) {
    status.value = 'error';
    error.value = 'Reload this Reddit page once so CommentGrab can read it, then try again.';
    return;
  }

  const n = clampN(topN.value);
  const list = await requestListScrape(tabId.value, n);
  if (!list?.success || !list.stubs.length) {
    status.value = 'error';
    error.value = list?.error || 'No posts found on this page.';
    return;
  }

  // Optionally drop posts already scraped before (any collection / batch),
  // keyed on the stable Reddit thread id so slugs/query strings don't matter.
  let stubs = list.stubs;
  if (skipExisting.value) {
    const known = new Set((await listCollections()).map((c) => threadKey(c.url)));
    stubs = stubs.filter((s) => !known.has(threadKey(s.url)));
    if (!stubs.length) {
      status.value = 'error';
      error.value = ALL_SKIPPED_MSG;
      return;
    }
  }

  const res = await requestBatchScrape({
    stubs,
    query: listLabel.value,
    source: listTarget.value.source,
    url: tabUrl.value,
    limit: n,
  });
  if (res?.success) {
    const run = await saveBatch(res, tabUrl.value);
    stats.value = await getStats();
    openDashboard(`/batch/${run.id}`);
    status.value = 'idle';
  } else {
    status.value = 'error';
    error.value = res?.error || 'Batch scrape failed.';
  }
  stopping.value = false;
}
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
  stopping.value = true;
  if (listTarget.value) {
    if (typeof tabId.value === 'number') cancelContentScrape(tabId.value); // stop DOM list scroll
    cancelBackgroundScrape(); // stop comment scraping
    return;
  }
  if (!platform.value) return;
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
    toast.errorWithReport('Export failed.', reportProblemUrl({ where: 'popup', platform: platform.value ?? undefined, error: 'Export failed.', page: tabUrl.value }));
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
    toast.errorWithReport('Could not save — local storage may be full.', reportProblemUrl({ where: 'popup', platform: platform.value ?? undefined, error: 'Could not save — local storage may be full.', page: tabUrl.value }));
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
  border-radius: 10px;
  border: 1px solid rgb(var(--cg-line-strong));
  background: rgb(var(--cg-surface));
  padding: 0.6rem 0;
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--cg-ink-soft));
  outline: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.export-chip:hover {
  border-color: #8f7bf3;
  color: rgb(var(--cg-brand-fg));
  background: rgb(var(--cg-brand-soft));
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid rgb(var(--cg-line-strong));
  background: rgb(var(--cg-surface));
  padding: 0.55rem 0;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--cg-ink-soft));
  outline: none;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.action-btn:hover {
  background: rgb(var(--cg-canvas-2));
}
.action-btn:active {
  transform: translateY(1px);
}
.action-btn--saved {
  border-color: rgba(31, 122, 69, 0.25);
  background: #e7f5ec;
  color: #1f7a45;
}
.action-btn--saved:hover {
  background: #dcefe3;
}
@media (prefers-color-scheme: dark) {
  .action-btn--saved,
  .action-btn--saved:hover {
    background: rgba(31, 122, 69, 0.2);
    color: #6fcf97;
  }
}
</style>
