<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" @keydown.esc="emit('close')">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="emit('close')" />
        <div
          class="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
          :class="widthClass"
        >
          <header v-if="$slots.header || title" class="flex items-center justify-between gap-4 border-b border-black/5 px-6 py-4">
            <div class="min-w-0">
              <slot name="header">
                <h2 class="truncate text-base font-semibold text-ink-900">{{ title }}</h2>
                <p v-if="subtitle" class="truncate text-sm text-ink-400">{{ subtitle }}</p>
              </slot>
            </div>
            <button class="btn-ghost -mr-2 h-8 w-8 rounded-lg p-0" @click="emit('close')">
              <X class="h-4 w-4" />
            </button>
          </header>
          <div class="scroll-thin min-h-0 flex-1 overflow-y-auto">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="border-t border-black/5 px-6 py-4">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{ open: boolean; title?: string; subtitle?: string; size?: 'md' | 'lg' | 'xl' }>(),
  { size: 'lg' },
);
const emit = defineEmits<{ close: [] }>();

const widthClass = computed(
  () => ({ md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' })[props.size],
);
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
