<template>
  <div class="animate-fade-up">
    <!-- ===================== PICKER ===================== -->
    <template v-if="!id">
      <header class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('an.title') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('an.pickerSubtitle') }}</p>
      </header>

      <div v-if="collections.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="c in collections"
          :key="c.id"
          class="flex flex-col rounded-2xl border border-black/[0.07] bg-white p-4 text-left transition hover:border-black/[0.16] hover:shadow-sm"
          @click="navigate(`/analyze/${c.id}`)"
        >
          <div class="flex items-start gap-3">
            <PlatformGlyph :platform="c.platform" :size="40" />
            <div class="min-w-0 flex-1">
              <div class="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{{ c.title }}</div>
              <div class="mt-0.5 text-xs text-ink-400">{{ c.commentCount.toLocaleString() }} {{ t('common.comments') }}</div>
            </div>
          </div>
          <div class="mt-4 flex items-center gap-1.5 border-t border-black/[0.05] pt-3 text-xs font-semibold" :class="c.analysis ? 'text-commentgrab-violet' : 'text-ink-400'">
            <component :is="c.analysis ? Sparkles : WandSparkles" class="h-3.5 w-3.5" />
            {{ c.analysis ? t('an.analyzedLabel') : t('an.notAnalyzed') }}
          </div>
        </button>
      </div>

      <SpEmpty
        v-else
        :icon="WandSparkles"
        :title="t('an.emptyTitle')"
        :description="t('an.emptyBody')"
      />
    </template>

    <!-- ===================== DETAIL ===================== -->
    <template v-else-if="collection">
      <button class="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900" @click="navigate('/analyze')">
        <ArrowLeft class="h-4 w-4" /> {{ t('common.allCollections') }}
      </button>

      <div class="flex items-start gap-4">
        <PlatformGlyph :platform="collection.platform" :size="48" />
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-bold leading-tight tracking-tight text-ink-900">{{ collection.title }}</h1>
          <div class="mt-1 text-sm text-ink-500">{{ platformLabel(collection.platform) }} · {{ collection.commentCount.toLocaleString() }} {{ t('common.comments') }}</div>
        </div>
        <div v-if="analysis" class="flex items-center gap-2">
          <SpButton variant="secondary" size="sm" :icon="FileText" @click="exportMd()">Export .md</SpButton>
          <SpButton variant="secondary" size="sm" :icon="Copy" @click="copyMd()">{{ t('common.copy') }}</SpButton>
          <SpButton variant="secondary" size="sm" :icon="RefreshCw" :loading="running" @click="run()">{{ t('an.reanalyze') }}</SpButton>
        </div>
      </div>

      <!-- no key -->
      <SpCard v-if="!settings.openAiKey" class="mt-5 p-6">
        <div class="flex items-center gap-2.5 text-base font-bold text-ink-900">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
            <KeyRound class="h-[18px] w-[18px] text-commentgrab-violet" />
          </span>
          {{ t('an.connectOpenAI') }}
        </div>
        <p class="mt-2 max-w-lg text-sm text-ink-500">{{ t('an.connectBody') }}</p>
        <SpButton class="mt-4" :icon="ArrowRight" @click="navigate('/settings')">{{ t('set.addApiKey') }}</SpButton>
      </SpCard>

      <!-- run CTA -->
      <SpCard v-else-if="!analysis" class="mt-5 flex flex-col items-center justify-center py-12 text-center">
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
          <WandSparkles class="h-7 w-7 text-commentgrab-violet" />
        </span>
        <h2 class="mt-4 text-lg font-bold text-ink-900">{{ t('an.runHeadline', { count: collection.commentCount.toLocaleString() }) }}</h2>
        <p class="mt-1 max-w-md text-sm text-ink-500">{{ t('an.runBody') }}</p>
        <SpButton class="mt-5" :icon="Sparkles" :loading="running" @click="run()">{{ running ? t('an.analyzing') : t('an.runAnalysis') }}</SpButton>
        <p v-if="error" class="mt-3 text-sm text-rose-600">{{ error }}</p>
        <p class="mt-2 text-xs text-ink-300">{{ t('an.using', { model: settings.openAiModel }) }}</p>
      </SpCard>

      <!-- results -->
      <div v-else class="mt-5 space-y-5">
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SpCard class="lg:col-span-2">
            <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-ink-900"><FileText class="h-4 w-4 text-commentgrab-violet" /> {{ t('an.summary') }}</h3>
            <p class="text-sm leading-relaxed text-ink-700">{{ analysis.summary || t('an.noSummary') }}</p>
          </SpCard>
          <SpCard>
            <h3 class="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><Gauge class="h-4 w-4 text-commentgrab-violet" /> {{ t('an.sentiment') }} <span class="ml-auto chip bg-commentgrab-soft text-ink-700">{{ analysis.sentiment.label }}</span></h3>
            <SentimentBar :sentiment="analysis.sentiment" />
          </SpCard>
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
        <SpCard>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-bold text-ink-900"><Megaphone class="h-4 w-4 text-commentgrab-violet" /> {{ t('an.adAngles') }}</h3>
            <div v-if="analysis.adAngles?.length" class="flex items-center gap-3">
              <button class="text-xs font-semibold text-ink-400 transition hover:text-commentgrab-violet" @click="copyAngles()">{{ t('common.copyAll') }}</button>
              <SpButton variant="secondary" size="sm" :icon="RefreshCw" :loading="anglesRunning" @click="runAngles()">{{ t('common.regenerate') }}</SpButton>
            </div>
          </div>

          <div v-if="analysis.adAngles?.length" class="space-y-2.5">
            <div v-for="(a, i) in analysis.adAngles" :key="i" class="rounded-xl border border-black/[0.06] bg-white p-3.5">
              <div class="flex items-start gap-2.5">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-commentgrab-soft text-[11px] font-bold text-commentgrab-violet">{{ i + 1 }}</span>
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-ink-900">{{ a.angle }}</div>
                  <div v-if="a.description" class="mt-0.5 text-sm leading-relaxed text-ink-600">{{ a.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-6 text-center">
            <p class="max-w-sm text-sm text-ink-500">{{ t('an.adAnglesEmpty') }}</p>
            <SpButton class="mt-3" size="sm" :icon="Sparkles" :loading="anglesRunning" @click="runAngles()">{{ anglesRunning ? t('an.analyzing') : t('an.generateAngles') }}</SpButton>
            <p v-if="anglesError" class="mt-2 text-sm text-rose-600">{{ anglesError }}</p>
          </div>
        </SpCard>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <InsightList :title="t('an.objections')" :icon="ShieldAlert" :items="analysis.objections" />
          <InsightList :title="t('an.triggers')" :icon="HeartPulse" :items="analysis.emotionalTriggers" />
          <InsightList :title="t('an.failed')" :icon="ThumbsDown" :items="analysis.failedSolutions" />

          <!-- customer language as chips -->
          <SpCard v-if="analysis.customerLanguage.length">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="flex items-center gap-2 text-sm font-bold text-ink-900"><MessageSquareQuote class="h-4 w-4 text-commentgrab-violet" /> {{ t('ov.customerLanguage') }}</h3>
              <button class="text-xs font-semibold text-ink-400 transition hover:text-commentgrab-violet" @click="copyLanguage()">{{ t('common.copyAll') }}</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="(p, i) in analysis.customerLanguage" :key="i" class="chip bg-slate-100 text-ink-700">"{{ p }}"</span>
            </div>
          </SpCard>
        </div>

        <!-- themes -->
        <SpCard v-if="analysis.topThemes.length">
          <h3 class="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900"><Hash class="h-4 w-4 text-commentgrab-violet" /> {{ t('an.themes') }}</h3>
          <div class="space-y-3">
            <div v-for="t in analysis.topThemes" :key="t.theme">
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="font-medium text-ink-700">{{ t.theme }}</span>
                <span class="text-ink-400">{{ t.mentions }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-commentgrab-violet" :style="{ width: `${themePct(t.mentions)}%` }" />
              </div>
            </div>
          </div>
        </SpCard>

        <p class="text-center text-xs text-ink-300">
          Analyzed {{ analysis.commentsAnalyzed }} comments with {{ analysis.model }} · {{ formatDateTime(analysis.createdAt) }}<template v-if="analysis.tokensIn || analysis.tokensOut"> · {{ (analysis.tokensIn ?? 0).toLocaleString() }} tokens in / {{ (analysis.tokensOut ?? 0).toLocaleString() }} out</template>
        </p>
      </div>
    </template>

    <SpEmpty v-else :icon="SearchX" :title="t('common.notFound')" :description="t('common.notFoundBody')" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ArrowLeft, ArrowRight, RefreshCw, KeyRound, WandSparkles, Sparkles, FileText, Gauge,
  Flame, ShieldAlert, HeartPulse, ThumbsDown, MessageSquareQuote, Hash, SearchX, Copy, Megaphone,
} from 'lucide-vue-next';
import type { AnalysisResult, AppSettings, SavedCollection } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings, listCollections, getCollection, updateCollection, takeAutoAnalyze } from '@/shared/storage';
import { platformLabel } from '@/shared/platform';
import { analyzeComments, generateAdAngles, generateHooks } from '@/shared/openai';
import { exportAnalysis } from '@/shared/export';
import { formatDateTime } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate } from '../router';
import { useToast } from '@/ui/composables/useToast';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import PlatformGlyph from '@/ui/components/PlatformGlyph.vue';
import SentimentBar from '../components/SentimentBar.vue';
import InsightList from '../components/InsightList.vue';

