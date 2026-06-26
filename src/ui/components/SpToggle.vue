<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
    :class="modelValue ? 'bg-commentgrab' : 'bg-slate-200'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200"
      :class="modelValue ? 'translate-x-[22px]' : 'translate-x-0.5'"
    />
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();
</script>
