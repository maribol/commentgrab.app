<template>
  <Teleport to="body">
    <Transition name="palette">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/40 px-4 pt-[12vh] backdrop-blur-sm"
        @click.self="close"
      >
        <div class="w-full max-w-xl overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl">
          <!-- input -->
          <div class="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5">
            <Search class="h-4.5 w-4.5 shrink-0 text-ink-300" />
            <input
              ref="inputEl"
              v-model="query"
              type="text"
              :placeholder="t('nav.searchSaved')"
              class="flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-300"
              @keydown="onKey"
            />
            <kbd class="rounded border border-black/10 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">esc</kbd>
          </div>

          <!-- results -->
          <div ref="listEl" class="scroll-thin max-h-[56vh] overflow-y-auto py-2">
            <template v-for="row in rows" :key="row.key">
              <div v-if="row.type === 'header'" class="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">
                {{ row.label }}
              </div>
              <button
                v-else
                :data-idx="row.index"
                class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition"
                :class="row.index === selected ? 'bg-commentgrab-soft' : 'hover:bg-black/[0.03]'"
                @mousemove="selected = row.index"
                @click="choose(row.item)"
              >
                <img v-if="row.item.favicon" :src="row.item.favicon" alt="" class="h-5 w-5 shrink-0 rounded" />
                <PlatformGlyph v-else-if="row.item.platform" :platform="row.item.platform" :size="22" />
                <component :is="row.item.icon" v-else class="h-[18px] w-[18px] shrink-0 text-ink-400" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-ink-900">{{ row.item.label }}</div>
                  <div v-if="row.item.sub" class="truncate text-xs text-ink-400">{{ row.item.sub }}</div>
                </div>
                <span class="shrink-0 text-[11px] font-medium text-ink-300">{{ row.item.group }}</span>
              </button>
            </template>

            <div v-if="!flat.length" class="px-4 py-10 text-center text-sm text-ink-400">{{ t('cmd.noMatches') }}</div>
          </div>

          <!-- footer -->
          <div class="flex items-center gap-4 border-t border-black/[0.06] bg-slate-50/70 px-4 py-2.5 text-[11px] text-ink-400">
            <span class="flex items-center gap-1"><kbd class="rounded border border-black/10 bg-white px-1 py-0.5">↑</kbd><kbd class="rounded border border-black/10 bg-white px-1 py-0.5">↓</kbd> {{ t('cmd.navigate') }}</span>
            <span class="flex items-center gap-1"><kbd class="rounded border border-black/10 bg-white px-1 py-0.5">↵</kbd> {{ t('cmd.select') }}</span>
            <span class="flex items-center gap-1"><kbd class="rounded border border-black/10 bg-white px-1 py-0.5">esc</kbd> {{ t('cmd.close') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from 'vue';
import { Search, LayoutDashboard, Bookmark, History, WandSparkles, Settings } from 'lucide-vue-next';
import type { PlatformId, SavedCollection } from '@/shared/types';
import { faviconUrl } from '@/shared/util';
import { navigate } from '../router';
import { t } from '@/shared/i18n';

const props = defineProps<{ open: boolean; collections: SavedCollection[] }>();
const emit = defineEmits<{ 'update:open': [boolean] }>();

interface Item {
  kind: 'page' | 'collection';
  label: string;
  sub?: string;
  group: string;
  path?: string;
  id?: string;
  icon?: Component;
  platform?: PlatformId;
  favicon?: string;
}

const PAGES: Array<{ labelKey: string; path: string; icon: Component }> = [
  { labelKey: 'nav.overview', path: '/', icon: LayoutDashboard },
  { labelKey: 'nav.saved', path: '/saved', icon: Bookmark },
  { labelKey: 'nav.history', path: '/history', icon: History },
  { labelKey: 'nav.analyze', path: '/analyze', icon: WandSparkles },
  { labelKey: 'nav.settings', path: '/settings', icon: Settings },
];

const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const query = ref('');
const selected = ref(0);

const groups = computed(() => {
  const q = query.value.trim().toLowerCase();
  const pages: Item[] = PAGES.filter((p) => !q || t(p.labelKey).toLowerCase().includes(q)).map((p) => ({
    kind: 'page',
    label: t(p.labelKey),
    path: p.path,
    icon: p.icon,
    group: t('cmd.pageTag'),
  }));
  const cols = (
    q
      ? props.collections.filter((c) => `${c.title} ${c.source}`.toLowerCase().includes(q))
      : [...props.collections].sort((a, b) => b.updatedAt - a.updatedAt)
  )
    .slice(0, 8)
    .map<Item>((c) => ({
      kind: 'collection',
      label: c.title,
      sub: c.source || '',
      id: c.id,
      platform: c.platform,
      favicon: faviconUrl(c.url),
      group: t('cmd.collectionTag'),
    }));

  const out: Array<{ label: string; items: Item[] }> = [];
  if (pages.length) out.push({ label: t('cmd.pages'), items: pages });
  if (cols.length) out.push({ label: q ? t('cmd.collections') : t('cmd.recent'), items: cols });
  return out;
});

const flat = computed(() => groups.value.flatMap((g) => g.items));

const rows = computed(() => {
  const out: Array<
    { type: 'header'; label: string; key: string } | { type: 'item'; item: Item; index: number; key: string }
  > = [];
  let idx = 0;
  for (const g of groups.value) {
    out.push({ type: 'header', label: g.label, key: `h-${g.label}` });
    for (const it of g.items) {
      out.push({ type: 'item', item: it, index: idx, key: `i-${idx}` });
      idx++;
    }
  }
  return out;
});

function close(): void {
  emit('update:open', false);
}

function choose(item: Item): void {
  navigate(item.kind === 'page' ? item.path! : `/saved/${item.id}`);
  close();
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (flat.value.length) selected.value = (selected.value + 1) % flat.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (flat.value.length) selected.value = (selected.value - 1 + flat.value.length) % flat.value.length;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const it = flat.value[selected.value];
    if (it) choose(it);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
}

watch(selected, (i) => {
  nextTick(() => listEl.value?.querySelector(`[data-idx="${i}"]`)?.scrollIntoView({ block: 'nearest' }));
});
watch(query, () => (selected.value = 0));
watch(
  () => props.open,
  (v) => {
    if (v) {
      query.value = '';
      selected.value = 0;
      nextTick(() => inputEl.value?.focus());
    }
  },
);
</script>

<style scoped>
.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.15s ease;
}
.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}
</style>
