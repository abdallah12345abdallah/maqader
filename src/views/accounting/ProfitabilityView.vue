<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NCard, NTable, NBadge, NStat, NSegment, NChart, NMeter } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { TONES, CHART_COLORS } from '@/lib/constants'
import { round, safeDiv } from '@/lib/utils'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const reports = useReportsStore()
const fmt = useFmt()

const level = ref('item')

const itemRows = computed(() =>
  reports.itemPerformance.map((r) => ({
    id: r.recipeId,
    name: fmt.name(r.recipe),
    emoji: r.recipe?.emoji || '🍽️',
    categoryName: fmt.name(r.category),
    qty: r.qty,
    net: r.net,
    cost: r.cost,
    margin: r.margin,
    marginPct: r.marginPct,
    foodCostPct: r.foodCostPct,
    share: safeDiv(r.net, reports.summary.net),
  })),
)

const categoryRows = computed(() =>
  reports.salesByCategory.map((r) => ({
    id: r.categoryId,
    name: fmt.name(r.category),
    emoji: r.category?.emoji || '🍽️',
    tone: r.category?.tone || 'ink',
    qty: r.qty,
    net: r.net,
    cost: r.cost,
    margin: r.margin,
    foodCostPct: r.foodCostPct,
    targetFoodCostPct: r.targetFoodCostPct,
    share: r.share,
  })),
)

const branchRows = computed(() =>
  reports.salesByBranch.map((r) => ({
    id: r.branch.id,
    name: fmt.name(r.branch),
    tone: r.branch.tone,
    orders: r.orders,
    net: r.net,
    cost: r.cost,
    margin: r.margin,
    foodCostPct: r.foodCostPct,
    avgTicket: r.avgTicket,
  })),
)

const typeRows = computed(() =>
  reports.salesByType.map((r) => ({
    id: r.type.id,
    name: fmt.name(r.type),
    tone: r.type.tone,
    orders: r.orders,
    net: r.net,
    cost: r.cost,
    margin: r.margin,
    avgTicket: r.avgTicket,
    share: r.share,
  })),
)

const topContributors = computed(() => itemRows.value.slice(0, 12))

const marginChart = computed(() => ({
  series: [
    { name: t('common.profit'), data: topContributors.value.map((r) => round(r.margin, 0)) },
    { name: t('common.cost'), data: topContributors.value.map((r) => round(r.cost, 0)) },
  ],
  categories: topContributors.value.map((r) => r.name),
}))

const categoryDonut = computed(() => ({
  series: categoryRows.value.map((r) => round(r.margin, 0)),
  labels: categoryRows.value.map((r) => r.name),
  colors: categoryRows.value.map((r) => TONES[r.tone].fill),
}))

const itemColumns = computed(() => [
  { key: 'name', label: t('common.name'), sortable: true },
  { key: 'qty', label: t('common.qty'), numeric: true, sortable: true },
  { key: 'net', label: t('common.sales'), numeric: true, sortable: true },
  { key: 'cost', label: t('common.cost'), numeric: true, sortable: true },
  { key: 'margin', label: t('common.profit'), numeric: true, sortable: true },
  { key: 'marginPct', label: t('common.margin'), numeric: true, sortable: true },
  { key: 'foodCostPct', label: t('dashboard.foodCost'), numeric: true, sortable: true },
  { key: 'share', label: t('common.share'), align: 'center', width: '130px' },
])

const categoryColumns = computed(() => [
  { key: 'name', label: t('common.category') },
  { key: 'qty', label: t('common.qty'), numeric: true, sortable: true },
  { key: 'net', label: t('common.sales'), numeric: true, sortable: true },
  { key: 'margin', label: t('common.profit'), numeric: true, sortable: true },
  { key: 'foodCostPct', label: t('dashboard.foodCost'), align: 'center', width: '170px' },
  { key: 'share', label: t('common.share'), numeric: true },
])

const branchColumns = computed(() => [
  { key: 'name', label: t('common.branch') },
  { key: 'orders', label: t('common.orders'), numeric: true, sortable: true },
  { key: 'net', label: t('common.sales'), numeric: true, sortable: true },
  { key: 'margin', label: t('common.profit'), numeric: true, sortable: true },
  { key: 'foodCostPct', label: t('dashboard.foodCost'), numeric: true },
  { key: 'avgTicket', label: t('dashboard.avgTicket'), numeric: true, sortable: true },
])

