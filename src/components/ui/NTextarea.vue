<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: [String, Number], default: 4 },
  size: { type: String, default: 'md' }, // sm | md
  disabled: Boolean,
  invalid: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const classes = computed(() =>
  cn(
    'w-full brut bg-paper text-ink placeholder:opacity-40 placeholder:font-bold',
    'shadow-brut-sm focus:shadow-brut focus:outline-none transition-shadow resize-y',
    props.size === 'sm' ? 'px-3 py-2 text-sm' : 'px-3.5 py-2.5 text-[15px]',
    props.invalid && 'bg-tomato-soft',
    props.disabled && 'opacity-50',
  ),
)
</script>

<template>
  <textarea
    :class="classes"
    :value="modelValue"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
