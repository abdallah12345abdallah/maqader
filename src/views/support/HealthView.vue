<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Copy, ClipboardCheck, ArrowUpRight, Plus,
} from 'lucide-vue-next'
import { NButton, NBadge, NCard, NStat, NMeter, NEmpty } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import NewTicketSheet from '@/components/support/NewTicketSheet.vue'
import { APP_INFO, COMPANY } from '@/data/org'
import { SUPPORT_PLAN } from '@/data/support'
import { runHealthChecks, healthScore } from '@/lib/support'
import { TONES } from '@/lib/constants'
import { cn, round } from '@/lib/utils'
import { useOpsStore } from '@/stores/ops'
import { useReportsStore } from '@/stores/reports'
import { useSupportStore } from '@/stores/support'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const router = useRouter()
const ops = useOpsStore()
const reports = useReportsStore()
const support = useSupportStore()
const ui = useUiStore()
const fmt = useFmt()
const isEn = computed(() => fmt.locale.value === 'en')

support.init()

/** الفحص بيتحدّث مع البيانات، والزر بيجدّد لقطة التشخيص والوقت */
const stamp = ref(Date.now())
const copied = ref(false)
const creating = ref(false)

const diagnostics = computed(() => {
  void stamp.value
  return support.snapshot()
})

const stuckOrders = computed(() => {
  const limit = Date.now() - 2 * 3600 * 1000
  return ops.openOrders.filter((o) => new Date(o.createdAt || o.sentAt || 0).getTime() < limit).length
})

const lastCountDays = computed(() => {
  const last = ops.counts[0]
  if (!last) return null
  return Math.max(0, Math.round((Date.now() - new Date(last.date).getTime()) / 86400000))
})

const checks = computed(() =>
  runHealthChecks({
    ledgerBalanced: reports.tb.isBalanced,
    ledgerDebit: reports.tb.totalDebit,
    ledgerCredit: reports.tb.totalCredit,
    negativeStockRows: diagnostics.value.integrity.negativeStockRows,
    lowStockCount: reports.lowStock.length,
    expiringCount: reports.expiringSoon.length,
    recipeErrors: diagnostics.value.integrity.recipeErrors,
    stuckOrders: stuckOrders.value,
    openOrders: ops.openOrders.length,
    wastePct: reports.wasteSummary.pctOfSales,
    foodCostPct: reports.summary.foodCostPct,
    storageKb: diagnostics.value.storageKb,
    lastCountDays: lastCountDays.value,
  }),
)

const score = computed(() => healthScore(checks.value))
const attention = computed(() => checks.value.filter((c) => c.status !== 'ok'))

const iconOf = (status) => ({ ok: CheckCircle2, warn: AlertTriangle, fail: XCircle })[status]
const nameOf = (c) => (isEn.value ? c.nameEn : c.nameAr)
const detailOf = (c) => (isEn.value ? c.detailEn : c.detailAr)

const install = computed(() => [
  { label: t('support.version'), value: `${APP_INFO.version} (${APP_INFO.edition})` },
  { label: t('support.build'), value: APP_INFO.build },
  { label: t('support.license'), value: APP_INFO.licenseId },
  { label: t('support.licensedTo'), value: APP_INFO.licensedTo || COMPANY.nameAr },
  { label: t('support.seats'), value: fmt.int(APP_INFO.seats) },
  { label: t('support.plan'), value: fmt.name(SUPPORT_PLAN) },
])

const payload = computed(() => JSON.stringify({ checks: checks.value, diagnostics: diagnostics.value }, null, 2))

function recheck() {
  stamp.value = Date.now()
  ui.toast(t('support.recheck'), 'sky', `${score.value.ok}/${score.value.total} ${t('support.checksOk')}`)
}

async function copyPayload() {
  try {
    await navigator.clipboard.writeText(payload.value)
    copied.value = true
    ui.toast(t('support.copied'), 'sky')
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    ui.toast(t('support.copyDiagnostics'), 'saffron')
  }
}