const typeColumns = computed(() => [
  { key: 'name', label: t('pos.orderType') },
  { key: 'orders', label: t('common.orders'), numeric: true, sortable: true },
  { key: 'net', label: t('common.sales'), numeric: true, sortable: true },
  { key: 'margin', label: t('common.profit'), numeric: true, sortable: true },
  { key: 'avgTicket', label: t('dashboard.avgTicket'), numeric: true },
  { key: 'share', label: t('common.share'), numeric: true },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('accounting.profitability')" :subtitle="t('accounting.profitabilitySubtitle')" emoji="💹" tone="basil">
      <template #actions><RangeFilter /></template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('dashboard.netSales')" :value="fmt.moneyShort(reports.summary.net)" tone="sky" :delta="reports.delta.net" />
      <NStat :label="t('accounting.cogs')" :value="fmt.moneyShort(reports.summary.cost)" tone="tomato" />
      <NStat :label="t('accounting.grossProfit')" :value="fmt.moneyShort(reports.summary.grossProfit)" tone="basil" :hint="fmt.pct(reports.summary.marginPct)" />
      <NStat :label="t('dashboard.avgTicket')" :value="fmt.money0(reports.summary.avgTicket)" tone="berry" :delta="reports.delta.avgTicket" />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <NCard :title="t('accounting.byItem')" subtitle="أعلى 12 طبق" tone="basil">
        <NChart
          type="bar"
          :series="marginChart.series"
          :categories="marginChart.categories"
          horizontal
          stacked
          :height="420"
          :colors="['#12b76a', '#ff4d2e']"
          :y-formatter="(v) => fmt.moneyShort(v)"
        />
      </NCard>

      <NCard :title="t('accounting.byCategory')" tone="berry">
        <NChart
          v-if="categoryDonut.series.length"
          type="donut"
          :series="categoryDonut.series"
          :labels="categoryDonut.labels"
          :colors="categoryDonut.colors"
          :height="420"
          :y-formatter="(v) => fmt.moneyShort(v)"
        />
      </NCard>
    </div>

    <NSegment
      v-model="level"
      :options="[
        { value: 'item', label: t('accounting.byItem'), count: itemRows.length },
        { value: 'category', label: t('accounting.byCategory'), count: categoryRows.length },
        { value: 'branch', label: t('accounting.byBranch'), count: branchRows.length },
        { value: 'type', label: t('dashboard.byType'), count: typeRows.length },
      ]"
      :scroll="false"
    />

    <!-- الأطباق -->
    <NTable v-if="level === 'item'" :columns="itemColumns" :rows="itemRows" row-key="id" max-height="62vh">
      <template #cell-name="{ row }">
        <button type="button" class="flex items-center gap-2 text-start cursor-pointer hover:underline" @click="router.push(`/recipes/${row.id}`)">
          <span class="text-lg leading-none">{{ row.emoji }}</span>
          <span>
            <span class="block font-extrabold leading-tight">{{ row.name }}</span>
            <span class="block text-[10px] font-bold opacity-55">{{ row.categoryName }}</span>
          </span>
        </button>
      </template>
      <template #cell-qty="{ row }">{{ fmt.int(row.qty) }}</template>
      <template #cell-net="{ row }">{{ fmt.moneyShort(row.net) }}</template>
      <template #cell-cost="{ row }">{{ fmt.moneyShort(row.cost) }}</template>
      <template #cell-margin="{ row }"><span class="font-display">{{ fmt.moneyShort(row.margin) }}</span></template>
      <template #cell-marginPct="{ row }">{{ fmt.pct(row.marginPct) }}</template>
      <template #cell-foodCostPct="{ row }">
        <NBadge :tone="row.foodCostPct > 0.35 ? 'tomato' : row.foodCostPct > 0.3 ? 'saffron' : 'basil'" size="sm">
          {{ fmt.pct(row.foodCostPct) }}
        </NBadge>
      </template>
      <template #cell-share="{ row }">
        <NMeter :value="row.share" tone="sky" height="sm" :caption="fmt.pct(row.share, 1)" />
      </template>
    </NTable>

    <!-- التصنيفات -->
    <NTable v-else-if="level === 'category'" :columns="categoryColumns" :rows="categoryRows" row-key="id">
      <template #cell-name="{ row }">
        <NBadge :tone="row.tone" size="sm">{{ row.emoji }} {{ row.name }}</NBadge>
      </template>
      <template #cell-qty="{ row }">{{ fmt.int(row.qty) }}</template>
      <template #cell-net="{ row }">{{ fmt.moneyShort(row.net) }}</template>
      <template #cell-margin="{ row }"><span class="font-display">{{ fmt.moneyShort(row.margin) }}</span></template>
      <template #cell-foodCostPct="{ row }">
        <NMeter
          :value="Math.min(1, row.foodCostPct / 0.6)"
          :target="row.targetFoodCostPct / 0.6"
          :tone="row.foodCostPct > row.targetFoodCostPct ? 'tomato' : 'basil'"
          height="sm"
          :caption="`${fmt.pct(row.foodCostPct)} / ${fmt.pct(row.targetFoodCostPct)}`"
        />
      </template>
      <template #cell-share="{ row }">{{ fmt.pct(row.share) }}</template>
    </NTable>

    <!-- الفروع -->
    <NTable v-else-if="level === 'branch'" :columns="branchColumns" :rows="branchRows" row-key="id">
      <template #cell-name="{ row }">
        <NBadge :tone="row.tone" size="sm" dot>{{ row.name }}</NBadge>
      </template>
      <template #cell-net="{ row }">{{ fmt.moneyShort(row.net) }}</template>
      <template #cell-margin="{ row }"><span class="font-display">{{ fmt.moneyShort(row.margin) }}</span></template>
      <template #cell-foodCostPct="{ row }">
        <NBadge :tone="row.foodCostPct > 0.34 ? 'tomato' : 'basil'" size="sm">{{ fmt.pct(row.foodCostPct) }}</NBadge>
      </template>
      <template #cell-avgTicket="{ row }">{{ fmt.money0(row.avgTicket) }}</template>
    </NTable>

    <!-- أنواع الأوردرات -->
    <NTable v-else :columns="typeColumns" :rows="typeRows" row-key="id">
      <template #cell-name="{ row }">
        <NBadge :tone="row.tone" size="sm" dot>{{ row.name }}</NBadge>
      </template>
      <template #cell-net="{ row }">{{ fmt.moneyShort(row.net) }}</template>
      <template #cell-margin="{ row }"><span class="font-display">{{ fmt.moneyShort(row.margin) }}</span></template>
      <template #cell-avgTicket="{ row }">{{ fmt.money0(row.avgTicket) }}</template>
      <template #cell-share="{ row }">{{ fmt.pct(row.share) }}</template>
    </NTable>
  </div>
</template>
