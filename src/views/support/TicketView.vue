<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowRight, Send, CheckCheck, RotateCcw, Star, Copy, ClipboardCheck, BookOpen, ArrowUpRight,
} from 'lucide-vue-next'
import { NButton, NBadge, NCard, NEmpty, NTextarea, NModal, NField } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import Icon from '@/components/shared/Icon.vue'
import SlaStrip from '@/components/support/SlaStrip.vue'
import {
  SUPPORT_STATUS,
  SUPPORT_CHANNELS,
  supportCategoryMap,
  supportPriorityMap,
  supportAgentMap,
  kbArticleMap,
} from '@/data/support'
import { BRANCHES, USERS, ROLES } from '@/data/org'
import { TONES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useSupportStore } from '@/stores/support'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const support = useSupportStore()
const ui = useUiStore()
const fmt = useFmt()
const isEn = computed(() => fmt.locale.value === 'en')

support.init()

const draft = ref('')
const rating = ref(0)
const ratingComment = ref('')
const ratingOpen = ref(false)
const copied = ref(false)

const ticket = computed(() => support.byId(String(route.params.id)))
const status = computed(() => SUPPORT_STATUS[ticket.value?.status] || SUPPORT_STATUS.open)
const category = computed(() => supportCategoryMap.get(ticket.value?.categoryId))
const priority = computed(() => supportPriorityMap.get(ticket.value?.priorityId))
const assignee = computed(() => supportAgentMap.get(ticket.value?.assigneeId))
const reporter = computed(() => USERS.find((u) => u.id === ticket.value?.createdBy))
const branch = computed(() => BRANCHES.find((b) => b.id === ticket.value?.branchId))
const channel = computed(() => SUPPORT_CHANNELS.find((c) => c.id === ticket.value?.channel))
const article = computed(() => kbArticleMap.get(ticket.value?.articleId))

const subject = computed(() =>
  ticket.value ? fmt.name({ nameAr: ticket.value.subjectAr, nameEn: ticket.value.subjectEn }) : '',
)
const bodyOf = (m) => fmt.name({ nameAr: m.bodyAr, nameEn: m.bodyEn })

/** صاحب الرسالة: أنت / فريق الدعم / النظام */
function authorOf(m) {
  if (m.author === 'agent') {
    const agent = supportAgentMap.get(m.agentId)
    return {
      name: agent ? fmt.name(agent) : t('support.agent'),
      role: agent ? (isEn.value ? agent.titleEn : agent.titleAr) : '',
      tone: agent?.tone || 'berry',
      avatar: agent?.avatar || '🛟',
      side: 'start',
    }
  }
  if (m.author === 'system') {
    return { name: t('support.system'), role: '', tone: 'ink', avatar: '⚙️', side: 'center' }
  }
  const user = USERS.find((u) => u.id === m.userId)
  return {
    name: user ? fmt.name(user) : t('support.you'),
    role: user ? fmt.name(ROLES[user.role]) : '',
    tone: user?.tone || 'sky',
    avatar: '🙋',
    side: 'end',
  }
}

/** خيط الرسائل مجهّز للعرض — بنحسب صاحب الرسالة مرة واحدة */
const thread = computed(() =>
  (ticket.value?.messages || []).map((m) => ({ ...m, body: bodyOf(m), who: authorOf(m) })),
)

const meta = computed(() => {
  const ticketValue = ticket.value
  if (!ticketValue) return []
  return [
    { key: 'status', label: t('common.status'), value: fmt.name(status.value), tone: status.value.tone },
    { key: 'priority', label: t('support.priority'), value: fmt.name(priority.value), tone: priority.value?.tone },
    { key: 'category', label: t('support.category'), value: fmt.name(category.value), tone: category.value?.tone },
    { key: 'branch', label: t('common.branch'), value: fmt.name(branch.value), tone: branch.value?.tone },
    { key: 'reporter', label: t('support.reporter'), value: fmt.name(reporter.value), tone: reporter.value?.tone },
    {
      key: 'assignee',
      label: t('support.assignee'),
      value: assignee.value ? fmt.name(assignee.value) : '—',
      tone: assignee.value?.tone || 'ink',
    },
    { key: 'channel', label: t('support.channel'), value: fmt.name(channel.value), tone: channel.value?.tone },
    { key: 'created', label: t('common.date'), value: fmt.dateTime(ticketValue.createdAt), tone: 'ink' },
  ]
})

function send() {
  const body = draft.value.trim()
  if (!body || !ticket.value) return
  const wasClosed = !status.value.isOpen
  support.reply(ticket.value.id, body)
  draft.value = ''
  ui.toast(wasClosed ? t('support.ticketReopened') : t('support.replySent'), 'sky')
}

function resolve() {
  support.resolveTicket(ticket.value.id)
  ui.toast(t('support.ticketResolved'), 'basil', t('support.rateHint'))
  ratingOpen.value = true
}

