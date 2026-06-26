<template>
  <div class="animate-fade-up">
    <header class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('set.title') }}</h1>
      <p class="mt-1 text-sm text-ink-500">{{ t('set.subtitle') }}</p>
    </header>

    <div class="space-y-5">
      <!-- OpenAI -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-base font-bold text-ink-900"><KeyRound class="h-4.5 w-4.5 text-commentgrab-violet" /> {{ t('set.openai') }}</h2>
        <p class="mt-1 text-sm text-ink-500">
          {{ t('set.openaiDesc') }}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="font-medium text-commentgrab-violet hover:underline">platform.openai.com</a>.
        </p>

        <label class="label mt-4">{{ t('set.apiKey') }}</label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              v-model="keyInput"
              :type="showKey ? 'text' : 'password'"
              placeholder="sk-…"
              autocomplete="off"
              spellcheck="false"
              class="input !pr-10 font-mono"
            />
            <button class="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700" @click="showKey = !showKey">
              <component :is="showKey ? EyeOff : Eye" class="h-4 w-4" />
            </button>
          </div>
          <SpButton variant="secondary" :loading="testing" @click="testKey()">{{ t('common.test') }}</SpButton>
          <SpButton :icon="Check" @click="saveKey()">{{ t('common.save') }}</SpButton>
        </div>
        <p v-if="keyStatus" class="mt-2 flex items-center gap-1.5 text-sm" :class="keyStatus.ok ? 'text-emerald-600' : 'text-rose-600'">
          <component :is="keyStatus.ok ? CheckCircle2 : AlertCircle" class="h-4 w-4" /> {{ keyStatus.message }}
        </p>

        <label class="label mt-4">{{ t('set.model') }}</label>
        <select v-model="form.openAiModel" class="input !w-auto">
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>

        <label class="label mt-4">{{ t('set.language') }}</label>
        <select v-model="form.language" class="input !w-auto" @change="setLocale(form.language)">
          <option v-for="l in LOCALES" :key="l.id" :value="l.id">{{ l.label }}</option>
        </select>

        <label class="label mt-4">{{ t('set.customInstr') }} <span class="font-normal normal-case text-ink-400">({{ t('common.optional') }})</span></label>
        <textarea
          v-model="form.analysisInstructions"
          rows="3"
          :placeholder="t('set.customInstrPlaceholder')"
          class="input resize-none"
        />
        <p class="mt-1.5 text-xs text-ink-400">{{ t('set.customInstrExample') }}</p>
      </SpCard>

      <!-- Export defaults -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-base font-bold text-ink-900"><SlidersHorizontal class="h-4.5 w-4.5 text-commentgrab-violet" /> {{ t('set.exportDefaults') }}</h2>
        <p class="mt-1 text-sm text-ink-500">{{ t('set.exportDefaultsSub') }}</p>
        <div class="mt-4 divide-y divide-black/[0.05]">
          <div v-for="tg in exportToggles" :key="tg.key" class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-sm font-medium text-ink-900">{{ tg.label }}</div>
              <div class="text-xs text-ink-400">{{ tg.desc }}</div>
            </div>
            <SpToggle :model-value="form.export[tg.key]" @update:model-value="form.export[tg.key] = $event" />
          </div>
        </div>
      </SpCard>

      <!-- Widget -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-base font-bold text-ink-900"><LayoutPanelLeft class="h-4.5 w-4.5 text-commentgrab-violet" /> {{ t('set.widget') }}</h2>
        <div class="mt-4 divide-y divide-black/[0.05]">
          <div class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-sm font-medium text-ink-900">{{ t('set.widgetShow') }}</div>
              <div class="text-xs text-ink-400">{{ t('set.widgetShowDesc') }}</div>
            </div>
            <SpToggle v-model="form.widgetEnabled" />
          </div>
          <div class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-sm font-medium text-ink-900">{{ t('set.widgetPos') }}</div>
              <div class="text-xs text-ink-400">{{ t('set.widgetPosDesc') }}</div>
            </div>
            <div class="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                v-for="pos in (['bottom-left','bottom-right'] as const)"
                :key="pos"
                class="rounded-lg px-3 py-1.5 transition"
                :class="form.widgetPosition === pos ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-700'"
                @click="form.widgetPosition = pos"
              >{{ pos === 'bottom-left' ? t('set.bottomLeft') : t('set.bottomRight') }}</button>
            </div>
          </div>
          <div class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-sm font-medium text-ink-900">{{ t('set.autoSave') }}</div>
              <div class="text-xs text-ink-400">{{ t('set.autoSaveDesc') }}</div>
            </div>
            <SpToggle v-model="form.autoSave" />
          </div>
        </div>
      </SpCard>

      <!-- Data -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-base font-bold text-ink-900"><Database class="h-4.5 w-4.5 text-commentgrab-violet" /> {{ t('set.yourData') }}</h2>
        <p class="mt-1 text-sm text-ink-500">{{ t('set.dataSub') }}</p>
        <div class="mt-4">
          <div class="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-500">
            <span>{{ formatBytes(usage.bytes) }} {{ t('set.used') }}</span>
            <span>{{ formatBytes(usage.quota) }} {{ t('set.available') }}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-commentgrab" :style="{ width: `${usagePct}%` }" />
          </div>
        </div>
        <SpButton variant="secondary" class="mt-4 hover:!text-rose-600" :icon="Trash2" @click="confirmClear = true">{{ t('set.clearAll') }}</SpButton>
      </SpCard>

      <!-- About -->
      <SpCard class="p-6">
        <div class="flex items-center gap-2.5">
          <BrandMark :size="36" class="shadow-glow" />
          <div>
            <div class="text-base font-bold"><span class="commentgrab-text">CommentGrab</span> <span class="text-ink-400">v1.0.0</span></div>
            <div class="text-xs text-ink-500">Free, source-available comment exporter · PolyForm Shield</div>
          </div>
        </div>
        <p class="mt-3 max-w-lg text-sm text-ink-500">
          Pull comments and reviews from Reddit, YouTube, Hacker News and Steam. Export to CSV, JSON or Markdown, and surface hooks, objections and customer language with OpenAI — all locally.
        </p>
      </SpCard>
    </div>

    <SpModal :open="confirmClear" :title="t('set.clearTitle')" :subtitle="t('set.clearSubtitle')" size="md" @close="confirmClear = false">
      <div class="px-6 py-5 text-sm text-ink-600">
        {{ t('set.clearBody') }}
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <SpButton variant="secondary" @click="confirmClear = false">{{ t('common.cancel') }}</SpButton>
          <button class="btn bg-rose-600 text-white hover:bg-rose-700" @click="clearData()">{{ t('set.deleteEverything') }}</button>
        </div>
      </template>
    </SpModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  KeyRound, Eye, EyeOff, Check, CheckCircle2, AlertCircle, SlidersHorizontal,
  LayoutPanelLeft, Database, Trash2,
} from 'lucide-vue-next';
import type { AppSettings, ExportSettings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { getSettings, saveSettings, estimateUsage, clearAllData } from '@/shared/storage';
import { t, setLocale, LOCALES } from '@/shared/i18n';
import { testApiKey, sanitizeKey } from '@/shared/openai';
import { useToast } from '@/ui/composables/useToast';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import SpToggle from '@/ui/components/SpToggle.vue';
import SpModal from '@/ui/components/SpModal.vue';
import BrandMark from '@/ui/components/BrandMark.vue';

const toast = useToast();
const form = reactive<AppSettings>({ ...DEFAULT_SETTINGS, export: { ...DEFAULT_SETTINGS.export } });
const keyInput = ref('');
const showKey = ref(false);
const testing = ref(false);
const keyStatus = ref<{ ok: boolean; message: string } | null>(null);
const usage = ref({ bytes: 0, quota: 0 });
const confirmClear = ref(false);
const loaded = ref(false);

const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'];

const exportToggles = computed<Array<{ key: keyof ExportSettings; label: string; desc: string }>>(() => [
  { key: 'includePostInfo', label: t('set.tgPostInfo'), desc: t('set.tgPostInfoDesc') },
  { key: 'includeMetadata', label: t('set.tgMeta'), desc: t('set.tgMetaDesc') },
  { key: 'includeScores', label: t('set.tgScores'), desc: t('set.tgScoresDesc') },
  { key: 'includePermalinks', label: t('set.tgPermalinks'), desc: t('set.tgPermalinksDesc') },
  { key: 'includeLinks', label: t('set.tgLinks'), desc: t('set.tgLinksDesc') },
  { key: 'preserveThreads', label: t('set.tgThreads'), desc: t('set.tgThreadsDesc') },
]);

const usagePct = computed(() => {
  if (!usage.value.quota) return 2;
  return Math.min(100, Math.max(2, Math.round((usage.value.bytes / usage.value.quota) * 100)));
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function refreshUsage(): Promise<void> {
  usage.value = await estimateUsage();
}

async function saveKey(): Promise<void> {
  const key = sanitizeKey(keyInput.value);
  keyInput.value = key;
  await saveSettings({ openAiKey: key });
  form.openAiKey = key;
  keyStatus.value = { ok: true, message: t('set.keySaved') };
  toast.success('API key saved');
}

async function testKey(): Promise<void> {
  testing.value = true;
  keyStatus.value = null;
  const result = await testApiKey(keyInput.value);
  testing.value = false;
  keyStatus.value = { ok: result.ok, message: result.ok ? t('set.keyValid') : result.error || t('set.keyFailed') };
  if (result.ok) await saveKey();
}

async function clearData(): Promise<void> {
  await clearAllData();
  confirmClear.value = false;
  await refreshUsage();
  toast.success('All data cleared');
}

onMounted(async () => {
  const s = await getSettings();
  Object.assign(form, s, { export: { ...s.export } });
  keyInput.value = s.openAiKey;
  await refreshUsage();
  loaded.value = true;
});

watch(
  form,
  () => {
    if (!loaded.value) return;
    saveSettings({
      openAiModel: form.openAiModel,
      export: { ...form.export },
      widgetEnabled: form.widgetEnabled,
      widgetPosition: form.widgetPosition,
      autoSave: form.autoSave,
      analysisInstructions: form.analysisInstructions,
      language: form.language,
    });
  },
  { deep: true },
);
</script>
