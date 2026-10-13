<template>
  <SpModal :open="confirmState.open" :title="title" size="md" @close="settleConfirm(false)">
    <div v-if="est" class="px-6 py-5">
      <dl class="divide-y divide-line overflow-hidden rounded-lg border border-line text-[13px]">
        <div class="flex items-center justify-between gap-4 px-3.5 py-2">
          <dt class="text-muted">{{ t('est.model') }}</dt>
          <dd class="flex items-center gap-2">
            <span class="font-mono text-[12.5px] text-ink">{{ est.model }}</span>
            <button class="text-[12px] font-medium text-commentgrab-violet hover:underline" @click="changeModel()">{{ t('est.change') }}</button>
          </dd>
        </div>
        <div v-if="est.requests > 1" class="flex items-center justify-between gap-4 px-3.5 py-2">
          <dt class="text-muted">{{ t('est.requests') }}</dt>
          <dd class="font-mono text-[12.5px] text-ink">{{ est.requests }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 px-3.5 py-2">
          <dt class="text-muted">{{ t('est.comments') }}</dt>
          <dd class="text-right text-ink">
            {{ est.sent < est.total ? t('est.sampled', { n: est.sent.toLocaleString(), m: est.total.toLocaleString() }) : t('est.all', { n: est.sent.toLocaleString() }) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 px-3.5 py-2">
          <dt class="text-muted">{{ t('est.input') }}</dt>
          <dd class="font-mono text-[12.5px] text-ink">{{ t('est.about', { v: est.inputTokens.toLocaleString() }) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 px-3.5 py-2">
          <dt class="text-muted">{{ t('est.output') }}</dt>
          <dd class="font-mono text-[12.5px] text-ink">{{ t(est.outputIsCap ? 'est.upTo' : 'est.about', { v: est.outputTokens.toLocaleString() }) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 bg-canvas px-3.5 py-2.5">
          <dt class="font-medium text-ink">{{ t('est.cost') }}</dt>
          <dd class="font-semibold text-ink">
            <span :class="est.cost === null ? 'font-normal text-muted' : ''">{{ costText(est.cost, est.model) }}</span>
          </dd>
        </div>
      </dl>
      <p class="mt-3 flex items-start gap-1.5 text-[12.5px] text-muted">
        <ShieldCheck class="mt-px h-3.5 w-3.5 shrink-0 text-faint" /> {{ t('est.note') }}
      </p>
      <div class="mt-4 space-y-2">
        <label class="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
          <input v-model="skipCheap" type="checkbox" class="h-[15px] w-[15px] cursor-pointer accent-brand-500" :disabled="skipAll" />
          {{ t('est.skipCheap') }}
        </label>
        <label class="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
          <input v-model="skipAll" type="checkbox" class="h-[15px] w-[15px] cursor-pointer accent-brand-500" />
          {{ t('est.skipAll') }}
        </label>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button class="btn-secondary btn-sm" @click="settleConfirm(false)">{{ t('common.cancel') }}</button>
        <button ref="okBtn" class="btn-primary btn-sm" @click="accept()">
          <Sparkles class="h-3.5 w-3.5" /> {{ est?.kind === 'analysis' ? t('est.confirm') : t('est.confirmGenerate') }}
        </button>
      </div>
    </template>
  </SpModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ShieldCheck, Sparkles } from 'lucide-vue-next';
import { saveSettings } from '@/shared/storage';
import { t } from '@/shared/i18n';
import { confirmState, settleConfirm, costText } from '../confirm';
import { navigate } from '../router';
import SpModal from '@/ui/components/SpModal.vue';

const est = computed(() => confirmState.estimate);
const skipCheap = ref(false);
const skipAll = ref(false);
const okBtn = ref<HTMLButtonElement | null>(null);

const title = computed(() => {
  const e = est.value;
  if (!e) return '';
  if (e.requests > 1) return t('est.titleBulk', { n: e.requests });
  if (e.kind === 'angles') return t('est.titleAngles');
  if (e.kind === 'hooks') return t('est.titleHooks');
  return t('est.title');
});

watch(
  () => confirmState.open,
  async (open) => {
    if (!open) return;
    skipCheap.value = false;
    skipAll.value = false;
    await nextTick();
    okBtn.value?.focus();
  },
);

async function accept(): Promise<void> {
  if (skipAll.value) await saveSettings({ confirmAnalysis: 'never' });
  else if (skipCheap.value) await saveSettings({ confirmAnalysis: 'above' });
  settleConfirm(true);
}

function changeModel(): void {
  settleConfirm(false);
  navigate('/settings');
}
</script>
