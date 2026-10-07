<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users } from 'lucide-vue-next'
import { NModal, NBadge } from '@/components/ui'
import { cn, groupBy } from '@/lib/utils'
import { TABLES } from '@/data/org'
import { usePosStore } from '@/stores/pos'
import { useFmt } from '@/composables/useFmt'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const { t } = useI18n()
const pos = usePosStore()
const fmt = useFmt()

const zones = computed(() => Object.entries(groupBy(TABLES, 'zone')))
const occupied = computed(() => pos.occupiedTables)

function choose(table) {
  const open = occupied.value.get(table.id)
  if (open && open.id !== pos.ticket.id) {
    pos.loadOrder(open.id)
  } else {
    pos.setTable(table.id)
  }
  emit('close')
}
</script>

<template>
  <NModal :open="open" :title="t('pos.selectTable')" emoji="🪑" tone="tomato" size="lg" @close="emit('close')">
    <div class="flex flex-col gap-5">
      <section v-for="[zone, tables] in zones" :key="zone" class="flex flex-col gap-2">
        <h4 class="text-sm">{{ zone }}</h4>
        <div class="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          <button
            v-for="tb in tables"
            :key="tb.id"
            type="button"
            :class="cn(
              'flex flex-col items-center gap-1 brut px-2 py-3 brut-press-sm cursor-pointer',
              pos.ticket.tableId === tb.id
                ? 'bg-ink text-paper'
                : occupied.get(tb.id)
                  ? 'bg-tomato-soft'
                  : 'bg-basil-soft',
            )"
            @click="choose(tb)"
          >
            <span class="font-display text-xl leading-none tabular">{{ tb.id.replace('T-', '') }}</span>
            <span class="flex items-center gap-1 text-[11px] font-extrabold opacity-70">
              <Users class="size-3" :stroke-width="3" />{{ tb.seats }}
            </span>
            <NBadge :tone="occupied.get(tb.id) ? 'tomato' : 'basil'" size="sm">
              {{ occupied.get(tb.id) ? t('pos.occupied') : t('pos.free') }}
            </NBadge>
            <span v-if="occupied.get(tb.id)" class="text-[10px] font-bold tabular opacity-60">
              {{ fmt.money0(occupied.get(tb.id).totals?.total || 0) }}
            </span>
          </button>
        </div>
      </section>
    </div>
  </NModal>
</template>
