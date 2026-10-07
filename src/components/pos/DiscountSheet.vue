<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X } from 'lucide-vue-next'
import { NModal, NButton, NField, NInput, NSelect, NSegment } from '@/components/ui'
import { DISCOUNT_REASONS } from '@/data/menu'
import { round } from '@/lib/utils'
import { usePosStore } from '@/stores/pos'
import { useFmt } from '@/composables/useFmt'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const { t } = useI18n()
const pos = usePosStore()
const fmt = useFmt()

const mode = ref('pct')
const value = ref(10)
const reasonId = ref(DISCOUNT_REASONS[0].id)

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const d = pos.ticket.discount
    mode.value = d?.type || 'pct'
    value.value = d ? (d.type === 'pct' ? round(d.value * 100, 2) : d.value) : 10
    reasonId.value = d?.reasonId || DISCOUNT_REASONS[0].id
  },
)

const reason = computed(() => DISCOUNT_REASONS.find((r) => r.id === reasonId.value))
const maxPct = computed(() => (reason.value?.maxPct || 1) * 100)
const subtotal = computed(() => pos.totals.grossNet)
const preview = computed(() =>
  mode.value === 'pct' ? round(subtotal.value * (value.value / 100), 2) : Math.min(value.value, subtotal.value),
)
const exceeds = computed(() => mode.value === 'pct' && value.value > maxPct.value)

function apply() {
  if (exceeds.value) return
  pos.applyDiscount({
    type: mode.value,
    value: mode.value === 'pct' ? value.value / 100 : value.value,
    reasonId: reasonId.value,
  })
  emit('close')
}
function clear() {
  pos.clearDiscount()
  emit('close')
}
</script>

<template>
  <NModal :open="open" :title="t('pos.applyDiscount')" emoji="🏷️" tone="berry" size="sm" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <NSegment
        v-model="mode"
        :options="[
          { value: 'pct', label: t('pos.discountPct') },
          { value: 'amount', label: t('pos.discountAmount') },
        ]"
        tone="berry"
        size="sm"
        :scroll="false"
      />

      <NField :label="mode === 'pct' ? '%' : fmt.money0(0).replace(/[\d.,\s]/g, '')">
        <NInput v-model="value" type="number" align="end" :min="0" :step="mode === 'pct' ? 1 : 5" />
      </NField>

      <NField :label="t('pos.discountReason')" :hint="`الحد الأقصى ${maxPct}%`">
        <NSelect
          v-model="reasonId"
          :options="DISCOUNT_REASONS.map((r) => ({ value: r.id, label: fmt.name(r) }))"
        />
      </NField>

      <div class="flex items-baseline justify-between gap-2 brut-thin bg-paper-2 px-3 py-2.5">
        <span class="text-xs font-extrabold opacity-70">{{ t('common.discount') }}</span>
        <span class="font-display text-2xl tabular">{{ fmt.money(preview) }}</span>
      </div>

      <p v-if="exceeds" class="brut-thin bg-tomato-soft px-3 py-2 text-xs font-extrabold">
        النسبة أعلى من حد هذا السبب ({{ maxPct }}%)
      </p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NButton v-if="pos.ticket.discount" tone="tomato" variant="soft" block @click="clear">
          <X class="size-4" :stroke-width="3" />
          {{ t('common.clear') }}
        </NButton>
        <NButton tone="basil" block :disabled="exceeds" @click="apply">
          <Check class="size-4" :stroke-width="3" />
          {{ t('common.apply') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>
