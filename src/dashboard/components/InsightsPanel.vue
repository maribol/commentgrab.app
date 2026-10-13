<template>
  <div>
    <!-- no key -->
    <section v-if="settingsLoaded && !settings.openAiKey" class="rounded-xl border border-line bg-surface p-5">
      <div class="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-commentgrab-soft">
          <KeyRound class="h-4 w-4 text-commentgrab-violet" />
        </span>
        {{ t('an.connectOpenAI') }}
      </div>
      <p class="mt-2 max-w-lg text-[13.5px] text-muted">{{ t('an.connectBody') }}</p>
      <SpButton class="mt-4" size="sm" :icon="ArrowRight" @click="navigate('/settings')">{{ t('set.addApiKey') }}</SpButton>
    </section>

    <!-- run CTA -->
    <section v-else-if="!analysis" class="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-commentgrab-soft">
        <WandSparkles class="h-5 w-5 text-commentgrab-violet" />
      </span>
      <h2 class="mt-4 text-[16px] font-semibold text-ink">
        {{ threads ? t('ins.combinedHeadline', { count: (meta.commentCount ?? 0).toLocaleString(), n: threads }) : t('an.runHeadline', { count: (meta.commentCount ?? 0).toLocaleString() }) }}
      </h2>
      <p class="mt-1 max-w-md text-[13.5px] text-muted">{{ threads ? t('ins.combinedBody') : t('an.runBody') }}</p>
      <div class="mt-5 flex items-center gap-3">
        <SpButton size="sm" :class="running ? 'disabled:!cursor-progress disabled:!opacity-100' : ''" :icon="Sparkles" :loading="running" :disabled="!canRun" :title="estimateTip" @click="run()">{{ running ? t('an.analyzing') : t('an.runAnalysis') }}</SpButton>
        <button v-if="running" class="text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline" @click="cancel()">{{ t('est.cancelRun') }}</button>
      </div>
      <p v-if="error" class="mt-3 text-[13px] text-rose-600">{{ error }}</p>
      <ReportProblemLink v-if="error" class="mt-1" where="dashboard" :platform="meta.platform" :error="error" :page="meta.url" />
      <p class="mt-2 text-[12px] text-faint">{{ t('an.using', { model: settings.openAiModel }) }}</p>
    </section>

    <!-- results -->
    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-[12px] text-faint">
          <p>{{ t('ins.meta', { n: analysis.commentsAnalyzed, model: analysis.model }) }} · {{ formatDateTime(analysis.createdAt) }}</p>
          <p v-if="usedLine" class="mt-0.5">{{ usedLine }}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="inline-flex overflow-hidden rounded-md border border-line-strong bg-surface">
            <button class="seg-btn" @click="exportAs('markdown')"><FileText class="h-3.5 w-3.5" /> Export .md</button>
            <button class="seg-btn border-l border-line-strong" @click="exportAs('clipboard')"><Copy class="h-3.5 w-3.5" /> {{ t('common.copy') }}</button>
          </div>
          <button v-if="running" class="text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline" @click="cancel()">{{ t('est.cancelRun') }}</button>
          <SpButton variant="secondary" size="sm" :class="running ? 'disabled:!cursor-progress disabled:!opacity-100' : ''" :icon="RefreshCw" :loading="running" :title="estimateTip" @click="run()">{{ running ? t('an.analyzing') : t('an.reanalyze') }}</SpButton>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section class="rounded-xl border border-line bg-surface p-4 xl:col-span-2">
          <h3 class="col-label flex items-center gap-1.5"><FileText class="h-3.5 w-3.5" /> {{ t('an.summary') }}</h3>
          <p class="text-[14px] leading-relaxed text-ink-soft">{{ analysis.summary || t('an.noSummary') }}</p>
        </section>
        <section class="rounded-xl border border-line bg-surface p-4">
          <h3 class="col-label flex items-center gap-1.5"><Gauge class="h-3.5 w-3.5" /> {{ t('an.sentiment') }} <span class="ml-auto rounded-md bg-canvas-2 px-1.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-ink-soft">{{ analysis.sentiment.label }}</span></h3>
          <SentimentBar :sentiment="analysis.sentiment" />
        </section>
      </div>

      <InsightList
        :title="t('an.hooks')"
        :icon="Flame"
        :items="analysis.hooks"
        numbered
        regenerable
        :regenerating="hooksRunning"
        @regenerate="regenHooks()"
      />

      <!-- Ad angles (generated on demand) -->
      <section class="overflow-hidden rounded-xl border border-line bg-surface">
        <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h3 class="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Megaphone class="h-4 w-4 text-commentgrab-violet" /> {{ t('an.adAngles') }}</h3>
          <div v-if="analysis.adAngles?.length" class="flex items-center gap-1">
            <button class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted transition-colors hover:bg-canvas-2 hover:text-ink disabled:opacity-50" :disabled="anglesRunning" @click="runAngles()">
              <RefreshCw class="h-3.5 w-3.5" :class="anglesRunning ? 'animate-spin-slow' : ''" /> {{ t('common.regenerate') }}
            </button>
            <button class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted transition-colors hover:bg-canvas-2 hover:text-ink" @click="copyAngles()"><Copy class="h-3.5 w-3.5" /> {{ t('common.copyAll') }}</button>
          </div>
        </header>

        <ul v-if="analysis.adAngles?.length" class="divide-y divide-line">
          <li v-for="(a, i) in analysis.adAngles" :key="i" class="flex items-start gap-3 px-4 py-3">
            <span class="mt-px w-5 shrink-0 font-mono text-[11.5px] text-faint">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="min-w-0">
              <div class="text-[13.5px] font-semibold text-ink">{{ a.angle }}</div>
              <div v-if="a.description" class="mt-0.5 text-[13.5px] leading-relaxed text-muted">{{ a.description }}</div>
            </div>
          </li>
        </ul>

        <div v-else class="flex flex-col items-center justify-center px-6 py-6 text-center">
          <p class="max-w-sm text-[13.5px] text-muted">{{ t('an.adAnglesEmpty') }}</p>
          <SpButton class="mt-3" variant="secondary" size="sm" :class="anglesRunning ? 'disabled:!opacity-100' : ''" :icon="Sparkles" :loading="anglesRunning" @click="runAngles()">{{ anglesRunning ? t('an.analyzing') : t('an.generateAngles') }}</SpButton>
          <p v-if="anglesError" class="mt-2 text-[13px] text-rose-600">{{ anglesError }}</p>
          <ReportProblemLink v-if="anglesError" class="mt-1" where="dashboard" :platform="meta.platform" :error="anglesError" :page="meta.url" />
        </div>
      </section>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <InsightList :title="t('an.objections')" :icon="ShieldAlert" :items="analysis.objections" />
        <InsightList :title="t('an.triggers')" :icon="HeartPulse" :items="analysis.emotionalTriggers" />
        <InsightList :title="t('an.failed')" :icon="ThumbsDown" :items="analysis.failedSolutions" />

        <!-- customer language as chips -->
        <section v-if="analysis.customerLanguage.length" class="overflow-hidden rounded-xl border border-line bg-surface">
          <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <h3 class="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><MessageSquareQuote class="h-4 w-4 text-commentgrab-violet" /> {{ t('ov.customerLanguage') }}</h3>
            <button class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted transition-colors hover:bg-canvas-2 hover:text-ink" @click="copyLanguage()"><Copy class="h-3.5 w-3.5" /> {{ t('common.copyAll') }}</button>
          </header>
          <div class="flex flex-wrap gap-1.5 p-4">
            <span v-for="(p, i) in analysis.customerLanguage" :key="i" class="rounded-md bg-canvas-2 px-2 py-1 text-[12.5px] text-ink-soft">“{{ p }}”</span>
          </div>
        </section>
      </div>

      <!-- themes -->
      <section v-if="analysis.topThemes.length" class="overflow-hidden rounded-xl border border-line bg-surface">
        <header class="border-b border-line px-4 py-2.5">
          <h3 class="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Hash class="h-4 w-4 text-commentgrab-violet" /> {{ t('an.themes') }}</h3>
        </header>
        <div class="space-y-2.5 p-4">
          <div v-for="th in analysis.topThemes" :key="th.theme" class="grid grid-cols-[minmax(0,200px)_1fr_40px] items-center gap-3 text-[13px]">
            <span class="truncate text-ink-soft">{{ th.theme }}</span>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-canvas-2">
              <div class="h-full rounded-full bg-brand-500" :style="{ width: `${themePct(th.mentions)}%` }" />
            </div>
            <span class="text-right font-mono text-[12px] text-faint">{{ th.mentions }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  ArrowRight, RefreshCw, KeyRound, WandSparkles, Sparkles, FileText, Gauge,
  Flame, ShieldAlert, HeartPulse, ThumbsDown, MessageSquareQuote, Hash, Copy, Megaphone,
} from 'lucide-vue-next';
import type { AnalysisResult, AppSettings } from '@/shared/types';
import type { InsightsSource } from '@/shared/insights';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings } from '@/shared/storage';
import { analyzeComments, generateAdAngles, generateHooks } from '@/shared/openai';
import { exportAnalysis, type AnalysisMeta } from '@/shared/export';
import { formatDateTime } from '@/shared/util';
import { costOf, estimateRun, type EstimateKind } from '@/shared/estimate';
import { confirmRun, costText } from '../confirm';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpButton from '@/ui/components/SpButton.vue';
import SentimentBar from './SentimentBar.vue';
import InsightList from './InsightList.vue';
import ReportProblemLink from '@/ui/components/ReportProblemLink.vue';
import { reportProblemUrl } from '@/shared/util';

