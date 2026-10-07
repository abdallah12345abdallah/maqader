<script setup>
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  emoji: { type: String, default: '' },
  tone: { type: String, default: 'tomato' },
})
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex items-center gap-3">
      <span
        v-if="emoji"
        :class="cn('grid size-12 shrink-0 place-items-center brut shadow-brut text-2xl', (TONES[tone] || TONES.tomato).soft)"
      >{{ emoji }}</span>
      <div>
        <h1 class="text-2xl leading-tight sm:text-3xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 text-xs font-bold opacity-65 sm:text-sm">{{ subtitle }}</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
