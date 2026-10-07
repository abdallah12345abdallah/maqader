<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowRight, ArrowLeft, Copy, Plus, Trash2, Layers, AlertTriangle, Clock,
  Flame, TrendingUp, Save, Package,
} from 'lucide-vue-next'
import {
  NButton, NBadge, NCard, NStat, NInput, NSelect, NField, NModal, NTable, NMeter, NChart, NEmpty, NSegment,
} from '@/components/ui'
import CostTreeNode from '@/components/recipes/CostTreeNode.vue'
import { cn, round, safeDiv } from '@/lib/utils'
import { TONES, CHART_COLORS } from '@/lib/constants'
import { UNITS, getUnit } from '@/lib/units'
import { useCatalogStore } from '@/stores/catalog'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const catalog = useCatalogStore()
const ui = useUiStore()
const fmt = useFmt()

const BackIcon = computed(() => (ui.isRtl ? ArrowRight : ArrowLeft))
const recipeId = computed(() => route.params.id)
const recipe = computed(() => catalog.recipeMap.get(recipeId.value))
const cost = computed(() => (recipe.value ? catalog.costOf(recipeId.value) : null))
const eco = computed(() => (recipe.value?.type === 'menu' ? catalog.economicsOf(recipeId.value) : null))
const tree = computed(() => (recipe.value ? catalog.engine.costTree(recipeId.value) : []))
const exploded = computed(() =>
  recipe.value ? catalog.engine.explodeDetailed(recipeId.value, recipe.value.yieldQty, recipe.value.yieldUnit) : [],
)
const usedIn = computed(() => catalog.usedIn(recipeId.value))
const category = computed(() => catalog.categoryMap.get(recipe.value?.categoryId))
const station = computed(() => catalog.stationMap.get(recipe.value?.stationId))

const rightTab = ref('tree')
const addSheet = ref(false)

/* ------------- تعديل مباشر ------------- */

function setPrice(v) {
  catalog.updateRecipe(recipeId.value, { price: Number(v) || 0 })
}
function setLineQty(index, v) {
  const lines = recipe.value.lines.map((l, i) => (i === index ? { ...l, qty: Number(v) || 0 } : l))
  catalog.updateRecipe(recipeId.value, { lines })
}
function setLineUnit(index, unit) {
  const lines = recipe.value.lines.map((l, i) => (i === index ? { ...l, unit } : l))
  catalog.updateRecipe(recipeId.value, { lines })
}
function removeLine(index) {
  catalog.updateRecipe(recipeId.value, { lines: recipe.value.lines.filter((_, i) => i !== index) })
}
function setBatchLoss(v) {
  catalog.updateRecipe(recipeId.value, { batchLossPct: Math.min(0.9, Math.max(0, (Number(v) || 0) / 100)) })
}
function setYield(v) {
  catalog.updateRecipe(recipeId.value, { yieldQty: Number(v) || 1 })
}

/* ------------- إضافة مكوّن ------------- */

const newLine = ref({ type: 'ingredient', refId: '', qty: 100, unit: 'g' })

const refOptions = computed(() => {
  if (newLine.value.type === 'ingredient') {
    return catalog.ingredients.map((x) => ({ value: x.id, label: `${fmt.name(x)} — ${x.sku}` }))
  }
  return catalog.prepRecipes
    .filter((r) => r.id !== recipeId.value)
    .map((r) => ({ value: r.id, label: `${fmt.name(r)} — ${r.code}` }))
})

const unitOptions = computed(() => {
  const entity =
    newLine.value.type === 'ingredient'
      ? catalog.ingredientMap.get(newLine.value.refId)
      : catalog.recipeMap.get(newLine.value.refId)
  const dim = entity ? (newLine.value.type === 'ingredient' ? entity.dim : getUnit(entity.yieldUnit)?.dim) : null
  return UNITS.filter((u) => !dim || u.dim === dim).map((u) => ({ value: u.code, label: fmt.name(u) }))
})

