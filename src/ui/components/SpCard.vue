<template>
  <div :class="['commentgrab-card', padded ? 'p-5' : '', hover ? 'transition-colors hover:border-line-strong' : '']">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean; hover?: boolean }>(), { padded: true, hover: false });
</script>
