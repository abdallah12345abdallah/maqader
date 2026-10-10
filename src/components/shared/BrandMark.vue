<script setup>
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'

/**
 * علامة مقادير — ميم × قلّاية: عين الحرف هي جسم القلّاية والذيل هو اليد،
 * وتحتها ثلاث ألسنة لهب. جدار القلّاية واليد بالحبر فينقلبوا مع الوضع الداكن،
 * والزعفران والطماطمي ثابتين.
 * `live` يشغّل ارتجاف اللهب · القلب بيحصل عند الهوفر (الحركة في main.css).
 */
const props = defineProps({
  live: { type: Boolean, default: false },
})
const { t } = useI18n()
</script>

<template>
  <svg
    viewBox="0 0 64 64"
    :class="cn('brand-mark block', props.live && 'brand-live')"
    role="img"
    :aria-label="t('common.appName')"
  >
    <g class="brand-flames">
      <path class="brand-flame fill-tomato" d="M41 44.5C44.8 48.6 44.2 53.6 41 57C37.8 53.6 37.2 48.6 41 44.5Z" />
      <path class="brand-flame fill-saffron" d="M34 47C36.9 50 36.4 54 34 56.6C31.6 54 31.1 50 34 47Z" />
      <path class="brand-flame fill-saffron" d="M47.5 46.5C50.6 49.8 50.1 53.9 47.5 56.6C44.9 53.9 44.4 49.8 47.5 46.5Z" />
    </g>
    <g class="brand-pan">
      <path class="stroke-ink" d="M28 32L15 50" fill="none" stroke-width="9" stroke-linecap="round" />
      <circle class="fill-saffron" cx="34" cy="26" r="11" />
      <circle class="stroke-ink" cx="34" cy="26" r="15" fill="none" stroke-width="8" />
    </g>
  </svg>
</template>
