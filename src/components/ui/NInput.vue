<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
  align: { type: String, default: 'start' },
  disabled: Boolean,
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
  invalid: Boolean,
})
const emit = defineEmits(['update:modelValue', 'enter'])

const classes = computed(() =>
  cn(
    'w-full brut bg-paper text-ink placeholder:opacity-40 placeholder:font-bold',
    'shadow-brut-sm focus:shadow-brut focus:outline-none transition-shadow',
    { sm: 'h-10 px-3 text-sm', md: 'h-12 px-3.5 text-[15px]', lg: 'h-14 px-4 text-lg' }[props.size],
    props.align === 'center' && 'text-center',
    props.align === 'end' && 'text-end tabular',
    props.type === 'number' && 'tabular',
    props.invalid && 'bg-tomato-soft',
    props.disabled && 'opacity-50',
  ),
)

function onInput(e) {
  const v = props.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
  emit('update:modelValue', v)
}
</script>

<template>
  <input
    :class="classes"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="min"
    :max="max"
    :step="step"
    @input="onInput"
    @keyup.enter="emit('enter', $event)"
  />
</template>