const props = defineProps<{
  analysis: AnalysisResult | null;
  /** Loads the comments to analyze (a single thread, or a fair merge of several). */
  load: () => Promise<InsightsSource>;
  /** Persists a new / updated analysis. */
  save: (a: AnalysisResult) => Promise<void>;
  meta: AnalysisMeta;
  /** Set for combined (board / batch) reports: how many threads feed it. */
  threads?: number;
}>();
const emit = defineEmits<{ running: [boolean] }>();

const toast = useToast();
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const settingsLoaded = ref(false);
const running = ref(false);
const error = ref('');
const anglesRunning = ref(false);
const anglesError = ref('');
const hooksRunning = ref(false);

/** Report-form link for a failure here; the page is the collection's public source URL. */
function reportHref(message: string): string {
  return reportProblemUrl({ where: 'dashboard', platform: props.meta.platform, error: message, page: props.meta.url });
}

const canRun = computed(() => (props.meta.commentCount ?? 0) > 0);
const maxMentions = computed(() => Math.max(1, ...(props.analysis?.topThemes ?? []).map((x) => x.mentions)));

function themePct(n: number): number {
  return Math.max(6, Math.round((n / maxMentions.value) * 100));
}

const ready = getSettings().then((s) => {
  settings.value = s;
  settingsLoaded.value = true;
});
onMounted(() => ready);

