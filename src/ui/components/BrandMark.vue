<template>
  <!-- The CommentGrab app icon as inline SVG (same artwork as the generated
       PNGs in scripts/gen-icons.mjs) so every in-app brand mark matches the
       toolbar / store icon. Inline SVG also renders in the content-script
       shadow DOM without needing a web-accessible resource. -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    class="shrink-0"
    style="border-radius: 23.4%"
  >
    <defs>
      <linearGradient :id="`cg-g-${uid}`" x1="0.08" y1="0" x2="0.92" y2="1">
        <stop offset="0%" stop-color="#7c3aed" />
        <stop offset="52%" stop-color="#d946ef" />
        <stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
      <radialGradient :id="`cg-gloss-${uid}`" cx="0.3" cy="0.12" r="0.95">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38" />
        <stop offset="45%" stop-color="#ffffff" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="128" height="128" rx="30" :fill="`url(#cg-g-${uid})`" />
    <rect x="0" y="0" width="128" height="128" rx="30" :fill="`url(#cg-gloss-${uid})`" />
    <path
      d="M35 31 h58 a15 15 0 0 1 15 15 v33 a15 15 0 0 1 -15 15 H60 l-15 15 v-15 h-10 a15 15 0 0 1 -15 -15 V46 a15 15 0 0 1 15 -15 z"
      fill="#ffffff"
    />
    <rect x="44" y="60" width="11" height="24" rx="5.5" fill="#7c3aed" />
    <rect x="61" y="50" width="11" height="34" rx="5.5" fill="#d946ef" />
    <rect x="78" y="42" width="11" height="42" rx="5.5" fill="#ec4899" />
  </svg>
</template>

<script setup lang="ts">
import { useId } from 'vue';

withDefaults(defineProps<{ size?: number }>(), { size: 40 });

// Namespace the gradient ids so multiple instances on a page don't collide.
const uid = useId();
</script>
