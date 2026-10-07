<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Printer, Plus } from 'lucide-vue-next'
import { NModal, NButton } from '@/components/ui'
import { COMPANY, ORDER_TYPES, PAYMENT_METHODS, TABLES, USERS } from '@/data/org'
import { useCatalogStore } from '@/stores/catalog'
import { useFmt } from '@/composables/useFmt'

const props = defineProps({
  open: Boolean,
  order: { type: Object, default: null },
  totals: { type: Object, default: null },
})
const emit = defineEmits(['close', 'new'])

const { t } = useI18n()
const catalog = useCatalogStore()
const fmt = useFmt()

const type = computed(() => ORDER_TYPES.find((x) => x.id === props.order?.type))
const table = computed(() => TABLES.find((x) => x.id === props.order?.tableId))
const cashier = computed(() => USERS.find((u) => u.id === props.order?.cashierId))
const lines = computed(() =>
  (props.totals?.lines || props.order?.lines || []).filter((l) => !l.isVoid),
)
const paymentName = (id) => fmt.name(PAYMENT_METHODS.find((m) => m.id === id))
const doPrint = () => window.print()
</script>

<template>
  <NModal :open="open" :title="t('pos.receipt')" emoji="🧾" tone="basil" size="sm" @close="emit('close')">
    <div v-if="order" id="receipt" class="mx-auto max-w-[340px] bg-paper font-sans">
      <header class="border-b-[3px] border-dashed border-ink pb-3 text-center">
        <p class="font-display text-2xl leading-none">{{ COMPANY.nameAr }}</p>
        <p class="mt-1 text-[11px] font-bold opacity-70">س.ض {{ COMPANY.taxId }}</p>
        <p class="mt-2 font-display text-lg tabular">{{ order.number }}</p>
      </header>

      <dl class="grid grid-cols-2 gap-x-3 gap-y-1 border-b-[3px] border-dashed border-ink py-3 text-[11px] font-bold">
        <div class="flex justify-between"><dt class="opacity-60">{{ t('common.type') }}</dt><dd>{{ fmt.name(type) }}</dd></div>
        <div class="flex justify-between"><dt class="opacity-60">{{ t('common.date') }}</dt><dd class="tabular">{{ fmt.date(order.closedAt || order.createdAt) }}</dd></div>
        <div v-if="table" class="flex justify-between"><dt class="opacity-60">{{ t('pos.table') }}</dt><dd>{{ fmt.name(table) }}</dd></div>
        <div class="flex justify-between"><dt class="opacity-60">{{ t('common.time') }}</dt><dd class="tabular">{{ fmt.time(order.closedAt || order.createdAt) }}</dd></div>
        <div v-if="cashier" class="col-span-2 flex justify-between"><dt class="opacity-60">{{ t('common.user') }}</dt><dd>{{ fmt.name(cashier) }}</dd></div>
      </dl>

      <ul class="flex flex-col gap-1.5 border-b-[3px] border-dashed border-ink py-3">
        <li v-for="l in lines" :key="l.id" class="text-xs font-bold">
          <div class="flex justify-between gap-2">
            <span class="flex-1">
              <i class="not-italic tabular opacity-60">{{ l.qty }}×</i>
              {{ fmt.name(catalog.recipeMap.get(l.recipeId)) }}
            </span>
            <span class="tabular">{{ fmt.money0(l.net ?? l.unitPrice * l.qty) }}</span>
          </div>
          <p v-if="l.optionsLabel" class="ps-5 text-[10px] opacity-60">{{ l.optionsLabel }}</p>
          <p v-if="l.note" class="ps-5 text-[10px] opacity-60">📝 {{ l.note }}</p>
        </li>
      </ul>

      <dl class="flex flex-col gap-1 py-3 text-xs font-extrabold">
        <div class="flex justify-between"><dt class="opacity-60">{{ t('common.subtotal') }}</dt><dd class="tabular">{{ fmt.money(order.totals?.grossNet ?? totals?.grossNet) }}</dd></div>
        <div v-if="order.totals?.discount" class="flex justify-between"><dt class="opacity-60">{{ t('common.discount') }}</dt><dd class="tabular">− {{ fmt.money(order.totals.discount) }}</dd></div>
        <div v-if="order.totals?.service" class="flex justify-between"><dt class="opacity-60">{{ t('common.service') }}</dt><dd class="tabular">{{ fmt.money(order.totals.service) }}</dd></div>
        <div v-if="order.totals?.deliveryFee" class="flex justify-between"><dt class="opacity-60">{{ t('common.delivery') }}</dt><dd class="tabular">{{ fmt.money(order.totals.deliveryFee) }}</dd></div>
        <div class="flex justify-between"><dt class="opacity-60">{{ t('common.tax') }} 14%</dt><dd class="tabular">{{ fmt.money(order.totals?.vat) }}</dd></div>
        <div class="mt-1 flex items-baseline justify-between border-t-[3px] border-ink pt-2">
          <dt class="font-display text-sm">{{ t('common.total') }}</dt>
          <dd class="font-display text-xl tabular">{{ fmt.money(order.totals?.total) }}</dd>
        </div>
      </dl>

      <ul class="flex flex-col gap-1 border-t-[3px] border-dashed border-ink py-3 text-[11px] font-bold">
        <li v-for="(p, i) in order.payments || []" :key="i" class="flex justify-between">
          <span class="opacity-60">{{ paymentName(p.method) }}</span>
          <span class="tabular">{{ fmt.money(p.amount) }}</span>
        </li>
      </ul>

      <footer class="border-t-[3px] border-dashed border-ink pt-3 text-center">
        <p class="font-display text-sm">شكرًا لزيارتك 🍳</p>
        <p class="mt-1 text-[10px] font-bold opacity-50">{{ t('common.appName') }} POS</p>
      </footer>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NButton variant="outline" block @click="doPrint">
          <Printer class="size-4" :stroke-width="3" />
          {{ t('pos.printReceipt') }}
        </NButton>
        <NButton tone="saffron" block @click="emit('new')">
          <Plus class="size-4" :stroke-width="3" />
          {{ t('pos.newSale') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>
