<template>
  <Onboarding v-if="active === 'welcome'" />
  <div v-else class="commentgrab-bg flex min-h-screen font-sans text-ink-900">
    <!-- Sidebar -->
    <aside
      class="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-black/[0.06] bg-white/80 backdrop-blur-xl transition-[width] duration-200"
      :class="collapsed ? 'w-[72px]' : 'w-64'"
    >
      <div class="flex items-center gap-3 px-4 pb-2 pt-5" :class="collapsed ? 'justify-center px-0' : ''">
        <BrandMark :size="38" class="shadow-glow" />
        <div v-if="!collapsed" class="min-w-0 leading-none">
          <div class="truncate text-[17px] font-bold tracking-tight"><span class="commentgrab-text">CommentGrab</span></div>
          <div class="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{{ t('nav.commentExporter') }}</div>
        </div>
        <button
          v-if="!collapsed"
          class="ml-auto rounded-lg p-1.5 text-ink-400 transition hover:bg-black/[0.05] hover:text-ink-700"
          :title="t('common.collapse')"
          @click="collapsed = true"
        >
          <PanelLeft class="h-4 w-4" />
        </button>
      </div>

      <button
        v-if="collapsed"
        class="mx-auto mt-1 rounded-lg p-1.5 text-ink-400 transition hover:bg-black/[0.05] hover:text-ink-700"
        :title="t('common.expand')"
        @click="collapsed = false"
      >
        <PanelLeft class="h-4 w-4" />
      </button>

      <nav class="mt-4 flex-1 space-y-6 overflow-y-auto px-3 scroll-thin">
        <div v-for="group in navGroups" :key="group.label">
          <div v-if="!collapsed" class="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">{{ group.label }}</div>
          <div class="space-y-0.5">
            <button
              v-for="item in group.items"
              :key="item.key"
              class="group flex w-full items-center rounded-xl text-sm font-medium transition"
              :class="[
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-2.5 py-2.5',
                active === item.key
                  ? 'border border-black/[0.06] bg-white text-ink-900 shadow-sm'
                  : 'border border-transparent text-ink-500 hover:bg-black/[0.035] hover:text-ink-900',
              ]"
              :title="collapsed ? item.label : ''"
              @click="navigate(item.path)"
            >
              <component
                :is="item.icon"
                class="h-[18px] w-[18px] shrink-0 transition"
                :class="active === item.key ? 'text-commentgrab-violet' : 'text-ink-400 group-hover:text-ink-700'"
              />
              <template v-if="!collapsed">
                <span>{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="active === item.key ? 'bg-commentgrab-soft text-commentgrab-violet' : 'bg-black/[0.05] text-ink-400'"
                >{{ item.badge }}</span>
              </template>
            </button>
          </div>
        </div>
      </nav>

      <div v-if="!collapsed" class="space-y-3 px-3 pb-5">
        <ProductHuntCard />

        <div class="rounded-2xl border border-black/[0.07] bg-white p-3.5">
          <div class="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
              <ShieldCheck class="h-4 w-4 text-commentgrab-violet" />
            </span>
            {{ t('nav.localPrivate') }}
          </div>
          <p class="mt-2 text-xs leading-relaxed text-ink-500">
            {{ t('nav.localPrivateBody') }}
          </p>
        </div>

        <!-- credits -->
        <div class="space-y-1.5 px-1.5">
          <a
            href="https://x.com/samtodosiciuc"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 text-[11px] font-medium text-ink-400 transition hover:text-ink-700"
          >
            <svg viewBox="0 0 24 24" class="h-3 w-3 shrink-0 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>@samtodosiciuc</span>
          </a>
          <a
            href="mailto:sam@elasticfunnels.io"
            class="flex items-center gap-2 text-[11px] font-medium text-ink-400 transition hover:text-ink-700"
          >
            <Mail class="h-3 w-3 shrink-0" />
            <span>sam@elasticfunnels.io</span>
          </a>
          <a
            :href="bugUrl"
            class="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-slate-50 hover:text-ink-900"
          >
            <Bug class="h-3.5 w-3.5" /> {{ t('nav.reportBug') }}
          </a>
        </div>

        <div class="flex items-center justify-between px-1.5 text-[11px] text-ink-300">
          <span>v1.0.0 · PolyForm Shield</span>
          <span class="font-medium">Source-available</span>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="scroll-thin flex min-h-screen flex-1 flex-col overflow-y-auto">
      <!-- Sticky top bar -->
      <header class="sticky top-0 z-20 flex items-center gap-4 border-b border-black/[0.06] bg-white/70 px-8 py-3 backdrop-blur-xl">
        <nav class="flex items-center gap-1.5 text-sm">
          <span class="text-ink-400">CommentGrab</span>
          <ChevronRight class="h-3.5 w-3.5 text-ink-300" />
          <span class="font-semibold text-ink-900">{{ sectionLabel }}</span>
        </nav>

        <button
          class="ml-auto flex w-full max-w-xs items-center gap-2 rounded-xl border border-black/[0.10] bg-white px-3.5 py-2 text-sm text-ink-300 transition hover:border-black/[0.18]"
          @click="paletteOpen = true"
        >
          <Search class="h-4 w-4 shrink-0" />
          <span class="flex-1 text-left">{{ t('nav.searchSaved') }}</span>
          <kbd class="rounded border border-black/10 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">⌘K</kbd>
        </button>
      </header>

      <div class="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
        <OverviewView v-if="active === 'overview'" />
        <SavedView v-else-if="active === 'saved'" :id="route.segments[1]" />
        <HistoryView v-else-if="active === 'history'" />
        <AnalyzeView v-else-if="active === 'analyze'" :id="route.segments[1]" />
        <SettingsView v-else-if="active === 'settings'" />
      </div>
    </main>

    <CommandPalette v-model:open="paletteOpen" :collections="collections" />
    <SpToaster />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  LayoutDashboard, Bookmark, History, WandSparkles, Settings, ShieldCheck, Mail,
  Search, ChevronRight, PanelLeft, Bug,
} from 'lucide-vue-next';
import type { SavedCollection } from '@/shared/types';
import { bugReportMailto } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate, useRoute } from './router';
import BrandMark from '@/ui/components/BrandMark.vue';
import Onboarding from './Onboarding.vue';
import ProductHuntCard from '@/ui/components/ProductHuntCard.vue';
import CommandPalette from './components/CommandPalette.vue';
import { listCollections } from '@/shared/storage';
import SpToaster from '@/ui/components/SpToaster.vue';
import OverviewView from './views/OverviewView.vue';
import SavedView from './views/SavedView.vue';
import HistoryView from './views/HistoryView.vue';
import AnalyzeView from './views/AnalyzeView.vue';
import SettingsView from './views/SettingsView.vue';

