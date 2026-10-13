<template>
  <!-- Sidebar entry, styled like the nav items in Dashboard.vue -->
  <button
    class="relative flex w-full items-center gap-3 rounded-lg px-2.5 py-[7px] text-[14px] text-muted transition"
    :class="[collapsed ? 'justify-center px-0' : '', panelOpen ? 'bg-canvas-2 font-medium text-ink' : 'hover:bg-canvas-2']"
    :title="collapsed ? t('wn.title') : ''"
    :aria-label="unread ? `${t('wn.title')} (${unread})` : t('wn.title')"
    @click="openPanel"
  >
    <span class="relative shrink-0">
      <Megaphone :size="18" :stroke-width="1.7" :class="panelOpen ? 'text-brand-600' : 'text-faint'" />
      <span
        v-if="collapsed && unread"
        class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-surface"
      />
    </span>
    <template v-if="!collapsed">
      <span>{{ t('wn.title') }}</span>
      <span v-if="unread" class="ml-auto rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-600">{{ unread }}</span>
    </template>
  </button>

  <!-- Slide-over panel -->
  <Teleport to="body">
    <Transition name="wn-fade">
      <div v-if="panelOpen" class="fixed inset-0 z-[60] bg-ink/30" @click="panelOpen = false" />
    </Transition>
    <Transition name="wn-slide">
      <aside
        v-if="panelOpen"
        ref="panelEl"
        class="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[420px] flex-col border-l border-line bg-surface font-sans text-ink outline-none"
        role="dialog"
        aria-modal="true"
        :aria-label="t('wn.title')"
        tabindex="-1"
        @keydown.esc="panelOpen = false"
      >
        <header class="flex items-center gap-3 border-b border-line px-6 py-4">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-commentgrab-soft">
            <Megaphone class="h-4 w-4 text-brand-600 dark:text-commentgrab-violet" />
          </span>
          <h2 class="text-base font-semibold text-ink">{{ t('wn.title') }}</h2>
          <button class="btn-ghost -mr-2 ml-auto h-8 w-8 rounded-lg p-0" :title="t('cmd.close')" @click="panelOpen = false">
            <X class="h-4 w-4" />
          </button>
        </header>

        <div class="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <div v-if="!store.items.length" class="px-6 py-16 text-center">
            <div class="text-[14px] font-semibold text-ink">{{ t('wn.empty') }}</div>
            <p class="mt-1 text-[13px] text-muted">{{ t('wn.emptyBody') }}</p>
          </div>

          <article v-for="item in store.items" :key="item.id" class="border-b border-line px-6 py-5 last:border-b-0">
            <div class="flex items-center gap-2 text-[12px] text-faint">
              <span class="chip" :class="tagClass(item.tag)">{{ t(`wn.tag.${item.tag}`) }}</span>
              <time :datetime="item.date">{{ formatDate(item.date) }}</time>
              <span v-if="openedUnread.has(item.id)" class="ml-auto chip bg-brand-50 text-brand-600 dark:bg-commentgrab-soft dark:text-commentgrab-violet">{{ t('wn.new') }}</span>
            </div>
            <img v-if="item.image" :src="item.image" alt="" loading="lazy" class="mt-3 aspect-[16/9] w-full rounded-lg border border-line bg-canvas-2 object-cover" />
            <h3 class="mt-2 text-[15px] font-semibold leading-snug text-ink">{{ item.title }}</h3>
            <AnnouncementBody :body="item.body" class="mt-2" />
            <div v-if="item.cta || item.url" class="mt-3 flex flex-wrap items-center gap-3">
              <a v-if="item.cta" :href="item.cta.url" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">
                {{ item.cta.label }}
              </a>
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[13px] font-semibold text-commentgrab-violet hover:underline"
              >
                {{ t('wn.readMore') }} <ArrowUpRight class="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        </div>

        <footer class="border-t border-line px-6 py-3">
          <a
            :href="CHANGELOG_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted transition hover:text-ink"
          >
            {{ t('wn.changelog') }} <ArrowUpRight class="h-3.5 w-3.5" />
          </a>
        </footer>
      </aside>
    </Transition>
  </Teleport>

  <!-- One-time modal for an unseen item flagged "modal": true -->
  <SpModal :open="!!modalItem" size="md" :title="t('wn.title')" @close="dismissModal">
    <div v-if="modalItem" class="px-6 py-5">
      <div class="flex items-center gap-2 text-[12px] text-faint">
        <span class="chip" :class="tagClass(modalItem.tag)">{{ t(`wn.tag.${modalItem.tag}`) }}</span>
        <time :datetime="modalItem.date">{{ formatDate(modalItem.date) }}</time>
      </div>
      <h3 class="mt-3 text-[17px] font-semibold leading-snug tracking-tight text-ink">{{ modalItem.title }}</h3>
      <AnnouncementBody :body="modalItem.body" class="mt-2" />
      <a
        v-if="modalItem.url"
        :href="modalItem.url"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-commentgrab-violet hover:underline"
      >
        {{ t('wn.readMore') }} <ArrowUpRight class="h-3.5 w-3.5" />
      </a>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <a
          v-if="modalItem?.cta"
          :href="modalItem.cta.url"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-secondary btn-sm"
          @click="dismissModal"
        >{{ modalItem.cta.label }}</a>
        <button class="btn-primary btn-sm" @click="dismissModal">{{ t('wn.gotIt') }}</button>
      </div>
    </template>
  </SpModal>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onMounted, ref, watch, type PropType } from 'vue';
