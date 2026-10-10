<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, Star, ArrowUpRight, BookOpen, Stethoscope } from 'lucide-vue-next'
import { NButton, NBadge, NCard, NStat, NMeter, NEmpty, NInput, NSelect, NSegment, NSwitch } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import Icon from '@/components/shared/Icon.vue'
import SlaStrip from '@/components/support/SlaStrip.vue'
import NewTicketSheet from '@/components/support/NewTicketSheet.vue'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUS,
  SUPPORT_CHANNELS,
  SUPPORT_PLAN,
  supportCategoryMap,
  supportPriorityMap,
} from '@/data/support'
import { BRANCHES, USERS } from '@/data/org'
import { TONES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useSupportStore } from '@/stores/support'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const support = useSupportStore()
const fmt = useFmt()
const isEn = computed(() => fmt.locale.value === 'en')

support.init()

const creating = ref(false)
const search = ref('')
const statusFilter = ref('open')
const categoryFilter = ref('')
const mineOnly = ref(false)

const metrics = computed(() => support.metrics)
const usage = computed(() => support.usage)

/** فلتر الحالة: «المفتوحة» مجموعة واحدة عشان ده السؤال الحقيقي كل يوم */
const statusOptions = computed(() => {
  const counts = metrics.value.byStatus
  return [
    { value: 'open', label: t('support.openTickets'), tone: 'tomato', count: metrics.value.open },
    { value: '', label: t('common.all'), tone: 'ink', count: metrics.value.total },
    ...Object.entries(SUPPORT_STATUS)
      .sort((a, b) => a[1].sort - b[1].sort)
      .map(([key, meta]) => ({
        value: key,
        label: fmt.name(meta),
        tone: meta.tone,
        count: counts[key] || 0,
      })),
  ]
})

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return support.tickets.filter((ticket) => {
    if (statusFilter.value === 'open' && !SUPPORT_STATUS[ticket.status]?.isOpen) return false
    if (statusFilter.value && statusFilter.value !== 'open' && ticket.status !== statusFilter.value) return false
    if (categoryFilter.value && ticket.categoryId !== categoryFilter.value) return false
    if (mineOnly.value && ticket.createdBy !== auth.userId) return false
    if (!q) return true
    const subject = `${ticket.subjectAr} ${ticket.subjectEn} ${ticket.number}`.toLowerCase()
    return subject.includes(q)
  })
})

const subjectOf = (ticket) => fmt.name({ nameAr: ticket.subjectAr, nameEn: ticket.subjectEn })
const lastMessage = (ticket) => ticket.messages[ticket.messages.length - 1]
const bodyOf = (m) => (m ? fmt.name({ nameAr: m.bodyAr, nameEn: m.bodyEn }) : '')
const userName = (id) => fmt.name(USERS.find((u) => u.id === id))
const branchName = (id) => fmt.name(BRANCHES.find((b) => b.id === id))

const volume = computed(() =>
  metrics.value.byCategory.map((r) => ({
    ...r,
    share: metrics.value.total ? r.count / metrics.value.total : 0,
  })),
)

