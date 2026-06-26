<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[variantClass, { 'btn-sm': size === 'sm' }]"
  >
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin-slow" />
    <component :is="icon" v-else-if="icon" :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
    <span v-if="$slots.default"><slot /></span>
  </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { Loader2 } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'md' | 'sm';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    icon?: Component;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false },
);

const variantClass = computed(() => {
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'ghost') return 'btn-ghost';
  return 'btn-primary';
});
</script>
