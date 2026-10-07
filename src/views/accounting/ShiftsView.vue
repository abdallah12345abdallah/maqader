<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTable, NBadge, NStat, NCard, NChart } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { USERS, BRANCHES } from '@/data/org'
import { round, sum, safeDiv, inRange } from '@/lib/utils'
import { useOpsStore } from '@/stores/ops'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const ops = useOpsStore()
const reports = useReportsStore()
const fmt = useFmt()

const rows = computed(() =>
  ops.shifts
    .filter((s) => inRange(s.closedAt || s.openedAt, reports.from, reports.to))
    .filter((s) => (!reports.branchId ? true : s.branchId === reports.branchId))
    .map((s) => ({
      id: s.id,
      number: s.number,
      date: s.date,
      branch: fmt.name(BRANCHES.find((b) => b.id === s.branchId)),
      branchTone: BRANCHES.find((b) => b.id === s.branchId)?.tone || 'ink',
      cashier: fmt.name(USERS.find((u) => u.id === s.cashierId)),
      ordersCount: s.ordersCount,
      salesTotal: s.salesTotal,
      openingFloat: s.openingFloat,
      cashExpected: s.cashExpected,
      cashCounted: s.cashCounted,
      difference: s.difference,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date)),
)

const summary = computed(() => {
  const list = rows.value
  const diff = round(sum(list, (s) => s.difference), 2)
  return {
    shifts: list.length,
    sales: round(sum(list, (s) => s.salesTotal), 2),
    cash: round(sum(list, (s) => s.cashCounted), 2),
    diff,
    shortShifts: list.filter((s) => s.difference < -0.01).length,
    accuracy: safeDiv(list.filter((s) => Math.abs(s.difference) < 0.01).length, list.length),
  }
})

const chart = computed(() => {
  const list = [...rows.value].reverse().slice(-20)
  return {
    series: [{ name: t('accounting.difference'), data: list.map((s) => round(s.difference, 2)) }],
    categories: list.map((s) => fmt.dayMonth(s.date)),
  }
})

const columns = computed(() => [
  { key: 'number', label: t('accounting.shifts'), sortable: true },
  { key: 'date', label: t('common.date'), sortable: true },
  { key: 'branch', label: t('common.branch') },
  { key: 'cashier', label: t('common.user') },
  { key: 'ordersCount', label: t('common.orders'), numeric: true, sortable: true },
  { key: 'salesTotal', label: t('common.sales'), numeric: true, sortable: true },
  { key: 'cashExpected', label: t('accounting.cashExpected'), numeric: true },
  { key: 'cashCounted', label: t('accounting.cashCounted'), numeric: true },
  { key: 'difference', label: t('accounting.difference'), numeric: true, sortable: true },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('accounting.shifts')" :subtitle="t('accounting.shiftsSubtitle')" emoji="💰" tone="saffron">
      <template #actions><RangeFilter /></template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('accounting.shifts')" :value="fmt.int(summary.shifts)" tone="saffron" />
      <NStat :label="t('accounting.cashCounted')" :value="fmt.moneyShort(summary.cash)" tone="basil" />
      <NStat
        :label="t('accounting.difference')"
        :value="fmt.money(summary.diff)"
        :tone="Math.abs(summary.diff) < 1 ? 'basil' : summary.diff < 0 ? 'tomato' : 'saffron'"
        :hint="`${summary.shortShifts} وردية بعجز`"
      />
      <NStat :label="t('accounting.exact')" :value="fmt.pct(summary.accuracy)" tone="sky" hint="ورديات مطابقة تمامًا" />
    </div>

    <NCard :title="t('accounting.difference')" subtitle="آخر 20 وردية" tone="tomato">
      <NChart
        type="bar"
        :series="chart.series"
        :categories="chart.categories"
        :height="260"
        :colors="['#ff4d2e']"
        :y-formatter="(v) => fmt.money(v)"
      />
    </NCard>

    <NTable :columns="columns" :rows="rows" row-key="id" max-height="62vh">
      <template #cell-number="{ row }">
        <span class="font-display text-xs tabular">{{ row.number }}</span>
      </template>
      <template #cell-date="{ row }">
        <span class="text-xs tabular">{{ fmt.date(row.date) }}</span>
      </template>
      <template #cell-branch="{ row }">
        <NBadge :tone="row.branchTone" size="sm" dot>{{ row.branch }}</NBadge>
      </template>
      <template #cell-salesTotal="{ row }">{{ fmt.money0(row.salesTotal) }}</template>
      <template #cell-cashExpected="{ row }">{{ fmt.money0(row.cashExpected) }}</template>
      <template #cell-cashCounted="{ row }">
        <span class="font-display">{{ fmt.money0(row.cashCounted) }}</span>
      </template>
      <template #cell-difference="{ row }">
        <NBadge
          :tone="Math.abs(row.difference) < 0.01 ? 'basil' : row.difference < 0 ? 'tomato' : 'saffron'"
          size="sm"
        >
          {{ Math.abs(row.difference) < 0.01 ? t('accounting.exact') : fmt.money(row.difference) }}
        </NBadge>
      </template>
    </NTable>
  </div>
</template>