import { Megaphone, X, ArrowUpRight } from 'lucide-vue-next';
import SpModal from '@/ui/components/SpModal.vue';
import { t } from '@/shared/i18n';
import {
  CHANGELOG_URL,
  isUnread,
  loadAnnouncements,
  markAllSeen,
  markSeen,
  store,
  takeModalItem,
  type Announcement,
} from '@/shared/announcements';
import { formatDate, parseBody, tagClass } from './announcementUi';

withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false });

/** Shared so the sidebar card's "All updates" link can open it. */
const panelOpen = computed({
  get: () => store.panelOpen,
  set: (v: boolean) => (store.panelOpen = v),
});
const panelEl = ref<HTMLElement | null>(null);
const modalItem = ref<Announcement | null>(null);
/** Ids that were unread when the panel opened, so their "New" chip survives markAllSeen. */
const openedUnread = ref(new Set<string>());
let modalChecked = false;

const unread = computed(() => store.items.filter((i) => isUnread(i, store.seen)).length);

function openPanel(): void {
  store.panelOpen = true;
}

watch(
  () => store.panelOpen,
  async (open) => {
    if (!open) return;
    openedUnread.value = new Set(store.items.filter((i) => isUnread(i, store.seen)).map((i) => i.id));
    modalItem.value = null;
    if (store.items.length) await markAllSeen(store.items);
    await nextTick();
    panelEl.value?.focus();
  },
);

async function dismissModal(): Promise<void> {
  const item = modalItem.value;
  modalItem.value = null;
  if (item) await markSeen(item.id);
}

/** Never on the welcome / onboarding screen. */
function onWelcome(): boolean {
  return /^#\/?welcome\b/.test(location.hash);
}

/**
 * One-time modal. The decision uses only the modalShown store (synced across
 * the user's Chrome profiles); takeModalItem records the id before the modal
 * renders, so however it is closed it never opens again.
 */
async function maybeShowModal(): Promise<void> {
  if (modalChecked || !store.ready || store.panelOpen || onWelcome()) return;
  modalChecked = true;
  const next = await takeModalItem(store.items);
  if (next && !store.panelOpen && !onWelcome()) modalItem.value = next;
}

/**
 * Body renderer: plain text only. Blank lines split paragraphs and lines that
 * start with "- " become list items. Everything goes through text nodes, never
 * innerHTML, so feed content can't inject markup.
 */
const AnnouncementBody = defineComponent({
  props: { body: { type: String as PropType<string>, required: true } },
  setup(p) {
    return () =>
      h(
        'div',
        { class: 'space-y-2 text-[13.5px] leading-relaxed text-ink-soft' },
        parseBody(p.body).map((b) =>
          b.kind === 'list'
            ? h('ul', { class: 'list-disc space-y-1 pl-5 marker:text-faint' }, b.items.map((l) => h('li', l)))
            : h('p', { class: 'whitespace-pre-line' }, b.text),
        ),
      );
  },
});

onMounted(async () => {
  try {
    // Resolves after the network round (or its 5s timeout), so a modal item
    // that only exists in the remote feed still gets its one showing.
    await loadAnnouncements();
  } catch {
    /* bundled copy already painted */
  }
  await maybeShowModal();
});
</script>

<style scoped>
.wn-fade-enter-active,
.wn-fade-leave-active {
  transition: opacity 0.2s ease;
}
.wn-fade-enter-from,
.wn-fade-leave-to {
  opacity: 0;
}
.wn-slide-enter-active,
.wn-slide-leave-active {
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.wn-slide-enter-from,
.wn-slide-leave-to {
  transform: translateX(100%);
}
</style>
