<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Play, Check, Clock, AlertTriangle, ChefHat } from 'lucide-vue-next'
import { NCard, NButton, NBadge, NStat, NEmpty, NMeter } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import Icon from '@/components/shared/Icon.vue'
import { cn, round, safeDiv, sum, addDays, startOfDay, inRange, groupBy } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { fromBase } from '@/lib/units'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const ui = useUiStore()
const fmt = useFmt()

const STATUS = {
  planned: { nameAr: 'مخططة', nameEn: 'Planned', tone: 'ink' },
  in_progress: { nameAr: 'جاري', nameEn: 'In progress', tone: 'saffron' },
  done: { nameAr: 'مكتملة', nameEn: 'Done', tone: 'basil' },
}

/** طلب كل وصفة تجهيز من مبيعات آخر 7 أيام ÷ 7 = الطلب اليومي */
const demand = computed(() => {
  const from = startOfDay(addDays(new Date(), -6))
  const to = new Date()
  const orders = ops.orders.filter(
    (o) => o.status === 'paid' && o.closedAt && inRange(o.closedAt, from, to),
  )
  const acc = new Map()
  for (const o of orders) {
    for (const line of o.lines || []) {
      if (line.isVoid) continue
      const recipe = catalog.recipeMap.get(line.recipeId)
      if (!recipe) continue
      const preps = catalog.engine.explodePreps(recipe.id, line.qty, 'portion')
      for (const [prepId, baseQty] of preps.entries()) {
        acc.set(prepId, (acc.get(prepId) || 0) + baseQty)
      }
    }
  }
  const out = new Map()
  for (const [prepId, baseQty] of acc.entries()) out.set(prepId, baseQty / 7)
  return out
})

const batchStatus = computed(() => new Map(ops.batches.map((b) => [b.recipeId, b])))

const rows = computed(() =>
  catalog.prepRecipes
    .map((r) => {
      const dailyBase = demand.value.get(r.id) || 0
      const dailyQty = fromBase(dailyBase, r.yieldUnit)
      const cost = catalog.costOf(r.id)
      const batches = dailyQty > 0 ? Math.max(1, Math.ceil(dailyQty / (r.yieldQty || 1))) : 0
      const batch = batchStatus.value.get(r.id)
      return {
        recipe: r,
        station: catalog.stationMap.get(r.stationId),
        dailyQty: round(dailyQty, 2),
        batches,
        batchYield: r.yieldQty,
        totalYield: round(batches * (r.yieldQty || 1), 2),
        unitCost: cost.costPerYieldUnit,
        batchCost: cost.batchCost,
        totalCost: round(batches * cost.batchCost, 2),
        usedIn: catalog.usedIn(r.id).length,
        status: batch?.status || 'planned',
        batchId: batch?.id || null,
        prepMinutes: sum(r.steps || [], (s) => s.durationMin),
        hasCritical: (r.steps || []).some((s) => s.critical),
      }
    })
    .filter((r) => r.batches > 0 || r.usedIn > 0)
    .sort((a, b) => b.totalCost - a.totalCost),
)

const byStation = computed(() => Object.entries(groupBy(rows.value, (r) => r.recipe.stationId)))

const summary = computed(() => ({
  recipes: rows.value.length,
  batches: sum(rows.value, (r) => r.batches),
  cost: round(sum(rows.value, (r) => r.totalCost), 2),
  minutes: sum(rows.value, (r) => r.prepMinutes * r.batches),
  done: rows.value.filter((r) => r.status === 'done').length,
}))

