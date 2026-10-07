<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Scissors, Snowflake, RotateCcw } from 'lucide-vue-next'
import { NInput, NSelect, NTable, NBadge, NStat, NButton, NModal, NField, NSegment } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import { round, safeDiv, sum } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const catalog = useCatalogStore()
const ui = useUiStore()
const fmt = useFmt()

const search = ref('')
const groupId = ref('')
const editing = ref(null)
const draft = ref({ purchaseCost: 0, trimPct: 0, reorderBase: 0, parBase: 0, supplierId: '' })

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return catalog.ingredients
    .filter((ing) => (groupId.value ? ing.groupId === groupId.value : true))
    .filter((ing) => (!q ? true : [ing.nameAr, ing.nameEn, ing.sku].some((v) => String(v || '').toLowerCase().includes(q))))
    .map((ing) => {
      const effective = catalog.ingredientUnitCost(ing.id)
      return {
        id: ing.id,
        ingredient: ing,
        name: fmt.name(ing),
        sku: ing.sku,
        groupName: fmt.name(catalog.groupMap.get(ing.groupId)),
        groupTone: catalog.groupMap.get(ing.groupId)?.tone || 'ink',
        purchaseCost: ing.purchaseCost,
        purchaseUnit: ing.purchaseUnit,
        trimPct: ing.trimPct,
        effective: round(effective, 3),
        uplift: safeDiv(effective - ing.purchaseCost, ing.purchaseCost),
        supplier: fmt.name(catalog.supplierMap.get(ing.supplierId)),
        storage: fmt.name(catalog.storageTypes.find((s) => s.id === ing.storage)),
        storageTone: catalog.storageTypes.find((s) => s.id === ing.storage)?.tone || 'ink',
        shelfLifeDays: ing.shelfLifeDays,
        usedIn: catalog.usedIn(ing.id).length,
        isOverridden: !!catalog.ingredientOverrides[ing.id],
      }
    })
    .sort((a, b) => b.usedIn - a.usedIn)
})

const summary = computed(() => ({
  items: catalog.ingredients.length,
  avgTrim: safeDiv(sum(catalog.ingredients, (i) => i.trimPct), catalog.ingredients.length),
  overridden: Object.keys(catalog.ingredientOverrides).length,
  unused: rows.value.filter((r) => !r.usedIn).length,
}))

function openEdit(row) {
  editing.value = row
  draft.value = {
    purchaseCost: row.ingredient.purchaseCost,
    trimPct: round((row.ingredient.trimPct || 0) * 100, 1),
    reorderBase: row.ingredient.reorderBase,
    parBase: row.ingredient.parBase,
    supplierId: row.ingredient.supplierId,
  }
}

function save() {
  catalog.updateIngredient(editing.value.id, {
    purchaseCost: Number(draft.value.purchaseCost) || 0,
    trimPct: Math.min(0.9, Math.max(0, (Number(draft.value.trimPct) || 0) / 100)),
    reorderBase: Number(draft.value.reorderBase) || 0,
    parBase: Number(draft.value.parBase) || 0,
    supplierId: draft.value.supplierId,
  })
  ui.toast(t('common.saved'), 'basil', `${editing.value.name} — ${editing.value.usedIn} وصفة هتتأثر`)
  editing.value = null
}

