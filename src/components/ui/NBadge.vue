<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  tone: { type: String, default: 'ink' },
  variant: { type: String, default: 'soft' }, // soft | solid | outline
  size: { type: String, default: 'md' }, // sm | md
  dot: Boolean,
})

const classes = computed(() => {
  const tone = TONES[props.tone] || TONES.ink
  return cn(
    'inline-flex items-center gap-1.5 font-extrabold whitespace-nowrap brut-thin',
    props.size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
    { soft: tone.soft, solid: tone.solid, outline: 'bg-paper text-ink' }[props.variant],
  )
})
const dotClass = computed(() => (TONES[props.tone] || TONES.ink).dot)
</script>

<template>
  <span :class="classes">
    <i v-if="dot" :class="cn('size-2 shrink-0 rounded-full border-2 border-ink', dotClass)" />
    <slot />
  </span>
</template>
