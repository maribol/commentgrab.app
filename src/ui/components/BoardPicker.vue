<template>
  <div :class="bare ? '' : 'rounded-xl border border-line bg-surface p-2.5'">
    <div v-if="!bare" class="col-label px-1">{{ t('common.boards') }}</div>
    <div v-if="boards.length" class="scroll-thin max-h-48 space-y-px overflow-y-auto" :class="bare ? '-mx-1.5' : ''">
      <button
        v-for="b in boards"
        :key="b.id"
        class="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-[13px] transition-colors hover:bg-canvas-2"
        :aria-pressed="selected.includes(b.id)"
        @click="toggle(b.id)"
      >
        <span
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
          :class="selected.includes(b.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-line-strong bg-surface'"
        >
          <Check v-if="selected.includes(b.id)" class="h-3 w-3" :stroke-width="3" />
        </span>
        <span class="truncate" :class="selected.includes(b.id) ? 'font-medium text-ink' : 'text-ink-soft'">{{ b.name }}</span>
      </button>
    </div>
    <p v-else class="pb-1 text-[12px] text-faint" :class="bare ? '' : 'px-1'">{{ t('common.noBoards') }}</p>

    <div class="mt-2 flex items-center gap-1.5" :class="bare ? '' : 'border-t border-line pt-2'">
      <input
        v-model="newName"
        type="text"
        :placeholder="t('common.newBoard')"
        class="h-8 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand-400"
        @keydown.enter.prevent="create"
      />
      <button
        class="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors"
        :class="newName.trim() ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-canvas-2 text-faint'"
        :disabled="!newName.trim()"
        @click="create"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('common.add') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Check, Plus } from 'lucide-vue-next';
import type { Board } from '@/shared/types';
import { listBoards, createBoard } from '@/shared/storage';
import { t } from '@/shared/i18n';

const props = defineProps<{ modelValue: string[]; /** Drop the card frame and title (the parent supplies them). */ bare?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [string[]] }>();

const boards = ref<Board[]>([]);
const newName = ref('');
const selected = ref<string[]>([...props.modelValue]);

onMounted(async () => {
  boards.value = await listBoards();
});

function emitSel(): void {
  emit('update:modelValue', [...selected.value]);
}

function toggle(id: string): void {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id];
  emitSel();
}

async function create(): Promise<void> {
  const name = newName.value.trim();
  if (!name) return;
  const b = await createBoard(name);
  newName.value = '';
  if (!boards.value.some((x) => x.id === b.id)) {
    boards.value = [...boards.value, b].sort((a, c) => a.name.localeCompare(c.name));
  }
  if (!selected.value.includes(b.id)) {
    selected.value = [...selected.value, b.id];
    emitSel();
  }
}

// Let parents commit a half-typed board name when the user confirms without
// clicking "Add" (misclick-friendly).
defineExpose({ flush: create });
</script>
