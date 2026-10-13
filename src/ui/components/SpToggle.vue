<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-brand-500/20"
    :class="modelValue ? 'bg-brand-500' : 'bg-line-strong'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="inline-block h-5 w-5 transform rounded-full bg-[#ffffff] transition-transform duration-200"
      :class="modelValue ? 'translate-x-[22px]' : 'translate-x-0.5'"
    />
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();
</script>
