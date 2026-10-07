<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Save, FileText, Truck } from 'lucide-vue-next'
import {
  NButton, NBadge, NTable, NStat, NModal, NField, NInput, NSelect, NCard, NEmpty,
} from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import { round, sum, safeDiv, inRange } from '@/lib/utils'
import { fromBase } from '@/lib/units'
import { COMPANY } from '@/data/org'
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
const viewing = ref(null)
const form = ref(newForm())

function newForm() {
  return {
    supplierId: catalog.suppliers[0].id,
    warehouseId: 'WH-MAIN',
    note: '',
    lines: [],
  }
}

const list = computed(() =>
  ops.purchases
    .filter((p) => inRange(p.date, reports.from, reports.to))
    .map((p) => ({
      id: p.id,
      purchase: p,
      number: p.number,
      date: p.date,
      supplier: fmt.name(catalog.supplierMap.get(p.supplierId)),
      warehouse: fmt.name(ops.warehouses.find((w) => w.id === p.warehouseId)),
      items: p.lines.length,
      net: p.net,
      vat: p.vat,
      total: p.total,
    })),
)

const summary = computed(() => ({
  invoices: list.value.length,
  net: round(sum(list.value, (p) => p.net), 2),
  avg: round(safeDiv(sum(list.value, (p) => p.net), list.value.length), 2),
  suppliers: new Set(list.value.map((p) => p.supplier)).size,
}))

/* ------- فاتورة جديدة ------- */

const supplierItems = computed(() =>
  catalog.ingredients
    .filter((x) => x.supplierId === form.value.supplierId)
    .map((x) => ({ value: x.id, label: `${fmt.name(x)} — ${fmt.money(x.purchaseCost)}/${fmt.unit(x.purchaseUnit)}` })),
)

function addLine() {
  const first = catalog.ingredients.find((x) => x.supplierId === form.value.supplierId)
  if (!first) return
  form.value.lines.push({
    ingredientId: first.id,
    qty: 10,
    unit: first.purchaseUnit,
    unitCost: first.purchaseCost,
  })
}

function onItemChange(line) {
  const ing = catalog.ingredientMap.get(line.ingredientId)
  if (!ing) return
  line.unit = ing.purchaseUnit
  line.unitCost = ing.purchaseCost
}

const formTotals = computed(() => {
  const net = round(sum(form.value.lines, (l) => (Number(l.qty) || 0) * (Number(l.unitCost) || 0)), 2)
  return { net, vat: round(net * COMPANY.vatPct, 2), total: round(net * (1 + COMPANY.vatPct), 2) }
})

/** تعبئة الفاتورة بالكميات الناقصة حتى الحد الأقصى */
function fillSuggested() {
  form.value.lines = catalog.ingredients
    .filter((x) => x.supplierId === form.value.supplierId)
    .map((ing) => {
      const onHand = ops.stockByIngredient.get(ing.id)?.qtyBase || 0
      if (!ing.reorderBase || onHand >= ing.reorderBase) return null
      const needBase = Math.max(0, ing.parBase - onHand)
      return {
        ingredientId: ing.id,
        qty: Math.max(1, round(fromBase(needBase, ing.purchaseUnit), 2)),
        unit: ing.purchaseUnit,
        unitCost: ing.purchaseCost,
      }
    })
    .filter(Boolean)
  if (!form.value.lines.length) ui.toast('مافيش مواد تحت حد الطلب لهذا المورد', 'sky')
}

function save() {
  if (!form.value.lines.length) return
  const record = ops.recordPurchase({
    supplierId: form.value.supplierId,
    branchId: auth.branchId,
    warehouseId: form.value.warehouseId,
    note: form.value.note,
    lines: form.value.lines.map((l) => ({
      ingredientId: l.ingredientId,
      qty: Number(l.qty) || 0,
      unit: l.unit,
      unitCost: Number(l.unitCost) || 0,
    })),
  })
  ui.toast(t('inventory.purchaseSaved'), 'basil', `${record.number} · ${fmt.money(record.total)}`)
  creating.value = false
  form.value = newForm()
}

