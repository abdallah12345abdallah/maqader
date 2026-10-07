import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import VueApexCharts from 'vue3-apexcharts'

import App from './App.vue'
import router from './router'
import ar from './locales/ar.json'
import en from './locales/en.json'
import { storage } from './lib/utils'
import './assets/main.css'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: storage.get('locale', 'ar'),
  fallbackLocale: 'ar',
  messages: { ar, en },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(VueApexCharts)
app.mount('#app')