function addLine() {
  if (!newLine.value.refId) return
  const lines = [...(recipe.value.lines || []), { ...newLine.value, qty: Number(newLine.value.qty) || 0 }]
  catalog.updateRecipe(recipeId.value, { lines })
  addSheet.value = false
  newLine.value = { type: 'ingredient', refId: '', qty: 100, unit: 'g' }
  ui.toast(t('common.saved'), 'basil')
}

function duplicate() {
  const copy = catalog.duplicateRecipe(recipeId.value)
  if (copy) {
    ui.toast(t('recipes.duplicate'), 'basil', fmt.name(copy))
    router.push(`/recipes/${copy.id}`)
  }
}

/* ------------- عرض ------------- */

const lineRows = computed(() =>
  (cost.value?.lines || []).map((l, index) => {
    const entity = l.type === 'ingredient' ? catalog.ingredientMap.get(l.refId) : catalog.recipeMap.get(l.refId)
    return {
      index,
      ...l,
      entity,
      name: fmt.name(entity),
      meta: l.type === 'ingredient' ? entity?.sku : entity?.code,
      trimPct: l.type === 'ingredient' ? entity?.trimPct || 0 : null,
    }
  }),
)

const topCostLines = computed(() => [...lineRows.value].sort((a, b) => b.cost - a.cost).slice(0, 6))

const donut = computed(() => ({
  series: topCostLines.value.map((l) => round(l.cost, 2)),
  labels: topCostLines.value.map((l) => l.name),
}))

const fcTone = computed(() => {
  if (!eco.value) return 'ink'
  const diff = eco.value.foodCostPct - eco.value.targetFoodCostPct
  return diff <= 0 ? 'basil' : diff <= 0.04 ? 'saffron' : 'tomato'
})

const lineColumns = computed(() => [
  { key: 'name', label: t('recipes.ingredients') },
  { key: 'qty', label: t('common.qty'), align: 'center', width: '190px' },
  { key: 'unitCost', label: t('common.cost') + ' / ' + t('common.unit'), numeric: true },
  { key: 'cost', label: t('common.cost'), numeric: true },
  { key: 'sharePct', label: t('recipes.shareOfCost'), numeric: true },
  { key: 'actions', label: '', align: 'center', width: '56px' },
])

const explodedColumns = computed(() => [
  { key: 'name', label: t('inventory.items') },
  { key: 'qty', label: t('common.qty'), numeric: true },
  { key: 'cost', label: t('common.cost'), numeric: true },
])
</script>

