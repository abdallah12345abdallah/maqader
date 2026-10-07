<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ArrowLeft, Clock } from 'lucide-vue-next'
import { NButton, NBadge, NEmpty } from '@/components/ui'
import Icon from '@/components/shared/Icon.vue'
import KdsTicket from '@/components/kds/KdsTicket.vue'
import { cn, sum, safeDiv } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'
import { useNow } from '@/composables/useNow'

const router = useRouter()
const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const auth = useAuthStore()
const ui = useUiStore()
const fmt = useFmt()
const now = useNow(1000)

const activeStation = ref(null)
const BackIcon = computed(() => (ui.isRtl ? ArrowLeft : ArrowRight))

const branchOrders = computed(() => ops.openOrders.filter((o) => o.branchId === auth.branchId))

/** هل الأوردر فيه شغل للقسم ده؟ */
function ordersForStation(stationId) {
  return branchOrders.value.filter((o) =>
    (o.lines || []).some((l) => {
      if (l.isVoid) return false
      if (!stationId) return true
      const r = catalog.recipeMap.get(l.recipeId)
      if (!r) return false
      return r.stationId === stationId || (r.steps || []).some((s) => s.stationId === stationId)
    }),
  )
}

const stations = computed(() =>
  catalog.stations.filter((s) => s.id !== 'ST-PREP').map((s) => {
    const list = ordersForStation(s.id)
    const pending = sum(list, (o) =>
      (o.lines || []).filter((l) => !l.isVoid && l.kdsStatus !== 'ready' && l.kdsStatus !== 'served').length,
    )
    return { ...s, orders: list.length, pending }
  }),
)

const visibleOrders = computed(() =>
  ordersForStation(activeStation.value).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
)

const stats = computed(() => {
  const list = branchOrders.value
  const allLines = list.flatMap((o) => (o.lines || []).filter((l) => !l.isVoid))
  const waits = list.map((o) => (now.value - new Date(o.createdAt).getTime()) / 60000)
  return {
    tickets: list.length,
    queued: allLines.filter((l) => (l.kdsStatus || 'queued') === 'queued').length,
    firing: allLines.filter((l) => l.kdsStatus === 'firing').length,
    ready: allLines.filter((l) => l.kdsStatus === 'ready').length,
    avgWait: safeDiv(sum(waits), waits.length),
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <!-- الشريط -->
    <header class="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b-[3px] border-ink bg-paper-2 px-3 py-2.5">
      <NButton variant="outline" size="sm" @click="router.push('/')">
        <component :is="BackIcon" class="size-4" :stroke-width="3" />
        <span class="hidden sm:inline">{{ t('nav.dashboard') }}</span>
      </NButton>

      <div class="flex items-center gap-2">
        <span class="grid size-9 place-items-center brut bg-plum shadow-brut-sm text-lg">👨‍🍳</span>
        <div class="leading-tight">
          <p class="font-display text-base">{{ t('kds.title') }}</p>
          <p class="text-[10px] font-bold opacity-60">{{ fmt.name(auth.branch) }}</p>
        </div>
      </div>

      <div class="ms-auto flex flex-wrap items-center gap-2">
        <NBadge tone="ink" size="sm" dot>{{ t('kds.queue') }} {{ stats.queued }}</NBadge>
        <NBadge tone="saffron" size="sm" dot>{{ t('kds.firing') }} {{ stats.firing }}</NBadge>
        <NBadge tone="basil" size="sm" dot>{{ t('kds.ready') }} {{ stats.ready }}</NBadge>
        <NBadge tone="sky" size="sm">
          <Clock class="size-3" :stroke-width="3" />
          {{ fmt.duration(stats.avgWait) }}
        </NBadge>
      </div>
    </header>

    <!-- أقسام المطبخ -->
    <div class="flex gap-2 overflow-x-auto border-b-[3px] border-ink bg-paper px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        :class="cn(
          'flex shrink-0 items-center gap-2 brut px-3.5 py-2.5 font-extrabold brut-press-sm cursor-pointer',
          activeStation === null ? 'bg-ink text-paper' : 'bg-paper',
        )"
        @click="activeStation = null"
      >
        <span class="text-sm">{{ t('kds.allStations') }}</span>
        <span :class="cn('min-w-5 brut-thin px-1 text-[10px] tabular', activeStation === null ? 'bg-paper text-ink' : 'bg-paper-2')">
          {{ branchOrders.length }}
        </span>
      </button>

      <button
        v-for="s in stations"
        :key="s.id"
        type="button"
        :class="cn(
          'flex shrink-0 items-center gap-2 brut px-3.5 py-2.5 font-extrabold brut-press-sm cursor-pointer',
          activeStation === s.id ? (TONES[s.tone] || TONES.ink).solid : 'bg-paper',
        )"
        @click="activeStation = s.id"
      >
        <Icon :name="s.icon" class="size-4 shrink-0" />
        <span class="text-sm">{{ fmt.name(s) }}</span>
        <span :class="cn('min-w-5 brut-thin px-1 text-[10px] tabular', activeStation === s.id ? 'bg-paper text-ink' : 'bg-paper-2')">
          {{ s.pending }}
        </span>
      </button>
    </div>

    <!-- التذاكر -->
    <main class="flex-1 p-3">
      <NEmpty
        v-if="!visibleOrders.length"
        :text="t('kds.noTickets')"
        :hint="t('kds.noTicketsHint')"
        emoji="🍽️"
        class="brut bg-paper"
      />
      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <KdsTicket
          v-for="o in visibleOrders"
          :key="o.id"
          :order="o"
          :station-id="activeStation"
          :now="now"
        />
      </div>
    </main>
  </div>
</template>