function onCreated(ticket) {
  router.push(`/support/tickets/${ticket.id}`)
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('support.title')" :subtitle="t('support.subtitle')" emoji="🛟" tone="plum">
      <template #actions>
        <NButton variant="outline" size="sm" @click="router.push('/support/kb')">
          <BookOpen class="size-4" :stroke-width="3" />{{ t('support.knowledge') }}
        </NButton>
        <NButton variant="outline" size="sm" @click="router.push('/support/health')">
          <Stethoscope class="size-4" :stroke-width="3" />{{ t('support.systemHealth') }}
        </NButton>
        <NButton tone="plum" size="sm" @click="creating = true">
          <Plus class="size-4" :stroke-width="3" />{{ t('support.newTicket') }}
        </NButton>
      </template>
    </PageHeader>

    <!-- المؤشرات اللي بتحاسب الدعم -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat
        :label="t('support.openTickets')"
        :value="fmt.int(metrics.open)"
        :tone="metrics.breached.length ? 'tomato' : 'plum'"
      >
        <template #hint>
          <span v-if="metrics.breached.length" class="text-tomato">
            {{ metrics.breached.length }} {{ t('support.breached') }}
          </span>
          <span v-else-if="metrics.awaitingCustomer.length">
            {{ metrics.awaitingCustomer.length }} {{ t('support.waitingYou') }}
          </span>
          <span v-else>{{ t('support.slaMet') }}</span>
        </template>
      </NStat>
      <NStat
        :label="t('support.avgFirstResponse')"
        :value="fmt.span(metrics.avgFirstResponseMins)"
        tone="saffron"
        :hint="`${t('support.avgResolution')} ${fmt.span(metrics.avgResolutionMins)}`"
      />
      <NStat
        :label="t('support.compliance')"
        :value="fmt.pct(metrics.responseSlaPct, 0)"
        :tone="metrics.responseSlaPct >= 0.9 ? 'basil' : 'saffron'"
        :hint="`${t('support.slaResolve')} ${fmt.pct(metrics.resolveSlaPct, 0)}`"
      />
      <NStat
        :label="t('support.satisfaction')"
        :value="`${fmt.num(metrics.csatAvg, 1)} / 5`"
        tone="sky"
        :hint="`${metrics.csatCount} ${t('support.rated')}`"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <!-- الباقة واستهلاكها -->
      <NCard :title="t('support.plan')" :subtitle="fmt.name(SUPPORT_PLAN)" emoji="🎟️" tone="berry">
        <div class="flex flex-col gap-3">
          <p class="text-xs font-extrabold opacity-70">
            {{ isEn ? SUPPORT_PLAN.coverageEn : SUPPORT_PLAN.coverageAr }}
          </p>

          <NMeter
            :value="usage.usedPct"
            :tone="usage.usedPct > 0.85 ? 'tomato' : 'berry'"
            :label="t('support.includedHours')"
            :caption="`${fmt.num(usage.usedHours, 1)} / ${usage.includedHours}`"
          />

          <dl class="grid grid-cols-3 gap-2 text-center">
            <div class="brut-thin bg-paper-2 px-2 py-2">
              <dt class="text-[10px] font-extrabold opacity-60">{{ t('support.remainingHours') }}</dt>
              <dd class="font-display text-lg tabular">{{ fmt.num(usage.remainingHours, 1) }}</dd>
            </div>
            <div class="brut-thin bg-paper-2 px-2 py-2">
              <dt class="text-[10px] font-extrabold opacity-60">{{ t('support.visits') }}</dt>
              <dd class="font-display text-lg tabular">
                {{ SUPPORT_PLAN.usedVisits }}/{{ SUPPORT_PLAN.includedVisits }}
              </dd>
            </div>
            <div class="brut-thin bg-paper-2 px-2 py-2">
              <dt class="text-[10px] font-extrabold opacity-60">{{ t('support.renewsIn') }}</dt>
              <dd class="font-display text-lg tabular">{{ usage.daysToRenew }} {{ t('support.days') }}</dd>
            </div>
          </dl>

          <!-- مصفوفة مستوى الخدمة -->
          <div>
            <p class="mb-1.5 text-xs font-extrabold opacity-70">{{ t('support.slaMatrix') }}</p>
            <ul class="flex flex-col gap-1">
              <li
                v-for="p in SUPPORT_PRIORITIES"
                :key="p.id"
                class="flex items-center gap-2 brut-thin bg-paper px-2.5 py-1.5"
              >
                <NBadge :tone="p.tone" size="sm" dot>{{ fmt.name(p) }}</NBadge>
                <span class="ms-auto text-[11px] font-extrabold tabular opacity-70">
                  {{ t('support.slaResponse') }} {{ fmt.span(p.responseMins) }}
                </span>
                <span class="text-[11px] font-extrabold tabular opacity-50">·</span>
                <span class="text-[11px] font-extrabold tabular opacity-70">
                  {{ fmt.span(p.resolveMins) }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </NCard>

      <!-- قنوات التواصل + حجم التذاكر -->
      <div class="flex flex-col gap-4">
        <NCard :title="t('support.channels')" emoji="📞" tone="basil" :padded="false">
          <ul class="flex flex-col divide-y-[3px] divide-ink/10">
            <li v-for="ch in SUPPORT_CHANNELS" :key="ch.id" class="flex items-center gap-3 px-4 py-2.5">
              <span :class="cn('grid size-9 shrink-0 place-items-center brut-thin', (TONES[ch.tone] || TONES.ink).soft)">
                <Icon :name="ch.icon" class="size-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-extrabold">{{ fmt.name(ch) }}</p>
                <p class="truncate text-[11px] font-bold opacity-60">
                  {{ isEn ? ch.hoursEn : ch.hoursAr }}
                </p>
              </div>
              <a
                v-if="ch.href"
                :href="ch.href"
                target="_blank"
                rel="noopener"
                class="brut-thin bg-paper px-2 py-1 text-[11px] font-extrabold tabular brut-press-sm"
              >{{ ch.value }}</a>
              <NButton v-else tone="plum" size="xs" @click="creating = true">
                {{ t('support.newTicket') }}
              </NButton>
            </li>
          </ul>
        </NCard>

        <NCard :title="t('support.byCategory')" emoji="📊" tone="sky">
          <ul v-if="volume.length" class="flex flex-col gap-2">
            <li v-for="row in volume" :key="row.category.id" class="flex items-center gap-2">
              <span class="w-32 shrink-0 truncate text-xs font-extrabold">{{ fmt.name(row.category) }}</span>
              <div class="min-w-0 flex-1">
                <NMeter :value="row.share" :tone="row.category.tone" height="sm" />
              </div>
              <span class="w-8 text-end font-display text-sm tabular">{{ row.count }}</span>
            </li>
          </ul>
          <NEmpty v-else :text="t('support.noTickets')" hint="" />
        </NCard>
      </div>
    </div>

    <!-- الفلاتر -->
    <div class="flex flex-wrap items-center gap-2">
      <NSegment v-model="statusFilter" :options="statusOptions" size="sm" tone="plum" />
      <div class="w-48">
        <NSelect
          v-model="categoryFilter"
          :options="[{ value: '', label: t('common.all') }, ...SUPPORT_CATEGORIES.map((c) => ({ value: c.id, label: fmt.name(c) }))]"
          size="sm"
        />
      </div>
      <div class="w-56">
        <NInput v-model="search" size="sm" :placeholder="t('common.searchPlaceholder')" />
      </div>
      <NSwitch v-model="mineOnly" tone="sky" :label="t('support.mineOnly')" />
    </div>

    <!-- التذاكر -->
    <ul v-if="rows.length" class="grid gap-3 lg:grid-cols-2">
      <li v-for="ticket in rows" :key="ticket.id">
        <RouterLink :to="`/support/tickets/${ticket.id}`" class="block h-full brut bg-paper shadow-brut brut-press">
          <div class="flex flex-col gap-2.5 p-3.5">
            <div class="flex items-start gap-2.5">
              <span
                :class="cn(
                  'grid size-10 shrink-0 place-items-center brut-thin',
                  (TONES[supportCategoryMap.get(ticket.categoryId)?.tone] || TONES.ink).soft,
                )"
              >
                <Icon :name="supportCategoryMap.get(ticket.categoryId)?.icon || 'LifeBuoy'" class="size-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-extrabold">{{ subjectOf(ticket) }}</p>
                <p class="mt-0.5 truncate text-[11px] font-bold opacity-60">
                  <span class="font-display tabular">{{ ticket.number }}</span>
                  · {{ branchName(ticket.branchId) }} · {{ userName(ticket.createdBy) }}
                </p>
              </div>
              <ArrowUpRight class="size-4 shrink-0 opacity-50" :stroke-width="3" />
            </div>

            <p class="line-clamp-2 text-xs font-bold opacity-75">{{ bodyOf(lastMessage(ticket)) }}</p>

            <div class="flex flex-wrap items-center gap-1.5">
              <NBadge :tone="SUPPORT_STATUS[ticket.status]?.tone" size="sm" dot>
                {{ fmt.name(SUPPORT_STATUS[ticket.status]) }}
              </NBadge>
              <NBadge :tone="supportPriorityMap.get(ticket.priorityId)?.tone" size="sm">
                {{ fmt.name(supportPriorityMap.get(ticket.priorityId)) }}
              </NBadge>
              <NBadge v-if="ticket.csat" tone="basil" size="sm">
                <Star class="size-3" :stroke-width="3" />{{ ticket.csat.stars }}/5
              </NBadge>
              <span class="ms-auto text-[10px] font-bold tabular opacity-55">
                {{ fmt.dateTime(lastMessage(ticket)?.at || ticket.createdAt) }}
              </span>
            </div>

            <SlaStrip :ticket="ticket" compact />
          </div>
        </RouterLink>
      </li>
    </ul>

    <NEmpty v-else :text="t('support.noTickets')" :hint="t('support.noTicketsHint')" emoji="🛟">
      <NButton tone="plum" size="sm" class="mt-2" @click="creating = true">
        <Plus class="size-4" :stroke-width="3" />{{ t('support.newTicket') }}
      </NButton>
    </NEmpty>

    <NewTicketSheet :open="creating" @close="creating = false" @created="onCreated" />
  </div>
</template>
