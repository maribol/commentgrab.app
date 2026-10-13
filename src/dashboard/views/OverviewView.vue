<template>
  <div class="animate-fade-up">
    <!-- The page name lives in the breadcrumb; only the muted tagline stays, and only once there is data. -->
    <p v-if="stats.totalScrapes > 0" class="mb-5 text-[13.5px] text-muted">{{ t('ov.subtitle') }}</p>

    <!-- Empty state -->
    <div v-if="stats.totalScrapes === 0" class="space-y-5">
      <SpCard class="px-8 py-10 text-center">
        <SpIllustration :src="heroIllustration" :size="168" class="mx-auto" />
        <h2 class="mt-4 text-2xl font-bold tracking-tight text-ink">{{ t('ov.firstThread') }}</h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {{ t('ov.emptyBody') }}
        </p>
        <div class="mx-auto mt-7 grid max-w-lg grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div v-for="p in supported" :key="p.id" class="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-3 pb-3.5 pt-3 transition hover:border-line-strong">
            <SpIllustration :src="platformIllustrations[p.id]!" :size="76" />
            <span class="text-xs font-semibold text-ink-soft">{{ p.label }}</span>
          </div>
        </div>
      </SpCard>

      <!-- how it works -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" class="rounded-xl border border-line bg-surface p-4">
          <SpIllustration :src="step.image" :size="72" />
          <div class="mt-3 text-sm font-semibold text-ink">{{ i + 1 }} · {{ step.title }}</div>
          <p class="mt-1 text-xs leading-relaxed text-muted">{{ step.body }}</p>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Hero -->
      <SpCard class="mb-5 px-7 py-6">
        <div class="col-label">{{ t('ov.allTime') }}</div>
        <div class="mt-1.5 text-5xl font-semibold tracking-tight text-ink">{{ stats.totalComments.toLocaleString() }}</div>
        <div class="mt-2.5 text-sm text-muted">
          {{ t('ov.across', { scrapes: stats.totalScrapes.toLocaleString(), saved: savedCount, exports: stats.totalExports.toLocaleString() }) }}<template v-if="analyzed.length"> {{ t('ov.analyzedSuffix', { n: analyzed.length }) }}</template>
        </div>
      </SpCard>

      <!-- Metric cards with sparklines -->
      <div class="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="card in metricCards" :key="card.label" class="rounded-xl border border-line bg-surface p-4">
          <div class="flex items-center justify-between">
            <span class="col-label !mb-0">{{ card.label }}</span>
            <component :is="card.icon" class="h-4 w-4 text-faint" />
          </div>
          <div class="mt-2 flex items-end justify-between gap-2">
            <div>
              <div class="text-2xl font-bold tracking-tight text-ink">{{ card.value }}</div>
              <div
                v-if="card.delta"
                class="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold"
                :class="card.delta.dir === 'up' ? 'text-emerald-600' : 'text-rose-500'"
              >
                <component :is="card.delta.dir === 'up' ? ArrowUp : ArrowDown" class="h-3 w-3" />{{ card.delta.pct }}%
              </div>
              <div v-else class="mt-1 text-xs text-faint">vs last month</div>
            </div>
            <div class="h-9 w-24 shrink-0"><SpSparkline :points="card.series" :color="card.color" /></div>
          </div>
        </div>
      </div>

      <!-- Aggregated AI insights -->
      <SpCard v-if="aiAgg" class="mb-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink"><Sparkles class="h-4 w-4 text-brand-600" /> {{ t('ov.aiInsights') }}</h2>
          <span class="text-xs font-medium text-faint">{{ t('ov.aiAcross', { n: aiAgg.count, label: aiAgg.label.toLowerCase() }) }}</span>
        </div>
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <div class="mb-2.5 col-label">{{ t('ov.topTopics') }}</div>
            <div v-if="aiAgg.themes.length" class="space-y-2.5">
              <div v-for="topic in aiAgg.themes" :key="topic.theme">
                <div class="mb-1 flex items-center justify-between text-sm">
                  <span class="truncate pr-2 font-medium text-ink-soft">{{ topic.theme }}</span>
                  <span class="shrink-0 text-faint">{{ topic.mentions }}</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-canvas-2">
                  <div class="h-full rounded-full bg-brand-500" :style="{ width: `${Math.max(6, Math.round((topic.mentions / aiAgg.maxMentions) * 100))}%` }" />
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-faint">{{ t('ov.noTopics') }}</p>
          </div>
          <div>
            <div class="mb-2.5 col-label">{{ t('ov.customerLanguage') }}</div>
            <div v-if="aiAgg.language.length" class="flex flex-wrap gap-1.5">
              <span v-for="(p, i) in aiAgg.language" :key="i" class="chip bg-canvas-2 text-ink-soft">"{{ p }}"</span>
            </div>
            <p v-else class="text-sm text-faint">{{ t('ov.noPhrases') }}</p>
          </div>
        </div>
      </SpCard>

      <!-- Recent collections -->
      <SpCard v-if="recentCollections.length" class="mb-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-[15px] font-semibold tracking-tight text-ink">{{ t('ov.recentCollections') }}</h2>
          <button class="text-xs font-semibold text-brand-600 hover:underline" @click="navigate('/saved')">{{ t('common.viewAll') }}</button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="c in recentCollections"
            :key="c.id"
            class="group flex flex-col rounded-xl border border-line bg-surface p-4 text-left transition hover:border-line-strong"
            @click="navigate(`/saved/${c.id}`)"
          >
            <div class="flex items-start gap-2.5">
              <img v-if="faviconUrl(c.url)" :src="faviconUrl(c.url)" alt="" class="mt-0.5 h-5 w-5 shrink-0 rounded" />
              <PlatformGlyph v-else :platform="c.platform" :size="20" />
              <div class="min-w-0 flex-1">
                <div class="line-clamp-2 text-sm font-semibold leading-snug text-ink">{{ c.title }}</div>
                <div class="mt-0.5 truncate text-xs text-faint">{{ c.source || platformLabel(c.platform) }}</div>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs">
              <span class="font-semibold text-ink-soft">{{ c.commentCount.toLocaleString() }}</span>
              <span class="flex items-center gap-1.5 text-faint">
                <span v-if="c.analysis" class="flex items-center gap-1 text-brand-600"><Sparkles class="h-3 w-3" /> {{ t('ov.analyzed') }}</span>
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
            <h2 class="text-[15px] font-semibold tracking-tight text-ink">{{ t('ov.activity') }}</h2>
            <p class="mt-0.5 text-sm text-muted">Your busiest months over the last half-year.</p>
          </div>
          <div class="flex rounded-lg border border-line bg-canvas-2 p-0.5 text-xs font-semibold">
            <button
              v-for="m in (['comments','scrapes'] as const)"
              :key="m"
              class="rounded-md px-3 py-1.5 capitalize transition"
              :class="metric === m ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted hover:text-ink'"
              @click="metric = m"
            >{{ m }}</button>
          </div>
        </div>
        <BarChart :points="months" :metric="metric" />
      </SpCard>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <!-- Platform breakdown -->
        <SpCard>
          <h2 class="mb-4 text-[15px] font-semibold tracking-tight text-ink">{{ t('ov.byPlatform') }}</h2>
          <div v-if="breakdown.length" class="space-y-3.5">
            <div v-for="row in breakdown" :key="row.platform">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="flex items-center gap-2 text-sm font-medium text-ink-soft">
                  <PlatformGlyph :platform="row.platform" :size="22" />
                  {{ platformLabel(row.platform) }}
                </span>
                <span class="text-sm font-semibold text-ink">{{ row.count.toLocaleString() }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-canvas-2">
                <div class="h-full rounded-full bg-brand-500" :style="{ width: `${row.pct}%` }" />
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-faint">No platform data yet.</p>
        </SpCard>

        <!-- Recent activity -->
        <SpCard>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-[15px] font-semibold tracking-tight text-ink">{{ t('ov.recentActivity') }}</h2>
            <button class="text-xs font-semibold text-brand-600 hover:underline" @click="navigate('/history')">{{ t('common.viewAll') }}</button>
          </div>
          <div v-if="recent.length" class="space-y-1">
            <button
              v-for="h in recent"
              :key="h.id"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-canvas-2"
              @click="openHistory(h)"
            >
              <img v-if="faviconUrl(h.url)" :src="faviconUrl(h.url)" alt="" class="h-[26px] w-[26px] shrink-0 rounded-lg" />
              <PlatformGlyph v-else :platform="h.platform" :size="30" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-ink">{{ h.title || h.source || 'Scrape' }}</div>
                <div class="text-xs text-faint">{{ h.commentCount.toLocaleString() }} · {{ relativeTime(h.scrapedAt) }}</div>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-faint" />
            </button>
          </div>
          <p v-else class="text-sm text-faint">Nothing yet.</p>
        </SpCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MessagesSquare, Layers, Download, Bookmark, ChevronRight, Sparkles, ArrowUp, ArrowDown } from 'lucide-vue-next';
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
import SpIllustration from '@/ui/components/SpIllustration.vue';
import { heroIllustration, platformIllustrations, stepIllustrations } from '@/assets/illustrations';

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
  { image: stepIllustrations[0], title: t('ov.step1'), body: t('ov.step1d') },
  { image: stepIllustrations[1], title: t('ov.step2'), body: t('ov.step2d') },
  { image: stepIllustrations[2], title: t('ov.step3'), body: t('ov.step3d') },
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
    { label: 'Comments', icon: MessagesSquare, value: formatNumber(stats.value.totalComments), color: '#6d5ef6', series: comments, delta: deltaOf(comments) },
    { label: 'Scrapes', icon: Layers, value: formatNumber(stats.value.totalScrapes), color: '#6d5ef6', series: scrapes, delta: deltaOf(scrapes) },
    { label: 'Exports', icon: Download, value: formatNumber(stats.value.totalExports), color: '#6d5ef6', series: exportsSeries, delta: deltaOf(exportsSeries) },
    { label: 'Saved', icon: Bookmark, value: formatNumber(savedCount.value), color: '#6d5ef6', series: saved, delta: deltaOf(saved) },
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
