<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Save } from 'lucide-vue-next'
import {
  NButton, NBadge, NTable, NStat, NModal, NField, NInput, NSelect, NCard, NChart, NEmpty,
} from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { WASTE_REASONS } from '@/data/menu'
import { TONES } from '@/lib/constants'
import { round, sum, safeDiv } from '@/lib/utils'
import { toBase } from '@/lib/units'
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

const creating = ref(false)
const form = ref(newForm())

function newForm() {
  return { warehouseId: 'WH-KIT', reasonId: WASTE_REASONS[0].id, note: '', lines: [] }
}

const waste = computed(() => reports.wasteSummary)

const rows = computed(() =>
  waste.value.events.map((w) => ({
    id: w.id,
    number: w.number,
    date: w.date,
    reason: fmt.name({ nameAr: w.reasonAr, nameEn: w.reasonEn }),
    reasonTone: WASTE_REASONS.find((r) => r.id === w.reasonId)?.tone || 'ink',
    warehouse: fmt.name(ops.warehouses.find((x) => x.id === w.warehouseId)),
    items: w.lines.length,
    topItem: fmt.name(catalog.ingredientMap.get([...w.lines].sort((a, b) => b.value - a.value)[0]?.ingredientId)),
    value: w.value,
  })),
)

const byReason = computed(() => waste.value.byReason)
const donut = computed(() => ({
  series: byReason.value.map((r) => r.value),
  labels: byReason.value.map((r) => fmt.name({ nameAr: r.reasonAr, nameEn: r.reasonEn })),
  colors: byReason.value.map((r) => TONES[WASTE_REASONS.find((x) => x.id === r.reasonId)?.tone || 'ink'].fill),
}))

