<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-xl"
    :style="{ width: box, height: box, backgroundColor: tint }"
  >
    <component :is="glyph" :style="{ width: inner, height: inner, color }" :stroke-width="2.2" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MessageCircle, Play, Newspaper, Gamepad2, Globe, Cloud, GitPullRequest, Layers, MapPin, Instagram } from 'lucide-vue-next';
import type { PlatformId } from '@/shared/types';
import { platformColor } from '@/shared/platform';

const props = withDefaults(defineProps<{ platform: PlatformId; size?: number }>(), { size: 36 });

const glyphMap = {
  reddit: MessageCircle,
  redditProfile: MessageCircle,
  youtube: Play,
  hackernews: Newspaper,
  steam: Gamepad2,
  bluesky: Cloud,
  github: GitPullRequest,
  stackexchange: Layers,
  instagram: Instagram,
  googlemaps: MapPin,
  generic: Globe,
} as const;

const glyph = computed(() => glyphMap[props.platform] ?? Globe);
const color = computed(() => platformColor(props.platform));
const tint = computed(() => `${color.value}1f`);
const box = computed(() => `${props.size}px`);
const inner = computed(() => `${Math.round(props.size * 0.52)}px`);
</script>
