<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2, MessageSquare, SlidersHorizontal, Percent, Send, Pause, CreditCard, Users, Armchair } from 'lucide-vue-next'
import { NButton, NBadge, NStepper, NEmpty } from '@/components/ui'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { ORDER_TYPES } from '@/data/org'
import { usePosStore } from '@/stores/pos'
import { useCatalogStore } from '@/stores/catalog'
import { useFmt } from '@/composables/useFmt'

const emit = defineEmits(['configure-line', 'discount', 'pay', 'table', 'note'])
const { t } = useI18n()
const pos = usePosStore()
const catalog = useCatalogStore()
const fmt = useFmt()

const typeOptions = computed(() => ORDER_TYPES)
const totals = computed(() => pos.totals)

const lines = computed(() =>
  totals.value.lines.map((l) => ({
    ...l,
    name: fmt.name(catalog.recipeMap.get(l.recipeId)),
    emoji: catalog.recipeMap.get(l.recipeId)?.emoji || '🍽️',
  })),
)

const fcTone = computed(() => {
  const p = totals.value.foodCostPct
  if (!p) return 'ink'
  return p <= 0.3 ? 'basil' : p <= 0.36 ? 'saffron' : 'tomato'
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <!-- نوع الأوردر -->
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="ty in typeOptions"
        :key="ty.id"
        type="button"
        :class="cn(
          'flex flex-col items-center gap-1 brut px-2 py-2.5 brut-press-sm cursor-pointer',
          pos.ticket.type === ty.id ? (TONES[ty.tone] || TONES.ink).solid : 'bg-paper',
        )"
        @click="pos.setType(ty.id)"
      >
        <span class="text-xs font-extrabold">{{ fmt.name(ty) }}</span>
      </button>
    </div>

    <!-- الطاولة والضيوف -->
    <div v-if="pos.ticket.type === 'dine_in'" class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="flex items-center gap-2 brut bg-paper px-3 py-2 brut-press-sm cursor-pointer"
        @click="emit('table')"
      >
        <Armchair class="size-4 shrink-0" :stroke-width="3" />
        <span class="truncate text-xs font-extrabold">
          {{ pos.table ? fmt.name(pos.table) : t('pos.selectTable') }}
        </span>
      </button>
      <div class="flex items-center justify-between gap-1 brut bg-paper px-2.5 py-1.5 shadow-brut-sm">
        <Users class="size-4 shrink-0" :stroke-width="3" />
        <NStepper :model-value="pos.ticket.guests" :min="1" :max="20" size="sm" @update:model-value="pos.setGuests" />
      </div>
    </div>

    <!-- السطور -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <NEmpty v-if="!lines.length" :text="t('pos.emptyTicket')" emoji="🧾" hint="" />

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="l in lines"
          :key="l.id"
          :class="cn('brut bg-paper p-2.5 shadow-brut-sm', l.isVoid && 'opacity-45 line-through')"
        >
          <div class="flex items-start gap-2">
            <span class="text-xl leading-none">{{ l.emoji }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm leading-tight font-extrabold">{{ l.name }}</p>
              <p v-if="l.optionsLabel" class="mt-0.5 text-[11px] font-bold text-berry">{{ l.optionsLabel }}</p>
              <p v-if="l.note" class="mt-0.5 text-[11px] font-bold opacity-60">📝 {{ l.note }}</p>
              <p v-if="l.sentAt" class="mt-1">
                <NBadge tone="saffron" size="sm">{{ t('pos.sent') }}</NBadge>
              </p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="font-display text-base leading-none tabular">{{ fmt.money0(l.net) }}</span>
              <span class="text-[10px] font-bold opacity-55 tabular">{{ fmt.money0(l.unitPrice) }} × {{ l.qty }}</span>
            </div>
          </div>

          <div class="mt-2 flex items-center justify-between gap-1">
            <NStepper
              :model-value="l.qty"
              :min="1"
              :max="99"
              size="sm"
              @update:model-value="(v) => pos.setQty(l.id, v)"
            />
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="grid size-8 place-items-center brut-thin bg-paper-2 brut-press-sm cursor-pointer"
                :title="t('pos.modifiers')"
                @click="emit('configure-line', l)"
              >
                <SlidersHorizontal class="size-3.5" :stroke-width="3" />
              </button>
              <button
                type="button"
                class="grid size-8 place-items-center brut-thin bg-paper-2 brut-press-sm cursor-pointer"
                :title="t('pos.lineNote')"
                @click="emit('note', l)"
              >
                <MessageSquare class="size-3.5" :stroke-width="3" />
              </button>
              <button
                type="button"
                class="grid size-8 place-items-center brut-thin bg-tomato-soft brut-press-sm cursor-pointer"
                :title="t('pos.void')"
                @click="pos.removeLine(l.id)"
              >
                <Trash2 class="size-3.5" :stroke-width="3" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- الإجماليات -->
    <div class="shrink-0 brut bg-paper-2 shadow-brut">
      <dl class="flex flex-col gap-1 p-3 text-sm font-extrabold">
        <div class="flex justify-between">
          <dt class="opacity-70">{{ t('common.subtotal') }}</dt>
          <dd class="tabular">{{ fmt.money(totals.grossNet) }}</dd>
        </div>
        <div v-if="totals.discount" class="flex justify-between text-tomato">
          <dt>{{ t('common.discount') }}</dt>
          <dd class="tabular">− {{ fmt.money(totals.discount) }}</dd>
        </div>
        <div v-if="totals.service" class="flex justify-between">
          <dt class="opacity-70">{{ t('common.service') }}</dt>
          <dd class="tabular">{{ fmt.money(totals.service) }}</dd>
        </div>
        <div v-if="totals.deliveryFee" class="flex justify-between">
          <dt class="opacity-70">{{ t('common.delivery') }}</dt>
          <dd class="tabular">{{ fmt.money(totals.deliveryFee) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="opacity-70">{{ t('common.tax') }}</dt>
          <dd class="tabular">{{ fmt.money(totals.vat) }}</dd>
        </div>
        <div class="mt-1 flex items-baseline justify-between border-t-[3px] border-ink pt-2">
          <dt class="font-display text-base">{{ t('common.total') }}</dt>
          <dd class="font-display text-2xl tabular">{{ fmt.money(totals.total) }}</dd>
        </div>
      </dl>

      <!-- ربح لحظي — للمدير والكاشير -->
      <div class="flex items-center justify-between gap-2 border-t-[3px] border-ink px-3 py-2">
        <NBadge :tone="fcTone" size="sm">
          {{ t('recipes.foodCostPct') }} {{ fmt.pct(totals.foodCostPct) }}
        </NBadge>
        <span class="text-xs font-extrabold tabular">
          {{ t('pos.liveProfit') }} {{ fmt.money0(totals.grossProfit) }}
        </span>
      </div>
    </div>

    <!-- الأزرار -->
    <div class="grid shrink-0 grid-cols-2 gap-2">
      <NButton tone="berry" variant="soft" :disabled="pos.isEmpty" @click="emit('discount')">
        <Percent class="size-4" :stroke-width="3" />
        {{ t('pos.applyDiscount') }}
      </NButton>
      <NButton tone="ink" variant="soft" :disabled="pos.isEmpty" @click="pos.park()">
        <Pause class="size-4" :stroke-width="3" />
        {{ t('pos.park') }}
      </NButton>
      <NButton tone="saffron" :disabled="pos.isEmpty" @click="pos.sendToKitchen()">
        <Send class="size-4" :stroke-width="3" />
        {{ t('pos.sendToKitchen') }}
      </NButton>
      <NButton tone="basil" :disabled="pos.isEmpty" @click="emit('pay')">
        <CreditCard class="size-4" :stroke-width="3" />
        {{ t('pos.pay') }}
      </NButton>
    </div>
  </div>
</template>
