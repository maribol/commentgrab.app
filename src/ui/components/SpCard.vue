<template>
  <div :class="['commentgrab-card', padded ? 'p-5' : '', hover ? 'transition hover:shadow-soft' : '']">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean; hover?: boolean }>(), { padded: true, hover: false });
</script>
