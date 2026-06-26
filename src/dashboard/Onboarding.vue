<template>
  <div class="commentgrab-bg flex min-h-screen items-center justify-center p-6 font-sans text-ink-900">
    <div class="w-full max-w-lg animate-fade-up">
      <div class="mb-6 flex items-center gap-3">
        <BrandMark :size="44" class="shadow-glow" />
        <div class="leading-none">
          <div class="text-xl font-bold tracking-tight"><span class="commentgrab-text">CommentGrab</span></div>
          <div class="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{{ t('nav.commentExporter') }}</div>
        </div>
      </div>

      <SpCard class="p-7">
        <h1 class="text-2xl font-bold tracking-tight text-ink-900">{{ t('onb.welcome') }}</h1>
        <p class="mt-2 text-sm leading-relaxed text-ink-500">{{ t('onb.subtitle') }}</p>

        <!-- language -->
        <div class="mt-6">
          <div class="text-sm font-bold text-ink-900">{{ t('onb.languageTitle') }}</div>
          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="l in LOCALES"
              :key="l.id"
              class="rounded-xl border px-3 py-2.5 text-sm font-semibold transition"
              :class="lang === l.id
                ? 'border-commentgrab-fuchsia/40 bg-commentgrab-soft text-commentgrab-violet'
                : 'border-black/[0.08] bg-white text-ink-600 hover:border-black/[0.16] hover:text-ink-900'"
              @click="pickLang(l.id)"
            >{{ l.label }}</button>
          </div>
          <p class="mt-2 text-xs text-ink-400">{{ t('onb.languageHint') }}</p>
        </div>

        <!-- api key (optional) -->
        <div class="mt-6">
          <div class="flex items-center gap-2 text-sm font-bold text-ink-900">
            {{ t('onb.apiTitle') }}
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">{{ t('onb.apiOptional') }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-ink-500">{{ t('onb.apiHint') }}</p>
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
          <button class="text-sm font-medium text-ink-400 transition hover:text-ink-700" @click="finish()">{{ t('onb.skipKey') }}</button>
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
