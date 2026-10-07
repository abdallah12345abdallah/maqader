<script setup>
import { computed } from 'vue'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { fmtPct } from '@/lib/format'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'ink' },
  /** تغيير نسبي: 0.12 = +12% */
  delta: { type: Number, default: null },
  /** هل زيادة المؤشر شيء كويس؟ (نسبة التكلفة بالعكس) */
  invert: Boolean,
  size: { type: String, default: 'md' }, // sm | md | lg
})

const toneClass = computed(() => (TONES[props.tone] || TONES.ink).soft)

const trend = computed(() => {
  if (props.delta === null || props.delta === undefined || !Number.isFinite(props.delta)) return null
  const up = props.delta > 0.0005
  const down = props.delta < -0.0005
  const good = props.invert ? down : up
  return {
    up,
    down,
    flat: !up && !down,
    icon: up ? ArrowUpRight : down ? ArrowDownRight : Minus,
    cls: !up && !down ? 'bg-paper-2 text-ink' : good ? 'bg-basil-soft text-ink' : 'bg-tomato-soft text-ink',
    text: fmtPct(Math.abs(props.delta), 1),
  }
})

const valueSize = computed(
  () => ({ sm: 'text-2xl', md: 'text-[2rem]', lg: 'text-[2.6rem]' })[props.size],
)
</script>

<template>
  <div :class="cn('brut shadow-brut p-4 flex flex-col gap-2', toneClass)">
    <div class="flex items-start justify-between gap-2">
      <p class="text-xs font-extrabold uppercase tracking-wide opacity-70">{{ label }}</p>
      <span
        v-if="trend"
        :class="cn('inline-flex items-center gap-0.5 brut-thin px-1.5 py-0.5 text-[11px] font-extrabold tabular', trend.cls)"
      >
        <component :is="trend.icon" class="size-3" :stroke-width="3" />
        {{ trend.text }}
      </span>
      <slot name="badge" />
    </div>
    <p :class="cn('font-display leading-none tabular', valueSize)">{{ value }}</p>
    <p v-if="hint || $slots.hint" class="text-[11px] font-bold opacity-70 leading-tight">
      <slot name="hint">{{ hint }}</slot>
    </p>
  </div>
</template>