<template>
  <div v-if="!recipe" class="brut bg-paper p-8">
    <NEmpty :text="t('common.empty')" emoji="🍽️" />
  </div>

  <div v-else class="flex flex-col gap-5">
    <!-- الرأس -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <NButton variant="outline" size="sm" @click="router.push('/recipes')">
          <component :is="BackIcon" class="size-4" :stroke-width="3" />
        </NButton>
        <span
          :class="cn('grid size-14 shrink-0 place-items-center brut shadow-brut text-3xl', (TONES[category?.tone || 'berry'] || TONES.berry).soft)"
        >{{ recipe.emoji }}</span>
        <div>
          <h1 class="text-2xl leading-tight sm:text-3xl">{{ fmt.name(recipe) }}</h1>
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            <NBadge tone="ink" size="sm">{{ recipe.code }}</NBadge>
            <NBadge v-if="category" :tone="category.tone" size="sm">{{ category.emoji }} {{ fmt.name(category) }}</NBadge>
            <NBadge v-if="station" :tone="station.tone" size="sm">
              <Flame class="size-3" :stroke-width="3" />{{ fmt.name(station) }}
            </NBadge>
            <NBadge :tone="recipe.type === 'menu' ? 'tomato' : 'berry'" size="sm">
              {{ recipe.type === 'menu' ? t('recipes.menuItems') : t('recipes.prepItems') }}
            </NBadge>
            <NBadge v-if="cost.depth > 1" tone="sky" size="sm">
              <Layers class="size-3" :stroke-width="3" />{{ cost.depth }} {{ t('recipes.levels') }}
            </NBadge>
            <NBadge v-if="recipe.prepTimeMin" tone="saffron" size="sm">
              <Clock class="size-3" :stroke-width="3" />{{ fmt.duration(recipe.prepTimeMin) }}
            </NBadge>
          </div>
        </div>
      </div>

      <NButton variant="outline" size="sm" @click="duplicate">
        <Copy class="size-4" :stroke-width="3" />{{ t('recipes.duplicate') }}
      </NButton>
    </header>

    <p v-if="cost.error" class="flex items-center gap-2 brut bg-tomato-soft px-4 py-3 text-sm font-extrabold">
      <AlertTriangle class="size-5 shrink-0" :stroke-width="3" />
      {{ t('recipes.recipeError') }} — {{ cost.error === 'CIRCULAR_REFERENCE' ? t('recipes.circularRef') : t('recipes.unitMismatch') }}
    </p>

    <!-- مؤشرات التكلفة -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat
        :label="recipe.type === 'menu' ? t('recipes.costPerPortion') : t('recipes.costPerBatch')"
        :value="fmt.money(recipe.type === 'menu' ? cost.unitCost : cost.batchCost)"
        tone="berry"
        :hint="recipe.type === 'prep' ? `${fmt.money(cost.costPerYieldUnit)} / ${fmt.unit(recipe.yieldUnit)}` : ''"
      />
      <NStat
        v-if="eco"
        :label="t('recipes.foodCostPct')"
        :value="fmt.pct(eco.foodCostPct)"
        :tone="fcTone"
        :hint="`${t('recipes.targetPct')} ${fmt.pct(eco.targetFoodCostPct)}`"
      />
      <NStat
        v-else
        :label="t('common.yield')"
        :value="`${fmt.qty(cost.yieldQty)} ${fmt.unit(recipe.yieldUnit)}`"
        tone="sky"
        :hint="`${t('recipes.batchLoss')} ${fmt.pct(cost.lossPct)}`"
      />
      <NStat
        v-if="eco"
        :label="t('recipes.profitPerPortion')"
        :value="fmt.money(eco.margin)"
        tone="basil"
        :hint="`${t('common.margin')} ${fmt.pct(eco.marginPct)}`"
      />
      <NStat
        v-else
        :label="t('recipes.usedIn')"
        :value="fmt.int(usedIn.length)"
        tone="saffron"
        :hint="usedIn.length ? usedIn.map((r) => fmt.name(r)).slice(0, 2).join(' · ') : t('recipes.notUsed')"
      />
      <NStat
        v-if="eco"
        :label="t('recipes.suggestedPrice')"
        :value="fmt.money0(eco.suggestedPrice)"
        :tone="eco.suggestedPrice > eco.grossPrice ? 'saffron' : 'basil'"
        :hint="eco.suggestedPrice > eco.grossPrice ? `أعلى من السعر الحالي بـ ${fmt.money0(eco.suggestedPrice - eco.grossPrice)}` : t('recipes.onTarget')"
      />
      <NStat
        v-else
        :label="t('recipes.shelfLife')"
        :value="recipe.shelfLifeHours ? `${recipe.shelfLifeHours} س` : '—'"
        tone="plum"
        :hint="t('recipes.prepItems')"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <!-- المكوّنات -->
      <div class="flex flex-col gap-4">
        <NCard :title="t('recipes.ingredients')" :subtitle="`${lineRows.length} مكوّن`" tone="berry" :padded="false">
          <template #actions>
            <NButton size="xs" tone="ink" @click="addSheet = true">
              <Plus class="size-3.5" :stroke-width="3" />{{ t('recipes.addLine') }}
            </NButton>
          </template>

          <NTable :columns="lineColumns" :rows="lineRows" row-key="index" dense class="!border-0 !shadow-none">
            <template #cell-name="{ row }">
              <div class="flex items-center gap-2">
                <span
                  :class="cn('grid size-7 shrink-0 place-items-center brut-thin text-[10px] font-extrabold', row.type === 'recipe' ? 'bg-berry-soft' : 'bg-paper-2')"
                >{{ row.type === 'recipe' ? '🧪' : '🥬' }}</span>
                <div class="min-w-0">
                  <p class="truncate font-extrabold">{{ row.name }}</p>
                  <p class="text-[10px] font-bold opacity-50">
                    {{ row.meta }}
                    <template v-if="row.trimPct">· {{ t('recipes.trimLoss') }} {{ fmt.pct(row.trimPct, 0) }}</template>
                    <template v-if="row.note">· {{ row.note }}</template>
                  </p>
                </div>
                <AlertTriangle v-if="row.error" class="size-4 shrink-0 text-tomato" :stroke-width="3" />
              </div>
            </template>

            <template #cell-qty="{ row }">
              <div class="flex items-center gap-1">
                <div class="w-20">
                  <NInput
                    :model-value="row.qty"
                    type="number"
                    size="sm"
                    align="end"
                    :step="0.5"
                    @update:model-value="(v) => setLineQty(row.index, v)"
                  />
                </div>
                <div class="w-24">
                  <NSelect
                    :model-value="row.unit"
                    size="sm"
                    :options="UNITS.filter((u) => u.dim === getUnit(row.unit)?.dim).map((u) => ({ value: u.code, label: u.abbrAr }))"
                    @update:model-value="(v) => setLineUnit(row.index, v)"
                  />
                </div>
              </div>
            </template>

            <template #cell-unitCost="{ row }">
              <span class="text-xs opacity-70">
                {{ row.type === 'ingredient'
                  ? fmt.money(catalog.ingredientUnitCost(row.refId)) + ' / ' + fmt.unit(row.entity?.purchaseUnit)
                  : fmt.money(catalog.costOf(row.refId).costPerYieldUnit) + ' / ' + fmt.unit(row.entity?.yieldUnit) }}
              </span>
            </template>

            <template #cell-cost="{ row }">
              <span class="font-display">{{ fmt.money(row.cost) }}</span>
            </template>

            <template #cell-sharePct="{ row }">
              <span class="text-xs opacity-70">{{ fmt.pct(row.sharePct, 0) }}</span>
            </template>

            <template #cell-actions="{ row }">
              <button
                type="button"
                class="grid size-7 place-items-center brut-thin bg-tomato-soft cursor-pointer"
                @click="removeLine(row.index)"
              >
                <Trash2 class="size-3" :stroke-width="3" />
              </button>
            </template>

            <template #footer>
              <tr>
                <td class="px-3 py-2.5 text-sm">{{ t('recipes.costPerBatch') }}</td>
                <td />
                <td />
                <td class="px-3 py-2.5 text-end text-base tabular">{{ fmt.money(cost.batchCost) }}</td>
                <td class="px-3 py-2.5 text-end text-xs tabular">100%</td>
                <td />
              </tr>
            </template>
          </NTable>
        </NCard>

        <!-- إعدادات الناتج -->
        <NCard :title="t('common.yield')" tone="sky">
          <div class="grid gap-3 sm:grid-cols-3">
            <NField :label="t('recipes.yieldQty')">
              <NInput :model-value="recipe.yieldQty" type="number" align="end" @update:model-value="setYield" />
            </NField>
            <NField :label="t('recipes.yieldUnit')">
              <NSelect
                :model-value="recipe.yieldUnit"
                :options="UNITS.map((u) => ({ value: u.code, label: fmt.name(u) }))"
                @update:model-value="(v) => catalog.updateRecipe(recipeId, { yieldUnit: v })"
              />
            </NField>
            <NField :label="t('recipes.batchLoss')" hint="%">
              <NInput
                :model-value="round((recipe.batchLossPct || 0) * 100, 1)"
                type="number"
                align="end"
                :step="0.5"
                @update:model-value="setBatchLoss"
              />
            </NField>
          </div>

          <div v-if="eco" class="mt-3 grid gap-3 border-t-[3px] border-ink/10 pt-3 sm:grid-cols-2">
            <NField :label="t('recipes.sellPrice')" :hint="t('recipes.suggestedPrice') + ': ' + fmt.money0(eco.suggestedPrice)">
              <NInput :model-value="recipe.price" type="number" align="end" :step="5" @update:model-value="setPrice" />
            </NField>
            <div class="flex flex-col justify-end gap-1">
              <NMeter
                :value="Math.min(1, eco.foodCostPct / 0.6)"
                :target="eco.targetFoodCostPct / 0.6"
                :tone="fcTone"
                :label="t('recipes.foodCostPct')"
                :caption="`${fmt.pct(eco.foodCostPct)} / ${fmt.pct(eco.targetFoodCostPct)}`"
              />
              <p class="text-[11px] font-bold opacity-60">
                {{ eco.offTarget > 0 ? t('recipes.aboveTarget') : t('recipes.onTarget') }}
                ({{ fmt.pct(Math.abs(eco.offTarget)) }})
              </p>
            </div>
          </div>
        </NCard>

        <!-- خطوات التجهيز -->
        <NCard :title="t('recipes.steps')" :subtitle="t('nav.kds')" tone="plum" :padded="false">
          <ol v-if="recipe.steps?.length" class="flex flex-col">
            <li
              v-for="(s, i) in recipe.steps"
              :key="i"
              class="flex items-start gap-3 border-b-[3px] border-ink/10 px-4 py-3 last:border-0"
            >
              <span class="grid size-8 shrink-0 place-items-center brut-thin bg-paper-2 font-display text-sm tabular">
                {{ i + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-extrabold leading-snug">
                  {{ fmt.name({ nameAr: s.textAr, nameEn: s.textEn }) }}
                </p>
                <p class="mt-1 flex flex-wrap items-center gap-1.5">
                  <NBadge :tone="catalog.stationMap.get(s.stationId)?.tone || 'ink'" size="sm">
                    {{ fmt.name(catalog.stationMap.get(s.stationId)) }}
                  </NBadge>
                  <NBadge tone="ink" size="sm">
                    <Clock class="size-3" :stroke-width="3" />{{ fmt.duration(s.durationMin) }}
                  </NBadge>
                  <NBadge v-if="s.critical" tone="tomato" size="sm">
                    <AlertTriangle class="size-3" :stroke-width="3" />{{ t('recipes.critical') }}
                  </NBadge>
                </p>
              </div>
            </li>
          </ol>
          <NEmpty v-else :text="t('recipes.steps')" hint="" />
        </NCard>
      </div>

      <!-- تحليل التكلفة -->
      <div class="flex flex-col gap-4">
        <NCard :title="t('recipes.costBreakdown')" tone="saffron">
          <NChart
            v-if="donut.series.length"
            type="donut"
            :series="donut.series"
            :labels="donut.labels"
            :height="260"
            :colors="CHART_COLORS"
            :y-formatter="(v) => fmt.money(v)"
          />
          <NEmpty v-else :text="t('common.empty')" hint="" />
        </NCard>

        <NCard :padded="false" tone="ink" :title="t('recipes.costTree')">
          <template #actions>
            <NSegment
              v-model="rightTab"
              :options="[
                { value: 'tree', label: t('recipes.costTree') },
                { value: 'exploded', label: t('recipes.explodedView') },
                { value: 'used', label: t('recipes.usedIn') },
              ]"
              size="sm"
              :scroll="false"
            />
          </template>

          <div v-if="rightTab === 'tree'">
            <div class="flex items-center gap-2 border-b-[3px] border-ink bg-paper-2 px-3 py-2 text-[10px] font-extrabold uppercase opacity-60">
              <span class="flex-1">{{ t('recipes.ingredients') }}</span>
              <span class="w-24 text-end">{{ t('common.qty') }}</span>
              <span class="w-20 text-end">{{ t('common.cost') }}</span>
              <span class="hidden w-14 text-end sm:block">%</span>
            </div>
            <ul class="px-3">
              <CostTreeNode
                v-for="node in tree"
                :key="node.key"
                :node="node"
                :total="cost.batchCost"
                :default-open="true"
              />
            </ul>
          </div>

          <NTable
            v-else-if="rightTab === 'exploded'"
            :columns="explodedColumns"
            :rows="exploded"
            row-key="ingredientId"
            dense
            class="!border-0 !shadow-none"
          >
            <template #cell-name="{ row }">
              <div class="flex items-center gap-2">
                <Package class="size-3.5 shrink-0 opacity-50" :stroke-width="3" />
                <span class="truncate font-extrabold">{{ fmt.name(row.ingredient) }}</span>
              </div>
            </template>
            <template #cell-qty="{ row }">{{ fmt.qty(row.qty) }} {{ fmt.unit(row.unit) }}</template>
            <template #cell-cost="{ row }">
              <span class="font-display">{{ fmt.money(row.cost) }}</span>
            </template>
          </NTable>

          <div v-else class="p-3">
            <ul v-if="usedIn.length" class="flex flex-col gap-2">
              <li v-for="r in usedIn" :key="r.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 brut-thin bg-paper-2 px-3 py-2 text-start brut-press-sm cursor-pointer"
                  @click="router.push(`/recipes/${r.id}`)"
                >
                  <span class="text-lg">{{ r.emoji }}</span>
                  <span class="flex-1 truncate text-sm font-extrabold">{{ fmt.name(r) }}</span>
                  <NBadge :tone="r.type === 'menu' ? 'tomato' : 'berry'" size="sm">
                    {{ r.type === 'menu' ? t('recipes.menuItems') : t('recipes.prepItems') }}
                  </NBadge>
                </button>
              </li>
            </ul>
            <NEmpty v-else :text="t('recipes.notUsed')" hint="" />
          </div>
        </NCard>

        <NCard v-if="eco" :title="t('recipes.contribution')" tone="basil">
          <dl class="flex flex-col gap-2 text-sm font-extrabold">
            <div class="flex justify-between"><dt class="opacity-70">{{ t('recipes.sellPrice') }}</dt><dd class="tabular">{{ fmt.money(eco.netPrice) }}</dd></div>
            <div class="flex justify-between"><dt class="opacity-70">{{ t('recipes.costPerPortion') }}</dt><dd class="tabular">− {{ fmt.money(eco.cost) }}</dd></div>
            <div class="flex items-baseline justify-between border-t-[3px] border-ink pt-2">
              <dt class="font-display">{{ t('common.profit') }}</dt>
              <dd class="font-display text-2xl tabular">{{ fmt.money(eco.margin) }}</dd>
            </div>
            <div class="flex items-center gap-2 brut-thin bg-paper-2 px-3 py-2">
              <TrendingUp class="size-4 shrink-0" :stroke-width="3" />
              <span class="text-xs">هامش {{ fmt.pct(eco.marginPct) }} من السعر الصافي</span>
            </div>
          </dl>
        </NCard>
      </div>
    </div>

    <!-- إضافة مكوّن -->
    <NModal :open="addSheet" :title="t('recipes.addLine')" emoji="➕" tone="berry" size="sm" @close="addSheet = false">
      <div class="flex flex-col gap-3">
        <NSegment
          v-model="newLine.type"
          :options="[
            { value: 'ingredient', label: t('recipes.rawMaterial') },
            { value: 'recipe', label: t('recipes.subRecipe') },
          ]"
          tone="berry"
          size="sm"
          :scroll="false"
        />
        <NField :label="newLine.type === 'ingredient' ? t('recipes.rawMaterial') : t('recipes.subRecipe')" required>
          <NSelect v-model="newLine.refId" :options="refOptions" :placeholder="t('common.search')" />
        </NField>
        <div class="grid grid-cols-2 gap-3">
          <NField :label="t('common.qty')">
            <NInput v-model="newLine.qty" type="number" align="end" />
          </NField>
          <NField :label="t('common.unit')">
            <NSelect v-model="newLine.unit" :options="unitOptions" />
          </NField>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="addSheet = false">{{ t('common.cancel') }}</NButton>
          <NButton tone="basil" block :disabled="!newLine.refId" @click="addLine">
            <Save class="size-4" :stroke-width="3" />{{ t('common.save') }}
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
