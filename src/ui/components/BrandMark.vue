<template>
  <!-- The CommentGrab mark as inline SVG: a flat version of the app icon
       (solid brand tile, white speech bubble, bars in brand shades). Inline SVG
       renders in the content-script shadow DOM without a web-accessible resource.
       Keep the `size` prop API so the artwork can be swapped for the new logo. -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    class="shrink-0"
    style="border-radius: 23.4%"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="128" height="128" rx="30" fill="#6D5EF6" />
    <path
      d="M35 31 h58 a15 15 0 0 1 15 15 v33 a15 15 0 0 1 -15 15 H60 l-15 15 v-15 h-10 a15 15 0 0 1 -15 -15 V46 a15 15 0 0 1 15 -15 z"
      fill="#FFFFFF"
    />
    <rect x="44" y="60" width="11" height="24" rx="5.5" fill="#8F7BF3" />
    <rect x="61" y="50" width="11" height="34" rx="5.5" fill="#6D5EF6" />
    <rect x="78" y="42" width="11" height="42" rx="5.5" fill="#5A45E8" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 40 });
</script>
