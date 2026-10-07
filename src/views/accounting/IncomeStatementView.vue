<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Printer, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import { NCard, NStat, NBadge, NButton, NChart, NMeter, NTable } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { cn, round, safeDiv } from '@/lib/utils'
import { useReportsStore } from '@/stores/reports'
import { useOpsStore } from '@/stores/ops'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const reports = useReportsStore()
const ops = useOpsStore()
const fmt = useFmt()

const pnl = computed(() => reports.pnl)
const pct = (v) => safeDiv(v, pnl.value.netRevenue)

/** صفوف قائمة الدخل بالترتيب المطعمي المعتاد */
const statement = computed(() => {
  const p = pnl.value
  const rows = []
  rows.push({ kind: 'header', label: t('accounting.revenue') })
  for (const l of p.revenueLines.filter((x) => !x.account.contra && x.net)) {
    rows.push({ kind: 'line', label: fmt.name(l.account), value: l.net, pct: pct(l.net) })
  }
  if (p.discounts) rows.push({ kind: 'line', label: t('accounting.discounts'), value: -p.discounts, pct: pct(-p.discounts) })
  rows.push({ kind: 'total', label: t('accounting.netRevenue'), value: p.netRevenue, pct: 1, tone: 'sky' })

  rows.push({ kind: 'header', label: t('accounting.cogs') })
  for (const l of p.cogsLines.filter((x) => x.net)) {
    rows.push({ kind: 'line', label: fmt.name(l.account), value: -l.net, pct: pct(-l.net) })
  }
  rows.push({ kind: 'total', label: t('accounting.grossProfit'), value: p.grossProfit, pct: pct(p.grossProfit), tone: 'basil' })

  rows.push({ kind: 'header', label: t('accounting.operatingExpenses') })
  for (const l of p.expenseLines.filter((x) => x.net)) {
    rows.push({ kind: 'line', label: fmt.name(l.account), value: -l.net, pct: pct(-l.net), fixed: l.account.fixed })
  }
  rows.push({ kind: 'grand', label: t('accounting.netProfit'), value: p.netProfit, pct: pct(p.netProfit), tone: p.netProfit >= 0 ? 'basil' : 'tomato' })
  return rows
})

/** شلال الربح: إيراد → تكلفة → مصروفات → صافي */
const waterfall = computed(() => {
  const p = pnl.value
  return {
    series: [
      {
        name: t('accounting.netProfit'),
        data: [
          { x: t('accounting.netRevenue'), y: round(p.netRevenue, 0) },
          { x: t('accounting.cogs'), y: -round(p.cogs, 0) },
          { x: t('accounting.operatingExpenses'), y: -round(p.expenses, 0) },
          { x: t('accounting.netProfit'), y: round(p.netProfit, 0) },
        ],
      },
    ],
  }
})

const dailyTrend = computed(() => {
  const days = reports.salesByDay
  return {
    series: [
      { name: t('dashboard.netSales'), type: 'column', data: days.map((d) => round(d.net, 0)) },
      { name: t('accounting.grossProfit'), type: 'line', data: days.map((d) => round(d.profit, 0)) },
    ],
    categories: days.map((d) => fmt.dayMonth(d.date)),
  }
})

const branchRows = computed(() =>
  reports.pnlByBranch.map(({ branch, statement: s }) => ({
    id: branch.id,
    name: fmt.name(branch),
    tone: branch.tone,
    netRevenue: s.netRevenue,
    cogs: s.cogs,
    foodCostPct: s.foodCostPct,
    grossProfit: s.grossProfit,
    expenses: s.expenses,
    netProfit: s.netProfit,
    netMarginPct: s.netMarginPct,
  })),
)

const branchColumns = computed(() => [
  { key: 'name', label: t('common.branch') },
  { key: 'netRevenue', label: t('accounting.netRevenue'), numeric: true, sortable: true },
  { key: 'cogs', label: t('accounting.cogs'), numeric: true },
  { key: 'foodCostPct', label: t('dashboard.foodCost'), numeric: true, sortable: true },
  { key: 'grossProfit', label: t('accounting.grossProfit'), numeric: true },
  { key: 'expenses', label: t('accounting.operatingExpenses'), numeric: true },
  { key: 'netProfit', label: t('accounting.netProfit'), numeric: true, sortable: true },
  { key: 'netMarginPct', label: t('accounting.netMargin'), numeric: true },
])

