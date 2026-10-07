<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  AlertTriangle, CheckCircle2, PackageX, CalendarClock, Trash2, Scale,
  ScanLine, ChefHat, ChevronRight, ChevronLeft,
} from 'lucide-vue-next'
import { NStat, NCard, NChart, NBadge, NButton, NMeter, NEmpty } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { cn, round, safeDiv } from '@/lib/utils'
import { TONES, CHART_COLORS } from '@/lib/constants'
import { useReportsStore } from '@/stores/reports'
import { useOpsStore } from '@/stores/ops'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const reports = useReportsStore()
const ops = useOpsStore()
const auth = useAuthStore()
const ui = useUiStore()
const fmt = useFmt()

const Chevron = computed(() => (ui.isRtl ? ChevronLeft : ChevronRight))
const s = computed(() => reports.summary)
const pnl = computed(() => reports.pnl)

const trend = computed(() => {
  const days = reports.salesByDay
  return {
    series: [
      { name: t('dashboard.netSales'), type: 'area', data: days.map((d) => round(d.net, 0)) },
      { name: t('accounting.cogs'), type: 'line', data: days.map((d) => round(d.cost, 0)) },
    ],
    categories: days.map((d) => fmt.dayMonth(d.date)),
  }
})

const categoryChart = computed(() => {
  const rows = reports.salesByCategory
  return {
    series: rows.map((r) => round(r.net, 0)),
    labels: rows.map((r) => fmt.name(r.category)),
    colors: rows.map((r) => TONES[r.category?.tone || 'ink'].fill),
  }
})

const hourChart = computed(() => {
  const rows = reports.salesByHour
  return {
    series: [{ name: t('dashboard.netSales'), data: rows.map((r) => round(r.net, 0)) }],
    categories: rows.map((r) => `${String(r.hour).padStart(2, '0')}:00`),
  }
})

const branchChart = computed(() => {
  const rows = reports.salesByBranch
  return {
    series: [
      { name: t('dashboard.netSales'), data: rows.map((r) => round(r.net, 0)) },
      { name: t('accounting.grossProfit'), data: rows.map((r) => round(r.margin, 0)) },
    ],
    categories: rows.map((r) => fmt.name(r.branch)),
  }
})

const topItems = computed(() => reports.itemPerformance.slice(0, 8))

/** تنبيهات تحتاج تصرف — كل واحد بيودّي لشاشته */
const alerts = computed(() => {
  const out = []
  if (reports.lowStock.length) {
    out.push({
      key: 'low',
      icon: PackageX,
      tone: 'tomato',
      title: t('dashboard.lowStockAlert'),
      value: reports.lowStock.length,
      detail: reports.lowStock.slice(0, 3).map((r) => fmt.name(r.ingredient)).join(' · '),
      route: '/inventory',
    })
  }
  const expired = reports.expiringSoon.filter((r) => r.isExpired).length
  if (reports.expiringSoon.length) {
    out.push({
      key: 'exp',
      icon: CalendarClock,
      tone: expired ? 'tomato' : 'saffron',
      title: t('dashboard.expiringAlert'),
      value: reports.expiringSoon.length,
      detail: expired ? `${expired} منتهية فعلًا` : 'خلال 7 أيام',
      route: '/inventory',
    })
  }
  const variance = reports.consumptionVariance.filter((r) => r.gapPct > 0.03)
  if (variance.length) {
    out.push({
      key: 'var',
      icon: Scale,
      tone: 'plum',
      title: t('dashboard.varianceAlert'),
      value: variance.length,
      detail: fmt.moneyShort(variance.reduce((a, r) => a + r.gapValue, 0)),
      route: '/inventory/variance',
    })
  }
  if (reports.wasteSummary.pctOfSales > 0.03) {
    out.push({
      key: 'waste',
      icon: Trash2,
      tone: 'tomato',
      title: t('dashboard.wasteAlert'),
      value: fmt.pct(reports.wasteSummary.pctOfSales),
      detail: fmt.moneyShort(reports.wasteSummary.total),
      route: '/inventory/waste',
    })
  }
  const overTarget = reports.itemPerformance.filter((r) => r.foodCostPct > (r.category?.targetFoodCostPct || 0.3) + 0.05)
  if (overTarget.length) {
    out.push({
      key: 'fc',
      icon: AlertTriangle,
      tone: 'saffron',
      title: t('recipes.aboveTarget'),
      value: overTarget.length,
      detail: overTarget.slice(0, 2).map((r) => fmt.name(r.recipe)).join(' · '),
      route: '/recipes/costing',
    })
  }
  return out
})

