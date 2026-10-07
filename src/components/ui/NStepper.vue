<script setup>
import { Minus, Plus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 999 },
  step: { type: Number, default: 1 },
  size: { type: String, default: 'md' },
})
const emit = defineEmits(['update:modelValue'])

const set = (v) => emit('update:modelValue', Math.min(props.max, Math.max(props.min, v)))
const btn = 'grid place-items-center brut-thin bg-paper brut-press-sm cursor-pointer shrink-0'
const sizes = { sm: 'size-8', md: 'size-10', lg: 'size-12' }
</script>

<template>
  <div class="inline-flex items-center gap-1.5">
    <button type="button" :class="cn(btn, sizes[size])" @click="set(modelValue - step)">
      <Minus class="size-4" :stroke-width="3" />
    </button>
    <span
      :class="cn('grid place-items-center font-display tabular px-2', sizes[size], size === 'lg' ? 'text-xl' : 'text-base')"
    >{{ modelValue }}</span>
    <button type="button" :class="cn(btn, sizes[size])" @click="set(modelValue + step)">
      <Plus class="size-4" :stroke-width="3" />
    </button>
  </div>
</template>
