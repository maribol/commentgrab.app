<template>
  <Onboarding v-if="active === 'welcome'" />
  <div v-else class="flex h-screen flex-col bg-shell p-3 font-sans text-ink">
    <div class="relative flex min-h-0 w-full flex-1 overflow-hidden rounded-[20px] border border-line bg-surface">
      <!-- Sidebar -->
      <aside
        class="flex shrink-0 flex-col overflow-hidden border-r border-line bg-surface px-3 py-4 transition-[width] duration-200"
        :class="collapsed ? 'w-[68px]' : 'w-64'"
      >
        <div class="flex items-center gap-2.5 px-2 pb-5" :class="collapsed ? 'flex-col gap-3 px-0' : ''">
          <BrandMark :size="28" />
          <div v-if="!collapsed" class="min-w-0">
            <img :src="wordmark" alt="CommentGrab" class="h-4 w-auto dark:hidden" />
            <img :src="wordmarkDark" alt="CommentGrab" class="hidden h-4 w-auto dark:block" />
          </div>
          <button
            class="text-faint transition hover:text-ink"
            :class="collapsed ? '' : 'ml-auto'"
            :title="collapsed ? t('common.expand') : t('common.collapse')"
            @click="collapsed = !collapsed"
          >
            <PanelLeft :size="19" :stroke-width="1.7" />
          </button>
        </div>

        <nav class="scroll-thin flex-1 overflow-y-auto text-[14px] text-muted">
          <div v-for="(group, gi) in navGroups" :key="group.label" :class="gi ? 'mt-4' : ''">
            <div v-if="!collapsed" class="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">{{ group.label }}</div>
            <div v-else-if="gi" class="mx-2 mb-2 border-t border-line"></div>
            <div class="space-y-0.5">
              <button
                v-for="item in group.items"
                :key="item.key"
                class="flex w-full items-center gap-3 rounded-lg px-2.5 py-[7px] transition"
                :class="[
                  collapsed ? 'justify-center px-0' : '',
                  navKey === item.key ? 'bg-canvas-2 font-medium text-ink' : 'hover:bg-canvas-2',
                ]"
                :title="collapsed ? item.label : ''"
                @click="navigate(item.path)"
              >
                <component
                  :is="item.icon"
                  :size="18"
                  :stroke-width="1.7"
                  class="shrink-0"
                  :class="navKey === item.key ? 'text-brand-600' : 'text-faint'"
                />
                <template v-if="!collapsed">
                  <span>{{ item.label }}</span>
                  <span
                    v-if="item.badge"
                    class="ml-auto rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
                    :class="navKey === item.key ? 'bg-commentgrab-soft text-commentgrab-violet' : 'bg-canvas-2 text-faint'"
                  >{{ item.badge }}</span>
                </template>
              </button>
            </div>
          </div>
        </nav>

        <!-- Settings sits apart at the bottom, like gtm-sites -->
        <div class="space-y-0.5 pt-2 text-[14px] text-muted">
          <WhatsNew :collapsed="collapsed" />
          <button
            v-for="item in bottomItems"
            :key="item.key"
            class="flex w-full items-center gap-3 rounded-lg px-2.5 py-[7px] transition"
            :class="[
              collapsed ? 'justify-center px-0' : '',
              active === item.key ? 'bg-canvas-2 font-medium text-ink' : 'hover:bg-canvas-2',
            ]"
            :title="collapsed ? item.label : ''"
            @click="navigate(item.path)"
          >
            <component :is="item.icon" :size="18" :stroke-width="1.7" class="shrink-0" :class="active === item.key ? 'text-brand-600' : 'text-faint'" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </button>
        </div>

        <div v-if="!collapsed" class="space-y-3 pt-3">

          <div class="rounded-xl border border-line bg-canvas p-3.5">
            <div class="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                <ShieldCheck class="h-4 w-4 text-brand-600" />
              </span>
              {{ t('nav.localPrivate') }}
            </div>
            <p class="mt-2 text-xs leading-relaxed text-muted">
              {{ t('nav.localPrivateBody') }}
            </p>
          </div>

          <div class="border-t border-line"></div>

          <!-- credits -->
          <div class="space-y-1.5 px-1.5">
            <a
              href="https://x.com/samtodosiciuc"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 text-[11px] font-medium text-faint transition hover:text-ink"
            >
              <svg viewBox="0 0 24 24" class="h-3 w-3 shrink-0 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>@samtodosiciuc</span>
            </a>
            <a
              href="mailto:sam@elasticfunnels.io"
              class="flex items-center gap-2 text-[11px] font-medium text-faint transition hover:text-ink"
            >
              <Mail class="h-3 w-3 shrink-0" />
              <span>sam@elasticfunnels.io</span>
            </a>
            <a
              :href="bugUrl"
              class="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-muted transition hover:bg-canvas-2 hover:text-ink"
            >
              <Bug class="h-3.5 w-3.5" /> {{ t('nav.reportBug') }}
            </a>
          </div>

          <div class="flex items-center justify-between px-1.5 text-[11px] text-faint">
            <span>v1.1.0 · PolyForm Shield</span>
            <span class="font-medium">Source-available</span>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <main class="scroll-thin relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <!-- Sticky top bar -->
        <header class="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-surface px-6 py-3 lg:px-8">
          <nav class="flex min-w-0 items-center gap-1.5 text-[13.5px]" aria-label="Breadcrumb">
            <button class="shrink-0 text-faint transition-colors hover:text-ink" @click="navigate('/')">CommentGrab</button>
            <ChevronRight class="h-3.5 w-3.5 shrink-0 text-faint" />
            <button
              v-if="detailLabel"
              class="shrink-0 text-muted transition-colors hover:text-ink"
              @click="navigate(sectionPath)"
            >{{ sectionLabel }}</button>
            <span v-else class="font-semibold text-ink">{{ sectionLabel }}</span>
            <template v-if="detailLabel">
              <ChevronRight class="h-3.5 w-3.5 shrink-0 text-faint" />
              <span class="max-w-[42ch] truncate font-semibold text-ink" :title="detailLabel">{{ detailLabel }}</span>
            </template>
          </nav>

          <button
            class="ml-auto flex w-full max-w-xs shrink-0 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-faint transition hover:border-brand-400"
            @click="paletteOpen = true"
          >
            <Search class="h-4 w-4 shrink-0" />
            <span class="flex-1 text-left">{{ t('nav.searchSaved') }}</span>
            <kbd class="rounded-md border border-line bg-canvas-2 px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted">⌘K</kbd>
          </button>
        </header>

        <div class="w-full max-w-[1600px] flex-1 px-6 py-6 lg:px-8">
          <OverviewView v-if="active === 'overview'" />
          <SavedView v-else-if="active === 'saved'" :id="route.segments[1]" :tab="route.segments[2]" />
          <BoardView v-else-if="active === 'board' && route.segments[1]" :id="route.segments[1]" :tab="route.segments[2]" />
          <BatchesView v-else-if="active === 'batch'" :id="route.segments[1]" :tab="route.segments[2]" />
          <HistoryView v-else-if="active === 'history'" />
          <SettingsView v-else-if="active === 'settings'" />
        </div>
      </main>
    </div>

    <CommandPalette v-model:open="paletteOpen" :collections="collections" />
    <RunConfirm />
    <ReviewPrompt floating />
    <SpToaster />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import {
  LayoutDashboard, Bookmark, Layers, History, Settings, ShieldCheck, Mail,
  Search, ChevronRight, PanelLeft, Bug,
} from 'lucide-vue-next';
import type { SavedCollection } from '@/shared/types';
import { bugReportMailto } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate, useRoute, crumb } from './router';
import BrandMark from '@/ui/components/BrandMark.vue';
import Onboarding from './Onboarding.vue';
import CommandPalette from './components/CommandPalette.vue';
import RunConfirm from './components/RunConfirm.vue';
import WhatsNew from './components/WhatsNew.vue';
import ReviewPrompt from '@/ui/components/ReviewPrompt.vue';
import wordmark from '@/assets/brand/wordmark.svg';
import wordmarkDark from '@/assets/brand/wordmark-dark.svg';
import { listCollections } from '@/shared/storage';
import SpToaster from '@/ui/components/SpToaster.vue';
import OverviewView from './views/OverviewView.vue';
import SavedView from './views/SavedView.vue';
import BatchesView from './views/BatchesView.vue';
import HistoryView from './views/HistoryView.vue';
import BoardView from './views/BoardView.vue';
import SettingsView from './views/SettingsView.vue';

