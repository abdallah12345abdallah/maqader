<script setup>
import { computed } from 'vue'
import { cn, clamp } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  /** 0..1 */
  value: { type: Number, default: 0 },
  /** علامة الهدف على نفس المقياس 0..1 */
  target: { type: Number, default: null },
  tone: { type: String, default: 'basil' },
  height: { type: String, default: 'md' }, // sm | md | lg
  label: { type: String, default: '' },
  caption: { type: String, default: '' },
})

const pct = computed(() => clamp((Number(props.value) || 0) * 100, 0, 100))
const targetPct = computed(() =>
  props.target === null ? null : clamp((Number(props.target) || 0) * 100, 0, 100),
)
const fill = computed(() => (TONES[props.tone] || TONES.basil).dot)
const h = computed(() => ({ sm: 'h-3', md: 'h-5', lg: 'h-7' })[props.height])
</script>

<template>
  <div class="flex flex-col gap-1">
    <div v-if="label || caption" class="flex items-baseline justify-between gap-2 text-xs font-extrabold">
      <span class="opacity-80">{{ label }}</span>
      <span class="tabular opacity-70">{{ caption }}</span>
    </div>
    <div :class="cn('relative w-full brut-thin bg-paper-2 overflow-hidden', h)">
      <div :class="cn('h-full transition-[width] duration-500 ease-out', fill)" :style="{ width: pct + '%' }" />
      <div
        v-if="targetPct !== null"
        class="absolute top-0 h-full w-[3px] bg-ink"
        :style="{ insetInlineStart: `calc(${targetPct}% - 1.5px)` }"
        :title="`${targetPct.toFixed(0)}%`"
      />
    </div>
  </div>
</template>
