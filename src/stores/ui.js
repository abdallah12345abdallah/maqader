import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { storage, uid } from '@/lib/utils'
import { COMPANY } from '@/data/org'

export const useUiStore = defineStore('ui', () => {
  const theme = ref(storage.get('theme', 'light'))
  const locale = ref(storage.get('locale', 'ar'))
  const currency = ref(storage.get('currency', COMPANY.currency))
  const sidebarCollapsed = ref(storage.get('sidebarCollapsed', false))
  const toasts = ref([])
  const booting = ref(true)

  const isRtl = computed(() => locale.value === 'ar')
  const dir = computed(() => (isRtl.value ? 'rtl' : 'ltr'))

  function apply() {
    const el = document.documentElement
    el.lang = locale.value
    el.dir = dir.value
    el.classList.toggle('dark', theme.value === 'dark')
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  function setLocale(l) {
    locale.value = l
  }
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  /** إشعار سريع — tone: basil | tomato | saffron | sky */
  function toast(message, tone = 'basil', detail = '') {
    const id = uid('T')
    toasts.value.push({ id, message, tone, detail })
    setTimeout(() => dismiss(id), tone === 'tomato' ? 5200 : 3200)
    return id
  }
  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  watch(theme, (v) => {
    storage.set('theme', v)
    apply()
  })
  watch(locale, (v) => {
    storage.set('locale', v)
    apply()
  })
  watch(currency, (v) => storage.set('currency', v))
  watch(sidebarCollapsed, (v) => storage.set('sidebarCollapsed', v))

  return {
    theme, locale, currency, sidebarCollapsed, toasts, booting,
    isRtl, dir,
    apply, toggleTheme, setLocale, toggleSidebar, toast, dismiss,
  }
})