const paymentMix = computed(() => reports.paymentMix)
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')" emoji="🍳" tone="tomato">
      <template #actions>
        <RangeFilter />
        <NButton v-if="auth.can('pos')" tone="saffron" size="sm" @click="router.push('/pos')">
          <ScanLine class="size-4" :stroke-width="3" />{{ t('nav.pos') }}
        </NButton>
        <NButton v-if="auth.can('kds')" tone="plum" size="sm" @click="router.push('/kds')">
          <ChefHat class="size-4" :stroke-width="3" />{{ t('nav.kds') }}
          <span v-if="ops.openOrders.length" class="brut-thin bg-paper px-1 text-[10px] text-ink tabular">
            {{ ops.openOrders.length }}
          </span>
        </NButton>
      </template>
    </PageHeader>

    <!-- مؤشرات -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <NStat :label="t('dashboard.netSales')" :value="fmt.moneyShort(s.net)" tone="tomato" :delta="reports.delta.net" :hint="t('common.vsPrev')" />
      <NStat :label="t('dashboard.ordersCount')" :value="fmt.int(s.orders)" tone="saffron" :delta="reports.delta.orders" :hint="`${fmt.int(s.items)} ${t('common.items')}`" />
      <NStat :label="t('dashboard.avgTicket')" :value="fmt.money0(s.avgTicket)" tone="berry" :delta="reports.delta.avgTicket" :hint="`${t('dashboard.avgPerCover')} ${fmt.money0(s.avgPerCover)}`" />
      <NStat
        :label="t('dashboard.foodCost')"
        :value="fmt.pct(s.foodCostPct)"
        :tone="s.foodCostPct > 0.34 ? 'tomato' : 'basil'"
        :delta="reports.delta.foodCostPct"
        invert
        :hint="fmt.moneyShort(s.cost)"
      />
      <NStat :label="t('accounting.grossProfit')" :value="fmt.moneyShort(s.grossProfit)" tone="basil" :hint="fmt.pct(s.marginPct)" />
      <NStat
        :label="t('accounting.netProfit')"
        :value="fmt.moneyShort(pnl.netProfit)"
        :tone="pnl.netProfit >= 0 ? 'basil' : 'tomato'"
        :hint="fmt.pct(pnl.netMarginPct)"
      />
    </div>

    <!-- تنبيهات -->
    <NCard :title="t('dashboard.alerts')" tone="tomato" :padded="false">
      <ul v-if="alerts.length" class="grid gap-0 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="a in alerts" :key="a.key" class="border-b-[3px] border-e-[3px] border-ink/10">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-saffron-soft cursor-pointer"
            @click="router.push(a.route)"
          >
            <span :class="cn('grid size-10 shrink-0 place-items-center brut-thin', TONES[a.tone].soft)">
              <component :is="a.icon" class="size-5" :stroke-width="3" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-extrabold leading-tight">{{ a.title }}</span>
              <span class="block truncate text-[11px] font-bold opacity-55">{{ a.detail }}</span>
            </span>
            <span class="font-display text-xl tabular">{{ a.value }}</span>
            <component :is="Chevron" class="size-4 shrink-0 opacity-40" :stroke-width="3" />
          </button>
        </li>
      </ul>
      <div v-else class="flex items-center gap-3 px-4 py-5">
        <CheckCircle2 class="size-6 shrink-0 text-basil" :stroke-width="3" />
        <p class="text-sm font-extrabold">{{ t('dashboard.allGood') }}</p>
      </div>
    </NCard>

    <!-- الحركة -->
    <NCard :title="t('dashboard.salesTrend')" :subtitle="`${fmt.date(reports.from)} — ${fmt.date(reports.to)}`" tone="tomato">
      <NChart
        type="area"
        :series="trend.series"
        :categories="trend.categories"
        :height="300"
        :colors="['#ff4d2e', '#14110f']"
        :y-formatter="(v) => fmt.moneyShort(v)"
        :options="{ chart: { type: 'area' }, stroke: { width: [4, 3], dashArray: [0, 5] }, fill: { opacity: [0.2, 0] } }"
      />
    </NCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <NCard :title="t('dashboard.byCategory')" tone="berry">
        <NChart
          v-if="categoryChart.series.length"
          type="donut"
          :series="categoryChart.series"
          :labels="categoryChart.labels"
          :colors="categoryChart.colors"
          :height="320"
          :y-formatter="(v) => fmt.moneyShort(v)"
        />
        <NEmpty v-else :text="t('common.empty')" hint="" />
      </NCard>

      <NCard :title="t('dashboard.byHour')" tone="saffron">
        <NChart
          type="bar"
          :series="hourChart.series"
          :categories="hourChart.categories"
          :height="320"
          :colors="['#ffc300']"
          :y-formatter="(v) => fmt.moneyShort(v)"
        />
      </NCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <!-- أعلى الأطباق -->
      <NCard :title="t('dashboard.topItems')" tone="basil" :padded="false">
        <ul class="flex flex-col divide-y-[3px] divide-ink/10">
          <li v-for="(r, i) in topItems" :key="r.recipeId">
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-basil-soft cursor-pointer"
              @click="router.push(`/recipes/${r.recipeId}`)"
            >
              <span class="grid size-7 shrink-0 place-items-center brut-thin bg-paper-2 font-display text-xs tabular">
                {{ i + 1 }}
              </span>
              <span class="text-lg leading-none">{{ r.recipe?.emoji }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-extrabold leading-tight">{{ fmt.name(r.recipe) }}</span>
                <span class="block text-[10px] font-bold opacity-55">
                  {{ fmt.int(r.qty) }} مبيع · {{ fmt.pct(r.foodCostPct) }} تكلفة
                </span>
              </span>
              <NBadge :tone="r.menuClassMeta.tone" size="sm">{{ fmt.name(r.menuClassMeta) }}</NBadge>
              <span class="w-20 shrink-0 text-end font-display text-sm tabular">{{ fmt.moneyShort(r.net) }}</span>
            </button>
          </li>
        </ul>
      </NCard>

      <div class="flex flex-col gap-4">
        <NCard :title="t('dashboard.byBranch')" tone="sky">
          <NChart
            type="bar"
            :series="branchChart.series"
            :categories="branchChart.categories"
            :height="240"
            :colors="['#2bb3ff', '#12b76a']"
            :y-formatter="(v) => fmt.moneyShort(v)"
          />
        </NCard>

        <NCard :title="t('dashboard.paymentMix')" tone="plum" :padded="false">
          <ul class="flex flex-col divide-y-[3px] divide-ink/10">
            <li v-for="p in paymentMix" :key="p.method.id" class="flex items-center gap-3 px-4 py-2.5">
              <span class="min-w-0 flex-1 text-sm font-extrabold">{{ fmt.name(p.method) }}</span>
              <span class="w-28"><NMeter :value="p.share" tone="plum" height="sm" /></span>
              <span class="w-14 text-end text-xs font-bold tabular opacity-60">{{ fmt.pct(p.share, 0) }}</span>
              <span class="w-20 text-end font-display text-sm tabular">{{ fmt.moneyShort(p.amount) }}</span>
            </li>
          </ul>
        </NCard>
      </div>
    </div>

    <!-- أرقام سريعة -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('dashboard.inventoryValue')" :value="fmt.moneyShort(ops.inventoryValue)" tone="basil" :hint="`${ops.stock.length} سطر مخزون`" />
      <NStat :label="t('dashboard.wastePct')" :value="fmt.pct(reports.wasteSummary.pctOfSales)" :tone="reports.wasteSummary.pctOfSales > 0.03 ? 'tomato' : 'basil'" :hint="fmt.moneyShort(reports.wasteSummary.total)" />
      <NStat :label="t('dashboard.breakEven')" :value="fmt.moneyShort(pnl.breakEvenRevenue)" tone="saffron" :hint="t('accounting.breakEvenHint')" />
      <NStat :label="t('dashboard.openOrders')" :value="fmt.int(ops.openOrders.length)" tone="sky" :hint="t('dashboard.covers') + ' ' + fmt.int(s.covers)" />
    </div>
  </div>
</template>
