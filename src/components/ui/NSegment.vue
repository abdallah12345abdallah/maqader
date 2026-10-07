<script setup>
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  /** [{ value, label, emoji, tone, count }] */
  options: { type: Array, default: () => [] },
  tone: { type: String, default: 'ink' },
  size: { type: String, default: 'md' }, // sm | md | lg
  scroll: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-5 text-base',
}
const activeTone = (o) => (TONES[o.tone || props.tone] || TONES.ink).solid
</script>

<template>
  <div
    :class="cn(
      'flex items-center gap-2',
      scroll && 'overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    )"
  >
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      :class="cn(
        'inline-flex shrink-0 items-center gap-2 font-extrabold brut brut-press-sm cursor-pointer',
        sizes[size],
        modelValue === o.value ? activeTone(o) : 'bg-paper text-ink',
      )"
      @click="emit('update:modelValue', o.value)"
    >
      <span v-if="o.emoji" class="text-base leading-none">{{ o.emoji }}</span>
      {{ o.label }}
      <span
        v-if="o.count !== undefined && o.count !== null"
        :class="cn(
          'min-w-5 brut-thin px-1 text-[10px] tabular',
          modelValue === o.value ? 'bg-paper text-ink' : 'bg-paper-2',
        )"
      >{{ o.count }}</span>
    </button>
  </div>
</template>