const props = defineProps<{ id?: string }>();
const toast = useToast();

const collections = ref<SavedCollection[]>([]);
const collection = ref<SavedCollection | null>(null);
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const running = ref(false);
const error = ref('');
const anglesRunning = ref(false);
const anglesError = ref('');
const hooksRunning = ref(false);

const analysis = computed<AnalysisResult | null>(() => collection.value?.analysis ?? null);
const maxMentions = computed(() => Math.max(1, ...(analysis.value?.topThemes ?? []).map((t) => t.mentions)));

function themePct(n: number): number {
  return Math.max(6, Math.round((n / maxMentions.value) * 100));
}

async function load(): Promise<void> {
  settings.value = await getSettings();
  error.value = '';
  if (props.id) {
    collection.value = (await getCollection(props.id)) ?? null;
    // Auto-run when opened via the widget/popup "Analyze" action.
    const auto = await takeAutoAnalyze();
    if (auto === props.id && collection.value && !collection.value.analysis && settings.value.openAiKey) {
      void run();
    }
  } else {
    collections.value = await listCollections();
  }
}

watch(() => props.id, load, { immediate: true });

async function run(): Promise<void> {
  if (!collection.value) return;
  if (!settings.value.openAiKey) {
    navigate('/settings');
    return;
  }
  running.value = true;
  error.value = '';
  try {
    const result = await analyzeComments(collection.value.comments, collection.value.post, {
      apiKey: settings.value.openAiKey,
      model: settings.value.openAiModel,
      instructions: settings.value.analysisInstructions,
    });
    await updateCollection(collection.value.id, { analysis: result });
    collection.value = { ...collection.value, analysis: result };
    toast.success('Analysis ready');
  } catch (e) {
    error.value = (e as Error).message || 'Analysis failed.';
    toast.error(error.value);
  } finally {
    running.value = false;
  }
}