let controller: AbortController | null = null;
let cancelled = false;
const estimateTip = ref('');

/** Real usage of the stored analysis, priced at today's table. */
const usedLine = computed(() => {
  const a = props.analysis;
  if (!a || !(a.tokensIn || a.tokensOut)) return '';
  const tokens = (a.tokensIn ?? 0) + (a.tokensOut ?? 0);
  const cost = costOf(a.model, a.tokensIn ?? 0, a.tokensOut ?? 0);
  return t('est.used', { n: tokens.toLocaleString(), cost: costText(cost, a.model) });
});

async function estimateFor(kind: EstimateKind, src: InsightsSource) {
  const o = await opts(src.instructions);
  return estimateRun(kind, src.comments, src.post, {
    model: o.model,
    instructions: o.instructions,
    prior: props.analysis,
    total: props.threads ? props.meta.commentCount : undefined,
  });
}

/** Precompute the run estimate for the button tooltip (shown even when confirms are off). */
async function refreshTip(): Promise<void> {
  try {
    const e = await estimateFor('analysis', await props.load());
    estimateTip.value = t('est.tip', { tokens: (e.inputTokens + e.outputTokens).toLocaleString(), cost: costText(e.cost, e.model) });
  } catch {
    estimateTip.value = '';
  }
}
watch(() => props.meta.commentCount, () => void refreshTip(), { immediate: true });

/** Estimate, ask (per the user's confirm setting), then hand back a signal for the call. */
async function begin(kind: EstimateKind, src: InsightsSource): Promise<AbortSignal | null> {
  const ok = await confirmRun(await estimateFor(kind, src));
  if (!ok) return null;
  controller = new AbortController();
  cancelled = false;
  return controller.signal;
}

function cancel(): void {
  cancelled = true;
  controller?.abort();
}

function failed(e: unknown, fallback: string): string | null {
  if (cancelled) {
    toast.success(t('est.cancelled'));
    return null;
  }
  return (e as Error).message || fallback;
}

