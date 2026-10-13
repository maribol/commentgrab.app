<template>
  <span v-if="count" class="h-1.5 w-1.5 rounded-full bg-brand-500" :title="`${t('wn.title')} (${count})`" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { t } from '@/shared/i18n';
import { unreadCount } from '@/shared/announcements';

// Popup only reads the cache the dashboard filled; it never hits the network.
const count = ref(0);
onMounted(async () => {
  try {
    count.value = await unreadCount(undefined, { cachedOnly: true });
  } catch {
    count.value = 0;
  }
});
</script>
