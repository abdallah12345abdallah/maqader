<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, ArrowUpRight, Plus, Eye } from 'lucide-vue-next'
import { NButton, NBadge, NCard, NStat, NEmpty, NInput, NSegment } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import Icon from '@/components/shared/Icon.vue'
import NewTicketSheet from '@/components/support/NewTicketSheet.vue'
import { SUPPORT_CATEGORIES, supportCategoryMap, articleUpdatedAt } from '@/data/support'
import { searchArticles } from '@/lib/support'
import { TONES } from '@/lib/constants'
import { cn, sum } from '@/lib/utils'
import { useSupportStore } from '@/stores/support'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const support = useSupportStore()
const ui = useUiStore()
const fmt = useFmt()

support.init()

const query = ref('')
const categoryFilter = ref('')
/** المقال المفتوح — يقبل ?article=KB-XX من أي شاشة تانية */
const openId = ref(String(route.query.article || ''))
const creating = ref(false)

const categoryOptions = computed(() => [
  { value: '', label: t('common.all'), tone: 'ink', count: support.articles.length },
  ...SUPPORT_CATEGORIES.map((c) => ({
    value: c.id,
    label: fmt.name(c),
    tone: c.tone,
    count: support.articles.filter((a) => a.categoryId === c.id).length,
  })).filter((o) => o.count > 0),
])

const results = computed(() =>
  searchArticles(query.value, {
    locale: fmt.locale.value,
    categoryId: categoryFilter.value,
    articles: support.articles,
  }),
)

const titleOf = (a) => fmt.name({ nameAr: a.titleAr, nameEn: a.titleEn })
const summaryOf = (a) => fmt.name({ nameAr: a.summaryAr, nameEn: a.summaryEn })
const stepsOf = (a) => (fmt.locale.value === 'en' ? a.stepsEn : a.stepsAr)
const tagsOf = (a) => (fmt.locale.value === 'en' ? a.tagsEn : a.tagsAr)

const toggle = (id) => (openId.value = openId.value === id ? '' : id)

function vote(article, helpful) {
  support.voteArticle(article.id, helpful)
  ui.toast(t('support.thanksFeedback'), helpful ? 'basil' : 'saffron', titleOf(article))
}

