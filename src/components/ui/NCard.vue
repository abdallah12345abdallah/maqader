<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  tone: { type: String, default: null },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  emoji: { type: String, default: '' },
  padded: { type: Boolean, default: true },
  interactive: Boolean,
  flat: Boolean,
})

const headerTone = computed(() => (props.tone ? (TONES[props.tone] || TONES.ink).solid : null))
const hasHeader = computed(() => !!(props.title || props.subtitle || props.emoji))
</script>

<template>
  <section
    :class="cn(
      'brut bg-paper overflow-hidden',
      flat ? 'shadow-brut-none' : 'shadow-brut',
      interactive && 'brut-press cursor-pointer',
    )"
  >
    <header
      v-if="hasHeader"
      :class="cn(
        'flex items-center gap-3 px-4 py-3 border-b-[3px]',
        headerTone || 'bg-paper-2 text-ink',
      )"
    >
      <span v-if="emoji" class="text-2xl leading-none">{{ emoji }}</span>
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-base leading-tight">{{ title }}</h3>
        <p v-if="subtitle" class="truncate text-xs font-bold opacity-75">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div :class="cn(padded ? 'p-4' : '')">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="border-t-[3px] bg-paper-2 px-4 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
