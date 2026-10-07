<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Save, ClipboardList, TrendingUp, TrendingDown } from 'lucide-vue-next'
import {
  NButton, NBadge, NTable, NStat, NModal, NField, NInput, NSelect, NMeter, NEmpty,
} from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import { round, sum, safeDiv, inRange } from '@/lib/utils'
import { fromBase, toBase } from '@/lib/units'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const auth = useAuthStore()
const ui = useUiStore()
const reports = useReportsStore()
const fmt = useFmt()

const counting = ref(false)
const viewing = ref(null)
const sheet = ref({ warehouseId: 'WH-MAIN', groupId: '', lines: [] })

const list = computed(() =>
  ops.counts
    .filter((c) => inRange(c.date, reports.from, reports.to))
    .map((c) => ({
      id: c.id,
      count: c,
      number: c.number,
      date: c.date,
      warehouse: fmt.name(ops.warehouses.find((w) => w.id === c.warehouseId)),
      items: c.lines.length,
      accuracyPct: c.accuracyPct,
      varianceValue: c.varianceValue,
      shortages: c.lines.filter((l) => l.varianceBase < 0).length,
    })),
)

const summary = computed(() => ({
  sessions: list.value.length,
  variance: round(sum(list.value, (c) => c.varianceValue), 2),
  accuracy: safeDiv(sum(list.value, (c) => c.accuracyPct), list.value.length),
  shortages: sum(list.value, (c) => c.shortages),
}))

/* ------- ورقة جرد جديدة ------- */

function openSheet() {
  sheet.value = { warehouseId: 'WH-MAIN', groupId: '', lines: [] }
  buildSheet()
  counting.value = true
}

