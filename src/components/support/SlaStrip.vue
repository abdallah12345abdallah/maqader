<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NBadge, NMeter } from '@/components/ui'
import { ticketSla } from '@/lib/support'
import { useNow } from '@/composables/useNow'
import { useFmt } from '@/composables/useFmt'

/** عدّاد مستوى الخدمة لتذكرة — حيّ ومعكوس صح في RTL */
const props = defineProps({
  ticket: { type: Object, required: true },
  compact: Boolean,
})

const { t } = useI18n()
const fmt = useFmt()
const now = useNow(30000)

const sla = computed(() => ticketSla(props.ticket, now.value))

const label = computed(
  () =>
    ({
      met: t('support.slaMet'),
      missed: t('support.slaMissed'),
      paused: t('support.waitingYou'),
      running: t('support.slaRemaining'),
      due_soon: t('support.dueSoon'),
      breached: t('support.breached'),
    })[sla.value.state],
)

/** الرقم اللي يهم: المتبقي للتذاكر المفتوحة، وزمن الحل للمقفولة */
const value = computed(() => {
  const s = sla.value
  if (!s.status.isOpen) return fmt.span(s.resolutionMins ?? 0)
  if (s.overdue) return `+${fmt.span(Math.abs(s.remainingMins))}`
  return fmt.span(s.remainingMins)
})
</script>

<template>
  <div v-if="compact" class="flex items-center gap-1.5">
    <NBadge :tone="sla.tone" size="sm" dot>{{ label }}</NBadge>
    <span class="text-[11px] font-extrabold tabular opacity-70">{{ value }}</span>
  </div>

  <div v-else class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NBadge :tone="sla.tone" dot>{{ label }} · {{ value }}</NBadge>
      <span class="text-[11px] font-bold opacity-65">
        {{ sla.status.isOpen ? `${t('support.slaDue')} ${fmt.dateTime(sla.dueAt)}` : fmt.dateTime(ticket.resolvedAt || ticket.closedAt) }}
      </span>
    </div>

    <NMeter
      :value="sla.progress"
      :tone="sla.tone"
      height="sm"
      :label="ticket.firstResponseAt ? t('support.slaResolve') : t('support.slaResponse')"
      :caption="fmt.span(sla.targetMins)"
    />

    <dl class="grid grid-cols-2 gap-2 text-[11px] font-extrabold">
      <div class="flex items-center justify-between gap-2 brut-thin bg-paper-2 px-2 py-1.5">
        <dt class="opacity-60">{{ t('support.firstResponse') }}</dt>
        <dd class="tabular">{{ sla.firstResponseMins === null ? '—' : fmt.span(sla.firstResponseMins) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-2 brut-thin bg-paper-2 px-2 py-1.5">
        <dt class="opacity-60">{{ t('support.waitingYou') }}</dt>
        <dd class="tabular">{{ fmt.span(sla.pausedMins) }}</dd>
      </div>
    </dl>
  </div>
</template>
