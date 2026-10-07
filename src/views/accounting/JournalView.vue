<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { NInput, NSelect, NBadge, NStat, NCard, NTable, NSegment, NEmpty } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { ACC } from '@/lib/gl'
import { cn, round, sum } from '@/lib/utils'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const reports = useReportsStore()
const fmt = useFmt()

const search = ref('')
const source = ref('')
const view = ref('journal')
const expanded = ref(new Set())

const SOURCES = ['sale', 'cogs', 'fee', 'purchase', 'waste', 'variance', 'expense']

const entries = computed(() => {
  const q = search.value.trim().toLowerCase()
  return reports.journalInRange
    .filter((e) => (source.value ? e.source === source.value : true))
    .filter((e) =>
      !q ? true : [e.id, e.memoAr, e.memoEn, e.refId].some((v) => String(v || '').toLowerCase().includes(q)),
    )
    .slice(0, 300)
})

const summary = computed(() => {
  const list = reports.journalInRange
  return {
    entries: list.length,
    debit: round(sum(list, (e) => e.debit), 2),
    unbalanced: list.filter((e) => !e.isBalanced).length,
    sources: new Set(list.map((e) => e.source)).size,
  }
})

const sourceCounts = computed(() =>
  Object.fromEntries(SOURCES.map((s) => [s, reports.journalInRange.filter((e) => e.source === s).length])),
)

const tbRows = computed(() =>
  reports.tb.rows.map((r) => ({
    id: r.accountId,
    code: r.account.code,
    name: fmt.name(r.account),
    debit: r.debit,
    credit: r.credit,
    net: r.net,
    group: r.account.group,
  })),
)

const tbColumns = computed(() => [
  { key: 'code', label: t('common.code'), sortable: true },
  { key: 'name', label: t('accounting.account') },
  { key: 'debit', label: t('accounting.debit'), numeric: true, sortable: true },
  { key: 'credit', label: t('accounting.credit'), numeric: true, sortable: true },
  { key: 'net', label: t('common.total'), numeric: true, sortable: true },
])

