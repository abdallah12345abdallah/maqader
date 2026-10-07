<script setup>
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  modelValue: Boolean,
  tone: { type: String, default: 'basil' },
  label: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :class="cn('inline-flex items-center gap-2.5 cursor-pointer')"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      :class="cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center brut-thin transition-colors',
        modelValue ? (TONES[tone] || TONES.basil).dot : 'bg-paper-2',
      )"
    >
      <span
        :class="cn(
          'absolute size-5 bg-paper border-2 border-ink transition-[inset-inline-start] duration-150',
          modelValue ? 'start-[calc(100%-1.4rem)]' : 'start-0.5',
        )"
      />
    </span>
    <span v-if="label" class="text-sm font-extrabold">{{ label }}</span>
  </button>
</template>
