<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, Layers, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-vue-next'
import { NInput, NBadge, NSegment, NEmpty, NMeter, NStat } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import { cn, safeDiv, sum } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { useCatalogStore } from '@/stores/catalog'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const catalog = useCatalogStore()
const ui = useUiStore()
const fmt = useFmt()

const tab = ref('menu')
const search = ref('')
const categoryId = ref(null)
const Chevron = computed(() => (ui.isRtl ? ChevronLeft : ChevronRight))

const tabs = computed(() => [
  { value: 'menu', label: t('recipes.menuItems'), count: catalog.menuRecipes.length, tone: 'tomato' },
  { value: 'prep', label: t('recipes.prepItems'), count: catalog.prepRecipes.length, tone: 'berry' },
])

const categoryOptions = computed(() => [
  { value: null, label: t('common.all'), emoji: '🍽️' },
  ...catalog.categories.map((c) => ({ value: c.id, label: fmt.name(c), emoji: c.emoji, tone: c.tone })),
])

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = tab.value === 'menu' ? catalog.menuRecipes : catalog.prepRecipes
  return base
    .filter((r) => (tab.value === 'menu' && categoryId.value ? r.categoryId === categoryId.value : true))
    .filter((r) => (!q ? true : [r.nameAr, r.nameEn, r.code].some((v) => String(v || '').toLowerCase().includes(q))))
    .map((r) => {
      const cost = catalog.costOf(r.id)
      const eco = r.type === 'menu' ? catalog.economicsOf(r.id) : null
      return { recipe: r, cost, eco, usedIn: catalog.usedIn(r.id).length }
    })
})

const summary = computed(() => {
  const menu = catalog.menuRecipes.map((r) => catalog.economicsOf(r.id)).filter(Boolean)
  const offTarget = menu.filter((e) => e.foodCostPct > e.targetFoodCostPct).length
  return {
    count: catalog.recipes.length,
    avgFc: safeDiv(sum(menu, (e) => e.foodCostPct), menu.length),
    offTarget,
    withErrors: catalog.recipes.filter((r) => catalog.costOf(r.id).error).length,
  }
})

