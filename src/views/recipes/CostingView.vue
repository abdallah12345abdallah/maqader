<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, RotateCcw, TrendingUp, TrendingDown } from 'lucide-vue-next'
import { NInput, NSelect, NField, NTable, NBadge, NCard, NStat, NButton, NSegment } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import { createCostEngine } from '@/lib/costing'
import { round, safeDiv, sum } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const fmt = useFmt()

const search = ref('')
const scope = ref('all')

/* ---------- محاكي تغيير الأسعار ---------- */
const sim = ref({ mode: 'group', refId: 'G-MEAT', pct: 15 })

const groupOptions = computed(() => catalog.groups.map((g) => ({ value: g.id, label: fmt.name(g) })))
const ingredientOptions = computed(() =>
  catalog.ingredients.map((x) => ({ value: x.id, label: `${fmt.name(x)} — ${fmt.money(x.purchaseCost)}/${fmt.unit(x.purchaseUnit)}` })),
)

/** كتالوج افتراضي بعد تطبيق التغيير — المحرك pure فبنبنيه من جديد */
const simIngredients = computed(() => {
  const factor = 1 + (Number(sim.value.pct) || 0) / 100
  return catalog.ingredients.map((ing) => {
    const hit = sim.value.mode === 'group' ? ing.groupId === sim.value.refId : ing.id === sim.value.refId
    return hit ? { ...ing, purchaseCost: round(ing.purchaseCost * factor, 4) } : ing
  })
})

const simEngine = computed(() => createCostEngine({ ingredients: simIngredients.value, recipes: catalog.recipes }))

const simActive = computed(() => Number(sim.value.pct) !== 0)

/* ---------- الصفوف ---------- */

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return catalog.menuRecipes
    .filter((r) => (!q ? true : [r.nameAr, r.nameEn, r.code].some((v) => String(v || '').toLowerCase().includes(q))))
    .map((r) => {
      const category = catalog.categoryMap.get(r.categoryId)
      const target = r.targetFoodCostPct || category?.targetFoodCostPct || 0.3
      const eco = catalog.engine.menuEconomics(r, { vatRate: 0, targetFoodCostPct: target })
      const simEco = simEngine.value.menuEconomics(r, { vatRate: 0, targetFoodCostPct: target })
      return {
        id: r.id,
        recipe: r,
        name: fmt.name(r),
        emoji: r.emoji,
        categoryName: fmt.name(category),
        categoryTone: category?.tone || 'ink',
        price: eco.grossPrice,
        cost: eco.cost,
        margin: eco.margin,
        foodCostPct: eco.foodCostPct,
        target,
        offTarget: eco.offTarget,
        suggestedPrice: eco.suggestedPrice,
        simCost: simEco.cost,
        simFoodCostPct: simEco.foodCostPct,
        costDelta: round(simEco.cost - eco.cost, 3),
        breaksTarget: eco.foodCostPct <= target && simEco.foodCostPct > target,
      }
    })
    .filter((r) => {
      if (scope.value === 'over') return r.offTarget > 0
      if (scope.value === 'breaks') return r.breaksTarget
      return true
    })
    .sort((a, b) => b.offTarget - a.offTarget)
})

/** أثر التغيير على تكلفة المبيعات بناءً على استهلاك الفترة الفعلي */
const simImpact = computed(() => {
  const factor = (Number(sim.value.pct) || 0) / 100
  let base = 0
  for (const [ingId, baseQty] of ops.theoreticalConsumption.entries()) {
    const ing = catalog.ingredientMap.get(ingId)
    if (!ing) continue
    const hit = sim.value.mode === 'group' ? ing.groupId === sim.value.refId : ing.id === sim.value.refId
    if (!hit) continue
    base += baseQty * catalog.engine.ingredientPurchaseCostPerBase(ingId)
  }
  return {
    currentCost: round(base, 2),
    delta: round(base * factor, 2),
    affected: rows.value.filter((r) => Math.abs(r.costDelta) > 0.001).length,
    breaks: rows.value.filter((r) => r.breaksTarget).length,
  }
})

const totals = computed(() => {
  const list = rows.value
  return {
    count: list.length,
    avgFc: safeDiv(sum(list, (r) => r.foodCostPct), list.length),
    over: list.filter((r) => r.offTarget > 0).length,
    potential: round(sum(list.filter((r) => r.suggestedPrice > r.price), (r) => r.suggestedPrice - r.price), 2),
  }
})

const columns = computed(() => [
  { key: 'name', label: t('common.name'), sortable: true },
  { key: 'price', label: t('recipes.sellPrice'), numeric: true, sortable: true },
  { key: 'cost', label: t('recipes.costPerPortion'), numeric: true, sortable: true },
  { key: 'margin', label: t('common.profit'), numeric: true, sortable: true },
  { key: 'foodCostPct', label: t('recipes.foodCostPct'), numeric: true, sortable: true },
  { key: 'target', label: t('recipes.targetPct'), numeric: true },
  { key: 'suggestedPrice', label: t('recipes.suggestedPrice'), numeric: true, sortable: true },
  { key: 'sim', label: t('recipes.priceImpact'), numeric: true },
])