function toggle(id) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const sourceTone = {
  sale: 'basil', cogs: 'tomato', fee: 'plum', purchase: 'saffron',
  waste: 'plum', variance: 'sky', expense: 'berry', production: 'ink',
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('accounting.journal')" :subtitle="t('accounting.journalSubtitle')" emoji="📒" tone="ink">
      <template #actions><RangeFilter /></template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('accounting.entryNo')" :value="fmt.int(summary.entries)" tone="ink" />
      <NStat :label="t('accounting.debit')" :value="fmt.moneyShort(summary.debit)" tone="sky" hint="إجمالي الحركة" />
      <NStat
        :label="t('common.balanced')"
        :value="summary.unbalanced ? fmt.int(summary.unbalanced) : '✓'"
        :tone="summary.unbalanced ? 'tomato' : 'basil'"
        :hint="summary.unbalanced ? t('common.unbalanced') : t('common.balanced')"
      />
      <NStat :label="t('accounting.source')" :value="fmt.int(summary.sources)" tone="berry" />
    </div>

    <NSegment
      v-model="view"
      :options="[
        { value: 'journal', label: t('accounting.journal') },
        { value: 'tb', label: t('accounting.trialBalance') },
      ]"
      :scroll="false"
    />

    <template v-if="view === 'journal'">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-52 flex-1">
          <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" :stroke-width="3" />
          <NInput v-model="search" :placeholder="t('common.searchPlaceholder')" class="!ps-10" />
        </div>
        <div class="w-48">
          <NSelect
            v-model="source"
            :placeholder="t('common.all')"
            :options="SOURCES.map((s) => ({ value: s, label: `${t(`accounting.sourceTypes.${s}`)} (${sourceCounts[s] || 0})` }))"
          />
        </div>
      </div>

      <NEmpty v-if="!entries.length" :text="t('common.empty')" emoji="📒" class="brut bg-paper" />

      <ul v-else class="flex flex-col gap-2">
        <li v-for="e in entries" :key="e.id" class="brut bg-paper shadow-brut-sm">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-start cursor-pointer"
            @click="toggle(e.id)"
          >
            <component :is="expanded.has(e.id) ? ChevronDown : ChevronRight" class="size-4 shrink-0 opacity-50" :stroke-width="3" />
            <span class="w-28 shrink-0 font-display text-sm tabular">{{ e.id }}</span>
            <NBadge :tone="sourceTone[e.source] || 'ink'" size="sm">{{ t(`accounting.sourceTypes.${e.source}`) }}</NBadge>
            <span class="min-w-0 flex-1 truncate text-sm font-extrabold">{{ fmt.name({ nameAr: e.memoAr, nameEn: e.memoEn }) }}</span>
            <span class="hidden shrink-0 text-xs font-bold tabular opacity-55 sm:block">{{ fmt.dateTime(e.date) }}</span>
            <span class="w-28 shrink-0 text-end font-display text-sm tabular">{{ fmt.money0(e.debit) }}</span>
            <component
              :is="e.isBalanced ? CheckCircle2 : AlertTriangle"
              :class="cn('size-4 shrink-0', e.isBalanced ? 'text-basil' : 'text-tomato')"
              :stroke-width="3"
            />
          </button>

          <table v-if="expanded.has(e.id)" class="w-full border-t-[3px] border-ink text-sm">
            <thead class="bg-paper-2">
              <tr class="text-[10px] font-extrabold uppercase opacity-60">
                <th class="px-3 py-1.5 text-start">{{ t('accounting.account') }}</th>
                <th class="px-3 py-1.5 text-end">{{ t('accounting.debit') }}</th>
                <th class="px-3 py-1.5 text-end">{{ t('accounting.credit') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in e.lines" :key="i" class="border-t-[3px] border-ink/10">
                <td class="px-3 py-1.5 font-bold">
                  <span class="tabular opacity-50">{{ ACC.get(l.accountId)?.code }}</span>
                  {{ fmt.name(ACC.get(l.accountId)) }}
                </td>
                <td class="px-3 py-1.5 text-end tabular">{{ l.debit ? fmt.money(l.debit) : '—' }}</td>
                <td class="px-3 py-1.5 text-end tabular">{{ l.credit ? fmt.money(l.credit) : '—' }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t-[3px] border-ink bg-paper-2 font-display">
              <tr>
                <td class="px-3 py-1.5">{{ t('common.total') }}</td>
                <td class="px-3 py-1.5 text-end tabular">{{ fmt.money(e.debit) }}</td>
                <td class="px-3 py-1.5 text-end tabular">{{ fmt.money(e.credit) }}</td>
              </tr>
            </tfoot>
          </table>
        </li>
      </ul>
    </template>

    <!-- ميزان المراجعة -->
    <template v-else>
      <NCard :title="t('accounting.trialBalance')" tone="sky" :padded="false">
        <NTable :columns="tbColumns" :rows="tbRows" row-key="id" class="!border-0 !shadow-none" max-height="68vh">
          <template #cell-code="{ row }">
            <span class="font-display tabular">{{ row.code }}</span>
          </template>
          <template #cell-debit="{ row }">{{ row.debit ? fmt.money0(row.debit) : '—' }}</template>
          <template #cell-credit="{ row }">{{ row.credit ? fmt.money0(row.credit) : '—' }}</template>
          <template #cell-net="{ row }">
            <span class="font-display">{{ fmt.money0(row.net) }}</span>
          </template>
          <template #footer>
            <tr>
              <td class="px-3 py-2.5" colspan="2">{{ t('common.total') }}</td>
              <td class="px-3 py-2.5 text-end tabular">{{ fmt.money0(reports.tb.totalDebit) }}</td>
              <td class="px-3 py-2.5 text-end tabular">{{ fmt.money0(reports.tb.totalCredit) }}</td>
              <td class="px-3 py-2.5 text-end">
                <NBadge :tone="reports.tb.isBalanced ? 'basil' : 'tomato'" size="sm">
                  {{ reports.tb.isBalanced ? t('common.balanced') : t('common.unbalanced') }}
                </NBadge>
              </td>
            </tr>
          </template>
        </NTable>
      </NCard>
    </template>
  </div>
</template>