function reopen() {
  support.reopenTicket(ticket.value.id)
  ui.toast(t('support.ticketReopened'), 'saffron')
}

function saveRating() {
  if (!rating.value) return
  support.rateTicket(ticket.value.id, rating.value, ratingComment.value.trim())
  ratingOpen.value = false
  ui.toast(t('support.thanksRating'), 'basil', `${rating.value}/5`)
}

async function copyDiagnostics() {
  const payload = JSON.stringify(ticket.value.diagnostics, null, 2)
  try {
    await navigator.clipboard.writeText(payload)
    copied.value = true
    ui.toast(t('support.copied'), 'sky')
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    ui.toast(t('support.copyDiagnostics'), 'saffron', payload.slice(0, 40))
  }
}
</script>

<template>
  <div v-if="!ticket" class="flex flex-col gap-4">
    <PageHeader :title="t('support.notFound')" :subtitle="t('support.subtitle')" emoji="🛟" tone="plum" />
    <NEmpty :text="t('support.notFound')" :hint="t('support.noTicketsHint')" emoji="🔍">
      <NButton tone="plum" size="sm" class="mt-2" @click="router.push('/support')">
        {{ t('support.tickets') }}
      </NButton>
    </NEmpty>
  </div>

  <div v-else class="flex flex-col gap-5">
    <PageHeader :title="subject" :subtitle="`${ticket.number} · ${fmt.dateTime(ticket.createdAt)}`" emoji="🛟" tone="plum">
      <template #actions>
        <NButton variant="outline" size="sm" @click="router.push('/support')">
          <ArrowRight class="size-4 ltr:rotate-180" :stroke-width="3" />{{ t('support.tickets') }}
        </NButton>
        <NButton v-if="status.isOpen" tone="basil" size="sm" @click="resolve">
          <CheckCheck class="size-4" :stroke-width="3" />{{ t('support.resolve') }}
        </NButton>
        <NButton v-else tone="saffron" size="sm" @click="reopen">
          <RotateCcw class="size-4" :stroke-width="3" />{{ t('support.reopen') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <!-- المحادثة -->
      <NCard :title="t('support.thread')" :subtitle="`${ticket.messages.length} ${t('support.messages')}`" emoji="💬" tone="plum">
        <ul class="flex flex-col gap-3">
          <li v-for="m in thread" :key="m.id">
            <!-- رسائل النظام سطر واحد في النص -->
            <p
              v-if="m.who.side === 'center'"
              class="hatch mx-auto w-fit brut-thin bg-paper px-2.5 py-1 text-[11px] font-extrabold opacity-80"
            >
              {{ m.body }} · {{ fmt.time(m.at) }}
            </p>

            <div v-else :class="cn('flex gap-2.5', m.who.side === 'end' && 'flex-row-reverse')">
              <span
                :class="cn(
                  'grid size-9 shrink-0 place-items-center brut-thin text-base',
                  (TONES[m.who.tone] || TONES.ink).soft,
                )"
              >{{ m.who.avatar }}</span>
              <div
                :class="cn(
                  'min-w-0 flex-1 brut-thin p-2.5',
                  m.who.side === 'end' ? 'bg-sky-soft' : 'bg-paper-2',
                )"
              >
                <div class="flex flex-wrap items-baseline gap-2">
                  <p class="text-xs font-extrabold">{{ m.who.name }}</p>
                  <p class="text-[10px] font-bold opacity-55">{{ m.who.role }}</p>
                  <p class="ms-auto text-[10px] font-bold tabular opacity-55">{{ fmt.dateTime(m.at) }}</p>
                </div>
                <p class="mt-1 text-sm font-bold leading-relaxed">{{ m.body }}</p>
              </div>
            </div>
          </li>
        </ul>

        <template #footer>
          <div class="flex flex-col gap-2">
            <NTextarea v-model="draft" :rows="3" size="sm" :placeholder="t('support.replyPlaceholder')" />
            <div class="flex flex-wrap items-center gap-2">
              <NButton tone="plum" size="sm" :disabled="!draft.trim()" @click="send">
                <Send class="size-4" :stroke-width="3" />{{ t('support.reply') }}
              </NButton>
              <p v-if="status.stopsClock" class="text-[11px] font-extrabold text-tomato">
                {{ t('support.slaPaused') }}
              </p>
              <NButton
                v-if="!status.isOpen && !ticket.csat"
                variant="outline"
                size="sm"
                class="ms-auto"
                @click="ratingOpen = true"
              >
                <Star class="size-4" :stroke-width="3" />{{ t('support.rate') }}
              </NButton>
            </div>
          </div>
        </template>
      </NCard>

      <div class="flex flex-col gap-4">
        <!-- مستوى الخدمة -->
        <NCard :title="t('support.sla')" emoji="⏱️" :tone="priority?.tone || 'ink'">
          <SlaStrip :ticket="ticket" />
        </NCard>

        <!-- تفاصيل التذكرة -->
        <NCard :title="t('common.details')" emoji="🧾" tone="ink" :padded="false">
          <dl class="flex flex-col divide-y-[3px] divide-ink/10">
            <div v-for="row in meta" :key="row.key" class="flex items-center justify-between gap-2 px-4 py-2">
              <dt class="text-xs font-extrabold opacity-60">{{ row.label }}</dt>
              <dd>
                <NBadge v-if="row.key !== 'created'" :tone="row.tone" size="sm" dot>{{ row.value }}</NBadge>
                <span v-else class="text-xs font-extrabold tabular">{{ row.value }}</span>
              </dd>
            </div>
            <div v-if="ticket.csat" class="flex items-center justify-between gap-2 px-4 py-2">
              <dt class="text-xs font-extrabold opacity-60">{{ t('support.satisfaction') }}</dt>
              <dd class="flex items-center gap-1">
                <Star
                  v-for="i in 5"
                  :key="i"
                  :class="cn('size-3.5', i <= ticket.csat.stars ? 'text-saffron' : 'opacity-25')"
                  :stroke-width="3"
                />
              </dd>
            </div>
          </dl>
        </NCard>

        <!-- المقال المرتبط -->
        <NCard v-if="article" :title="t('support.relatedArticle')" emoji="📘" tone="saffron">
          <RouterLink
            :to="{ path: '/support/kb', query: { article: article.id } }"
            class="flex items-center gap-2 brut-thin bg-paper px-2.5 py-2 brut-press-sm"
          >
            <BookOpen class="size-4 shrink-0" :stroke-width="3" />
            <span class="min-w-0 flex-1 text-xs font-extrabold">
              {{ fmt.name({ nameAr: article.titleAr, nameEn: article.titleEn }) }}
            </span>
            <ArrowUpRight class="size-3.5 shrink-0" :stroke-width="3" />
          </RouterLink>
        </NCard>

        <!-- بيانات التشخيص -->
        <NCard v-if="ticket.diagnostics" :title="t('support.diagnostics')" emoji="🩺" tone="sky">
          <p class="text-[11px] font-bold opacity-65">{{ t('support.diagnosticsHint') }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
            <NBadge tone="ink" size="sm">{{ t('support.version') }} {{ ticket.diagnostics.app?.version }}</NBadge>
            <NBadge :tone="ticket.diagnostics.integrity?.ledgerBalanced ? 'basil' : 'tomato'" size="sm" dot>
              {{ ticket.diagnostics.integrity?.ledgerBalanced ? t('common.balanced') : t('common.unbalanced') }}
            </NBadge>
            <NBadge tone="sky" size="sm">{{ fmt.int(ticket.diagnostics.counts?.orders || 0) }} {{ t('common.orders') }}</NBadge>
          </div>
          <pre class="mt-2 max-h-56 overflow-auto brut-thin bg-paper-2 p-2 text-[10px] leading-relaxed" dir="ltr">{{ JSON.stringify(ticket.diagnostics, null, 2) }}</pre>
          <NButton variant="outline" size="sm" class="mt-2" @click="copyDiagnostics">
            <component :is="copied ? ClipboardCheck : Copy" class="size-4" :stroke-width="3" />
            {{ copied ? t('support.copied') : t('support.copyDiagnostics') }}
          </NButton>
        </NCard>

        <!-- حالة التذكرة لو فيها قسم مرتبط -->
        <NCard v-if="category?.route" :title="t('support.openScreen')" emoji="🔗" :tone="category.tone">
          <NButton variant="soft" :tone="category.tone" size="sm" block @click="router.push(category.route)">
            <Icon :name="category.icon" class="size-4" />{{ fmt.name(category) }}
          </NButton>
        </NCard>
      </div>
    </div>

    <!-- تقييم الخدمة -->
    <NModal :open="ratingOpen" :title="t('support.rate')" :subtitle="t('support.rateHint')" emoji="⭐" tone="saffron" @close="ratingOpen = false">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-center gap-2">
          <button
            v-for="i in 5"
            :key="i"
            type="button"
            :class="cn('grid size-12 place-items-center brut cursor-pointer brut-press-sm', i <= rating ? 'bg-saffron' : 'bg-paper')"
            @click="rating = i"
          >
            <Star :class="cn('size-5', i <= rating ? 'text-ink' : 'opacity-40')" :stroke-width="3" />
          </button>
        </div>
        <NField :label="t('common.note')">
          <NTextarea v-model="ratingComment" :rows="3" size="sm" />
        </NField>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="ratingOpen = false">{{ t('common.cancel') }}</NButton>
          <NButton tone="saffron" block :disabled="!rating" @click="saveRating">{{ t('common.save') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
