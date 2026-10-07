<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  tone: { type: String, default: 'ink' },
  variant: { type: String, default: 'solid' }, // solid | soft | outline | ghost
  size: { type: String, default: 'md' }, // xs | sm | md | lg | xl
  block: Boolean,
  disabled: Boolean,
  active: Boolean,
  as: { type: String, default: 'button' },
})

const sizes = {
  xs: 'h-8 px-2.5 text-xs gap-1',
  sm: 'h-10 px-3 text-sm gap-1.5',
  md: 'h-12 px-4 text-[15px] gap-2',
  lg: 'h-14 px-5 text-base gap-2',
  xl: 'h-16 px-6 text-lg gap-2.5',
}

const classes = computed(() => {
  const tone = TONES[props.tone] || TONES.ink
  const look = {
    solid: tone.solid,
    soft: tone.soft,
    outline: 'bg-paper text-ink',
    ghost: 'bg-transparent text-ink border-transparent shadow-brut-none hover:bg-paper-2',
  }[props.variant]

  return cn(
    'inline-flex items-center justify-center font-extrabold whitespace-nowrap select-none',
    'brut brut-press cursor-pointer',
    sizes[props.size],
    look,
    props.variant === 'ghost' && 'brut-press-sm',
    props.block && 'w-full',
    props.active && 'ring-4 ring-ink ring-offset-0',
  )
})
</script>

<template>
  <component :is="as" :class="classes" :disabled="as === 'button' ? disabled : undefined" :aria-disabled="disabled || undefined">
    <slot />
  </component>
</template>
