<template>
  <div>
    <!-- empty / missing comments -->
    <div v-if="!hasComments" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 px-6 py-10 text-center">
      <MessageSquareOff class="mb-2 h-6 w-6 text-ink-300" />
      <p class="text-sm font-medium text-ink-700">{{ t('ct.empty') }}</p>
      <p class="mt-1 max-w-sm text-xs text-ink-400">{{ t('ct.emptyBody') }}</p>
    </div>

    <template v-else>
    <!-- toolbar -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <div class="relative min-w-[200px] flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input v-model="query" type="text" :placeholder="t('ct.search')" class="input !py-2 !pl-9" />
      </div>
      <select v-model="sort" class="input !w-auto !py-2">
        <option value="thread">{{ t('ct.sortThread') }}</option>
        <option value="top">{{ t('ct.sortTop') }}</option>
        <option value="new">{{ t('ct.sortNew') }}</option>
        <option value="old">{{ t('ct.sortOld') }}</option>
        <option value="long">{{ t('ct.sortLong') }}</option>
      </select>
      <button
        class="chip border transition"
        :class="topOnly ? 'border-commentgrab-fuchsia/40 bg-commentgrab-soft text-ink-900' : 'border-black/[0.08] bg-white text-ink-500 hover:text-ink-700'"
        @click="topOnly = !topOnly"
      >
        <ListTree class="h-3.5 w-3.5" /> {{ t('ct.topOnly') }}
      </button>
    </div>

    <div class="mb-2 px-1 text-xs text-ink-400">
      {{ t('ct.showing', { a: Math.min(limit, filtered.length).toLocaleString(), b: filtered.length.toLocaleString() }) }}
    </div>

    <!-- list -->
    <div class="scroll-thin max-h-[60vh] space-y-2 overflow-y-auto pr-1">
      <article
        v-for="(c, i) in visible"
        :key="`${c.commentId || 'c'}-${i}`"
        class="rounded-xl border border-black/[0.06] bg-white p-3.5 transition hover:border-black/[0.12]"
        :style="{ marginLeft: `${Math.min(c.depth, 5) * 16}px` }"
      >
        <div class="mb-1.5 flex items-center gap-2 text-xs">
          <span class="font-semibold text-ink-900">{{ c.author || 'anonymous' }}</span>
          <span v-if="c.score !== 'Hidden'" class="chip bg-commentgrab-soft text-ink-700">
            <ArrowBigUp class="h-3.5 w-3.5" /> {{ Number(c.score).toLocaleString() }}
          </span>
          <span v-if="c.timestamp" class="text-ink-300">{{ prettyTime(c.timestamp) }}</span>
          <span v-if="c.depth > 0" class="text-ink-300">· reply</span>
          <a
            v-if="c.permalink"
            :href="c.permalink"
            target="_blank"
            rel="noopener"
            class="ml-auto text-ink-300 transition hover:text-commentgrab-violet"
            :title="t('common.openComment')"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{{ c.text }}</p>
        <div v-if="c.links.length" class="mt-2 flex flex-wrap gap-1.5">
          <a
            v-for="(l, i) in c.links"
            :key="i"
            :href="l"
            target="_blank"
            rel="noopener"
            class="chip max-w-[220px] truncate bg-slate-100 text-ink-500 hover:text-commentgrab-violet"
          >
            <LinkIcon class="h-3 w-3 shrink-0" /> <span class="truncate">{{ prettyLink(l) }}</span>
          </a>
        </div>
      </article>
    </div>

    <button
      v-if="limit < filtered.length"
      class="btn-secondary btn-sm mt-3 w-full"
      @click="limit += 80"
    >
      {{ t('ct.showMore') }}
    </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search, ListTree, ArrowBigUp, ExternalLink, Link as LinkIcon, MessageSquareOff } from 'lucide-vue-next';
import type { Comment } from '@/shared/types';
import { t } from '@/shared/i18n';

const props = defineProps<{ comments: Comment[] }>();

const hasComments = computed(() => Array.isArray(props.comments) && props.comments.length > 0);

type SortKey = 'thread' | 'top' | 'new' | 'old' | 'long';
const query = ref('');
const sort = ref<SortKey>('thread');
const topOnly = ref(false);
const limit = ref(80);

function scoreNum(c: Comment): number {
  return c.score === 'Hidden' ? -1 : Number(c.score) || 0;
}
function timeNum(c: Comment): number {
  const t = Date.parse(c.timestamp);
  return Number.isNaN(t) ? 0 : t;
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  // Guard against a collection that was stored without its comments array.
  let rows = Array.isArray(props.comments) ? props.comments : [];
  if (topOnly.value) rows = rows.filter((c) => c.depth === 0);
  if (q) rows = rows.filter((c) => c.text.toLowerCase().includes(q) || c.author.toLowerCase().includes(q));

  const arr = [...rows];
  switch (sort.value) {
    case 'top':
      arr.sort((a, b) => scoreNum(b) - scoreNum(a));
      break;
    case 'new':
      arr.sort((a, b) => timeNum(b) - timeNum(a));
      break;
    case 'old':
      arr.sort((a, b) => timeNum(a) - timeNum(b));
      break;
    case 'long':
      arr.sort((a, b) => b.text.length - a.text.length);
      break;
    default:
      break;
  }
  return arr;
});

const visible = computed(() => filtered.value.slice(0, limit.value));

function prettyTime(ts: string): string {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return ts;
  return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function prettyLink(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
</script>