const totalViews = computed(() => sum(support.articles, (a) => a.views))
const helpfulPct = computed(() => {
  const votes = sum(support.articles, (a) => a.helpful)
  return votes / Math.max(1, totalViews.value)
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('support.knowledge')" :subtitle="t('support.knowledgeSubtitle')" emoji="📚" tone="saffron">
      <template #actions>
        <NButton variant="outline" size="sm" @click="router.push('/support')">
          {{ t('support.tickets') }}
        </NButton>
        <NButton tone="plum" size="sm" @click="creating = true">
          <Plus class="size-4" :stroke-width="3" />{{ t('support.newTicket') }}
        </NButton>
      </template>
    </PageHeader>

    <div class="grid gap-3 sm:grid-cols-3">
      <NStat :label="t('support.articles')" :value="fmt.int(support.articles.length)" tone="saffron" />
      <NStat :label="t('support.views')" :value="fmt.int(totalViews)" tone="sky" />
      <NStat :label="t('support.helpful')" :value="fmt.pct(helpfulPct, 0)" tone="basil" :hint="t('support.knowledgeSubtitle')" />
    </div>

    <!-- البحث والتصنيف -->
    <div class="flex flex-col gap-2">
      <div class="relative">
        <NInput v-model="query" :placeholder="t('support.searchKb')" size="lg" />
        <Search class="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 opacity-45" :stroke-width="3" />
      </div>
      <NSegment v-model="categoryFilter" :options="categoryOptions" size="sm" tone="saffron" />
    </div>

    <ul v-if="results.length" class="flex flex-col gap-3">
      <li v-for="a in results" :key="a.id">
        <NCard :padded="false" :flat="openId !== a.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 p-3.5 text-start cursor-pointer"
            @click="toggle(a.id)"
          >
            <span
              :class="cn(
                'grid size-10 shrink-0 place-items-center brut-thin',
                (TONES[supportCategoryMap.get(a.categoryId)?.tone] || TONES.ink).soft,
              )"
            >
              <Icon :name="supportCategoryMap.get(a.categoryId)?.icon || 'BookOpen'" class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-extrabold">{{ titleOf(a) }}</p>
              <p class="mt-0.5 text-xs font-bold opacity-70">{{ summaryOf(a) }}</p>
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                <NBadge :tone="supportCategoryMap.get(a.categoryId)?.tone" size="sm">
                  {{ fmt.name(supportCategoryMap.get(a.categoryId)) }}
                </NBadge>
                <span class="flex items-center gap-1 text-[10px] font-bold tabular opacity-55">
                  <Eye class="size-3" :stroke-width="3" />{{ fmt.int(a.views) }}
                </span>
                <span class="text-[10px] font-bold tabular opacity-55">
                  {{ a.readMins }} {{ t('support.readMins') }} · {{ t('common.updated') }} {{ fmt.date(articleUpdatedAt(a)) }}
                </span>
              </div>
            </div>
            <component :is="openId === a.id ? ChevronUp : ChevronDown" class="size-4 shrink-0 opacity-60" :stroke-width="3" />
          </button>

          <div v-if="openId === a.id" class="border-t-[3px] border-ink/15 p-3.5">
            <p class="text-xs font-extrabold opacity-70">{{ t('support.steps') }}</p>
            <ol class="mt-2 flex flex-col gap-2">
              <li v-for="(step, i) in stepsOf(a)" :key="i" class="flex items-start gap-2.5">
                <span class="grid size-6 shrink-0 place-items-center brut-thin bg-paper-2 font-display text-[11px] tabular">
                  {{ i + 1 }}
                </span>
                <p class="text-sm font-bold leading-relaxed">{{ step }}</p>
              </li>
            </ol>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <NBadge v-for="tag in tagsOf(a)" :key="tag" tone="ink" size="sm">{{ tag }}</NBadge>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <NButton v-if="a.route" variant="soft" :tone="supportCategoryMap.get(a.categoryId)?.tone || 'ink'" size="sm" @click="router.push(a.route)">
                <ArrowUpRight class="size-4" :stroke-width="3" />{{ t('support.openScreen') }}
              </NButton>
              <div class="ms-auto flex items-center gap-1.5">
                <span class="text-[11px] font-bold opacity-60">{{ t('support.helpful') }}</span>
                <NButton
                  :tone="a.myVote === 1 ? 'basil' : 'ink'"
                  :variant="a.myVote === 1 ? 'solid' : 'outline'"
                  size="xs"
                  @click="vote(a, true)"
                >
                  <ThumbsUp class="size-3.5" :stroke-width="3" />{{ fmt.int(a.helpful) }}
                </NButton>
                <NButton
                  :tone="a.myVote === -1 ? 'tomato' : 'ink'"
                  :variant="a.myVote === -1 ? 'solid' : 'outline'"
                  size="xs"
                  @click="vote(a, false)"
                >
                  <ThumbsDown class="size-3.5" :stroke-width="3" />
                </NButton>
              </div>
            </div>
          </div>
        </NCard>
      </li>
    </ul>

    <NEmpty v-else :text="t('common.noResults')" :hint="t('support.stillNeedHelp')" emoji="🔍" />

    <!-- لسه محتاج مساعدة -->
    <NCard :title="t('support.stillNeedHelp')" emoji="🛟" tone="plum">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-bold opacity-75">{{ t('support.noTicketsHint') }}</p>
        <NButton tone="plum" size="sm" @click="creating = true">
          <Plus class="size-4" :stroke-width="3" />{{ t('support.newTicket') }}
        </NButton>
      </div>
    </NCard>

    <NewTicketSheet
      :open="creating"
      :subject="query"
      :category-id="categoryFilter"
      @close="creating = false"
      @created="(ticket) => router.push(`/support/tickets/${ticket.id}`)"
    />
  </div>
</template>
