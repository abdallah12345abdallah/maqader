<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Plus, Trash2, Banknote, CreditCard, Smartphone, Bike } from 'lucide-vue-next'
import { NModal, NButton, NBadge, NField, NInput } from '@/components/ui'
import { cn, round, sum } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/data/org'
import { usePosStore } from '@/stores/pos'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'done'])

const { t } = useI18n()
const pos = usePosStore()
const ui = useUiStore()
const fmt = useFmt()

const icons = { cash: Banknote, card: CreditCard, wallet: Smartphone, aggregator: Bike }
const payments = ref([])
const tendered = ref(0)

const total = computed(() => pos.totals.total)
const paid = computed(() => round(sum(payments.value, (p) => p.amount), 2))
const remaining = computed(() => round(total.value - paid.value, 2))
const change = computed(() => round(Math.max(0, tendered.value - total.value), 2))
const canComplete = computed(() => remaining.value <= 0.01 && payments.value.length > 0)

watch(
  () => props.open,
  (v) => {
    if (!v) return
    payments.value = []
    tendered.value = 0
  },
)

function addPayment(methodId) {
  const amount = remaining.value > 0 ? remaining.value : 0
  if (amount <= 0) return
  payments.value.push({ method: methodId, amount })
  if (methodId === 'cash') tendered.value = Math.ceil(amount / 5) * 5
}

const quickCash = computed(() => {
  const base = total.value
  return [...new Set([
    Math.ceil(base),
    Math.ceil(base / 50) * 50,
    Math.ceil(base / 100) * 100,
    Math.ceil(base / 100) * 100 + 100,
  ])].filter((v) => v >= base)
})

function complete() {
  const result = pos.pay(payments.value.map((p) => ({ ...p, amount: round(p.amount, 2) })))
  if (!result.ok) {
    ui.toast(t('pos.emptyTicket'), 'tomato')
    return
  }
  ui.toast(t('pos.saleDone'), 'basil', `${result.order.number} · ${fmt.money(result.totals.total)}`)
  emit('done', result)
  emit('close')
}
</script>

<template>
  <NModal :open="open" :title="t('pos.paymentTitle')" :subtitle="t('pos.splitHint')" emoji="💳" tone="basil" size="md" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <!-- المطلوب -->
      <div class="flex items-end justify-between gap-3 brut bg-ink px-4 py-3 text-paper">
        <span class="text-xs font-extrabold uppercase opacity-70">{{ t('pos.due') }}</span>
        <span class="font-display text-4xl leading-none tabular">{{ fmt.money(total) }}</span>
      </div>

      <!-- طرق الدفع -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          v-for="m in PAYMENT_METHODS"
          :key="m.id"
          type="button"
          :class="cn('flex flex-col items-center gap-1 brut bg-paper px-2 py-3 brut-press-sm cursor-pointer', remaining <= 0 && 'opacity-40')"
          :disabled="remaining <= 0"
          @click="addPayment(m.id)"
        >
          <component :is="icons[m.id]" class="size-5" :stroke-width="3" />
          <span class="text-[11px] font-extrabold">{{ fmt.name(m) }}</span>
          <span v-if="m.feePct" class="text-[10px] font-bold opacity-55">{{ fmt.pct(m.feePct, 1) }} عمولة</span>
        </button>
      </div>

      <!-- الدفعات المضافة -->
      <ul v-if="payments.length" class="flex flex-col gap-2">
        <li
          v-for="(p, i) in payments"
          :key="i"
          class="flex items-center gap-2 brut-thin bg-paper-2 px-3 py-2"
        >
          <component :is="icons[p.method]" class="size-4 shrink-0" :stroke-width="3" />
          <span class="flex-1 text-xs font-extrabold">
            {{ fmt.name(PAYMENT_METHODS.find((m) => m.id === p.method)) }}
          </span>
          <div class="w-32">
            <NInput v-model="p.amount" type="number" size="sm" align="end" :step="0.25" />
          </div>
          <button type="button" class="grid size-8 place-items-center brut-thin bg-tomato-soft cursor-pointer" @click="payments.splice(i, 1)">
            <Trash2 class="size-3.5" :stroke-width="3" />
          </button>
        </li>
      </ul>

      <!-- النقدية والباقي -->
      <div v-if="payments.some((p) => p.method === 'cash')" class="flex flex-col gap-2 brut-thin bg-saffron-soft p-3">
        <NField :label="t('pos.cashTendered')">
          <NInput v-model="tendered" type="number" align="end" />
        </NField>
        <div class="flex flex-wrap gap-2">
          <NButton v-for="v in quickCash" :key="v" size="xs" variant="outline" @click="tendered = v">
            {{ fmt.money0(v) }}
          </NButton>
        </div>
        <div class="flex items-baseline justify-between border-t-[3px] border-ink pt-2">
          <span class="text-xs font-extrabold">{{ t('pos.change') }}</span>
          <span class="font-display text-2xl tabular">{{ fmt.money(change) }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 text-sm font-extrabold">
        <NBadge :tone="remaining > 0.01 ? 'tomato' : 'basil'">
          {{ remaining > 0.01 ? `${t('pos.remaining')} ${fmt.money(remaining)}` : t('pos.paid') }}
        </NBadge>
        <span class="tabular opacity-70">{{ t('pos.paid') }}: {{ fmt.money(paid) }}</span>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NButton variant="outline" block @click="emit('close')">{{ t('common.cancel') }}</NButton>
        <NButton tone="basil" block :disabled="!canComplete" @click="complete">
          <Check class="size-4" :stroke-width="3" />
          {{ t('pos.completeSale') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>
