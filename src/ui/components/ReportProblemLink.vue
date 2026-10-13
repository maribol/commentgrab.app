<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener"
    class="inline-flex items-center gap-1 text-[12px] font-medium text-muted transition hover:text-ink"
    data-report-problem
  >
    <Bug class="h-3 w-3 shrink-0" />
    {{ t('common.reportProblem') }}
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bug } from 'lucide-vue-next';
import { t } from '@/shared/i18n';
import { reportProblemUrl, type ReportWhere } from '@/shared/util';

/** "Report this problem" under an error. Only opens the site's form; nothing is sent from here. */
const props = defineProps<{ where: ReportWhere; platform?: string | null; error?: string | null; page?: string | null }>();

const href = computed(() =>
  reportProblemUrl({
    where: props.where,
    platform: props.platform || undefined,
    error: props.error || undefined,
    page: props.page || undefined,
  }),
);
</script>
