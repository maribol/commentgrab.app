<template>
  <div>
    <!-- empty / missing comments -->
    <div v-if="!hasComments" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <MessageSquareOff class="mb-2 h-6 w-6 text-faint" />
      <p class="text-sm font-medium text-ink-soft">{{ t('ct.empty') }}</p>
      <p class="mt-1 max-w-sm text-xs text-faint">{{ t('ct.emptyBody') }}</p>
    </div>

    <template v-else>
      <!-- toolbar: one 36px row -->
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <div class="relative min-w-[180px] flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input v-model="query" type="text" :placeholder="t('ct.search')" class="input h-9 !py-0 !pl-9 text-[13px]" />
        </div>
        <SelectField v-model="sort">
          <option value="thread">{{ t('ct.sortThread') }}</option>
          <option value="top">{{ t('ct.sortTop') }}</option>
          <option value="new">{{ t('ct.sortNew') }}</option>
          <option value="old">{{ t('ct.sortOld') }}</option>
          <option value="long">{{ t('ct.sortLong') }}</option>
        </SelectField>
        <button
          class="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors"
          :class="topOnly ? 'border-brand-400/50 bg-commentgrab-soft text-commentgrab-violet' : 'border-line-strong bg-surface text-muted hover:bg-canvas-2 hover:text-ink'"
          :aria-pressed="topOnly"
          @click="topOnly = !topOnly"
        >
          <ListTree class="h-3.5 w-3.5" /> {{ t('ct.topOnly') }}
        </button>
      </div>

      <!-- thread: one card, hairline rows -->
      <div class="overflow-hidden rounded-xl border border-line bg-surface">
        <div class="flex items-center justify-between border-b border-line bg-canvas px-4 py-2 text-[12px] text-faint">
          <span>{{ t('ct.showing', { a: Math.min(limit, filtered.length).toLocaleString(), b: filtered.length.toLocaleString() }) }}</span>
        </div>
        <div class="divide-y divide-line">
          <article
            v-for="(c, i) in visible"
            :key="`${c.commentId || 'c'}-${i}`"
            class="group px-4 py-3"
          >
            <div :class="indented && c.depth > 0 ? 'border-l border-line-strong pl-3' : ''" :style="indented && c.depth > 0 ? { marginLeft: `${(Math.min(c.depth, 5) - 1) * 18}px` } : undefined">
              <div class="flex items-center gap-2">
                <span class="truncate text-[13.5px] font-semibold text-ink">{{ c.author || 'anonymous' }}</span>
                <span v-if="c.score !== 'Hidden'" class="inline-flex items-center gap-0.5 text-[12px] text-faint">
                  <ArrowBigUp class="h-3.5 w-3.5" />{{ Number(c.score).toLocaleString() }}
                </span>
                <span v-if="c.timestamp" class="text-[12px] text-faint">{{ prettyTime(c.timestamp) }}</span>
                <a
                  v-if="c.permalink"
                  :href="c.permalink"
                  target="_blank"
                  rel="noopener"
                  class="ml-auto text-faint opacity-0 transition hover:text-commentgrab-violet focus:opacity-100 group-hover:opacity-100"
                  :title="t('common.openComment')"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                </a>
              </div>
              <p class="mt-1 whitespace-pre-wrap text-[14px] leading-[1.55] text-ink-soft">{{ c.text }}</p>
              <div v-if="c.links.length" class="mt-1.5 flex flex-wrap gap-1.5">
                <a
                  v-for="(l, li) in c.links"
                  :key="li"
                  :href="l"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex max-w-[240px] items-center gap-1 rounded-md bg-canvas-2 px-1.5 py-0.5 text-[11.5px] text-muted hover:text-commentgrab-violet"
                >
                  <LinkIcon class="h-3 w-3 shrink-0" /> <span class="truncate">{{ prettyLink(l) }}</span>
                </a>
              </div>
            </div>
          </article>
          <div v-if="!visible.length" class="px-4 py-8 text-center text-[13px] text-faint">{{ t('cmd.noMatches') }}</div>
        </div>
        <button
          v-if="limit < filtered.length"
          class="w-full border-t border-line px-4 py-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-canvas-2 hover:text-ink"
          @click="limit += 80"
        >
          {{ t('ct.showMore') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search, ListTree, ArrowBigUp, ExternalLink, Link as LinkIcon, MessageSquareOff } from 'lucide-vue-next';
import type { Comment } from '@/shared/types';
import { t } from '@/shared/i18n';
import SelectField from './SelectField.vue';

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
/** Indent replies only while the thread order is intact; sorted views are flat. */
const indented = computed(() => sort.value === 'thread' && !topOnly.value);

function prettyTime(ts: string): string {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return ts;
  return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function prettyLink(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
</script>