async function opts(extra?: string): Promise<{ apiKey: string; model: string; instructions: string }> {
  await ready;
  return {
    apiKey: settings.value.openAiKey,
    model: settings.value.openAiModel,
    instructions: [extra, settings.value.analysisInstructions].filter((x) => x?.trim()).join('\n'),
  };
}

/** Whether a key is configured (callers decide whether to auto-run). */
async function hasKey(): Promise<boolean> {
  await ready;
  return !!settings.value.openAiKey;
}

async function run(): Promise<void> {
  await ready;
  if (!settings.value.openAiKey) {
    navigate('/settings');
    return;
  }
  if (running.value) return;
  error.value = '';
  const src = await props.load();
  const signal = await begin('analysis', src);
  if (!signal) return;
  running.value = true;
  emit('running', true);
  try {
    const result = await analyzeComments(src.comments, src.post, { ...(await opts(src.instructions)), signal });
    await props.save(result);
    toast.success('Analysis ready');
  } catch (e) {
    const msg = failed(e, 'Analysis failed.');
    if (msg) {
      error.value = msg;
      toast.error(msg);
    }
  } finally {
    running.value = false;
    emit('running', false);
    controller = null;
  }
}

async function exportAs(format: 'markdown' | 'clipboard'): Promise<void> {
  if (!props.analysis) return;
  const outcome = await exportAnalysis(format, props.analysis, props.meta);
  if (outcome.ok) toast.success(format === 'clipboard' ? 'Analysis copied to clipboard' : 'Analysis exported');
  else {
    const msg = format === 'clipboard' ? 'Copy failed.' : 'Export failed.';
    toast.errorWithReport(msg, reportHref(msg));
  }
}

async function copyAngles(): Promise<void> {
  const angles = props.analysis?.adAngles ?? [];
  if (!angles.length) return;
  const text = angles.map((a, i) => `${i + 1}. ${a.angle}${a.description ? `\n${a.description}` : ''}`).join('\n\n');
  await navigator.clipboard.writeText(text);
  toast.success(`Copied ${angles.length} angles`);
}

async function copyLanguage(): Promise<void> {
  const phrases = props.analysis?.customerLanguage ?? [];
  if (!phrases.length) return;
  await navigator.clipboard.writeText(phrases.map((p) => `"${p}"`).join('\n'));
  toast.success(`Copied ${phrases.length} phrases`);
}

async function regenHooks(): Promise<void> {
  const prior = props.analysis;
  if (!prior) return;
  if (!(await hasKey())) {
    navigate('/settings');
    return;
  }
  const src = await props.load();
  const signal = await begin('hooks', src);
  if (!signal) return;
  hooksRunning.value = true;
  try {
    const res = await generateHooks(src.comments, src.post, prior, { ...(await opts(src.instructions)), signal });
    if (!res.hooks.length) throw new Error('No hooks returned.');
    await props.save({
      ...prior,
      hooks: res.hooks,
      tokensIn: (prior.tokensIn ?? 0) + res.tokensIn,
      tokensOut: (prior.tokensOut ?? 0) + res.tokensOut,
    });
    toast.success('Hooks regenerated');
  } catch (e) {
    const msg = failed(e, 'Could not regenerate hooks.');
    if (msg) toast.errorWithReport(msg, reportHref(msg));
  } finally {
    hooksRunning.value = false;
    controller = null;
  }
}

async function runAngles(): Promise<void> {
  const prior = props.analysis;
  if (!prior) return;
  if (!(await hasKey())) {
    navigate('/settings');
    return;
  }
  anglesError.value = '';
  const src = await props.load();
  const signal = await begin('angles', src);
  if (!signal) return;
  anglesRunning.value = true;
  try {
    const res = await generateAdAngles(src.comments, src.post, prior, { ...(await opts(src.instructions)), signal });
    // Store alongside the analysis and add the new token usage onto the totals.
    await props.save({
      ...prior,
      adAngles: res.adAngles,
      tokensIn: (prior.tokensIn ?? 0) + res.tokensIn,
      tokensOut: (prior.tokensOut ?? 0) + res.tokensOut,
    });
    toast.success('Ad angles ready');
  } catch (e) {
    const msg = failed(e, 'Could not generate ad angles.');
    if (msg) {
      anglesError.value = msg;
      toast.error(msg);
    }
  } finally {
    anglesRunning.value = false;
    controller = null;
  }
}

defineExpose({ run, hasKey, running, cancel });
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
</style>
