import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5180 },
  build: {
    chunkSizeWarningLimit: 700,
    // تقسيم المكتبات يخص بناء المتصفح فقط — في بناء الـ SSR بتكون external
    rollupOptions: isSsrBuild
      ? {}
      : {
          output: {
            manualChunks: {
              vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
              icons: ['lucide-vue-next'],
              charts: ['apexcharts', 'vue3-apexcharts'],
            },
          },
        },
  },
}))
