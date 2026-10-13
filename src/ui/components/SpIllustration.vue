<template>
  <!-- Generated spot illustration (transparent WebP, ink outlines). In dark mode the ink and the
       thin threads would vanish on the dark surface, so the art sits on a dimmed pale lilac tile. -->
  <img
    :src="src"
    alt=""
    :width="size"
    :height="size"
    draggable="false"
    class="shrink-0 select-none rounded-xl dark:bg-[#ebe8f7] dark:brightness-90"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ src: string; size?: number }>(), { size: 64 });
</script>