function setStatus(row, status) {
  if (!row.batchId) return
  ops.setBatchStatus(row.batchId, status)
  ui.toast(fmt.name(STATUS[status]), status === 'done' ? 'basil' : 'saffron', fmt.name(row.recipe))
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('recipes.production')" :subtitle="t('recipes.productionHint')" emoji="👨‍🍳" tone="plum" />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('recipes.prepItems')" :value="fmt.int(summary.recipes)" tone="berry" />
      <NStat :label="t('recipes.batches')" :value="fmt.int(summary.batches)" tone="plum" :hint="`${summary.done} ${t('recipes.done')}`" />
      <NStat :label="t('common.cost')" :value="fmt.moneyShort(summary.cost)" tone="saffron" hint="تكلفة دفعات اليوم" />
      <NStat :label="t('kds.avgPrepTime')" :value="fmt.duration(summary.minutes)" tone="sky" hint="إجمالي زمن التجهيز" />
    </div>

    <NMeter
      :value="safeDiv(summary.done, summary.recipes)"
      tone="basil"
      height="lg"
      :label="t('recipes.done')"
      :caption="`${summary.done} / ${summary.recipes}`"
    />

    <section v-for="[stationId, list] in byStation" :key="stationId" class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <span
          :class="cn('grid size-9 place-items-center brut shadow-brut-sm', (TONES[catalog.stationMap.get(stationId)?.tone || 'ink'] || TONES.ink).soft)"
        >
          <Icon :name="catalog.stationMap.get(stationId)?.icon || 'ChefHat'" class="size-4" />
        </span>
        <h2 class="text-lg">{{ fmt.name(catalog.stationMap.get(stationId)) }}</h2>
        <NBadge tone="ink" size="sm">{{ list.length }}</NBadge>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="row in list"
          :key="row.recipe.id"
          :class="cn('flex flex-col gap-3 brut bg-paper p-4 shadow-brut', row.status === 'done' && 'bg-basil-soft/50')"
        >
          <div class="flex items-start gap-3">
            <span class="grid size-11 shrink-0 place-items-center brut-thin bg-paper-2 text-2xl">{{ row.recipe.emoji }}</span>
            <div class="min-w-0 flex-1">
              <button
                type="button"
                class="truncate text-base font-extrabold leading-tight cursor-pointer hover:underline"
                @click="router.push(`/recipes/${row.recipe.id}`)"
              >{{ fmt.name(row.recipe) }}</button>
              <p class="mt-0.5 text-[11px] font-bold opacity-55">
                {{ row.recipe.code }} · {{ t('recipes.usedInCount', { count: row.usedIn }) }}
              </p>
            </div>
            <NBadge :tone="STATUS[row.status].tone" size="sm">{{ fmt.name(STATUS[row.status]) }}</NBadge>
          </div>

          <dl class="grid grid-cols-3 gap-2">
            <div class="brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="text-[10px] font-extrabold uppercase opacity-55">{{ t('recipes.batches') }}</dt>
              <dd class="font-display text-lg leading-none tabular">{{ row.batches }}</dd>
            </div>
            <div class="brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.yield') }}</dt>
              <dd class="font-display text-sm leading-none tabular">
                {{ fmt.qty(row.totalYield) }} {{ fmt.unit(row.recipe.yieldUnit) }}
              </dd>
            </div>
            <div class="brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="text-[10px] font-extrabold uppercase opacity-55">{{ t('common.cost') }}</dt>
              <dd class="font-display text-sm leading-none tabular">{{ fmt.moneyShort(row.totalCost) }}</dd>
            </div>
          </dl>

          <p class="flex flex-wrap items-center gap-1.5">
            <NBadge tone="sky" size="sm">
              <Clock class="size-3" :stroke-width="3" />{{ fmt.duration(row.prepMinutes) }}
            </NBadge>
            <NBadge v-if="row.hasCritical" tone="tomato" size="sm">
              <AlertTriangle class="size-3" :stroke-width="3" />{{ t('recipes.critical') }}
            </NBadge>
            <NBadge tone="ink" size="sm">
              طلب يومي {{ fmt.qty(row.dailyQty) }} {{ fmt.unit(row.recipe.yieldUnit) }}
            </NBadge>
          </p>

          <div class="mt-auto flex gap-2">
            <NButton
              v-if="row.status === 'planned'"
              tone="saffron"
              size="sm"
              block
              :disabled="!row.batchId"
              @click="setStatus(row, 'in_progress')"
            >
              <Play class="size-4" :stroke-width="3" />{{ t('recipes.startBatch') }}
            </NButton>
            <NButton
              v-else-if="row.status === 'in_progress'"
              tone="basil"
              size="sm"
              block
              @click="setStatus(row, 'done')"
            >
              <Check class="size-4" :stroke-width="3" />{{ t('recipes.completeBatch') }}
            </NButton>
            <NButton v-else tone="ink" variant="soft" size="sm" block @click="setStatus(row, 'planned')">
              <ChefHat class="size-4" :stroke-width="3" />{{ t('recipes.planned') }}
            </NButton>
          </div>
        </article>
      </div>
    </section>

    <NEmpty v-if="!rows.length" :text="t('common.empty')" emoji="👨‍🍳" class="brut bg-paper" />
  </div>
</template>
