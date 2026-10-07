<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import { NInput, NSelect, NTable, NBadge, NStat, NSegment, NCard, NChart, NMeter } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import RangeFilter from '@/components/shared/RangeFilter.vue'
import { round, sum, safeDiv } from '@/lib/utils'
import { fromBase } from '@/lib/units'
import { useCatalogStore } from '@/stores/catalog'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const catalog = useCatalogStore()
const reports = useReportsStore()
const fmt = useFmt()

/** حد التسامح المقبول في الفرق */
const TOLERANCE = 0.03

const search = ref('')
const groupId = ref('')
const scope = ref('all')

const base = computed(() =>
  reports.consumptionVariance.map((r) => {
    const unit = r.ingredient.purchaseUnit
    return {
      id: r.ingredient.id,
      ingredient: r.ingredient,
      name: fmt.name(r.ingredient),
      sku: r.ingredient.sku,
      groupId: r.ingredient.groupId,
      groupName: fmt.name(catalog.groupMap.get(r.ingredient.groupId)),
      unit,
      theoretical: round(fromBase(r.theoretical, unit), 2),
      actual: round(fromBase(r.actual, unit), 2),
      wasteQty: round(fromBase(r.wasteQty, unit), 2),
      shortage: round(fromBase(r.shortage, unit), 2),
      gapQty: round(fromBase(r.gapQty, unit), 2),
      gapPct: r.gapPct,
      gapValue: r.gapValue,
      theoreticalValue: r.theoreticalValue,
      needsReview: r.gapPct > TOLERANCE,
    }
  }),
)

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return base.value
    .filter((r) => (groupId.value ? r.groupId === groupId.value : true))
    .filter((r) => (!q ? true : [r.name, r.sku].some((v) => String(v || '').toLowerCase().includes(q))))
    .filter((r) => {
      if (scope.value === 'review') return r.needsReview
      if (scope.value === 'ok') return !r.needsReview
      return true
    })
})

const summary = computed(() => {
  const list = base.value
  const gap = round(sum(list, (r) => r.gapValue), 2)
  const theo = round(sum(list, (r) => r.theoreticalValue), 2)
  return {
    theoretical: theo,
    gap,
    gapPct: safeDiv(gap, theo),
    needsReview: list.filter((r) => r.needsReview).length,
    items: list.length,
  }
})

/** أعلى 10 مواد بفرق قيمة — العين على الفلوس مش الكميات */
const topGaps = computed(() => rows.value.slice(0, 10))

const columns = computed(() => [
  { key: 'name', label: t('inventory.items'), sortable: true },
  { key: 'theoretical', label: t('common.theoretical'), numeric: true, sortable: true },
  { key: 'wasteQty', label: t('common.waste'), numeric: true, sortable: true },
  { key: 'shortage', label: t('inventory.shortage'), numeric: true, sortable: true },
  { key: 'actual', label: t('common.actual'), numeric: true, sortable: true },
  { key: 'gapPct', label: t('inventory.gapPct'), align: 'center', width: '150px' },
  { key: 'gapValue', label: t('inventory.gapValue'), numeric: true, sortable: true },
  { key: 'flag', label: '', align: 'center', width: '60px' },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('inventory.varianceTitle')" :subtitle="t('inventory.varianceHint')" emoji="⚖️" tone="tomato">
      <template #actions><RangeFilter :branch="false" /></template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('common.theoretical')" :value="fmt.moneyShort(summary.theoretical)" tone="sky" hint="تكلفة الاستهلاك من الوصفات" />
      <NStat
        :label="t('inventory.gapValue')"
        :value="fmt.moneyShort(summary.gap)"
        :tone="summary.gapPct > TOLERANCE ? 'tomato' : 'basil'"
        :hint="`${fmt.pct(summary.gapPct)} من النظري`"
      />
      <NStat :label="t('inventory.needsReview')" :value="fmt.int(summary.needsReview)" :tone="summary.needsReview ? 'tomato' : 'basil'" :hint="`من ${summary.items} مادة`" />
      <NStat
        :label="t('inventory.withinTolerance')"
        :value="fmt.int(summary.items - summary.needsReview)"
        tone="basil"
        :hint="`حد التسامح ${fmt.pct(TOLERANCE, 0)}`"
      />
    </div>

    <NMeter
      :value="Math.min(1, summary.gapPct / 0.1)"
      :target="TOLERANCE / 0.1"
      :tone="summary.gapPct > TOLERANCE ? 'tomato' : 'basil'"
      height="lg"
      :label="t('inventory.gapPct')"
      :caption="`${fmt.pct(summary.gapPct)} · ${t('common.target')} ${fmt.pct(TOLERANCE, 0)}`"
    />

    <NCard :title="t('inventory.gapValue')" subtitle="أعلى 10 مواد" tone="tomato">
      <NChart
        type="bar"
        :series="[{ name: t('inventory.gapValue'), data: topGaps.map((r) => round(r.gapValue, 0)) }]"
        :categories="topGaps.map((r) => r.name)"
        horizontal
        :height="340"
        :colors="['#ff4d2e']"
        :y-formatter="(v) => fmt.money0(v)"
      />
    </NCard>

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
      <NSegment
        v-model="scope"
        :options="[
          { value: 'all', label: t('common.all'), count: base.length },
          { value: 'review', label: t('inventory.needsReview'), tone: 'tomato', count: summary.needsReview },
          { value: 'ok', label: t('inventory.withinTolerance'), tone: 'basil' },
        ]"
        size="sm"
        :scroll="false"
      />
    </div>

    <NTable :columns="columns" :rows="rows" row-key="id" max-height="60vh">
      <template #cell-name="{ row }">
        <div class="min-w-0">
          <p class="truncate font-extrabold">{{ row.name }}</p>
          <p class="text-[10px] font-bold opacity-50">{{ row.sku }} · {{ row.groupName }}</p>
        </div>
      </template>
      <template #cell-theoretical="{ row }">
        {{ fmt.qty(row.theoretical) }} <span class="text-[10px] opacity-55">{{ fmt.unit(row.unit) }}</span>
      </template>
      <template #cell-wasteQty="{ row }">
        <span :class="row.wasteQty ? 'text-plum' : 'opacity-30'">{{ row.wasteQty ? fmt.qty(row.wasteQty) : '—' }}</span>
      </template>
      <template #cell-shortage="{ row }">
        <span :class="row.shortage ? 'text-tomato' : 'opacity-30'">{{ row.shortage ? fmt.qty(row.shortage) : '—' }}</span>
      </template>
      <template #cell-actual="{ row }">
        <span class="font-display">{{ fmt.qty(row.actual) }}</span>
      </template>
      <template #cell-gapPct="{ row }">
        <NBadge :tone="row.needsReview ? 'tomato' : row.gapPct > 0.01 ? 'saffron' : 'basil'" size="sm">
          {{ fmt.pct(row.gapPct) }}
        </NBadge>
      </template>
      <template #cell-gapValue="{ row }">
        <span :class="['font-display', row.needsReview && 'text-tomato']">{{ fmt.money0(row.gapValue) }}</span>
      </template>
      <template #cell-flag="{ row }">
        <AlertTriangle v-if="row.needsReview" class="mx-auto size-4 text-tomato" :stroke-width="3" />
        <CheckCircle2 v-else class="mx-auto size-4 text-basil" :stroke-width="3" />
      </template>
    </NTable>
  </div>
</template>
