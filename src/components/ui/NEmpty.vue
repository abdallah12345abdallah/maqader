<script setup>
import { Inbox } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

defineProps({
  text: { type: String, default: '' },
  hint: { type: String, default: '' },
  emoji: { type: String, default: '' },
})
const { t } = useI18n()
</script>

<template>
  <div class="hatch flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
    <div class="grid size-14 place-items-center brut bg-paper shadow-brut-sm">
      <span v-if="emoji" class="text-2xl">{{ emoji }}</span>
      <Inbox v-else class="size-6" :stroke-width="3" />
    </div>
    <p class="font-display text-base">{{ text || t('common.empty') }}</p>
    <p class="max-w-xs text-xs font-bold opacity-60">{{ hint || t('common.emptyHint') }}</p>
    <slot />
  </div>
</template>
