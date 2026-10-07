import { ref, onMounted, onUnmounted } from 'vue'

/** ساعة حيّة للعدّادات — تتوقف تلقائيًا عند تفكيك الكومبوننت */
export function useNow(intervalMs = 1000) {
  const now = ref(Date.now())
  let timer = null
  onMounted(() => {
    timer = setInterval(() => (now.value = Date.now()), intervalMs)
  })
  onUnmounted(() => timer && clearInterval(timer))
  return now
}
