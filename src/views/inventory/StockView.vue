<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, AlertTriangle, CalendarClock } from 'lucide-vue-next'
import { NInput, NSelect, NTable, NBadge, NStat, NSegment, NMeter, NCard } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import { MOVEMENT_TYPES } from '@/lib/constants'
import { round, safeDiv, sum } from '@/lib/utils'
import { fromBase } from '@/lib/units'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const reports = useReportsStore()
const fmt = useFmt()

const search = ref('')
const groupId = ref('')
const warehouseId = ref('')
const scope = ref('all')

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return catalog.ingredients
    .filter((ing) => (groupId.value ? ing.groupId === groupId.value : true))
    .filter((ing) => (!q ? true : [ing.nameAr, ing.nameEn, ing.sku].some((v) => String(v || '').toLowerCase().includes(q))))
    .map((ing) => {
      const agg = ops.stockByIngredient.get(ing.id)
      const whRows = (agg?.rows || []).filter((r) => (warehouseId.value ? r.warehouseId === warehouseId.value : true))
      const qtyBase = warehouseId.value ? sum(whRows, (r) => r.qtyBase) : agg?.qtyBase || 0
      const value = warehouseId.value
        ? sum(whRows, (r) => r.qtyBase * r.avgCostPerBase)
        : agg?.value || 0
      const nearestExpiry = whRows
        .map((r) => r.expiryAt)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b))[0]
      const consumed = ops.theoreticalConsumption.get(ing.id) || 0
      const dailyUse = consumed / Math.max(1, reports.days + 1)
      return {
        id: ing.id,
        ingredient: ing,
        name: fmt.name(ing),
        sku: ing.sku,
        groupName: fmt.name(catalog.groupMap.get(ing.groupId)),
        groupTone: catalog.groupMap.get(ing.groupId)?.tone || 'ink',
        qty: round(fromBase(qtyBase, ing.purchaseUnit), 2),
        qtyBase,
        unit: ing.purchaseUnit,
        value: round(value, 2),
        reorder: round(fromBase(ing.reorderBase, ing.purchaseUnit), 2),
        par: round(fromBase(ing.parBase, ing.purchaseUnit), 2),
        coverage: safeDiv(qtyBase, ing.parBase || 1),
        daysOfCover: dailyUse > 0 ? round(qtyBase / dailyUse, 1) : null,
        belowReorder: ing.reorderBase > 0 && qtyBase < ing.reorderBase,
        nearestExpiry,
        isExpiring: nearestExpiry ? new Date(nearestExpiry) <= new Date(Date.now() + 7 * 86400000) : false,
        suggestedOrder: round(Math.max(0, fromBase(ing.parBase - qtyBase, ing.purchaseUnit)), 2),
      }
    })
    .filter((r) => {
      if (scope.value === 'low') return r.belowReorder
      if (scope.value === 'expiring') return r.isExpiring
      return true
    })
    .sort((a, b) => a.coverage - b.coverage)
})

const summary = computed(() => ({
  value: ops.inventoryValue,
  items: catalog.ingredients.length,
  low: reports.lowStock.length,
  expiring: reports.expiringSoon.length,
  wastePct: reports.wasteSummary.pctOfSales,
}))

const movements = computed(() =>
  ops.movements.slice(0, 40).map((m) => ({
    id: m.id,
    date: m.date,
    typeMeta: MOVEMENT_TYPES[m.type] || MOVEMENT_TYPES.purchase,
    type: m.type,
    refNumber: m.refNumber,
    warehouse: fmt.name(ops.warehouses.find((w) => w.id === m.warehouseId)),
    linesCount: m.lines?.length || 0,
    value: round(m.value || 0, 2),
  })),
)

const columns = computed(() => [
  { key: 'name', label: t('inventory.items'), sortable: true },
  { key: 'qty', label: t('inventory.onHand'), numeric: true, sortable: true },
  { key: 'coverage', label: t('inventory.coverage'), align: 'center', width: '150px' },
  { key: 'daysOfCover', label: 'أيام تغطية', numeric: true, sortable: true },
  { key: 'value', label: t('inventory.stockValue'), numeric: true, sortable: true },
  { key: 'nearestExpiry', label: t('inventory.expiryDate'), align: 'center' },
  { key: 'suggestedOrder', label: t('inventory.suggestedOrder'), numeric: true },
])

