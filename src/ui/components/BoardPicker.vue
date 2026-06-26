<template>
  <div class="rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-lg">
    <div class="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('common.boards') }}</div>
    <div v-if="boards.length" class="scroll-thin max-h-40 space-y-0.5 overflow-y-auto">
      <button
        v-for="b in boards"
        :key="b.id"
        class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-black/[0.03]"
        @click="toggle(b.id)"
      >
        <span
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
          :class="selected.includes(b.id) ? 'border-commentgrab-violet bg-commentgrab-violet text-white' : 'border-black/20'"
        >
          <Check v-if="selected.includes(b.id)" class="h-3 w-3" />
        </span>
        <span class="truncate text-ink-800">{{ b.name }}</span>
      </button>
    </div>
    <p v-else class="px-1 pb-1 text-xs text-ink-400">{{ t('common.noBoards') }}</p>

    <div class="mt-1.5 flex items-center gap-1.5 border-t border-black/[0.06] pt-1.5">
      <input
        v-model="newName"
        type="text"
        :placeholder="t('common.newBoard')"
        class="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none transition focus:border-commentgrab-fuchsia/60"
        @keydown.enter.prevent="create"
      />
      <button
        class="rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-700 disabled:opacity-40"
        :disabled="!newName.trim()"
        @click="create"
      >
        {{ t('common.add') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Check } from 'lucide-vue-next';
import type { Board } from '@/shared/types';
import { listBoards, createBoard } from '@/shared/storage';
import { t } from '@/shared/i18n';

const props = defineProps<{ modelValue: string[] }>();
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
