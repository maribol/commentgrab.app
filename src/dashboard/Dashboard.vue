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
          <div v-if="!collapsed" class="min-w-0 leading-none">
            <div class="truncate text-[15px] font-bold tracking-tight text-ink">CommentGrab</div>
            <div class="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">{{ t('nav.commentExporter') }}</div>
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
                  active === item.key ? 'bg-canvas-2 font-medium text-ink' : 'hover:bg-canvas-2',
                ]"
                :title="collapsed ? item.label : ''"
                @click="navigate(item.path)"
              >
                <component
                  :is="item.icon"
                  :size="18"
                  :stroke-width="1.7"
                  class="shrink-0"
                  :class="active === item.key ? 'text-brand-600' : 'text-faint'"
                />
                <template v-if="!collapsed">
                  <span>{{ item.label }}</span>
                  <span
                    v-if="item.badge"
                    class="ml-auto rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
                    :class="active === item.key ? 'bg-brand-50 text-brand-600' : 'bg-canvas-2 text-faint'"
                  >{{ item.badge }}</span>
                </template>
              </button>
            </div>
          </div>
        </nav>

        <div v-if="!collapsed" class="space-y-3 pt-3">
          <ProductHuntCard />

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
        <header class="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-surface px-8 py-3">
          <nav class="flex items-center gap-1.5 text-[13.5px]">
            <span class="text-faint">CommentGrab</span>
            <ChevronRight class="h-3.5 w-3.5 text-faint" />
            <span class="font-semibold text-ink">{{ sectionLabel }}</span>
          </nav>

          <button
            class="ml-auto flex w-full max-w-xs items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-faint transition hover:border-brand-400"
            @click="paletteOpen = true"
          >
            <Search class="h-4 w-4 shrink-0" />
            <span class="flex-1 text-left">{{ t('nav.searchSaved') }}</span>
            <kbd class="rounded-md border border-line bg-canvas-2 px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted">⌘K</kbd>
          </button>
        </header>

        <div class="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
          <OverviewView v-if="active === 'overview'" />
          <SavedView v-else-if="active === 'saved'" :id="route.segments[1]" />
          <BatchesView v-else-if="active === 'batch'" :id="route.segments[1]" />
          <HistoryView v-else-if="active === 'history'" />
          <AnalyzeView v-else-if="active === 'analyze'" :id="route.segments[1]" />
          <SettingsView v-else-if="active === 'settings'" />
        </div>
      </main>
    </div>

    <CommandPalette v-model:open="paletteOpen" :collections="collections" />
    <SpToaster />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  LayoutDashboard, Bookmark, Layers, History, WandSparkles, Settings, ShieldCheck, Mail,
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
import BatchesView from './views/BatchesView.vue';
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

const NAV_KEYS = ['overview', 'saved', 'batch', 'history', 'analyze', 'settings'];
const sectionLabel = computed(() => t(`nav.${NAV_KEYS.includes(active.value) ? active.value : 'overview'}`));

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
