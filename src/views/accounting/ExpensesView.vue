<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Save } from 'lucide-vue-next'
import { NButton, NBadge, NTable, NStat, NModal, NField, NInput, NSelect, NCard, NChart } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { ACCOUNTS } from '@/data/org'
import { ACC } from '@/lib/gl'
import { round, safeDiv, sum } from '@/lib/utils'
import { CHART_COLORS } from '@/lib/constants'
import { useOpsStore } from '@/stores/ops'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const ops = useOpsStore()
const auth = useAuthStore()
const ui = useUiStore()
const reports = useReportsStore()
const fmt = useFmt()

const creating = ref(false)
const form = ref({ accountId: 'A-6030', amount: 0, memoAr: '', paidFrom: 'A-1010' })

const expenseAccounts = computed(() => ACCOUNTS.filter((a) => a.parentId === 'A-6000'))
const cashAccounts = computed(() => ACCOUNTS.filter((a) => ['A-1010', 'A-1020', 'A-1030'].includes(a.id)))

/** صفوف المصروفات من قائمة الدخل — مش من جدول منفصل */
const rows = computed(() =>
  reports.pnl.expenseLines
    .filter((l) => l.net)
    .map((l) => ({
      id: l.accountId,
      code: l.account.code,
      name: fmt.name(l.account),
      fixed: !!l.account.fixed,
      amount: l.net,
      pctOfRevenue: safeDiv(l.net, reports.pnl.netRevenue),
      perDay: round(l.net / Math.max(1, reports.days + 1), 2),
    }))
    .sort((a, b) => b.amount - a.amount),
)

const manual = computed(() =>
  ops.expenses.map((e) => ({
    id: e.id,
    date: e.date,
    account: fmt.name(ACC.get(e.accountId)),
    memo: e.memoAr || '—',
    paidFrom: fmt.name(ACC.get(e.paidFrom)),
    amount: e.amount,
  })),
)

const summary = computed(() => {
  const p = reports.pnl
  return {
    total: p.expenses,
    fixed: p.fixedExpenses,
    variable: p.variableExpenses,
    pct: safeDiv(p.expenses, p.netRevenue),
  }
})

const donut = computed(() => ({
  series: rows.value.map((r) => round(r.amount, 0)),
  labels: rows.value.map((r) => r.name),
}))

function save() {
  if (!form.value.amount) return
  ops.recordExpense({
    accountId: form.value.accountId,
    amount: Number(form.value.amount) || 0,
    memoAr: form.value.memoAr || fmt.name(ACC.get(form.value.accountId)),
    memoEn: form.value.memoAr,
    branchId: auth.branchId,
    paidFrom: form.value.paidFrom,
  })
  ui.toast(t('accounting.expenseSaved'), 'basil', fmt.money(form.value.amount))
  creating.value = false
  form.value = { accountId: 'A-6030', amount: 0, memoAr: '', paidFrom: 'A-1010' }
}

const columns = computed(() => [
  { key: 'code', label: t('common.code') },
  { key: 'name', label: t('accounting.expenseAccount'), sortable: true },
  { key: 'fixed', label: t('common.type'), align: 'center' },
  { key: 'perDay', label: 'يوميًا', numeric: true, sortable: true },
  { key: 'amount', label: t('accounting.amount'), numeric: true, sortable: true },
  { key: 'pctOfRevenue', label: '% من الإيراد', numeric: true, sortable: true },
])

