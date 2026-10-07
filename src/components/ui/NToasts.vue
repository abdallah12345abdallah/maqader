<script setup>
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'

const ui = useUiStore()
const icons = { basil: CheckCircle2, tomato: XCircle, saffron: AlertTriangle, sky: Info }
</script>

<template>
  <Teleport to="body">
    <div class="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-3 opacity-0 scale-95"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-for="t in ui.toasts"
          :key="t.id"
          :class="cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-3 brut shadow-brut px-4 py-3',
            (TONES[t.tone] || TONES.ink).soft,
          )"
        >
          <component :is="icons[t.tone] || Info" class="mt-0.5 size-5 shrink-0" :stroke-width="3" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-extrabold leading-snug">{{ t.message }}</p>
            <p v-if="t.detail" class="mt-0.5 text-xs font-bold opacity-70">{{ t.detail }}</p>
          </div>
          <button type="button" class="shrink-0 cursor-pointer opacity-50 hover:opacity-100" @click="ui.dismiss(t.id)">
            <X class="size-4" :stroke-width="3" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