const route = useRoute();
const collections = ref<SavedCollection[]>([]);
const savedCount = computed(() => collections.value.length);
const collapsed = ref(false);
const paletteOpen = ref(false);

const active = computed(() => route.segments[0] || 'overview');
const bugUrl = bugReportMailto(chrome.runtime.getManifest().version);

const NAV_KEYS = ['overview', 'saved', 'history', 'analyze', 'settings'];
const sectionLabel = computed(() => t(`nav.${NAV_KEYS.includes(active.value) ? active.value : 'overview'}`));

const navGroups = computed(() => [
  {
    label: t('nav.workspace'),
    items: [
      { key: 'overview', label: t('nav.overview'), path: '/', icon: LayoutDashboard, badge: '' },
      { key: 'saved', label: t('nav.saved'), path: '/saved', icon: Bookmark, badge: savedCount.value ? String(savedCount.value) : '' },
      { key: 'history', label: t('nav.history'), path: '/history', icon: History, badge: '' },
    ],
  },
  {
    label: t('nav.tools'),
    items: [
      { key: 'analyze', label: t('nav.analyze'), path: '/analyze', icon: WandSparkles, badge: '' },
      { key: 'settings', label: t('nav.settings'), path: '/settings', icon: Settings, badge: '' },
    ],
  },
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