/** أعلى المواد هدرًا */
const topItems = computed(() => {
  const acc = new Map()
  for (const w of waste.value.events) {
    for (const l of w.lines || []) {
      const cur = acc.get(l.ingredientId) || { ingredientId: l.ingredientId, value: 0, qty: 0 }
      cur.value += l.value || 0
      cur.qty += l.baseQty || 0
      acc.set(l.ingredientId, cur)
    }
  }
  return [...acc.values()]
    .map((r) => ({
      ...r,
      name: fmt.name(catalog.ingredientMap.get(r.ingredientId)),
      value: round(r.value, 2),
      share: safeDiv(r.value, waste.value.total),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
})

function addLine() {
  const ing = catalog.ingredients[0]
  form.value.lines.push({ ingredientId: ing.id, qty: 1, unit: ing.purchaseUnit })
}
function onItemChange(line) {
  const ing = catalog.ingredientMap.get(line.ingredientId)
  if (ing) line.unit = ing.purchaseUnit
}

const formValue = computed(() =>
  round(
    sum(form.value.lines, (l) => {
      if (!catalog.ingredientMap.get(l.ingredientId)) return 0
      try {
        return toBase(Number(l.qty) || 0, l.unit) * catalog.engine.ingredientPurchaseCostPerBase(l.ingredientId)
      } catch {
        return 0
      }
    }),
    2,
  ),
)

function save() {
  if (!form.value.lines.length) return
  const record = ops.recordWaste({
    branchId: auth.branchId,
    warehouseId: form.value.warehouseId,
    reasonId: form.value.reasonId,
    note: form.value.note,
    lines: form.value.lines.map((l) => ({ ingredientId: l.ingredientId, qty: Number(l.qty) || 0, unit: l.unit })),
  })
  ui.toast(t('inventory.wasteSaved'), 'saffron', `${record.number} · ${fmt.money(record.value)}`)
  creating.value = false
  form.value = newForm()
}

const columns = computed(() => [
  { key: 'number', label: t('common.code'), sortable: true },
  { key: 'date', label: t('common.date'), sortable: true },
  { key: 'reason', label: t('inventory.wasteReason') },
  { key: 'warehouse', label: t('common.warehouse') },
  { key: 'topItem', label: t('inventory.items') },
  { key: 'items', label: t('common.items'), numeric: true },
  { key: 'value', label: t('inventory.wasteValue'), numeric: true, sortable: true },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('inventory.waste')" :subtitle="t('inventory.subtitle')" emoji="🗑️" tone="plum">
      <template #actions>
        <RangeFilter :branch="false" />
        <NButton tone="plum" size="sm" @click="creating = true; form = newForm()">
          <Plus class="size-4" :stroke-width="3" />{{ t('inventory.newWaste') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('inventory.wasteValue')" :value="fmt.moneyShort(waste.total)" tone="plum" />
      <NStat
        :label="t('dashboard.wastePct')"
        :value="fmt.pct(waste.pctOfSales)"
        :tone="waste.pctOfSales > 0.03 ? 'tomato' : 'basil'"
        hint="الحد المقبول 3%"
      />
      <NStat :label="t('common.orders')" :value="fmt.int(waste.count)" tone="sky" hint="عدد حركات الهدر" />
      <NStat
        :label="t('inventory.wasteReason')"
        :value="byReason[0] ? fmt.name({ nameAr: byReason[0].reasonAr, nameEn: byReason[0].reasonEn }) : '—'"
        tone="saffron"
        :hint="byReason[0] ? fmt.moneyShort(byReason[0].value) : ''"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <NCard :title="t('inventory.wasteReason')" tone="plum">
        <NChart
          v-if="donut.series.length"
          type="donut"
          :series="donut.series"
          :labels="donut.labels"
          :colors="donut.colors"
          :height="280"
          :y-formatter="(v) => fmt.money0(v)"
        />
        <NEmpty v-else :text="t('common.empty')" hint="" />
      </NCard>

      <NCard :title="t('inventory.items')" subtitle="أعلى المواد هدرًا" tone="tomato" :padded="false">
        <ul v-if="topItems.length" class="flex flex-col divide-y-[3px] divide-ink/10">
          <li v-for="(r, i) in topItems" :key="r.ingredientId" class="flex items-center gap-3 px-4 py-2.5">
            <span class="grid size-7 shrink-0 place-items-center brut-thin bg-paper-2 font-display text-xs tabular">
              {{ i + 1 }}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm font-extrabold">{{ r.name }}</span>
            <span class="text-xs font-bold tabular opacity-55">{{ fmt.pct(r.share, 0) }}</span>
            <span class="w-24 text-end font-display text-sm tabular">{{ fmt.money0(r.value) }}</span>
          </li>
        </ul>
        <NEmpty v-else :text="t('common.empty')" hint="" />
      </NCard>
    </div>

    <NTable :columns="columns" :rows="rows" row-key="id" max-height="56vh">
      <template #cell-number="{ row }">
        <span class="font-display tabular">{{ row.number }}</span>
      </template>
      <template #cell-date="{ row }">
        <span class="text-xs tabular">{{ fmt.dateTime(row.date) }}</span>
      </template>
      <template #cell-reason="{ row }">
        <NBadge :tone="row.reasonTone" size="sm" dot>{{ row.reason }}</NBadge>
      </template>
      <template #cell-value="{ row }">
        <span class="font-display text-tomato">{{ fmt.money0(row.value) }}</span>
      </template>
    </NTable>

    <!-- تسجيل هدر -->
    <NModal :open="creating" :title="t('inventory.newWaste')" emoji="🗑️" tone="plum" size="lg" @close="creating = false">
      <div class="flex flex-col gap-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <NField :label="t('common.warehouse')" required>
            <NSelect
              v-model="form.warehouseId"
              :options="ops.warehouses.map((w) => ({ value: w.id, label: fmt.name(w) }))"
            />
          </NField>
          <NField :label="t('inventory.wasteReason')" required>
            <NSelect
              v-model="form.reasonId"
              :options="WASTE_REASONS.map((r) => ({ value: r.id, label: fmt.name(r) }))"
            />
          </NField>
          <NField :label="t('common.note')">
            <NInput v-model="form.note" />
          </NField>
        </div>

        <NButton size="sm" tone="ink" @click="addLine">
          <Plus class="size-4" :stroke-width="3" />{{ t('inventory.addItem') }}
        </NButton>

        <NEmpty v-if="!form.lines.length" :text="t('inventory.addItem')" hint="" emoji="🥬" />

        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="(l, i) in form.lines"
            :key="i"
            class="grid items-end gap-2 brut-thin bg-paper-2 p-2.5 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <NField :label="t('inventory.items')">
              <NSelect
                v-model="l.ingredientId"
                :options="catalog.ingredients.map((x) => ({ value: x.id, label: fmt.name(x) }))"
                size="sm"
                @update:model-value="onItemChange(l)"
              />
            </NField>
            <NField :label="t('common.qty')">
              <div class="w-24"><NInput v-model="l.qty" type="number" size="sm" align="end" :step="0.1" /></div>
            </NField>
            <NField :label="t('common.unit')">
              <div class="w-20 brut-thin bg-paper px-2 py-2 text-center text-xs font-extrabold">
                {{ fmt.unit(l.unit) }}
              </div>
            </NField>
            <button type="button" class="grid size-9 place-items-center brut-thin bg-tomato-soft cursor-pointer" @click="form.lines.splice(i, 1)">
              <Trash2 class="size-3.5" :stroke-width="3" />
            </button>
          </li>
        </ul>

        <div v-if="form.lines.length" class="flex items-baseline justify-between gap-2 brut bg-tomato-soft px-3 py-2.5">
          <span class="text-xs font-extrabold opacity-70">{{ t('inventory.wasteValue') }}</span>
          <span class="font-display text-2xl tabular">{{ fmt.money(formValue) }}</span>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="creating = false">{{ t('common.cancel') }}</NButton>
          <NButton tone="plum" block :disabled="!form.lines.length" @click="save">
            <Save class="size-4" :stroke-width="3" />{{ t('inventory.saveWaste') }}
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