async function exportAnalysisAs(format: 'markdown' | 'clipboard'): Promise<void> {
  const c = collection.value;
  if (!c?.analysis) return;
  const outcome = await exportAnalysis(format, c.analysis, {
    title: c.title,
    platform: c.platform,
    url: c.url,
    commentCount: c.commentCount,
  });
  if (outcome.ok) {
    toast.success(format === 'clipboard' ? 'Analysis copied to clipboard' : 'Analysis exported');
  } else {
    toast.error(format === 'clipboard' ? 'Copy failed.' : 'Export failed.');
  }
}

const exportMd = (): Promise<void> => exportAnalysisAs('markdown');
const copyMd = (): Promise<void> => exportAnalysisAs('clipboard');

async function copyAngles(): Promise<void> {
  const angles = collection.value?.analysis?.adAngles ?? [];
  if (!angles.length) return;
  const text = angles.map((a, i) => `${i + 1}. ${a.angle}${a.description ? `\n${a.description}` : ''}`).join('\n\n');
  await navigator.clipboard.writeText(text);
  toast.success(`Copied ${angles.length} angles`);
}

async function copyLanguage(): Promise<void> {
  const phrases = collection.value?.analysis?.customerLanguage ?? [];
  if (!phrases.length) return;
  await navigator.clipboard.writeText(phrases.map((p) => `"${p}"`).join('\n'));
  toast.success(`Copied ${phrases.length} phrases`);
}

async function regenHooks(): Promise<void> {
  const c = collection.value;
  if (!c?.analysis) return;
  if (!settings.value.openAiKey) {
    navigate('/settings');
    return;
  }
  hooksRunning.value = true;
  try {
    const res = await generateHooks(c.comments, c.post, c.analysis, {
      apiKey: settings.value.openAiKey,
      model: settings.value.openAiModel,
      instructions: settings.value.analysisInstructions,
    });
    if (!res.hooks.length) throw new Error('No hooks returned.');
    const updated = {
      ...c.analysis,
      hooks: res.hooks,
      tokensIn: (c.analysis.tokensIn ?? 0) + res.tokensIn,
      tokensOut: (c.analysis.tokensOut ?? 0) + res.tokensOut,
    };
    await updateCollection(c.id, { analysis: updated });
    collection.value = { ...c, analysis: updated };
    toast.success('Hooks regenerated');
  } catch (e) {
    toast.error((e as Error).message || 'Could not regenerate hooks.');
  } finally {
    hooksRunning.value = false;
  }
}

async function runAngles(): Promise<void> {
  const c = collection.value;
  if (!c?.analysis) return;
  if (!settings.value.openAiKey) {
    navigate('/settings');
    return;
  }
  anglesRunning.value = true;
  anglesError.value = '';
  try {
    const res = await generateAdAngles(c.comments, c.post, c.analysis, {
      apiKey: settings.value.openAiKey,
      model: settings.value.openAiModel,
      instructions: settings.value.analysisInstructions,
    });
    // Store alongside the analysis and add the new token usage onto the totals.
    const updated = {
      ...c.analysis,
      adAngles: res.adAngles,
      tokensIn: (c.analysis.tokensIn ?? 0) + res.tokensIn,
      tokensOut: (c.analysis.tokensOut ?? 0) + res.tokensOut,
    };
    await updateCollection(c.id, { analysis: updated });
    collection.value = { ...c, analysis: updated };
    toast.success('Ad angles ready');
  } catch (e) {
    anglesError.value = (e as Error).message || 'Could not generate ad angles.';
    toast.error(anglesError.value);
  } finally {
    anglesRunning.value = false;
  }
}
</script>
