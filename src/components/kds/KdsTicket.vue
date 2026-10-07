<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Check, Clock, AlertTriangle, Flame, Users, Armchair } from 'lucide-vue-next'
import { NButton, NBadge } from '@/components/ui'
import { cn, round } from '@/lib/utils'
import { TICKET_STATUS } from '@/lib/constants'
import { ORDER_TYPES, TABLES } from '@/data/org'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useFmt } from '@/composables/useFmt'

/** تذكرة قسم واحد: السطور الخاصة بالقسم فقط + خطوات تجهيزها */
const props = defineProps({
  order: { type: Object, required: true },
  stationId: { type: String, default: null },
  now: { type: Number, default: () => Date.now() },
})

const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const fmt = useFmt()

const station = computed(() => catalog.stationMap.get(props.stationId))
const type = computed(() => ORDER_TYPES.find((x) => x.id === props.order.type))
const table = computed(() => TABLES.find((x) => x.id === props.order.tableId))

const lines = computed(() =>
  (props.order.lines || [])
    .filter((l) => !l.isVoid)
    .filter((l) => (props.stationId ? lineTouchesStation(l, props.stationId) : true))
    .map((l) => {
      const recipe = catalog.recipeMap.get(l.recipeId)
      const steps = (recipe?.steps || []).filter((s) => !props.stationId || s.stationId === props.stationId)
      return { ...l, recipe, steps, status: l.kdsStatus || 'queued' }
    }),
)

/** السطر يخص القسم لو الوصفة موجّهة له أو فيها خطوة فيه */
function lineTouchesStation(line, stationId) {
  const recipe = catalog.recipeMap.get(line.recipeId)
  if (!recipe) return false
  if (recipe.stationId === stationId) return true
  return (recipe.steps || []).some((s) => s.stationId === stationId)
}

const elapsedMin = computed(() => {
  const start = props.order.lines?.find((l) => l.sentAt)?.sentAt || props.order.createdAt
  return (props.now - new Date(start).getTime()) / 60000
})

const sla = computed(() => station.value?.slaMin || 12)
const lateness = computed(() => elapsedMin.value - sla.value)
const urgency = computed(() =>
  lateness.value > 4 ? 'tomato' : lateness.value > 0 ? 'saffron' : 'basil',
)

const allReady = computed(() => lines.value.every((l) => l.status === 'ready' || l.status === 'served'))

const clock = computed(() => {
  const m = Math.floor(Math.max(0, elapsedMin.value))
  const s = Math.floor((Math.max(0, elapsedMin.value) - m) * 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const setStatus = (line, status) => ops.setLineStatus(props.order.id, line.id, status)
function bumpAll() {
  for (const l of lines.value) if (l.status !== 'ready') setStatus(l, 'ready')
}
</script>

<template>
  <article
    :class="cn(
      'flex flex-col brut bg-paper shadow-brut',
      urgency === 'tomato' && !allReady && 'animate-brut-pulse',
    )"
  >
    <!-- رأس التذكرة -->
    <header
      :class="cn(
        'flex items-center gap-2 border-b-[3px] border-ink px-3 py-2',
        allReady ? 'bg-basil-soft' : urgency === 'tomato' ? 'bg-tomato text-paper' : urgency === 'saffron' ? 'bg-saffron' : 'bg-paper-2',
      )"
    >
      <div class="min-w-0 flex-1">
        <p class="truncate font-display text-base leading-none tabular">{{ order.number }}</p>
        <p class="mt-0.5 flex items-center gap-2 text-[11px] font-bold opacity-80">
          <span>{{ fmt.name(type) }}</span>
          <span v-if="table" class="flex items-center gap-0.5">
            <Armchair class="size-3" :stroke-width="3" />{{ fmt.name(table) }}
          </span>
          <span v-if="order.type === 'dine_in'" class="flex items-center gap-0.5">
            <Users class="size-3" :stroke-width="3" />{{ order.guests }}
          </span>
        </p>
      </div>
      <div class="flex flex-col items-end gap-0.5">
        <span class="flex items-center gap-1 font-display text-lg leading-none tabular">
          <Clock class="size-4" :stroke-width="3" />{{ clock }}
        </span>
        <span class="text-[10px] font-extrabold opacity-80">
          {{ t('kds.sla') }} {{ sla }}د
        </span>
      </div>
    </header>

    <!-- السطور -->
    <ul class="flex flex-1 flex-col divide-y-[3px] divide-ink/10">
      <li
        v-for="l in lines"
        :key="l.id"
        :class="cn('p-3', l.status === 'ready' && 'bg-basil-soft/60')"
      >
        <div class="flex items-start gap-2">
          <span class="grid size-9 shrink-0 place-items-center brut-thin bg-paper-2 font-display text-sm tabular">
            {{ l.qty }}×
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-extrabold leading-tight">{{ fmt.name(l.recipe) }}</p>
            <p v-if="l.optionsLabel" class="mt-0.5 text-[11px] font-bold text-berry">{{ l.optionsLabel }}</p>
            <p v-if="l.note" class="mt-1 brut-thin bg-saffron-soft px-1.5 py-0.5 text-[11px] font-extrabold">
              📝 {{ l.note }}
            </p>
          </div>
          <NBadge :tone="TICKET_STATUS[l.status]?.tone" size="sm">
            {{ fmt.name(TICKET_STATUS[l.status]) }}
          </NBadge>
        </div>

        <!-- خطوات القسم -->
        <ol v-if="l.steps.length" class="mt-2 flex flex-col gap-1 ps-11">
          <li
            v-for="(s, i) in l.steps"
            :key="i"
            class="flex items-start gap-1.5 text-[11px] font-bold"
          >
            <span class="mt-0.5 grid size-4 shrink-0 place-items-center brut-thin bg-paper-2 text-[9px] tabular">
              {{ i + 1 }}
            </span>
            <span class="flex-1 leading-snug">{{ fmt.name({ nameAr: s.textAr, nameEn: s.textEn }) }}</span>
            <AlertTriangle v-if="s.critical" class="mt-0.5 size-3 shrink-0 text-tomato" :stroke-width="3" />
            <span class="mt-0.5 shrink-0 tabular opacity-50">{{ s.durationMin }}د</span>
          </li>
        </ol>

        <div class="mt-2 flex gap-2 ps-11">
          <NButton
            v-if="l.status === 'queued'"
            tone="saffron"
            size="xs"
            @click="setStatus(l, 'firing')"
          >
            <Play class="size-3" :stroke-width="3" />{{ t('kds.start') }}
          </NButton>
          <NButton
            v-if="l.status === 'firing'"
            tone="basil"
            size="xs"
            @click="setStatus(l, 'ready')"
          >
            <Check class="size-3" :stroke-width="3" />{{ t('kds.markReady') }}
          </NButton>
          <NButton
            v-if="l.status === 'ready'"
            tone="ink"
            variant="soft"
            size="xs"
            @click="setStatus(l, 'firing')"
          >
            {{ t('kds.recall') }}
          </NButton>
        </div>
      </li>
    </ul>

    <!-- تجهيز الكل -->
    <footer class="border-t-[3px] border-ink p-2">
      <NButton :tone="allReady ? 'basil' : 'ink'" :variant="allReady ? 'soft' : 'solid'" size="sm" block :disabled="allReady" @click="bumpAll">
        <Flame class="size-4" :stroke-width="3" />
        {{ allReady ? t('kds.ready') : t('kds.bumpAll') }}
      </NButton>
    </footer>
  </article>
</template>
