import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * إعداد خاص بالـ smoke test: يبني السكريبت للـ Node مع استبدال
 * ApexCharts (محتاج DOM) ببديل بسيط، وبدون Tailwind.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^vue3-apexcharts$/, replacement: fileURLToPath(new URL('./stubs/apexcharts-stub.js', import.meta.url)) },
      { find: /^apexcharts$/, replacement: fileURLToPath(new URL('./stubs/apexcharts-stub.js', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('../src', import.meta.url)) },
    ],
  },
  css: { postcss: { plugins: [] } },
  build: { ssr: true, minify: false, target: 'node20' },
})
