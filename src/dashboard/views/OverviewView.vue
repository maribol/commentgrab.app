<template>
  <div class="animate-fade-up">
    <header class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('ov.title') }}</h1>
      <p class="mt-1 text-sm text-ink-500">{{ t('ov.subtitle') }}</p>
    </header>

    <!-- Empty state -->
    <div v-if="stats.totalScrapes === 0" class="space-y-5">
      <SpCard class="px-8 py-10 text-center">
        <BrandMark :size="64" class="mx-auto shadow-glow" />
        <h2 class="mt-5 text-2xl font-bold tracking-tight text-ink-900">{{ t('ov.firstThread') }}</h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          {{ t('ov.emptyBody') }}
        </p>
        <div class="mx-auto mt-7 grid max-w-lg grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div v-for="p in supported" :key="p.id" class="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] bg-white px-3 py-4 transition hover:border-black/[0.12]">
            <PlatformGlyph :platform="p.id" :size="34" />
            <span class="text-xs font-semibold text-ink-700">{{ p.label }}</span>
          </div>
        </div>
      </SpCard>

      <!-- how it works -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" class="rounded-2xl border border-black/[0.06] bg-white p-4">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-commentgrab-soft text-commentgrab-violet">
            <component :is="step.icon" class="h-[18px] w-[18px]" />
          </span>
          <div class="mt-3 text-sm font-bold text-ink-900">{{ i + 1 }} · {{ step.title }}</div>
          <p class="mt-1 text-xs leading-relaxed text-ink-500">{{ step.body }}</p>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Hero -->
      <SpCard class="mb-5 px-7 py-6">
        <div class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{{ t('ov.allTime') }}</div>
        <div class="mt-1.5 text-5xl font-bold tracking-tight commentgrab-text">{{ stats.totalComments.toLocaleString() }}</div>
        <div class="mt-2.5 text-sm text-ink-500">
          {{ t('ov.across', { scrapes: stats.totalScrapes.toLocaleString(), saved: savedCount, exports: stats.totalExports.toLocaleString() }) }}<template v-if="analyzed.length"> {{ t('ov.analyzedSuffix', { n: analyzed.length }) }}</template>
        </div>
      </SpCard>

      <!-- Metric cards with sparklines -->
      <div class="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="card in metricCards" :key="card.label" class="rounded-2xl border border-black/[0.07] bg-white p-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ card.label }}</span>
            <component :is="card.icon" class="h-4 w-4 text-ink-300" />
          </div>
          <div class="mt-2 flex items-end justify-between gap-2">
            <div>
              <div class="text-2xl font-bold tracking-tight text-ink-900">{{ card.value }}</div>
              <div
                v-if="card.delta"
                class="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold"
                :class="card.delta.dir === 'up' ? 'text-emerald-600' : 'text-rose-500'"
              >
                <component :is="card.delta.dir === 'up' ? ArrowUp : ArrowDown" class="h-3 w-3" />{{ card.delta.pct }}%
              </div>
              <div v-else class="mt-1 text-xs text-ink-300">vs last month</div>
            </div>
            <div class="h-9 w-24 shrink-0"><SpSparkline :points="card.series" :color="card.color" /></div>
          </div>
        </div>
      </div>

      <!-- Aggregated AI insights -->
      <SpCard v-if="aiAgg" class="mb-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-base font-bold tracking-tight text-ink-900"><Sparkles class="h-4 w-4 text-commentgrab-violet" /> {{ t('ov.aiInsights') }}</h2>
          <span class="text-xs font-medium text-ink-400">{{ t('ov.aiAcross', { n: aiAgg.count, label: aiAgg.label.toLowerCase() }) }}</span>
        </div>
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <div class="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('ov.topTopics') }}</div>
            <div v-if="aiAgg.themes.length" class="space-y-2.5">
              <div v-for="topic in aiAgg.themes" :key="topic.theme">
                <div class="mb-1 flex items-center justify-between text-sm">
                  <span class="truncate pr-2 font-medium text-ink-700">{{ topic.theme }}</span>
                  <span class="shrink-0 text-ink-400">{{ topic.mentions }}</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-commentgrab-violet" :style="{ width: `${Math.max(6, Math.round((topic.mentions / aiAgg.maxMentions) * 100))}%` }" />
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-ink-400">{{ t('ov.noTopics') }}</p>
          </div>
          <div>
            <div class="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('ov.customerLanguage') }}</div>
            <div v-if="aiAgg.language.length" class="flex flex-wrap gap-1.5">
              <span v-for="(p, i) in aiAgg.language" :key="i" class="chip bg-slate-100 text-ink-700">"{{ p }}"</span>
            </div>
            <p v-else class="text-sm text-ink-400">{{ t('ov.noPhrases') }}</p>
          </div>
        </div>
      </SpCard>

      <!-- Recent collections -->
      <SpCard v-if="recentCollections.length" class="mb-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-bold tracking-tight text-ink-900">{{ t('ov.recentCollections') }}</h2>
          <button class="text-xs font-semibold text-commentgrab-violet hover:underline" @click="navigate('/saved')">{{ t('common.viewAll') }}</button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="c in recentCollections"
            :key="c.id"
            class="group flex flex-col rounded-2xl border border-black/[0.07] bg-white p-4 text-left transition hover:border-black/[0.16] hover:shadow-sm"
            @click="navigate(`/saved/${c.id}`)"
          >
            <div class="flex items-start gap-2.5">
              <img v-if="faviconUrl(c.url)" :src="faviconUrl(c.url)" alt="" class="mt-0.5 h-5 w-5 shrink-0 rounded" />
              <PlatformGlyph v-else :platform="c.platform" :size="20" />
              <div class="min-w-0 flex-1">
                <div class="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{{ c.title }}</div>
                <div class="mt-0.5 truncate text-xs text-ink-400">{{ c.source || platformLabel(c.platform) }}</div>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-2.5 text-xs">
              <span class="font-semibold text-ink-700">{{ c.commentCount.toLocaleString() }}</span>
              <span class="flex items-center gap-1.5 text-ink-400">
                <span v-if="c.analysis" class="flex items-center gap-1 text-commentgrab-violet"><Sparkles class="h-3 w-3" /> {{ t('ov.analyzed') }}</span>
                {{ relativeTime(c.updatedAt) }}
              </span>
            </div>
          </button>
        </div>
      </SpCard>

      <!-- Chart -->
      <SpCard class="mb-5">
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold tracking-tight text-ink-900">{{ t('ov.activity') }}</h2>
            <p class="mt-0.5 text-sm text-ink-500">Your busiest months over the last half-year.</p>
          </div>
          <div class="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              v-for="m in (['comments','scrapes'] as const)"
              :key="m"
              class="rounded-lg px-3 py-1.5 capitalize transition"
              :class="metric === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-700'"
              @click="metric = m"
            >{{ m }}</button>
          </div>
        </div>
        <BarChart :points="months" :metric="metric" />
      </SpCard>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <!-- Platform breakdown -->
        <SpCard>
          <h2 class="mb-4 text-base font-bold tracking-tight text-ink-900">{{ t('ov.byPlatform') }}</h2>
          <div v-if="breakdown.length" class="space-y-3.5">
            <div v-for="row in breakdown" :key="row.platform">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <PlatformGlyph :platform="row.platform" :size="22" />
                  {{ platformLabel(row.platform) }}
                </span>
                <span class="text-sm font-semibold text-ink-900">{{ row.count.toLocaleString() }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-commentgrab-violet" :style="{ width: `${row.pct}%` }" />
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-ink-400">No platform data yet.</p>
        </SpCard>

        <!-- Recent activity -->
        <SpCard>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-bold tracking-tight text-ink-900">{{ t('ov.recentActivity') }}</h2>
            <button class="text-xs font-semibold text-commentgrab-violet hover:underline" @click="navigate('/history')">{{ t('common.viewAll') }}</button>
          </div>
          <div v-if="recent.length" class="space-y-1">
            <button
              v-for="h in recent"
              :key="h.id"
              class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-black/[0.03]"
              @click="openHistory(h)"
            >
              <img v-if="faviconUrl(h.url)" :src="faviconUrl(h.url)" alt="" class="h-[26px] w-[26px] shrink-0 rounded-lg" />
              <PlatformGlyph v-else :platform="h.platform" :size="30" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-ink-900">{{ h.title || h.source || 'Scrape' }}</div>
                <div class="text-xs text-ink-400">{{ h.commentCount.toLocaleString() }} · {{ relativeTime(h.scrapedAt) }}</div>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-ink-300" />
            </button>
          </div>
          <p v-else class="text-sm text-ink-400">Nothing yet.</p>
        </SpCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MessagesSquare, Layers, Download, Bookmark, ChevronRight, Sparkles, MousePointerClick, FileDown, ArrowUp, ArrowDown } from 'lucide-vue-next';
