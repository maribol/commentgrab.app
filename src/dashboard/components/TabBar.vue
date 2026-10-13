<template>
  <div class="flex items-center gap-5 border-b border-line" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      :aria-selected="modelValue === tab.id"
      class="-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[13.5px] transition-colors"
      :class="modelValue === tab.id ? 'border-brand-500 font-semibold text-ink' : 'border-transparent font-medium text-muted hover:text-ink'"
      @click="$emit('update:modelValue', tab.id)"
    >
      <component :is="tab.icon" v-if="tab.icon" class="h-3.5 w-3.5" :class="modelValue === tab.id ? 'text-commentgrab-violet' : 'text-faint'" />
      {{ tab.label }}
      <span v-if="tab.badge" class="rounded-md bg-canvas-2 px-1.5 py-px text-[11px] font-semibold text-faint">{{ tab.badge }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ tabs: Array<{ id: string; label: string; icon?: Component; badge?: string }>; modelValue: string }>();
defineEmits<{ 'update:modelValue': [id: string] }>();
</script>