/** تذكرة مكتوبة مسبقًا بنتيجة الفحص — الدعم يبدأ من معلومة مش من سؤال */
const prefill = computed(() => {
  const failing = attention.value
    .map((c) => `• ${nameOf(c)}: ${detailOf(c)}`)
    .join('\n')
  return {
    subject: attention.value.length
      ? `${t('support.systemHealth')}: ${nameOf(attention.value[0])}`
      : t('support.systemHealth'),
    body: `${t('support.healthScore')}: ${Math.round(score.value.score * 100)}%\n${failing || t('support.allHealthy')}`,
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('support.systemHealth')" :subtitle="t('support.healthSubtitle')" emoji="🩺" tone="sky">
      <template #actions>
        <NButton variant="outline" size="sm" @click="recheck">
          <RefreshCw class="size-4" :stroke-width="3" />{{ t('support.recheck') }}
        </NButton>
        <NButton tone="plum" size="sm" @click="creating = true">
          <Plus class="size-4" :stroke-width="3" />{{ t('support.openTicketWithCheck') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat
        :label="t('support.healthScore')"
        :value="fmt.pct(score.score, 0)"
        :tone="score.tone"
        :hint="score.status === 'ok' ? t('support.allHealthy') : `${score.fail + score.warn} ${t('support.needsAttention')}`"
      />
      <NStat :label="t('support.checksOk')" :value="fmt.int(score.ok)" tone="basil" />
      <NStat :label="t('support.checksWarn')" :value="fmt.int(score.warn)" :tone="score.warn ? 'saffron' : 'ink'" />
      <NStat :label="t('support.checksFail')" :value="fmt.int(score.fail)" :tone="score.fail ? 'tomato' : 'ink'" />
    </div>

    <NMeter
      :value="score.score"
      :tone="score.tone"
      height="lg"
      :label="t('support.healthScore')"
      :caption="`${score.ok}/${score.total}`"
    />

    <div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <!-- الفحوصات -->
      <NCard :title="t('support.systemHealth')" :subtitle="t('support.healthSubtitle')" emoji="✅" :tone="score.tone" :padded="false">
        <ul class="flex flex-col divide-y-[3px] divide-ink/10">
          <li v-for="c in checks" :key="c.id" class="flex items-center gap-3 px-4 py-2.5">
            <span :class="cn('grid size-9 shrink-0 place-items-center brut-thin', (TONES[c.tone] || TONES.ink).soft)">
              <component :is="iconOf(c.status)" class="size-4" :stroke-width="3" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-extrabold">{{ nameOf(c) }}</p>
              <p class="truncate text-[11px] font-bold opacity-65">{{ detailOf(c) }}</p>
            </div>
            <NBadge :tone="c.tone" size="sm" dot>
              {{ c.status === 'ok' ? t('support.checksOk') : c.status === 'warn' ? t('support.checksWarn') : t('support.checksFail') }}
            </NBadge>
            <button
              v-if="c.route"
              type="button"
              class="grid size-8 shrink-0 place-items-center brut-thin bg-paper cursor-pointer brut-press-sm"
              :title="t('support.openScreen')"
              @click="router.push(c.route)"
            >
              <ArrowUpRight class="size-3.5" :stroke-width="3" />
            </button>
          </li>
        </ul>
      </NCard>

      <div class="flex flex-col gap-4">
        <!-- بيانات التثبيت -->
        <NCard :title="t('support.install')" emoji="🏷️" tone="ink">
          <dl class="flex flex-col gap-2 text-sm font-extrabold">
            <div v-for="row in install" :key="row.label" class="flex justify-between gap-2">
              <dt class="opacity-60">{{ row.label }}</dt>
              <dd class="tabular">{{ row.value }}</dd>
            </div>
          </dl>
        </NCard>

        <!-- لقطة التشخيص -->
        <NCard :title="t('support.diagnostics')" emoji="📋" tone="sky">
          <p class="text-[11px] font-bold opacity-65">{{ t('support.diagnosticsHint') }}</p>
          <dl class="mt-2 grid grid-cols-2 gap-2 text-[11px] font-extrabold">
            <div class="flex items-center justify-between gap-1.5 brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="opacity-60">{{ t('common.orders') }}</dt>
              <dd class="tabular">{{ fmt.int(diagnostics.counts.orders) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-1.5 brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="opacity-60">{{ t('dashboard.openOrders') }}</dt>
              <dd class="tabular">{{ fmt.int(diagnostics.counts.openOrders) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-1.5 brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="opacity-60">{{ t('accounting.journal') }}</dt>
              <dd class="tabular">{{ fmt.int(diagnostics.counts.journal) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-1.5 brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="opacity-60">{{ t('dashboard.inventoryValue') }}</dt>
              <dd class="tabular">{{ fmt.moneyShort(diagnostics.inventoryValue) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-1.5 brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="opacity-60">{{ t('settings.data') }}</dt>
              <dd class="tabular">{{ round(diagnostics.storageKb, 0) }} KB</dd>
            </div>
            <div class="flex items-center justify-between gap-1.5 brut-thin bg-paper-2 px-2 py-1.5">
              <dt class="opacity-60">{{ t('common.branch') }}</dt>
              <dd>{{ diagnostics.branchId }}</dd>
            </div>
          </dl>
          <NButton variant="outline" size="sm" class="mt-3" block @click="copyPayload">
            <component :is="copied ? ClipboardCheck : Copy" class="size-4" :stroke-width="3" />
            {{ copied ? t('support.copied') : t('support.copyDiagnostics') }}
          </NButton>
        </NCard>
      </div>
    </div>

    <!-- فحوصات محتاجة نظرة -->
    <NCard :title="t('support.needsAttention')" emoji="⚠️" tone="saffron" :padded="attention.length === 0">
      <ul v-if="attention.length" class="flex flex-col divide-y-[3px] divide-ink/10">
        <li v-for="c in attention" :key="c.id" class="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <NBadge :tone="c.tone" size="sm" dot>{{ nameOf(c) }}</NBadge>
          <p class="min-w-0 flex-1 text-xs font-bold opacity-75">{{ detailOf(c) }}</p>
          <NButton v-if="c.route" variant="outline" size="xs" @click="router.push(c.route)">
            <ArrowUpRight class="size-3.5" :stroke-width="3" />{{ t('support.openScreen') }}
          </NButton>
        </li>
      </ul>
      <NEmpty v-else :text="t('support.allHealthy')" :hint="t('support.healthSubtitle')" emoji="🟢" />
    </NCard>

    <NewTicketSheet
      :open="creating"
      category-id="CAT-HW"
      :priority-id="score.fail ? 'P2' : 'P3'"
      :subject="prefill.subject"
      :body="prefill.body"
      @close="creating = false"
      @created="(ticket) => router.push(`/support/tickets/${ticket.id}`)"
    />
  </div>
</template>
