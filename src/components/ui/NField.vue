<script setup>
import { cn } from '@/lib/utils'

defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: Boolean,
  inline: Boolean,
})
</script>

<template>
  <label :class="cn('flex gap-1.5', inline ? 'items-center' : 'flex-col')">
    <span v-if="label" class="text-xs font-extrabold opacity-80 whitespace-nowrap">
      {{ label }}
      <i v-if="required" class="text-tomato not-italic">*</i>
    </span>
    <span class="flex-1">
      <slot />
    </span>
    <span v-if="error" class="text-[11px] font-extrabold text-tomato">{{ error }}</span>
    <span v-else-if="hint" class="text-[11px] font-bold opacity-60">{{ hint }}</span>
  </label>
</template>