const columns = computed(() => [
  { key: 'name', label: t('inventory.items'), sortable: true },
  { key: 'purchaseCost', label: t('inventory.purchaseCost'), numeric: true, sortable: true },
  { key: 'trimPct', label: t('recipes.trimLoss'), numeric: true, sortable: true },
  { key: 'effective', label: t('inventory.effectiveCost'), numeric: true, sortable: true },
  { key: 'storage', label: t('inventory.storage'), align: 'center' },
  { key: 'supplier', label: t('common.supplier'), sortable: true },
  { key: 'usedIn', label: t('recipes.usedIn'), numeric: true, sortable: true },
  { key: 'actions', label: '', align: 'center', width: '90px' },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('inventory.items')" :subtitle="t('inventory.itemsSubtitle')" emoji="🥬" tone="basil" />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('inventory.items')" :value="fmt.int(summary.items)" tone="basil" />
      <NStat :label="t('recipes.trimLoss')" :value="fmt.pct(summary.avgTrim)" tone="saffron" :hint="t('common.avg')" />
      <NStat :label="t('common.edit')" :value="fmt.int(summary.overridden)" tone="berry" hint="مواد عدّلت أسعارها" />
      <NStat :label="t('recipes.notUsed')" :value="fmt.int(summary.unused)" :tone="summary.unused ? 'saffron' : 'basil'" hint="غير مستخدمة في وصفات" />
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-52 flex-1">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" :stroke-width="3" />
        <NInput v-model="search" :placeholder="t('common.searchPlaceholder')" class="!ps-10" />
      </div>
      <div class="w-48">
        <NSelect
          v-model="groupId"
          :placeholder="t('common.all')"
          :options="catalog.groups.map((g) => ({ value: g.id, label: fmt.name(g) }))"
        />
      </div>
      <NButton v-if="summary.overridden" variant="outline" size="sm" @click="catalog.resetOverrides(); ui.toast(t('settings.resetDone'), 'sky')">
        <RotateCcw class="size-4" :stroke-width="3" />{{ t('settings.resetCatalog') }}
      </NButton>
    </div>

    <NTable :columns="columns" :rows="rows" row-key="id" max-height="66vh">
      <template #cell-name="{ row }">
        <div class="min-w-0">
          <p class="truncate font-extrabold">
            {{ row.name }}
            <i v-if="row.isOverridden" class="text-[10px] text-berry not-italic">● معدّل</i>
          </p>
          <p class="text-[10px] font-bold opacity-50">{{ row.sku }} · {{ row.groupName }}</p>
        </div>
      </template>

      <template #cell-purchaseCost="{ row }">
        {{ fmt.money(row.purchaseCost) }}
        <span class="text-[10px] opacity-55"> / {{ fmt.unit(row.purchaseUnit) }}</span>
      </template>

      <template #cell-trimPct="{ row }">
        <NBadge v-if="row.trimPct" :tone="row.trimPct > 0.15 ? 'tomato' : 'saffron'" size="sm">
          <Scissors class="size-3" :stroke-width="3" />{{ fmt.pct(row.trimPct, 0) }}
        </NBadge>
        <span v-else class="opacity-30">—</span>
      </template>

      <template #cell-effective="{ row }">
        <span class="font-display">{{ fmt.money(row.effective) }}</span>
        <span v-if="row.uplift > 0.001" class="block text-[10px] font-bold text-tomato">+{{ fmt.pct(row.uplift, 0) }}</span>
      </template>

      <template #cell-storage="{ row }">
        <NBadge :tone="row.storageTone" size="sm">
          <Snowflake v-if="row.ingredient.storage !== 'dry'" class="size-3" :stroke-width="3" />
          {{ row.storage }}
        </NBadge>
      </template>

      <template #cell-supplier="{ row }">
        <span class="text-xs">{{ row.supplier }}</span>
      </template>

      <template #cell-usedIn="{ row }">
        <NBadge :tone="row.usedIn ? 'ink' : 'saffron'" size="sm">{{ row.usedIn }}</NBadge>
      </template>

      <template #cell-actions="{ row }">
        <NButton size="xs" variant="outline" @click="openEdit(row)">{{ t('common.edit') }}</NButton>
      </template>
    </NTable>

    <!-- تعديل مادة -->
    <NModal
      :open="!!editing"
      :title="editing?.name || ''"
      :subtitle="`${editing?.sku} · ${t('recipes.usedInCount', { count: editing?.usedIn || 0 })}`"
      emoji="🥬"
      tone="basil"
      size="sm"
      @close="editing = null"
    >
      <div v-if="editing" class="flex flex-col gap-3">
        <NField :label="`${t('inventory.purchaseCost')} / ${fmt.unit(editing.purchaseUnit)}`" required>
          <NInput v-model="draft.purchaseCost" type="number" align="end" :step="0.5" />
        </NField>
        <NField :label="t('recipes.trimLoss')" :hint="t('inventory.effectiveCostHint')">
          <NInput v-model="draft.trimPct" type="number" align="end" :step="0.5" :min="0" :max="90" />
        </NField>
        <div class="grid grid-cols-2 gap-3">
          <NField :label="t('inventory.reorderPoint')" :hint="fmt.unit(editing.ingredient.recipeUnit)">
            <NInput v-model="draft.reorderBase" type="number" align="end" />
          </NField>
          <NField :label="t('inventory.parLevel')" :hint="fmt.unit(editing.ingredient.recipeUnit)">
            <NInput v-model="draft.parBase" type="number" align="end" />
          </NField>
        </div>
        <NField :label="t('common.supplier')">
          <NSelect
            v-model="draft.supplierId"
            :options="catalog.suppliers.map((s) => ({ value: s.id, label: fmt.name(s) }))"
          />
        </NField>

        <p class="brut-thin bg-saffron-soft px-3 py-2 text-xs font-extrabold">
          ⚠️ تغيير السعر هيعيد حساب تكلفة {{ editing.usedIn }} وصفة فورًا
        </p>
      </div>

      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="editing = null">{{ t('common.cancel') }}</NButton>
          <NButton tone="basil" block @click="save">{{ t('common.save') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
