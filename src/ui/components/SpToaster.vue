<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3 pr-4"
      >
        <span class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full" :class="iconWrap(t.type)">
          <component :is="iconFor(t.type)" class="h-3.5 w-3.5" />
        </span>
        <p class="flex-1 text-sm leading-snug text-ink-soft">{{ t.message }}</p>
        <button class="text-faint transition hover:text-muted" @click="dismiss(t.id)">
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next';
import { useToast, type ToastType } from '../composables/useToast';

const { toasts, dismiss } = useToast();

function iconFor(type: ToastType) {
  return type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;
}
function iconWrap(type: ToastType) {
  return type === 'success'
    ? 'bg-[#e7f5ec] text-[#1f7a45] dark:bg-[#1f7a45]/20 dark:text-[#6fcf97]'
    : type === 'error'
      ? 'bg-[#fdeaea] text-[#c23a3a] dark:bg-[#c23a3a]/20 dark:text-[#f08a8a]'
      : 'bg-commentgrab-soft text-commentgrab-violet';
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
