<script setup>
import { watch, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  tone: { type: String, default: 'ink' },
  size: { type: String, default: 'md' }, // sm | md | lg | xl | full
  emoji: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const widths = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(96rem,96vw)]',
}

const onKey = (e) => e.key === 'Escape' && emit('close')
watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
    if (v) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)
onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div class="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" @click="emit('close')" />
      <div
        :class="cn(
          'relative z-10 w-full brut bg-paper shadow-brut-lg animate-pop',
          'max-h-[94vh] flex flex-col rounded-b-none sm:rounded-b-[14px]',
          widths[size],
        )"
        role="dialog"
        aria-modal="true"
      >
        <header
          :class="cn('flex items-center gap-3 border-b-[3px] px-4 py-3 shrink-0', (TONES[tone] || TONES.ink).solid)"
        >
          <span v-if="emoji" class="text-2xl leading-none">{{ emoji }}</span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg leading-tight">{{ title }}</h2>
            <p v-if="subtitle" class="truncate text-xs font-bold opacity-80">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center brut-thin bg-paper text-ink brut-press-sm cursor-pointer"
            @click="emit('close')"
          >
            <X class="size-4" :stroke-width="3" />
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="shrink-0 border-t-[3px] bg-paper-2 p-4">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
