<script setup>
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/shared/BrandMark.vue'
import { NToasts } from '@/components/ui'
import { useUiStore } from '@/stores/ui'
import { useOpsStore } from '@/stores/ops'

const ui = useUiStore()
const ops = useOpsStore()
const { locale } = useI18n()

ui.apply()
locale.value = ui.locale
watch(() => ui.locale, (v) => (locale.value = v))

onMounted(() => {
  // نولّد بيانات الـ 30 يوم بعد أول رسم عشان الشاشة تظهر فورًا
  requestAnimationFrame(() => {
    setTimeout(() => {
      ops.init()
      ui.booting = false
    }, 30)
  })
})
</script>

<template>
  <div v-if="ui.booting" class="grid min-h-screen place-items-center bg-paper p-6">
    <div class="flex flex-col items-center gap-5 text-center">
      <BrandMark class="size-28" live />
      <div>
        <h1 class="font-display text-4xl">{{ $t('common.appName') }}</h1>
        <p class="mt-1 text-sm font-bold opacity-70">{{ $t('common.tagline') }}</p>
      </div>
      <div class="h-4 w-56 overflow-hidden brut-thin bg-paper-2">
        <div class="h-full w-1/3 bg-tomato" style="animation: marquee-rtl 900ms linear infinite alternate" />
      </div>
      <p class="text-xs font-extrabold opacity-60">{{ $t('common.booting') }}</p>
    </div>
  </div>

  <template v-else>
    <RouterView />
    <NToasts />
  </template>
</template>