import type { HistoryEntry, PlatformId, SavedCollection, Stats } from '@/shared/types';
import { EMPTY_STATS } from '@/shared/types';
import { getStats, listCollections, listHistory } from '@/shared/storage';
import { lastNMonths, monthKey, type MonthlyPoint } from '@/shared/stats';
import { PLATFORM_META, platformLabel } from '@/shared/platform';
import { formatNumber, relativeTime, faviconUrl } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import SpCard from '@/ui/components/SpCard.vue';
import SpSparkline from '@/ui/components/SpSparkline.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import BarChart from '../components/BarChart.vue';
import BrandMark from '@/ui/components/BrandMark.vue';

const stats = ref<Stats>({ ...EMPTY_STATS });
const collections = ref<SavedCollection[]>([]);
const savedCount = computed(() => collections.value.length);
const recent = ref<HistoryEntry[]>([]);
const metric = ref<'comments' | 'scrapes'>('comments');

const analyzed = computed(() =>
  collections.value.filter((c) => c.analysis).sort((a, b) => b.updatedAt - a.updatedAt),
);
const recentCollections = computed(() =>
  [...collections.value].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
);

const supported = [PLATFORM_META.reddit, PLATFORM_META.youtube, PLATFORM_META.hackernews, PLATFORM_META.steam];

