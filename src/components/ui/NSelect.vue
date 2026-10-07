<script setup>
import { computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'md' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const classes = computed(() =>
  cn(
    'w-full appearance-none brut bg-paper text-ink font-extrabold',
    'shadow-brut-sm focus:shadow-brut focus:outline-none transition-shadow cursor-pointer',
    { sm: 'h-10 ps-3 pe-9 text-sm', md: 'h-12 ps-3.5 pe-10 text-[15px]', lg: 'h-14 ps-4 pe-11 text-base' }[props.size],
    props.disabled && 'opacity-50',
  ),
)
</script>

<template>
  <span class="relative block">
    <select
      :class="classes"
      :value="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
    </select>
    <ChevronDown class="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" :stroke-width="3" />
  </span>
</template>