const doPrint = () => window.print()
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('accounting.incomeStatement')" :subtitle="t('accounting.incomeSubtitle')" emoji="📊" tone="sky">
      <template #actions>
        <RangeFilter />
        <NButton variant="outline" size="sm" class="no-print" @click="doPrint">
          <Printer class="size-4" :stroke-width="3" />{{ t('common.print') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('accounting.netRevenue')" :value="fmt.moneyShort(pnl.netRevenue)" tone="sky" :delta="reports.delta.net" />
      <NStat
        :label="t('accounting.grossProfit')"
        :value="fmt.moneyShort(pnl.grossProfit)"
        tone="basil"
        :hint="`${t('accounting.grossMargin')} ${fmt.pct(pnl.grossMarginPct)}`"
      />
      <NStat
        :label="t('dashboard.foodCost')"
        :value="fmt.pct(pnl.foodCostPct)"
        :tone="pnl.foodCostPct > 0.34 ? 'tomato' : 'basil'"
        invert
        :delta="reports.delta.foodCostPct"
      />
      <NStat
        :label="t('accounting.netProfit')"
        :value="fmt.moneyShort(pnl.netProfit)"
        :tone="pnl.netProfit >= 0 ? 'basil' : 'tomato'"
        :hint="`${t('accounting.netMargin')} ${fmt.pct(pnl.netMarginPct)}`"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <!-- القائمة -->
      <NCard :title="t('accounting.incomeStatement')" :subtitle="`${fmt.date(reports.from)} — ${fmt.date(reports.to)}`" tone="sky" :padded="false">
        <table class="w-full text-sm">
          <tbody>
            <tr
              v-for="(r, i) in statement"
              :key="i"
              :class="cn(
                r.kind === 'header' && 'bg-ink text-paper',
                r.kind === 'total' && 'bg-paper-2 border-y-[3px] border-ink',
                r.kind === 'grand' && 'bg-saffron border-y-[3px] border-ink',
              )"
            >
              <th
                v-if="r.kind === 'header'"
                colspan="3"
                class="px-4 py-2 text-start text-xs font-extrabold uppercase tracking-wide"
              >{{ r.label }}</th>
              <template v-else>
                <td :class="cn('px-4 py-2', r.kind === 'line' ? 'ps-8 font-bold' : 'font-display')">
                  {{ r.label }}
                  <NBadge v-if="r.fixed" tone="ink" size="sm" class="ms-1.5">ثابت</NBadge>
                </td>
                <td
                  :class="cn(
                    'px-4 py-2 text-end tabular',
                    r.kind === 'grand' ? 'font-display text-xl' : r.kind === 'total' ? 'font-display text-base' : 'font-extrabold',
                    r.value < 0 && r.kind === 'line' && 'text-tomato',
                  )"
                >{{ fmt.money(r.value) }}</td>
                <td class="px-4 py-2 text-end text-[11px] font-bold tabular opacity-55">
                  {{ fmt.pct(r.pct, 1) }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </NCard>

      <div class="flex flex-col gap-4">
        <NCard :title="t('accounting.netProfit')" tone="basil">
          <NChart
            type="bar"
            :series="waterfall.series"
            :height="260"
            :colors="['#2bb3ff', '#ff4d2e', '#ff2d8a', '#12b76a']"
            :y-formatter="(v) => fmt.moneyShort(v)"
            :options="{
              plotOptions: { bar: { distributed: true, columnWidth: '55%' } },
              legend: { show: false },
              xaxis: { type: 'category' },
            }"
          />
        </NCard>

        <NCard :title="t('accounting.breakEven')" :subtitle="t('accounting.breakEvenHint')" tone="saffron">
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-2">
              <div class="brut-thin bg-paper-2 px-3 py-2">
                <p class="text-[10px] font-extrabold uppercase opacity-60">{{ t('accounting.fixedExpenses') }}</p>
                <p class="font-display text-lg tabular">{{ fmt.moneyShort(pnl.fixedExpenses) }}</p>
              </div>
              <div class="brut-thin bg-paper-2 px-3 py-2">
                <p class="text-[10px] font-extrabold uppercase opacity-60">{{ t('accounting.contributionMargin') }}</p>
                <p class="font-display text-lg tabular">{{ fmt.pct(pnl.contributionMarginPct) }}</p>
              </div>
            </div>
            <NMeter
              :value="Math.min(1, safeDiv(pnl.netRevenue, pnl.breakEvenRevenue))"
              :target="1"
              :tone="pnl.netRevenue >= pnl.breakEvenRevenue ? 'basil' : 'tomato'"
              height="lg"
              :label="t('accounting.breakEven')"
              :caption="`${fmt.moneyShort(pnl.netRevenue)} / ${fmt.moneyShort(pnl.breakEvenRevenue)}`"
            />
            <p
              :class="cn(
                'flex items-center gap-2 brut-thin px-3 py-2 text-xs font-extrabold',
                pnl.netRevenue >= pnl.breakEvenRevenue ? 'bg-basil-soft' : 'bg-tomato-soft',
              )"
            >
              <component :is="pnl.netRevenue >= pnl.breakEvenRevenue ? CheckCircle2 : AlertTriangle" class="size-4 shrink-0" :stroke-width="3" />
              <span v-if="pnl.netRevenue >= pnl.breakEvenRevenue">
                فوق نقطة التعادل بـ {{ fmt.moneyShort(pnl.netRevenue - pnl.breakEvenRevenue) }}
              </span>
              <span v-else>
                ناقص {{ fmt.moneyShort(pnl.breakEvenRevenue - pnl.netRevenue) }} للوصول للتعادل
              </span>
            </p>
          </div>
        </NCard>
      </div>
    </div>

    <NCard :title="t('dashboard.salesTrend')" tone="tomato">
      <NChart
        type="line"
        :series="dailyTrend.series"
        :categories="dailyTrend.categories"
        :height="280"
        :colors="['#2bb3ff', '#12b76a']"
        :y-formatter="(v) => fmt.moneyShort(v)"
        :options="{ chart: { type: 'line' }, stroke: { width: [0, 4] }, plotOptions: { bar: { columnWidth: '55%' } } }"
      />
    </NCard>

    <NCard :title="t('accounting.byBranch')" tone="berry" :padded="false">
      <NTable :columns="branchColumns" :rows="branchRows" row-key="id" class="!border-0 !shadow-none">
        <template #cell-name="{ row }">
          <NBadge :tone="row.tone" size="sm" dot>{{ row.name }}</NBadge>
        </template>
        <template #cell-netRevenue="{ row }">{{ fmt.moneyShort(row.netRevenue) }}</template>
        <template #cell-cogs="{ row }">{{ fmt.moneyShort(row.cogs) }}</template>
        <template #cell-foodCostPct="{ row }">
          <NBadge :tone="row.foodCostPct > 0.34 ? 'tomato' : 'basil'" size="sm">{{ fmt.pct(row.foodCostPct) }}</NBadge>
        </template>
        <template #cell-grossProfit="{ row }">{{ fmt.moneyShort(row.grossProfit) }}</template>
        <template #cell-expenses="{ row }">{{ fmt.moneyShort(row.expenses) }}</template>
        <template #cell-netProfit="{ row }">
          <span :class="['font-display', row.netProfit < 0 ? 'text-tomato' : 'text-basil']">
            {{ fmt.moneyShort(row.netProfit) }}
          </span>
        </template>
        <template #cell-netMarginPct="{ row }">{{ fmt.pct(row.netMarginPct) }}</template>
      </NTable>
    </NCard>

    <p class="flex items-center gap-2 text-xs font-bold opacity-60">
      <TrendingUp class="size-4" :stroke-width="3" />
      {{ t('accounting.journalSubtitle') }} —
      {{ ops.journal.length }} قيد ·
      <NBadge :tone="reports.tb.isBalanced ? 'basil' : 'tomato'" size="sm">
        {{ reports.tb.isBalanced ? t('common.balanced') : t('common.unbalanced') }}
      </NBadge>
    </p>
  </div>
</template>