const steps = computed(() => [
  { icon: MousePointerClick, title: t('ov.step1'), body: t('ov.step1d') },
  { icon: Sparkles, title: t('ov.step2'), body: t('ov.step2d') },
  { icon: FileDown, title: t('ov.step3'), body: t('ov.step3d') },
]);
const months = computed<MonthlyPoint[]>(() => lastNMonths(stats.value, 6));

const savedSeries = computed(() => {
  const keys = months.value.map((m) => m.key);
  const counts: Record<string, number> = {};
  keys.forEach((k) => (counts[k] = 0));
  for (const c of collections.value) {
    const k = monthKey(new Date(c.createdAt));
    if (k in counts) counts[k] += 1;
  }
  return keys.map((k) => counts[k]);
});

function deltaOf(series: number[]): { dir: 'up' | 'down'; pct: number } | null {
  if (series.length < 2) return null;
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!cur && !prev) return null;
  if (!prev) return { dir: 'up', pct: 100 };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return null;
  return { dir: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) };
}

const metricCards = computed(() => {
  const m = months.value;
  const comments = m.map((x) => x.comments);
  const scrapes = m.map((x) => x.scrapes);
  const exportsSeries = m.map((x) => x.exports);
  const saved = savedSeries.value;
  return [
    { label: 'Comments', icon: MessagesSquare, value: formatNumber(stats.value.totalComments), color: '#7c3aed', series: comments, delta: deltaOf(comments) },
    { label: 'Scrapes', icon: Layers, value: formatNumber(stats.value.totalScrapes), color: '#a855f7', series: scrapes, delta: deltaOf(scrapes) },
    { label: 'Exports', icon: Download, value: formatNumber(stats.value.totalExports), color: '#d946ef', series: exportsSeries, delta: deltaOf(exportsSeries) },
    { label: 'Saved', icon: Bookmark, value: formatNumber(savedCount.value), color: '#ec4899', series: saved, delta: deltaOf(saved) },
  ];
});

const aiAgg = computed(() => {
  const list = analyzed.value;
  if (!list.length) return null;
  const themeMap = new Map<string, { theme: string; mentions: number }>();
  let pos = 0;
  let neu = 0;
  let neg = 0;
  const phrases: string[] = [];
  for (const c of list) {
    const a = c.analysis;
    if (!a) continue;
    for (const t of a.topThemes ?? []) {
      const key = t.theme.trim().toLowerCase();
      if (!key) continue;
      const mentions = t.mentions || 1;
      const cur = themeMap.get(key);
      if (cur) cur.mentions += mentions;
      else themeMap.set(key, { theme: t.theme.trim(), mentions });
    }
    pos += a.sentiment?.positive ?? 0;
    neu += a.sentiment?.neutral ?? 0;
    neg += a.sentiment?.negative ?? 0;
    for (const p of a.customerLanguage ?? []) phrases.push(p.trim());
  }
  const themes = [...themeMap.values()].sort((x, y) => y.mentions - x.mentions).slice(0, 8);
  const maxMentions = Math.max(1, ...themes.map((t) => t.mentions));
  const language = [...new Set(phrases.filter(Boolean))].slice(0, 14);
  const label = pos >= neg && pos >= neu ? 'Positive' : neg >= neu ? 'Negative' : 'Mixed';
  return { count: list.length, themes, maxMentions, language, label };
});

const breakdown = computed(() => {
  const entries = Object.entries(stats.value.commentsByPlatform) as Array<[PlatformId, number]>;
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return entries
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({ platform, count, pct: Math.max(4, Math.round((count / max) * 100)) }));
});

function openHistory(h: HistoryEntry): void {
  if (h.savedCollectionId) navigate(`/saved/${h.savedCollectionId}`);
  else if (h.url) chrome.tabs.create({ url: h.url });
}

onMounted(async () => {
  stats.value = await getStats();
  collections.value = await listCollections();
  recent.value = (await listHistory()).slice(0, 6);
});
</script>