const movementColumns = computed(() => [
  { key: 'date', label: t('common.date') },
  { key: 'type', label: t('inventory.movementType') },
  { key: 'refNumber', label: t('common.code') },
  { key: 'warehouse', label: t('common.warehouse') },
  { key: 'linesCount', label: t('common.items'), numeric: true },
  { key: 'value', label: t('common.value'), numeric: true },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('inventory.title')" :subtitle="t('inventory.subtitle')" emoji="📦" tone="basil" />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <NStat :label="t('inventory.stockValue')" :value="fmt.moneyShort(summary.value)" tone="basil" :hint="`${summary.items} مادة`" />
      <NStat :label="t('inventory.belowReorder')" :value="fmt.int(summary.low)" :tone="summary.low ? 'tomato' : 'basil'" :hint="t('inventory.reorderPoint')" />
      <NStat :label="t('inventory.expiring')" :value="fmt.int(summary.expiring)" :tone="summary.expiring ? 'saffron' : 'basil'" hint="خلال 7 أيام" />
      <NStat :label="t('dashboard.wastePct')" :value="fmt.pct(summary.wastePct)" :tone="summary.wastePct > 0.03 ? 'tomato' : 'basil'" :hint="fmt.moneyShort(reports.wasteSummary.total)" />
      <NStat :label="t('inventory.movements')" :value="fmt.int(ops.movements.length)" tone="sky" hint="آخر 30 يوم" />
    </div>

    <!-- فلاتر -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-52 flex-1">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" :stroke-width="3" />
        <NInput v-model="search" :placeholder="t('common.searchPlaceholder')" class="!ps-10" />
      </div>
      <div class="w-44">
        <NSelect
          v-model="groupId"
          :placeholder="t('common.all')"
          :options="catalog.groups.map((g) => ({ value: g.id, label: fmt.name(g) }))"
        />
      </div>
      <div class="w-44">
        <NSelect
          v-model="warehouseId"
          :placeholder="t('common.warehouse')"
          :options="ops.warehouses.map((w) => ({ value: w.id, label: fmt.name(w) }))"
        />
      </div>
      <NSegment
        v-model="scope"
        :options="[
          { value: 'all', label: t('common.all') },
          { value: 'low', label: t('inventory.belowReorder'), tone: 'tomato', count: summary.low },
          { value: 'expiring', label: t('inventory.expiring'), tone: 'saffron', count: summary.expiring },
        ]"
        size="sm"
        :scroll="false"
      />
    </div>

    <NTable :columns="columns" :rows="rows" row-key="id" max-height="58vh">
      <template #cell-name="{ row }">
        <div class="flex items-center gap-2">
          <AlertTriangle v-if="row.belowReorder" class="size-4 shrink-0 text-tomato" :stroke-width="3" />
          <div class="min-w-0">
            <p class="truncate font-extrabold">{{ row.name }}</p>
            <p class="text-[10px] font-bold opacity-50">{{ row.sku }} · {{ row.groupName }}</p>
          </div>
        </div>
      </template>

      <template #cell-qty="{ row }">
        <span class="font-display">{{ fmt.qty(row.qty) }}</span>
        <span class="text-[10px] opacity-55"> {{ fmt.unit(row.unit) }}</span>
      </template>

      <template #cell-coverage="{ row }">
        <NMeter
          :value="Math.min(1, row.coverage)"
          :target="row.par ? row.reorder / row.par : null"
          :tone="row.belowReorder ? 'tomato' : row.coverage < 0.5 ? 'saffron' : 'basil'"
          height="sm"
          :caption="fmt.pct(row.coverage, 0)"
        />
      </template>

      <template #cell-daysOfCover="{ row }">
        <span v-if="row.daysOfCover === null" class="opacity-30">—</span>
        <NBadge v-else :tone="row.daysOfCover < 3 ? 'tomato' : row.daysOfCover < 7 ? 'saffron' : 'basil'" size="sm">
          {{ fmt.num(row.daysOfCover, 1) }}
        </NBadge>
      </template>

      <template #cell-value="{ row }">{{ fmt.money0(row.value) }}</template>

      <template #cell-nearestExpiry="{ row }">
        <span v-if="!row.nearestExpiry" class="opacity-30">—</span>
        <NBadge v-else :tone="row.isExpiring ? 'tomato' : 'ink'" size="sm">
          <CalendarClock class="size-3" :stroke-width="3" />{{ fmt.dayMonth(row.nearestExpiry) }}
        </NBadge>
      </template>

      <template #cell-suggestedOrder="{ row }">
        <span v-if="!row.suggestedOrder" class="opacity-30">—</span>
        <span v-else class="font-display">{{ fmt.qty(row.suggestedOrder) }} {{ fmt.unit(row.unit) }}</span>
      </template>
    </NTable>

    <!-- الحركات -->
    <NCard :title="t('inventory.movements')" tone="sky" :padded="false">
      <NTable :columns="movementColumns" :rows="movements" row-key="id" dense class="!border-0 !shadow-none" max-height="44vh">
        <template #cell-date="{ row }">
          <span class="text-xs tabular">{{ fmt.dateTime(row.date) }}</span>
        </template>
        <template #cell-type="{ row }">
          <NBadge :tone="row.typeMeta.tone" size="sm" dot>{{ fmt.name(row.typeMeta) }}</NBadge>
        </template>
        <template #cell-refNumber="{ row }">
          <span class="text-xs font-extrabold tabular">{{ row.refNumber || '—' }}</span>
        </template>
        <template #cell-value="{ row }">
          <span :class="row.typeMeta.sign < 0 ? 'text-tomato' : ''">
            {{ row.typeMeta.sign < 0 ? '−' : '+' }} {{ fmt.money0(Math.abs(row.value)) }}
          </span>
        </template>
      </NTable>
    </NCard>
  </div>
</template>