const columns = computed(() => [
  { key: 'number', label: t('inventory.purchaseNumber'), sortable: true },
  { key: 'date', label: t('common.date'), sortable: true },
  { key: 'supplier', label: t('common.supplier'), sortable: true },
  { key: 'warehouse', label: t('common.warehouse') },
  { key: 'items', label: t('common.items'), numeric: true, sortable: true },
  { key: 'net', label: t('inventory.net'), numeric: true, sortable: true },
  { key: 'vat', label: t('common.tax'), numeric: true },
  { key: 'total', label: t('common.total'), numeric: true, sortable: true },
  { key: 'actions', label: '', align: 'center', width: '80px' },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('inventory.purchases')" :subtitle="t('inventory.subtitle')" emoji="🚚" tone="saffron">
      <template #actions>
        <NButton tone="saffron" size="sm" @click="creating = true; form = newForm()">
          <Plus class="size-4" :stroke-width="3" />{{ t('inventory.newPurchase') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('inventory.purchases')" :value="fmt.int(summary.invoices)" tone="saffron" />
      <NStat :label="t('inventory.net')" :value="fmt.moneyShort(summary.net)" tone="basil" />
      <NStat :label="t('common.avg')" :value="fmt.moneyShort(summary.avg)" tone="sky" hint="متوسط الفاتورة" />
      <NStat :label="t('common.supplier')" :value="fmt.int(summary.suppliers)" tone="berry" />
    </div>

    <NTable :columns="columns" :rows="list" row-key="id" max-height="64vh">
      <template #cell-number="{ row }">
        <span class="font-display tabular">{{ row.number }}</span>
      </template>
      <template #cell-date="{ row }">
        <span class="text-xs tabular">{{ fmt.date(row.date) }}</span>
      </template>
      <template #cell-net="{ row }">{{ fmt.money0(row.net) }}</template>
      <template #cell-vat="{ row }">
        <span class="text-xs opacity-60">{{ fmt.money0(row.vat) }}</span>
      </template>
      <template #cell-total="{ row }">
        <span class="font-display">{{ fmt.money0(row.total) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <NButton size="xs" variant="outline" @click="viewing = row.purchase">
          <FileText class="size-3.5" :stroke-width="3" />
        </NButton>
      </template>
    </NTable>

    <!-- فاتورة جديدة -->
    <NModal :open="creating" :title="t('inventory.newPurchase')" emoji="🚚" tone="saffron" size="xl" @close="creating = false">
      <div class="flex flex-col gap-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <NField :label="t('common.supplier')" required>
            <NSelect
              v-model="form.supplierId"
              :options="catalog.suppliers.map((s) => ({ value: s.id, label: fmt.name(s) }))"
            />
          </NField>
          <NField :label="t('common.warehouse')" required>
            <NSelect
              v-model="form.warehouseId"
              :options="ops.warehouses.map((w) => ({ value: w.id, label: fmt.name(w) }))"
            />
          </NField>
          <NField :label="t('common.note')">
            <NInput v-model="form.note" />
          </NField>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <NButton size="sm" tone="ink" @click="addLine">
            <Plus class="size-4" :stroke-width="3" />{{ t('inventory.addItem') }}
          </NButton>
          <NButton size="sm" variant="outline" @click="fillSuggested">
            <Truck class="size-4" :stroke-width="3" />تعبئة من حد الطلب
          </NButton>
        </div>

        <NEmpty v-if="!form.lines.length" :text="t('inventory.addItem')" hint="" emoji="📦" />

        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="(l, i) in form.lines"
            :key="i"
            class="grid items-end gap-2 brut-thin bg-paper-2 p-2.5 sm:grid-cols-[1fr_auto_auto_auto_auto]"
          >
            <NField :label="t('inventory.items')">
              <NSelect
                v-model="l.ingredientId"
                :options="supplierItems"
                size="sm"
                @update:model-value="onItemChange(l)"
              />
            </NField>
            <NField :label="t('common.qty')">
              <div class="w-24"><NInput v-model="l.qty" type="number" size="sm" align="end" /></div>
            </NField>
            <NField :label="t('common.unit')">
              <div class="w-20 brut-thin bg-paper px-2 py-2 text-center text-xs font-extrabold">
                {{ fmt.unit(l.unit) }}
              </div>
            </NField>
            <NField :label="t('inventory.purchaseCost')">
              <div class="w-28"><NInput v-model="l.unitCost" type="number" size="sm" align="end" :step="0.5" /></div>
            </NField>
            <div class="flex items-center gap-2">
              <span class="w-24 text-end font-display text-sm tabular">
                {{ fmt.money0((Number(l.qty) || 0) * (Number(l.unitCost) || 0)) }}
              </span>
              <button type="button" class="grid size-9 place-items-center brut-thin bg-tomato-soft cursor-pointer" @click="form.lines.splice(i, 1)">
                <Trash2 class="size-3.5" :stroke-width="3" />
              </button>
            </div>
          </li>
        </ul>

        <dl v-if="form.lines.length" class="flex flex-col gap-1 brut bg-paper-2 p-3 text-sm font-extrabold">
          <div class="flex justify-between"><dt class="opacity-70">{{ t('inventory.net') }}</dt><dd class="tabular">{{ fmt.money(formTotals.net) }}</dd></div>
          <div class="flex justify-between"><dt class="opacity-70">{{ t('common.tax') }}</dt><dd class="tabular">{{ fmt.money(formTotals.vat) }}</dd></div>
          <div class="flex items-baseline justify-between border-t-[3px] border-ink pt-2">
            <dt class="font-display">{{ t('common.total') }}</dt>
            <dd class="font-display text-2xl tabular">{{ fmt.money(formTotals.total) }}</dd>
          </div>
        </dl>
      </div>

      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="creating = false">{{ t('common.cancel') }}</NButton>
          <NButton tone="basil" block :disabled="!form.lines.length" @click="save">
            <Save class="size-4" :stroke-width="3" />{{ t('inventory.savePurchase') }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- عرض فاتورة -->
    <NModal
      :open="!!viewing"
      :title="viewing?.number || ''"
      :subtitle="viewing ? fmt.date(viewing.date) : ''"
      emoji="🧾"
      tone="ink"
      size="lg"
      @close="viewing = null"
    >
      <div v-if="viewing" class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <NBadge tone="saffron">{{ fmt.name(catalog.supplierMap.get(viewing.supplierId)) }}</NBadge>
          <NBadge tone="sky">{{ fmt.name(ops.warehouses.find((w) => w.id === viewing.warehouseId)) }}</NBadge>
          <NBadge tone="basil">{{ t('inventory.received') }}</NBadge>
        </div>
        <ul class="flex flex-col divide-y-[3px] divide-ink/10 brut bg-paper">
          <li v-for="(l, i) in viewing.lines" :key="i" class="flex items-center gap-2 px-3 py-2">
            <span class="min-w-0 flex-1 truncate text-sm font-extrabold">
              {{ fmt.name(catalog.ingredientMap.get(l.ingredientId)) }}
            </span>
            <span class="w-24 text-end text-xs font-bold tabular">{{ fmt.qty(l.qty) }} {{ fmt.unit(l.unit) }}</span>
            <span class="w-24 text-end text-xs font-bold tabular opacity-70">{{ fmt.money(l.unitCost) }}</span>
            <span class="w-24 text-end font-display text-sm tabular">{{ fmt.money0(l.total) }}</span>
          </li>
        </ul>
        <dl class="flex flex-col gap-1 brut bg-paper-2 p-3 text-sm font-extrabold">
          <div class="flex justify-between"><dt class="opacity-70">{{ t('inventory.net') }}</dt><dd class="tabular">{{ fmt.money(viewing.net) }}</dd></div>
          <div class="flex justify-between"><dt class="opacity-70">{{ t('common.tax') }}</dt><dd class="tabular">{{ fmt.money(viewing.vat) }}</dd></div>
          <div class="flex items-baseline justify-between border-t-[3px] border-ink pt-2">
            <dt class="font-display">{{ t('common.total') }}</dt>
            <dd class="font-display text-xl tabular">{{ fmt.money(viewing.total) }}</dd>
          </div>
        </dl>
      </div>
    </NModal>
  </div>
</template>
