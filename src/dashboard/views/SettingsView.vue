<template>
  <div class="animate-fade-up">
    <p class="mb-4 text-[13.5px] text-muted">{{ t('set.subtitle') }}</p>

    <div class="max-w-3xl space-y-4">
      <!-- OpenAI -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-[14px] font-semibold text-ink"><KeyRound class="h-4 w-4 text-commentgrab-violet" /> {{ t('set.openai') }}</h2>
        <p class="mt-1 text-[13px] text-muted">
          {{ t('set.openaiDesc') }}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="font-medium text-brand-600 hover:underline">platform.openai.com</a>.
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
              class="input h-9 !py-0 !pr-10 font-mono text-[13px]"
            />
            <button class="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink-soft" @click="showKey = !showKey">
              <component :is="showKey ? EyeOff : Eye" class="h-4 w-4" />
            </button>
          </div>
          <SpButton variant="secondary" class="!h-9 !py-0" :loading="testing" @click="testKey()">{{ t('common.test') }}</SpButton>
          <SpButton class="!h-9 !py-0" :icon="Check" @click="saveKey()">{{ t('common.save') }}</SpButton>
        </div>
        <p v-if="keyStatus" class="mt-2 flex items-center gap-1.5 text-sm" :class="keyStatus.ok ? 'text-emerald-600' : 'text-rose-600'">
          <component :is="keyStatus.ok ? CheckCircle2 : AlertCircle" class="h-4 w-4" /> {{ keyStatus.message }}
        </p>

        <label class="label mt-4">{{ t('set.model') }}</label>
        <SelectField v-model="form.openAiModel" class="min-w-[200px]">
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </SelectField>

        <label class="label mt-4">{{ t('set.confirm') }}</label>
        <div class="inline-flex flex-wrap rounded-lg border border-line bg-canvas-2 p-0.5 text-[12.5px] font-semibold" role="radiogroup" :aria-label="t('set.confirm')">
          <button
            v-for="m in confirmModes"
            :key="m.id"
            role="radio"
            :aria-checked="form.confirmAnalysis === m.id"
            class="rounded-md px-3 py-1.5 transition"
            :class="form.confirmAnalysis === m.id ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted hover:text-ink'"
            @click="form.confirmAnalysis = m.id"
          >{{ m.label }}</button>
        </div>
        <p class="mt-1.5 text-xs text-faint">{{ t('set.confirmDesc') }}</p>

        <label class="label mt-4">{{ t('set.language') }}</label>
        <SelectField v-model="form.language" class="min-w-[200px]" @change="setLocale(form.language)">
          <option v-for="l in LOCALES" :key="l.id" :value="l.id">{{ l.label }}</option>
        </SelectField>

        <label class="label mt-4">{{ t('set.customInstr') }} <span class="font-normal normal-case text-faint">({{ t('common.optional') }})</span></label>
        <textarea
          v-model="form.analysisInstructions"
          rows="3"
          :placeholder="t('set.customInstrPlaceholder')"
          class="input resize-none text-[13px]"
        />
        <p class="mt-1.5 text-xs text-faint">{{ t('set.customInstrExample') }}</p>
      </SpCard>

      <!-- Export defaults -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-[14px] font-semibold text-ink"><SlidersHorizontal class="h-4 w-4 text-commentgrab-violet" /> {{ t('set.exportDefaults') }}</h2>
        <p class="mt-1 text-[13px] text-muted">{{ t('set.exportDefaultsSub') }}</p>
        <div class="mt-4 divide-y divide-line">
          <div v-for="tg in exportToggles" :key="tg.key" class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-[13.5px] font-medium text-ink">{{ tg.label }}</div>
              <div class="text-xs text-faint">{{ tg.desc }}</div>
            </div>
            <SpToggle :model-value="form.export[tg.key]" @update:model-value="form.export[tg.key] = $event" />
          </div>
        </div>
      </SpCard>

      <!-- Widget -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-[14px] font-semibold text-ink"><LayoutPanelLeft class="h-4 w-4 text-commentgrab-violet" /> {{ t('set.widget') }}</h2>
        <div class="mt-4 divide-y divide-line">
          <div class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-[13.5px] font-medium text-ink">{{ t('set.widgetShow') }}</div>
              <div class="text-xs text-faint">{{ t('set.widgetShowDesc') }}</div>
            </div>
            <SpToggle v-model="form.widgetEnabled" />
          </div>
          <div class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-[13.5px] font-medium text-ink">{{ t('set.widgetPos') }}</div>
              <div class="text-xs text-faint">{{ t('set.widgetPosDesc') }}</div>
            </div>
            <div class="flex rounded-lg border border-line bg-canvas-2 p-0.5 text-xs font-semibold">
              <button
                v-for="pos in (['bottom-left','bottom-right'] as const)"
                :key="pos"
                class="rounded-md px-3 py-1.5 transition"
                :class="form.widgetPosition === pos ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted hover:text-ink'"
                @click="form.widgetPosition = pos"
              >{{ pos === 'bottom-left' ? t('set.bottomLeft') : t('set.bottomRight') }}</button>
            </div>
          </div>
          <div class="flex items-center justify-between py-3">
            <div class="pr-4">
              <div class="text-[13.5px] font-medium text-ink">{{ t('set.autoSave') }}</div>
              <div class="text-xs text-faint">{{ t('set.autoSaveDesc') }}</div>
            </div>
            <SpToggle v-model="form.autoSave" />
          </div>
        </div>
      </SpCard>

      <!-- Data -->
      <SpCard>
        <h2 class="flex items-center gap-2 text-[14px] font-semibold text-ink"><Database class="h-4 w-4 text-commentgrab-violet" /> {{ t('set.yourData') }}</h2>
        <p class="mt-1 text-[13px] text-muted">{{ t('set.dataSub') }}</p>
        <div class="mt-4">
          <div class="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
            <span>{{ formatBytes(usage.bytes) }} {{ t('set.used') }}</span>
            <span>{{ formatBytes(usage.quota) }} {{ t('set.available') }}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-canvas-2">
            <div class="h-full rounded-full bg-brand-500" :style="{ width: `${usagePct}%` }" />
          </div>
        </div>
        <SpButton variant="secondary" class="mt-4 hover:!text-rose-600" :icon="Trash2" @click="confirmClear = true">{{ t('set.clearAll') }}</SpButton>
      </SpCard>

      <!-- About -->
      <SpCard>
        <div class="flex items-center gap-2.5">
          <BrandMark :size="36" />
          <div>
            <div class="text-[15px] font-bold tracking-tight text-ink">CommentGrab <span class="font-medium text-faint">v{{ appVersion }}</span></div>
            <div class="text-xs text-muted">Free, source-available comment exporter · PolyForm Shield</div>
          </div>
        </div>
        <p class="mt-3 max-w-lg text-sm text-muted">
          Pull comments and reviews from Reddit, YouTube, Hacker News and Steam. Export to CSV, JSON or Markdown, and surface hooks, objections and customer language with OpenAI — all locally.
        </p>
      </SpCard>
    </div>

    <SpModal :open="confirmClear" :title="t('set.clearTitle')" :subtitle="t('set.clearSubtitle')" size="md" @close="confirmClear = false">
      <div class="px-6 py-5 text-sm text-muted">
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
import type { AppSettings, ConfirmMode, ExportSettings } from '@/shared/types';
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
import SelectField from '../components/SelectField.vue';

const toast = useToast();
const appVersion = chrome.runtime.getManifest().version;
const form = reactive<AppSettings>({ ...DEFAULT_SETTINGS, export: { ...DEFAULT_SETTINGS.export } });
const keyInput = ref('');
const showKey = ref(false);
const testing = ref(false);
const keyStatus = ref<{ ok: boolean; message: string } | null>(null);
const usage = ref({ bytes: 0, quota: 0 });
const confirmClear = ref(false);
const loaded = ref(false);

const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'];

const confirmModes = computed<Array<{ id: ConfirmMode; label: string }>>(() => [
  { id: 'always', label: t('set.confirmAlways') },
  { id: 'above', label: t('set.confirmAbove') },
  { id: 'never', label: t('set.confirmNever') },
]);

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
      confirmAnalysis: form.confirmAnalysis,
    });
  },
  { deep: true },
);
</script>