const route = useRoute();
const collections = ref<SavedCollection[]>([]);
const savedCount = computed(() => collections.value.length);
const collapsed = ref(false);
const paletteOpen = ref(false);

const active = computed(() => route.segments[0] || 'overview');
const bugUrl = bugReportMailto(chrome.runtime.getManifest().version);

// Insights now live with the item: the old /analyze/:id link (still used by the
// widget and popup hand-off) lands on the collection's Insights tab instead.
watchEffect(() => {
  if (active.value !== 'analyze') return;
  const id = route.segments[1];
  location.replace(`#${id ? `/saved/${id}/insights` : '/saved'}`);
});

/** Which nav item a route belongs to (a board lives under Saved). */
const navKey = computed(() => (active.value === 'board' ? 'saved' : active.value));
const NAV_KEYS = ['overview', 'saved', 'batch', 'history', 'settings'];
const sectionLabel = computed(() => t(`nav.${NAV_KEYS.includes(navKey.value) ? navKey.value : 'overview'}`));
const sectionPath = computed(() => (navKey.value === 'overview' ? '/' : `/${navKey.value}`));
/** Detail-page tail of the breadcrumb, shown only while its own page is open. */
const detailLabel = computed(() => {
  const base = route.segments.slice(0, 2).join('/');
  return route.segments.length >= 2 && crumb.path === `/${base}` ? crumb.label : '';
});

const navGroups = computed(() => [
  {
    label: t('nav.workspace'),
    items: [
      { key: 'overview', label: t('nav.overview'), path: '/', icon: LayoutDashboard, badge: '' },
      { key: 'saved', label: t('nav.saved'), path: '/saved', icon: Bookmark, badge: savedCount.value ? String(savedCount.value) : '' },
      { key: 'batch', label: t('nav.batch'), path: '/batch', icon: Layers, badge: '' },
      { key: 'history', label: t('nav.history'), path: '/history', icon: History, badge: '' },
    ],
  },
]);

const bottomItems = computed(() => [
  { key: 'settings', label: t('nav.settings'), path: '/settings', icon: Settings },
]);

function onKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    paletteOpen.value = true;
  }
}

onMounted(async () => {
  collections.value = await listCollections();
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>
