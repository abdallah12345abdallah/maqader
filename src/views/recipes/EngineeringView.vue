<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NCard, NTable, NBadge, NStat, NSegment, NChart } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { MENU_CLASSES, TONES } from '@/lib/constants'
import { round, safeDiv, sum } from '@/lib/utils'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const reports = useReportsStore()
const fmt = useFmt()

const filterClass = ref(null)

const rows = computed(() =>
  reports.itemPerformance
    .filter((r) => (filterClass.value ? r.menuClass === filterClass.value : true))
    .map((r) => ({
      id: r.recipeId,
      name: fmt.name(r.recipe),
      emoji: r.recipe?.emoji || '🍽️',
      categoryName: fmt.name(r.category),
      qty: r.qty,
      net: r.net,
      unitMargin: r.unitMargin,
      margin: r.margin,
      foodCostPct: r.foodCostPct,
      menuClass: r.menuClass,
      meta: r.menuClassMeta,
    })),
)

const counts = computed(() => {
  const all = reports.itemPerformance
  return Object.fromEntries(
    Object.keys(MENU_CLASSES).map((k) => [k, all.filter((r) => r.menuClass === k).length]),
  )
})

const classOptions = computed(() => [
  { value: null, label: t('common.all'), count: reports.itemPerformance.length },
  ...Object.entries(MENU_CLASSES).map(([key, meta]) => ({
    value: key,
    label: fmt.name(meta),
    tone: meta.tone,
    count: counts.value[key] || 0,
  })),
])

/** مخطط مبعثر: الشعبية (س) × هامش الوحدة (ص) — سلسلة لكل تصنيف */
const scatter = computed(() => {
  const groups = Object.keys(MENU_CLASSES)
  return groups.map((key) => ({
    name: fmt.name(MENU_CLASSES[key]),
    data: reports.itemPerformance
      .filter((r) => r.menuClass === key)
      .map((r) => ({ x: r.qty, y: round(r.unitMargin, 2), label: fmt.name(r.recipe) })),
  }))
})

const scatterColors = computed(() => Object.values(MENU_CLASSES).map((m) => TONES[m.tone].fill))

const chartOptions = computed(() => ({
  chart: { type: 'scatter' },
  markers: { size: 9, strokeWidth: 2.5, strokeColors: '#14110f' },
  xaxis: { title: { text: t('recipes.popularity'), style: { fontWeight: 800 } }, tickAmount: 6, type: 'numeric' },
  yaxis: { title: { text: t('recipes.unitMargin'), style: { fontWeight: 800 } } },
  annotations: {
    xaxis: [{ x: round(reports.benchmarks.avgQty * 0.9, 1), strokeDashArray: 6, borderColor: '#14110f', borderWidth: 3 }],
    yaxis: [{ y: round(reports.benchmarks.avgUnitMargin, 2), strokeDashArray: 6, borderColor: '#14110f', borderWidth: 3 }],
  },
  tooltip: {
    custom: ({ seriesIndex, dataPointIndex, w }) => {
      const p = w.config.series[seriesIndex].data[dataPointIndex]
      return `<div style="padding:8px;font-weight:800">${p.label}<br/>${p.x} مبيع · هامش ${p.y}</div>`
    },
  },
  legend: { position: 'top' },
}))

const summary = computed(() => {
  const list = reports.itemPerformance
  return {
    items: list.length,
    stars: counts.value.star || 0,
    dogs: counts.value.dog || 0,
    avgMargin: safeDiv(sum(list, (r) => r.unitMargin), list.length),
  }
})

const columns = computed(() => [
  { key: 'name', label: t('common.name'), sortable: true },
  { key: 'qty', label: t('recipes.popularity'), numeric: true, sortable: true },
  { key: 'net', label: t('common.sales'), numeric: true, sortable: true },
  { key: 'unitMargin', label: t('recipes.unitMargin'), numeric: true, sortable: true },
  { key: 'margin', label: t('common.profit'), numeric: true, sortable: true },
  { key: 'foodCostPct', label: t('recipes.foodCostPct'), numeric: true, sortable: true },
  { key: 'menuClass', label: t('recipes.classification') },
  { key: 'rec', label: t('recipes.recommendation') },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('recipes.engineering')" :subtitle="t('recipes.engineeringHint')" emoji="🎯" tone="berry">
      <template #actions><RangeFilter /></template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('recipes.menuItems')" :value="fmt.int(summary.items)" tone="berry" />
      <NStat :label="fmt.name(MENU_CLASSES.star)" :value="fmt.int(summary.stars)" tone="basil" :hint="MENU_CLASSES.star.hintAr" />
      <NStat :label="fmt.name(MENU_CLASSES.dog)" :value="fmt.int(summary.dogs)" tone="tomato" :hint="MENU_CLASSES.dog.hintAr" />
      <NStat :label="t('recipes.unitMargin')" :value="fmt.money(summary.avgMargin)" tone="saffron" :hint="t('common.avg')" />
    </div>

    <NCard :title="t('recipes.engineering')" :subtitle="t('recipes.engineeringHint')" tone="berry">
      <NChart
        type="scatter"
        :series="scatter"
        :colors="scatterColors"
        :height="400"
        :options="chartOptions"
      />
    </NCard>

    <!-- القرارات لكل ربع -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="(meta, key) in MENU_CLASSES"
        :key="key"
        :class="['flex flex-col gap-2 brut shadow-brut p-4', TONES[meta.tone].soft]"
      >
        <div class="flex items-baseline justify-between">
          <h3 class="text-base">{{ fmt.name(meta) }}</h3>
          <span class="font-display text-2xl tabular">{{ counts[key] || 0 }}</span>
        </div>
        <p class="text-xs font-bold opacity-75 leading-snug">{{ meta.hintAr }}</p>
      </article>
    </div>

    <NSegment v-model="filterClass" :options="classOptions" size="sm" />

    <NTable :columns="columns" :rows="rows" row-key="id" max-height="60vh" :empty-text="t('common.empty')">
      <template #cell-name="{ row }">
        <button
          type="button"
          class="flex items-center gap-2 text-start cursor-pointer hover:underline"
          @click="router.push(`/recipes/${row.id}`)"
        >
          <span class="text-lg leading-none">{{ row.emoji }}</span>
          <span>
            <span class="block font-extrabold leading-tight">{{ row.name }}</span>
            <span class="block text-[10px] font-bold opacity-55">{{ row.categoryName }}</span>
          </span>
        </button>
      </template>
      <template #cell-qty="{ row }">{{ fmt.int(row.qty) }}</template>
      <template #cell-net="{ row }">{{ fmt.moneyShort(row.net) }}</template>
      <template #cell-unitMargin="{ row }">
        <span class="font-display">{{ fmt.money(row.unitMargin) }}</span>
      </template>
      <template #cell-margin="{ row }">{{ fmt.moneyShort(row.margin) }}</template>
      <template #cell-foodCostPct="{ row }">{{ fmt.pct(row.foodCostPct) }}</template>
      <template #cell-menuClass="{ row }">
        <NBadge :tone="row.meta.tone" size="sm">{{ fmt.name(row.meta) }}</NBadge>
      </template>
      <template #cell-rec="{ row }">
        <span class="text-[11px] font-bold opacity-70">{{ row.meta.hintAr }}</span>
      </template>
    </NTable>
  </div>
</template>
