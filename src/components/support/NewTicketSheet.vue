<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Send, Lightbulb, ShieldCheck, ArrowUpRight } from 'lucide-vue-next'
import { NModal, NButton, NBadge, NField, NInput, NSelect, NTextarea, NSwitch } from '@/components/ui'
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, supportPriorityMap } from '@/data/support'
import { suggestArticles } from '@/lib/support'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useSupportStore } from '@/stores/support'
import { useFmt } from '@/composables/useFmt'

/**
 * فتح تذكرة — بيقترح حلول جاهزة أول ما تكتب الموضوع (بيقلّل التذاكر
 * المتكررة)، وبيوضّح وعد الـ SLA قبل الإرسال.
 */
const props = defineProps({
  open: Boolean,
  categoryId: { type: String, default: '' },
  priorityId: { type: String, default: '' },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  /** إرفاق لقطة التشخيص افتراضيًا */
  attach: { type: Boolean, default: true },
})
const emit = defineEmits(['close', 'created'])

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const support = useSupportStore()
const fmt = useFmt()

const blank = () => ({
  subject: props.subject,
  body: props.body,
  categoryId: props.categoryId || SUPPORT_CATEGORIES[0].id,
  priorityId: props.priorityId || 'P3',
  attach: props.attach,
})
const form = ref(blank())

watch(
  () => props.open,
  (v) => {
    if (v) form.value = blank()
  },
)

const categoryOptions = computed(() =>
  SUPPORT_CATEGORIES.map((c) => ({ value: c.id, label: fmt.name(c) })),
)
const priority = computed(() => supportPriorityMap.get(form.value.priorityId))
const priorityHint = computed(() =>
  fmt.locale.value === 'ar' ? priority.value.hintAr : priority.value.hintEn,
)

const suggestions = computed(() =>
  suggestArticles(
    { subject: form.value.subject, body: form.value.body, categoryId: form.value.categoryId },
    { locale: fmt.locale.value, limit: 3 },
  ),
)

const canSend = computed(() => form.value.subject.trim().length > 4 && form.value.body.trim().length > 9)

function send() {
  if (!canSend.value) return
  const ticket = support.createTicket({
    subject: form.value.subject.trim(),
    body: form.value.body.trim(),
    categoryId: form.value.categoryId,
    priorityId: form.value.priorityId,
    branchId: auth.branchId,
    userId: auth.userId,
    articleId: suggestions.value[0]?.id || null,
    diagnostics: form.value.attach ? support.snapshot() : null,
  })
  ui.toast(
    t('support.ticketCreated'),
    'basil',
    `${ticket.number} · ${t('support.slaResponse')} ${fmt.span(priority.value.responseMins)}`,
  )
  emit('created', ticket)
  emit('close')
}
</script>

<template>
  <NModal
    :open="open"
    :title="t('support.newTicket')"
    :subtitle="t('support.subtitle')"
    emoji="🛟"
    tone="plum"
    size="lg"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <NField :label="t('support.subject')" required>
        <NInput v-model="form.subject" :placeholder="t('support.subjectPlaceholder')" />
      </NField>

      <div class="grid gap-3 sm:grid-cols-2">
        <NField :label="t('support.category')" required>
          <NSelect v-model="form.categoryId" :options="categoryOptions" />
        </NField>
        <NField :label="t('support.priority')" required :hint="priorityHint">
          <NSelect
            v-model="form.priorityId"
            :options="SUPPORT_PRIORITIES.map((p) => ({ value: p.id, label: fmt.name(p) }))"
          />
        </NField>
      </div>

      <!-- وعد الـ SLA واضح قبل الإرسال -->
      <div :class="cn('flex flex-wrap items-center justify-between gap-2 brut px-3 py-2.5', (TONES[priority.tone] || TONES.ink).soft)">
        <span class="flex items-center gap-2 text-xs font-extrabold">
          <ShieldCheck class="size-4" :stroke-width="3" />
          {{ t('support.slaResponse') }} {{ fmt.span(priority.responseMins) }}
        </span>
        <span class="text-xs font-extrabold tabular opacity-75">
          {{ t('support.slaResolve') }} {{ fmt.span(priority.resolveMins) }}
        </span>
      </div>

      <NField :label="t('support.details')" required>
        <NTextarea v-model="form.body" :rows="5" :placeholder="t('support.detailsPlaceholder')" />
      </NField>

      <!-- حلول جاهزة قبل التذكرة -->
      <section v-if="suggestions.length" class="brut bg-saffron-soft p-3">
        <header class="flex items-center gap-2">
          <Lightbulb class="size-4" :stroke-width="3" />
          <p class="text-sm font-extrabold">{{ t('support.suggested') }}</p>
        </header>
        <p class="mt-0.5 text-[11px] font-bold opacity-70">{{ t('support.suggestedHint') }}</p>
        <ul class="mt-2 flex flex-col gap-1.5">
          <li v-for="a in suggestions" :key="a.id">
            <RouterLink
              :to="{ path: '/support/kb', query: { article: a.id } }"
              class="flex items-center gap-2 brut-thin bg-paper px-2.5 py-2 text-xs font-extrabold brut-press-sm"
              @click="emit('close')"
            >
              <span class="min-w-0 flex-1 truncate">{{ fmt.name({ nameAr: a.titleAr, nameEn: a.titleEn }) }}</span>
              <NBadge tone="ink" size="sm">{{ a.readMins }} {{ t('support.readMins') }}</NBadge>
              <ArrowUpRight class="size-3.5 shrink-0" :stroke-width="3" />
            </RouterLink>
          </li>
        </ul>
      </section>

      <div class="flex flex-wrap items-center justify-between gap-3 brut-thin bg-paper-2 px-3 py-2.5">
        <div class="min-w-0">
          <p class="text-sm font-extrabold">{{ t('support.attachDiagnostics') }}</p>
          <p class="text-[11px] font-bold opacity-60">{{ t('support.diagnosticsHint') }}</p>
        </div>
        <NSwitch v-model="form.attach" tone="basil" />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NButton variant="outline" block @click="emit('close')">{{ t('common.cancel') }}</NButton>
        <NButton tone="plum" block :disabled="!canSend" @click="send">
          <Send class="size-4" :stroke-width="3" />{{ t('common.save') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>
