<template>
  <div class="animate-fade-up">
    <div v-if="board">
      <header class="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div class="min-w-0 grow basis-[420px]">
          <h1 class="flex items-center gap-2 text-[20px] font-semibold leading-snug tracking-tight text-ink">
            <FolderOpen class="h-5 w-5 shrink-0 text-faint" /> {{ board.name }}
          </h1>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-faint">
            <span class="rounded-md bg-canvas-2 px-1.5 py-0.5 font-medium text-ink-soft">{{ t('ins.board') }}</span>
            <span>{{ t('ins.collectionsCount', { n: members.length }) }}</span>
            <span class="text-line-strong">/</span>
            <span>{{ totalComments.toLocaleString() }} {{ t('common.comments') }}</span>
            <span v-if="board.analysis" class="inline-flex items-center gap-1 rounded-md bg-commentgrab-soft px-1.5 py-0.5 font-medium text-commentgrab-violet">
              <Sparkles class="h-3 w-3" /> {{ t('an.analyzedLabel') }} {{ relativeTime(board.analyzedAt || board.analysis.createdAt) }}
            </span>
          </div>
        </div>
        <div class="flex flex-none items-center gap-2">
          <SpButton v-if="!board.analysis" size="sm" :icon="WandSparkles" :disabled="!members.length" @click="analyzeNow()">{{ t('ins.analyzeBoard') }}</SpButton>
        </div>
      </header>

      <TabBar
        class="mt-5"
        :model-value="activeTab"
        :tabs="[
          { id: 'insights', label: t('tab.insights'), icon: Sparkles },
          { id: 'collections', label: t('tab.collections'), icon: Bookmark, badge: String(members.length) },
        ]"
        @update:model-value="setTab"
      />

      <div class="mt-5">
        <template v-if="activeTab === 'insights'">
          <InsightsPanel
            v-if="members.length"
            ref="panel"
            :analysis="board.analysis ?? null"
            :load="loadSource"
            :save="saveAnalysis"
            :threads="members.length"
            :meta="{ title: board.name, commentCount: totalComments }"
          />
          <SpEmpty v-else :icon="FolderOpen" :title="t('ins.boardEmpty')" />
        </template>
        <CollectionTable v-else-if="members.length" :collections="members" :boards="boards" />
        <SpEmpty v-else :icon="FolderOpen" :title="t('ins.boardEmpty')" />
      </div>
    </div>

    <SpEmpty v-else-if="loaded" :icon="SearchX" :title="t('ins.boardNotFound')" :description="t('common.notFoundBody')" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Bookmark, FolderOpen, SearchX, Sparkles, WandSparkles } from 'lucide-vue-next';
import type { AnalysisResult, Board, SavedCollection } from '@/shared/types';
import { getBoard, getCollection, listBoards, listCollections, updateBoard } from '@/shared/storage';
import { combinedSource, type InsightsSource } from '@/shared/insights';
import { relativeTime } from '@/shared/util';
import { t } from '@/shared/i18n';
import { navigate, pendingRuns, setCrumb } from '../router';
import SpButton from '@/ui/components/SpButton.vue';
import SpEmpty from '@/ui/components/SpEmpty.vue';
import CollectionTable from '../components/CollectionTable.vue';
import InsightsPanel from '../components/InsightsPanel.vue';
import TabBar from '../components/TabBar.vue';

const props = defineProps<{ id: string; tab?: string }>();

const board = ref<Board | null>(null);
const boards = ref<Board[]>([]);
const members = ref<SavedCollection[]>([]);
const loaded = ref(false);
const panel = ref<InstanceType<typeof InsightsPanel> | null>(null);

const activeTab = computed(() => (props.tab === 'collections' ? 'collections' : 'insights'));
const totalComments = computed(() => members.value.reduce((n, c) => n + (c.commentCount || 0), 0));

async function load(): Promise<void> {
  loaded.value = false;
  board.value = (await getBoard(props.id)) ?? null;
  boards.value = await listBoards();
  members.value = (await listCollections()).filter((c) => c.boardIds?.includes(props.id));
  if (board.value) setCrumb(`/board/${props.id}`, board.value.name);
  loaded.value = true;
}

async function maybeAutoRun(): Promise<void> {
  if (activeTab.value !== 'insights' || !pendingRuns.has(props.id)) return;
  pendingRuns.delete(props.id);
  await nextTick();
  if (panel.value && (await panel.value.hasKey())) void panel.value.run();
}

watch(
  () => [props.id, props.tab] as const,
  async ([id], prev) => {
    if (!prev || id !== prev[0]) await load();
    await maybeAutoRun();
  },
  { immediate: true },
);

function setTab(tab: string): void {
  navigate(tab === 'collections' ? `/board/${props.id}/collections` : `/board/${props.id}`);
}

function analyzeNow(): void {
  pendingRuns.add(props.id);
  if (activeTab.value === 'insights') void maybeAutoRun();
  else setTab('insights');
}

function loadSource(): Promise<InsightsSource> {
  return combinedSource(board.value?.name ?? 'board', members.value.map((c) => c.id), getCollection);
}

async function saveAnalysis(a: AnalysisResult): Promise<void> {
  const updated = await updateBoard(props.id, { analysis: a, analyzedAt: Date.now() });
  if (updated) board.value = updated;
}
</script>