function buildSheet() {
  sheet.value.lines = ops.stock
    .filter((s) => s.warehouseId === sheet.value.warehouseId)
    .filter((s) => {
      if (!sheet.value.groupId) return true
      return catalog.ingredientMap.get(s.ingredientId)?.groupId === sheet.value.groupId
    })
    .map((s) => {
      const ing = catalog.ingredientMap.get(s.ingredientId)
      return {
        ingredientId: s.ingredientId,
        name: fmt.name(ing),
        sku: ing?.sku,
        unit: ing?.purchaseUnit || 'kg',
        systemQty: round(fromBase(s.qtyBase, ing?.purchaseUnit || 'kg'), 3),
        systemBase: s.qtyBase,
        countedQty: round(fromBase(s.qtyBase, ing?.purchaseUnit || 'kg'), 3),
        costPerBase: catalog.engine.ingredientPurchaseCostPerBase(s.ingredientId),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

const sheetRows = computed(() =>
  sheet.value.lines.map((l, index) => {
    const countedBase = toBase(Number(l.countedQty) || 0, l.unit)
    const varianceBase = round(countedBase - l.systemBase, 3)
    return {
      ...l,
      index,
      countedBase,
      varianceBase,
      varianceQty: round(fromBase(varianceBase, l.unit), 3),
      varianceValue: round(varianceBase * l.costPerBase, 2),
    }
  }),
)

const sheetTotals = computed(() => {
  const rows = sheetRows.value
  const counted = rows.filter((r) => Math.abs(r.varianceBase) > 0.0001)
  return {
    items: rows.length,
    withVariance: counted.length,
    varianceValue: round(sum(rows, (r) => r.varianceValue), 2),
    shortageValue: round(sum(rows.filter((r) => r.varianceValue < 0), (r) => r.varianceValue), 2),
    accuracy: safeDiv(
      sum(rows, (r) => Math.min(r.countedBase, r.systemBase)),
      sum(rows, (r) => r.systemBase),
    ),
  }
})

function post() {
  const record = ops.postCount({
    warehouseId: sheet.value.warehouseId,
    branchId: auth.branchId,
    countedBy: auth.userId,
    lines: sheetRows.value.map((r) => ({
      ingredientId: r.ingredientId,
      systemBase: r.systemBase,
      countedBase: r.countedBase,
      unit: r.unit,
    })),
  })
  ui.toast(t('inventory.countPosted'), 'basil', `${record.number} · ${fmt.money(record.varianceValue)}`)
  counting.value = false
}

const columns = computed(() => [
  { key: 'number', label: t('inventory.countNumber'), sortable: true },
  { key: 'date', label: t('common.date'), sortable: true },
  { key: 'warehouse', label: t('common.warehouse') },
  { key: 'items', label: t('common.items'), numeric: true },
  { key: 'accuracyPct', label: t('inventory.accuracy'), align: 'center', width: '160px' },
  { key: 'shortages', label: t('inventory.shortage'), numeric: true },
  { key: 'varianceValue', label: t('common.variance'), numeric: true, sortable: true },
  { key: 'actions', label: '', align: 'center', width: '70px' },
])

const sheetColumns = computed(() => [
  { key: 'name', label: t('inventory.items') },
  { key: 'systemQty', label: t('inventory.systemQty'), numeric: true },
  { key: 'countedQty', label: t('inventory.countedQty'), align: 'center', width: '140px' },
  { key: 'varianceQty', label: t('common.variance'), numeric: true },
  { key: 'varianceValue', label: t('common.value'), numeric: true },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('inventory.counts')" :subtitle="t('inventory.countHint')" emoji="📋" tone="sky">
      <template #actions>
        <NButton tone="sky" size="sm" @click="openSheet">
          <Plus class="size-4" :stroke-width="3" />{{ t('inventory.newCount') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('inventory.counts')" :value="fmt.int(summary.sessions)" tone="sky" />
      <NStat :label="t('inventory.accuracy')" :value="fmt.pct(summary.accuracy)" :tone="summary.accuracy > 0.97 ? 'basil' : 'saffron'" />
      <NStat
        :label="t('common.variance')"
        :value="fmt.moneyShort(summary.variance)"
        :tone="summary.variance < 0 ? 'tomato' : 'basil'"
        hint="صافي فروق الجرد"
      />
      <NStat :label="t('inventory.shortage')" :value="fmt.int(summary.shortages)" tone="tomato" hint="أصناف بها عجز" />
    </div>

    <NTable :columns="columns" :rows="list" row-key="id" max-height="60vh">
      <template #cell-number="{ row }">
        <span class="font-display tabular">{{ row.number }}</span>
      </template>
      <template #cell-date="{ row }">
        <span class="text-xs tabular">{{ fmt.date(row.date) }}</span>
      </template>
      <template #cell-accuracyPct="{ row }">
        <NMeter
          :value="row.accuracyPct"
          :tone="row.accuracyPct > 0.97 ? 'basil' : row.accuracyPct > 0.93 ? 'saffron' : 'tomato'"
          height="sm"
          :caption="fmt.pct(row.accuracyPct)"
        />
      </template>
      <template #cell-shortages="{ row }">
        <NBadge :tone="row.shortages ? 'tomato' : 'basil'" size="sm">{{ row.shortages }}</NBadge>
      </template>
      <template #cell-varianceValue="{ row }">
        <span :class="['font-display', row.varianceValue < 0 ? 'text-tomato' : 'text-basil']">
          {{ fmt.money0(row.varianceValue) }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <NButton size="xs" variant="outline" @click="viewing = row.count">
          <ClipboardList class="size-3.5" :stroke-width="3" />
        </NButton>
      </template>
    </NTable>

    <!-- ورقة جرد -->
    <NModal :open="counting" :title="t('inventory.newCount')" :subtitle="t('inventory.countHint')" emoji="📋" tone="sky" size="xl" @close="counting = false">
      <div class="flex flex-col gap-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <NField :label="t('common.warehouse')" required>
            <NSelect
              v-model="sheet.warehouseId"
              :options="ops.warehouses.map((w) => ({ value: w.id, label: fmt.name(w) }))"
              @update:model-value="buildSheet"
            />
          </NField>
          <NField :label="t('common.category')">
            <NSelect
              v-model="sheet.groupId"
              :placeholder="t('common.all')"
              :options="catalog.groups.map((g) => ({ value: g.id, label: fmt.name(g) }))"
              @update:model-value="buildSheet"
            />
          </NField>
          <div class="flex items-end">
            <div class="grid w-full grid-cols-2 gap-2">
              <div class="brut-thin bg-paper-2 px-2 py-1.5">
                <p class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.items') }}</p>
                <p class="font-display text-base tabular">{{ sheetTotals.items }}</p>
              </div>
              <div :class="['brut-thin px-2 py-1.5', sheetTotals.varianceValue < 0 ? 'bg-tomato-soft' : 'bg-basil-soft']">
                <p class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.variance') }}</p>
                <p class="font-display text-base tabular">{{ fmt.money0(sheetTotals.varianceValue) }}</p>
              </div>
            </div>
          </div>
        </div>

        <NEmpty v-if="!sheetRows.length" :text="t('common.empty')" hint="" emoji="📦" />

        <NTable v-else :columns="sheetColumns" :rows="sheetRows" row-key="index" dense max-height="46vh">
          <template #cell-name="{ row }">
            <div class="min-w-0">
              <p class="truncate font-extrabold">{{ row.name }}</p>
              <p class="text-[10px] font-bold opacity-50">{{ row.sku }}</p>
            </div>
          </template>
          <template #cell-systemQty="{ row }">
            {{ fmt.qty(row.systemQty) }} <span class="text-[10px] opacity-55">{{ fmt.unit(row.unit) }}</span>
          </template>
          <template #cell-countedQty="{ row }">
            <NInput
              v-model="sheet.lines[row.index].countedQty"
              type="number"
              size="sm"
              align="end"
              :step="0.1"
            />
          </template>
          <template #cell-varianceQty="{ row }">
            <span v-if="Math.abs(row.varianceQty) < 0.001" class="opacity-30">—</span>
            <span v-else :class="['inline-flex items-center gap-1 font-extrabold', row.varianceQty < 0 ? 'text-tomato' : 'text-basil']">
              <component :is="row.varianceQty < 0 ? TrendingDown : TrendingUp" class="size-3" :stroke-width="3" />
              {{ fmt.qty(row.varianceQty) }}
            </span>
          </template>
          <template #cell-varianceValue="{ row }">
            <span v-if="Math.abs(row.varianceValue) < 0.01" class="opacity-30">—</span>
            <span v-else :class="row.varianceValue < 0 ? 'text-tomato' : 'text-basil'">
              {{ fmt.money(row.varianceValue) }}
            </span>
          </template>
        </NTable>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <NBadge tone="ink" size="sm">{{ t('inventory.accuracy') }} {{ fmt.pct(sheetTotals.accuracy) }}</NBadge>
            <NBadge tone="tomato" size="sm">{{ t('inventory.shortage') }} {{ fmt.money0(sheetTotals.shortageValue) }}</NBadge>
            <NBadge tone="sky" size="sm">{{ sheetTotals.withVariance }} صنف بفرق</NBadge>
          </div>
          <div class="flex gap-2">
            <NButton variant="outline" @click="counting = false">{{ t('common.cancel') }}</NButton>
            <NButton tone="basil" :disabled="!sheetRows.length" @click="post">
              <Save class="size-4" :stroke-width="3" />{{ t('inventory.postCount') }}
            </NButton>
          </div>
        </div>
      </template>
    </NModal>

    <!-- عرض جرد -->
    <NModal
      :open="!!viewing"
      :title="viewing?.number || ''"
      :subtitle="viewing ? fmt.dateTime(viewing.date) : ''"
      emoji="📋"
      tone="ink"
      size="lg"
      @close="viewing = null"
    >
      <div v-if="viewing" class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <NBadge tone="sky">{{ fmt.name(ops.warehouses.find((w) => w.id === viewing.warehouseId)) }}</NBadge>
          <NBadge tone="ink">{{ t('inventory.accuracy') }} {{ fmt.pct(viewing.accuracyPct) }}</NBadge>
          <NBadge :tone="viewing.varianceValue < 0 ? 'tomato' : 'basil'">
            {{ t('common.variance') }} {{ fmt.money(viewing.varianceValue) }}
          </NBadge>
        </div>
        <ul class="flex flex-col divide-y-[3px] divide-ink/10 brut bg-paper">
          <li
            v-for="(l, i) in viewing.lines.filter((x) => Math.abs(x.varianceBase) > 0.0001)"
            :key="i"
            class="flex items-center gap-2 px-3 py-2"
          >
            <span class="min-w-0 flex-1 truncate text-sm font-extrabold">
              {{ fmt.name(catalog.ingredientMap.get(l.ingredientId)) }}
            </span>
            <span class="w-24 text-end text-xs font-bold tabular opacity-70">{{ fmt.qty(l.systemBase) }}</span>
            <span class="w-24 text-end text-xs font-bold tabular">{{ fmt.qty(l.countedBase) }}</span>
            <span :class="['w-24 text-end font-display text-sm tabular', l.varianceValue < 0 ? 'text-tomato' : 'text-basil']">
              {{ fmt.money0(l.varianceValue) }}
            </span>
          </li>
        </ul>
      </div>
    </NModal>
  </div>
</template>