const fcTone = (row) => (row.offTarget <= 0 ? 'basil' : row.offTarget <= 0.04 ? 'saffron' : 'tomato')
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('recipes.costCard')" :subtitle="t('recipes.subtitle')" emoji="🧮" tone="saffron" />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('recipes.menuItems')" :value="fmt.int(totals.count)" tone="berry" />
      <NStat :label="t('recipes.foodCostPct')" :value="fmt.pct(totals.avgFc)" tone="saffron" :hint="t('common.avg')" />
      <NStat :label="t('recipes.aboveTarget')" :value="fmt.int(totals.over)" tone="tomato" hint="تحتاج مراجعة سعر أو تكلفة" />
      <NStat :label="t('recipes.suggestedPrice')" :value="fmt.moneyShort(totals.potential)" tone="basil" hint="فرق السعر المقترح الكلي" />
    </div>

    <!-- المحاكي -->
    <NCard :title="t('recipes.priceImpact')" subtitle="لو سعر الشراء اتغير، إيه اللي هيكسر المستهدف؟" tone="plum" emoji="🧪">
      <div class="grid gap-3 lg:grid-cols-[auto_1fr_auto_auto] lg:items-end">
        <NField :label="t('common.type')">
          <NSegment
            v-model="sim.mode"
            :options="[
              { value: 'group', label: t('common.category') },
              { value: 'ingredient', label: t('recipes.rawMaterial') },
            ]"
            tone="plum"
            size="sm"
            :scroll="false"
          />
        </NField>
        <NField :label="sim.mode === 'group' ? t('common.category') : t('recipes.rawMaterial')">
          <NSelect v-model="sim.refId" :options="sim.mode === 'group' ? groupOptions : ingredientOptions" />
        </NField>
        <NField label="% التغيير">
          <div class="w-28">
            <NInput v-model="sim.pct" type="number" align="end" :step="5" />
          </div>
        </NField>
        <NButton variant="outline" @click="sim.pct = 0">
          <RotateCcw class="size-4" :stroke-width="3" />{{ t('common.reset') }}
        </NButton>
      </div>

      <div v-if="simActive" class="mt-4 grid gap-3 sm:grid-cols-4">
        <div class="brut-thin bg-paper-2 px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase opacity-60">تكلفة الفترة الحالية</p>
          <p class="font-display text-lg tabular">{{ fmt.moneyShort(simImpact.currentCost) }}</p>
        </div>
        <div :class="['brut-thin px-3 py-2', simImpact.delta > 0 ? 'bg-tomato-soft' : 'bg-basil-soft']">
          <p class="text-[10px] font-extrabold uppercase opacity-60">أثر التغيير</p>
          <p class="font-display text-lg tabular">
            {{ simImpact.delta > 0 ? '+' : '' }}{{ fmt.moneyShort(simImpact.delta) }}
          </p>
        </div>
        <div class="brut-thin bg-paper-2 px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase opacity-60">أطباق متأثرة</p>
          <p class="font-display text-lg tabular">{{ simImpact.affected }}</p>
        </div>
        <div :class="['brut-thin px-3 py-2', simImpact.breaks ? 'bg-tomato-soft' : 'bg-paper-2']">
          <p class="text-[10px] font-extrabold uppercase opacity-60">هتكسر المستهدف</p>
          <p class="font-display text-lg tabular">{{ simImpact.breaks }}</p>
        </div>
      </div>
    </NCard>

    <!-- الفلاتر -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-56 flex-1">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" :stroke-width="3" />
        <NInput v-model="search" :placeholder="t('common.searchPlaceholder')" class="!ps-10" />
      </div>
      <NSegment
        v-model="scope"
        :options="[
          { value: 'all', label: t('common.all'), count: catalog.menuRecipes.length },
          { value: 'over', label: t('recipes.aboveTarget'), tone: 'tomato' },
          { value: 'breaks', label: 'هتكسر المستهدف', tone: 'plum' },
        ]"
        size="sm"
        :scroll="false"
      />
    </div>

    <!-- الجدول -->
    <NTable :columns="columns" :rows="rows" row-key="id" max-height="62vh">
      <template #cell-name="{ row }">
        <button
          type="button"
          class="flex items-center gap-2 text-start cursor-pointer hover:underline"
          @click="router.push(`/recipes/${row.id}`)"
        >
          <span class="text-lg leading-none">{{ row.emoji }}</span>
          <span>
            <span class="block font-extrabold leading-tight">{{ row.name }}</span>
            <span class="block text-[10px] font-bold opacity-55">{{ row.categoryName }}</span>
          </span>
        </button>
      </template>

      <template #cell-price="{ row }">{{ fmt.money0(row.price) }}</template>
      <template #cell-cost="{ row }">{{ fmt.money(row.cost) }}</template>
      <template #cell-margin="{ row }">
        <span class="font-display">{{ fmt.money(row.margin) }}</span>
      </template>

      <template #cell-foodCostPct="{ row }">
        <NBadge :tone="fcTone(row)" size="sm">{{ fmt.pct(row.foodCostPct) }}</NBadge>
      </template>

      <template #cell-target="{ row }">
        <span class="text-xs opacity-60">{{ fmt.pct(row.target) }}</span>
      </template>

      <template #cell-suggestedPrice="{ row }">
        <span :class="row.suggestedPrice > row.price ? 'text-tomato' : 'opacity-60'">
          {{ fmt.money0(row.suggestedPrice) }}
        </span>
      </template>

      <template #cell-sim="{ row }">
        <span v-if="!simActive || Math.abs(row.costDelta) < 0.001" class="opacity-30">—</span>
        <span v-else class="inline-flex items-center gap-1 text-xs font-extrabold">
          <component :is="row.costDelta > 0 ? TrendingUp : TrendingDown" class="size-3" :stroke-width="3" />
          {{ fmt.money(row.costDelta) }}
          <NBadge v-if="row.breaksTarget" tone="tomato" size="sm">{{ fmt.pct(row.simFoodCostPct) }}</NBadge>
        </span>
      </template>
    </NTable>
  </div>
</template>