const fcTone = (eco) => {
  if (!eco) return 'ink'
  const diff = eco.foodCostPct - eco.targetFoodCostPct
  return diff <= 0 ? 'basil' : diff <= 0.04 ? 'saffron' : 'tomato'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('recipes.title')" :subtitle="t('recipes.subtitle')" emoji="📖" tone="berry" />

    <!-- ملخص -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('recipes.title')" :value="fmt.int(summary.count)" tone="berry" :hint="`${catalog.menuRecipes.length} طبق · ${catalog.prepRecipes.length} تجهيز`" />
      <NStat :label="t('recipes.foodCostPct')" :value="fmt.pct(summary.avgFc)" tone="saffron" :hint="t('common.avg')" />
      <NStat :label="t('recipes.aboveTarget')" :value="fmt.int(summary.offTarget)" tone="tomato" :hint="t('recipes.targetPct')" />
      <NStat :label="t('recipes.recipeError')" :value="fmt.int(summary.withErrors)" :tone="summary.withErrors ? 'tomato' : 'basil'" hint="وصفات تحتاج مراجعة" />
    </div>

    <!-- فلاتر -->
    <div class="flex flex-col gap-3">
      <NSegment v-model="tab" :options="tabs" :scroll="false" />
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-56 flex-1">
          <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" :stroke-width="3" />
          <NInput v-model="search" :placeholder="t('common.searchPlaceholder')" class="!ps-10" />
        </div>
      </div>
      <NSegment v-if="tab === 'menu'" v-model="categoryId" :options="categoryOptions" size="sm" />
    </div>

    <!-- الوصفات -->
    <NEmpty v-if="!rows.length" :text="t('common.noResults')" emoji="🔍" class="brut bg-paper" />

    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="row in rows"
        :key="row.recipe.id"
        class="group flex cursor-pointer flex-col gap-3 brut bg-paper p-4 brut-press"
        @click="router.push(`/recipes/${row.recipe.id}`)"
      >
        <div class="flex items-start gap-3">
          <span
            :class="cn(
              'grid size-12 shrink-0 place-items-center brut-thin text-2xl',
              (TONES[catalog.categoryMap.get(row.recipe.categoryId)?.tone || 'berry'] || TONES.berry).soft,
            )"
          >{{ row.recipe.emoji }}</span>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <h3 class="truncate text-base leading-tight">{{ fmt.name(row.recipe) }}</h3>
              <AlertTriangle v-if="row.cost.error" class="size-4 shrink-0 text-tomato" :stroke-width="3" />
            </div>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold opacity-60">
              <span class="tabular">{{ row.recipe.code }}</span>
              <span v-if="catalog.stationMap.get(row.recipe.stationId)">
                · {{ fmt.name(catalog.stationMap.get(row.recipe.stationId)) }}
              </span>
            </p>
          </div>
          <component :is="Chevron" class="size-5 shrink-0 opacity-30 transition-opacity group-hover:opacity-100" :stroke-width="3" />
        </div>

        <!-- أرقام الوصفة -->
        <dl class="grid grid-cols-3 gap-2">
          <div class="brut-thin bg-paper-2 px-2 py-1.5">
            <dt class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.cost') }}</dt>
            <dd class="font-display text-sm tabular">
              {{ fmt.money(row.recipe.type === 'menu' ? row.cost.unitCost : row.cost.batchCost) }}
            </dd>
          </div>
          <div v-if="row.eco" class="brut-thin bg-paper-2 px-2 py-1.5">
            <dt class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.price') }}</dt>
            <dd class="font-display text-sm tabular">{{ fmt.money0(row.eco.grossPrice) }}</dd>
          </div>
          <div v-else class="brut-thin bg-paper-2 px-2 py-1.5">
            <dt class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.yield') }}</dt>
            <dd class="font-display text-sm tabular">
              {{ fmt.qty(row.recipe.yieldQty) }} {{ fmt.unit(row.recipe.yieldUnit) }}
            </dd>
          </div>
          <div class="brut-thin bg-paper-2 px-2 py-1.5">
            <dt class="text-[10px] font-extrabold uppercase opacity-55">
              {{ row.eco ? t('recipes.foodCostPct') : t('recipes.usedIn') }}
            </dt>
            <dd class="font-display text-sm tabular">
              {{ row.eco ? fmt.pct(row.eco.foodCostPct) : row.usedIn }}
            </dd>
          </div>
        </dl>

        <!-- نسبة التكلفة مقابل المستهدف -->
        <NMeter
          v-if="row.eco"
          :value="Math.min(1, row.eco.foodCostPct / 0.6)"
          :target="row.eco.targetFoodCostPct / 0.6"
          :tone="fcTone(row.eco)"
          height="sm"
          :label="t('recipes.targetPct')"
          :caption="fmt.pct(row.eco.targetFoodCostPct)"
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <NBadge :tone="row.recipe.type === 'menu' ? 'tomato' : 'berry'" size="sm">
            {{ row.recipe.type === 'menu' ? t('recipes.menuItems') : t('recipes.prepItems') }}
          </NBadge>
          <NBadge v-if="row.cost.depth > 1" tone="sky" size="sm">
            <Layers class="size-3" :stroke-width="3" />
            {{ row.cost.depth }} {{ t('recipes.levels') }}
          </NBadge>
          <NBadge v-if="row.eco" :tone="fcTone(row.eco)" size="sm">
            {{ row.eco.offTarget <= 0 ? t('recipes.onTarget') : t('recipes.aboveTarget') }}
          </NBadge>
          <NBadge v-if="row.recipe.type === 'prep' && row.usedIn" tone="ink" size="sm">
            {{ t('recipes.usedInCount', { count: row.usedIn }) }}
          </NBadge>
        </div>
      </article>
    </div>
  </div>
</template>
