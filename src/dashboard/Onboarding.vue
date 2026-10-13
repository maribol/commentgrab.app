<template>
  <div class="flex min-h-screen items-center bg-shell justify-center p-6 font-sans text-ink">
    <div class="w-full max-w-lg animate-fade-up">
      <div class="mb-6 flex items-center gap-3">
        <BrandMark :size="36" />
        <img :src="wordmark" alt="CommentGrab" class="h-6 w-auto dark:hidden" />
        <img :src="wordmarkDark" alt="CommentGrab" class="hidden h-6 w-auto dark:block" />
      </div>

      <SpCard class="p-7">
        <h1 class="text-[22px] font-semibold tracking-tight text-ink">{{ t('onb.welcome') }}</h1>
        <p class="mt-2 text-sm leading-relaxed text-muted">{{ t('onb.subtitle') }}</p>

        <!-- language -->
        <div class="mt-6">
          <div class="text-sm font-semibold text-ink">{{ t('onb.languageTitle') }}</div>
          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="l in LOCALES"
              :key="l.id"
              class="rounded-lg border px-3 py-2.5 text-sm font-semibold transition"
              :class="lang === l.id
                ? 'border-brand-200 bg-brand-50 text-brand-600'
                : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'"
              @click="pickLang(l.id)"
            >{{ l.label }}</button>
          </div>
          <p class="mt-2 text-xs text-faint">{{ t('onb.languageHint') }}</p>
        </div>

        <!-- api key (optional) -->
        <div class="mt-6">
          <div class="flex items-center gap-2 text-sm font-semibold text-ink">
            {{ t('onb.apiTitle') }}
            <span class="rounded-md bg-canvas-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">{{ t('onb.apiOptional') }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-muted">{{ t('onb.apiHint') }}</p>
          <div class="mt-3 flex gap-2">
            <input
              v-model="key"
              type="password"
              :placeholder="t('onb.apiPlaceholder')"
              autocomplete="off"
              spellcheck="false"
              class="input font-mono"
            />
            <SpButton variant="secondary" :loading="testing" @click="test()">{{ t('common.test') }}</SpButton>
          </div>
          <p v-if="status" class="mt-2 text-sm" :class="status.ok ? 'text-emerald-600' : 'text-amber-600'">{{ status.msg }}</p>
        </div>

        <div class="mt-7 flex items-center justify-end gap-4">
          <button class="text-sm font-medium text-faint transition hover:text-ink-soft" @click="finish()">{{ t('onb.skipKey') }}</button>
          <SpButton :icon="ArrowRight" @click="finish()">{{ t('onb.getStarted') }}</SpButton>
        </div>
      </SpCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ArrowRight } from 'lucide-vue-next';
import type { AppSettings } from '@/shared/types';
import { t, setLocale, LOCALES, type Locale } from '@/shared/i18n';
import { getSettings, saveSettings } from '@/shared/storage';
import { testApiKey, sanitizeKey } from '@/shared/openai';
import { navigate } from './router';
import SpCard from '@/ui/components/SpCard.vue';
import SpButton from '@/ui/components/SpButton.vue';
import BrandMark from '@/ui/components/BrandMark.vue';
import wordmark from '@/assets/brand/wordmark.svg';
import wordmarkDark from '@/assets/brand/wordmark-dark.svg';

const lang = ref<Locale>('en');
const key = ref('');
const testing = ref(false);
const status = ref<{ ok: boolean; msg: string } | null>(null);

getSettings().then((s) => {
  lang.value = (LOCALES.some((l) => l.id === s.language) ? s.language : 'en') as Locale;
  key.value = s.openAiKey || '';
});

function pickLang(l: Locale): void {
  lang.value = l;
  setLocale(l); // live-preview the language as you pick
}

async function test(): Promise<void> {
  testing.value = true;
  status.value = null;
  const r = await testApiKey(key.value);
  testing.value = false;
  status.value = { ok: r.ok, msg: r.ok ? t('onb.keySaved') : r.error || t('onb.keyInvalid') };
}

async function finish(): Promise<void> {
  const patch: Partial<AppSettings> = { language: lang.value };
  if (key.value.trim()) patch.openAiKey = sanitizeKey(key.value);
  await saveSettings(patch);
  setLocale(lang.value);
  navigate('/');
}
</script>