const manualColumns = computed(() => [
  { key: 'date', label: t('common.date') },
  { key: 'account', label: t('accounting.expenseAccount') },
  { key: 'memo', label: t('accounting.memo') },
  { key: 'paidFrom', label: t('accounting.paidFrom') },
  { key: 'amount', label: t('accounting.amount'), numeric: true },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('accounting.expenses')" :subtitle="t('accounting.incomeSubtitle')" emoji="🧾" tone="berry">
      <template #actions>
        <RangeFilter />
        <NButton tone="berry" size="sm" @click="creating = true">
          <Plus class="size-4" :stroke-width="3" />{{ t('accounting.newExpense') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('accounting.operatingExpenses')" :value="fmt.moneyShort(summary.total)" tone="berry" :hint="`${fmt.pct(summary.pct)} من الإيراد`" />
      <NStat :label="t('accounting.fixedExpenses')" :value="fmt.moneyShort(summary.fixed)" tone="tomato" :hint="fmt.pct(safeDiv(summary.fixed, summary.total))" />
      <NStat :label="t('accounting.variableExpenses')" :value="fmt.moneyShort(summary.variable)" tone="saffron" :hint="fmt.pct(safeDiv(summary.variable, summary.total))" />
      <NStat :label="t('accounting.contributionMargin')" :value="fmt.pct(reports.pnl.contributionMarginPct)" tone="basil" :hint="fmt.moneyShort(reports.pnl.contributionMargin)" />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <NCard :title="t('accounting.expenses')" tone="berry" :padded="false">
        <NTable :columns="columns" :rows="rows" row-key="id" class="!border-0 !shadow-none">
          <template #cell-code="{ row }">
            <span class="font-display tabular">{{ row.code }}</span>
          </template>
          <template #cell-fixed="{ row }">
            <NBadge :tone="row.fixed ? 'tomato' : 'saffron'" size="sm">
              {{ row.fixed ? t('accounting.fixedExpenses') : t('accounting.variableExpenses') }}
            </NBadge>
          </template>
          <template #cell-perDay="{ row }">
            <span class="text-xs opacity-70">{{ fmt.money0(row.perDay) }}</span>
          </template>
          <template #cell-amount="{ row }">
            <span class="font-display">{{ fmt.money0(row.amount) }}</span>
          </template>
          <template #cell-pctOfRevenue="{ row }">{{ fmt.pct(row.pctOfRevenue) }}</template>
          <template #footer>
            <tr>
              <td class="px-3 py-2.5" colspan="4">{{ t('common.total') }}</td>
              <td class="px-3 py-2.5 text-end text-base tabular">{{ fmt.money0(summary.total) }}</td>
              <td class="px-3 py-2.5 text-end tabular">{{ fmt.pct(summary.pct) }}</td>
            </tr>
          </template>
        </NTable>
      </NCard>

      <NCard :title="t('accounting.expenses')" subtitle="التوزيع" tone="sky">
        <NChart
          v-if="donut.series.length"
          type="donut"
          :series="donut.series"
          :labels="donut.labels"
          :colors="CHART_COLORS"
          :height="380"
          :y-formatter="(v) => fmt.moneyShort(v)"
        />
      </NCard>
    </div>

    <NCard v-if="manual.length" :title="t('accounting.newExpense')" subtitle="المصروفات اللي سجّلتها" tone="ink" :padded="false">
      <NTable :columns="manualColumns" :rows="manual" row-key="id" dense class="!border-0 !shadow-none">
        <template #cell-date="{ row }">
          <span class="text-xs tabular">{{ fmt.dateTime(row.date) }}</span>
        </template>
        <template #cell-amount="{ row }">
          <span class="font-display">{{ fmt.money(row.amount) }}</span>
        </template>
      </NTable>
    </NCard>

    <!-- تسجيل مصروف -->
    <NModal :open="creating" :title="t('accounting.newExpense')" emoji="🧾" tone="berry" size="sm" @close="creating = false">
      <div class="flex flex-col gap-3">
        <NField :label="t('accounting.expenseAccount')" required>
          <NSelect
            v-model="form.accountId"
            :options="expenseAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${fmt.name(a)}` }))"
          />
        </NField>
        <NField :label="t('accounting.amount')" required>
          <NInput v-model="form.amount" type="number" align="end" :step="50" />
        </NField>
        <NField :label="t('accounting.memo')">
          <NInput v-model="form.memoAr" placeholder="وصف المصروف" />
        </NField>
        <NField :label="t('accounting.paidFrom')">
          <NSelect
            v-model="form.paidFrom"
            :options="cashAccounts.map((a) => ({ value: a.id, label: fmt.name(a) }))"
          />
        </NField>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="creating = false">{{ t('common.cancel') }}</NButton>
          <NButton tone="basil" block :disabled="!form.amount" @click="save">
            <Save class="size-4" :stroke-width="3" />{{ t('accounting.saveExpense') }}
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
