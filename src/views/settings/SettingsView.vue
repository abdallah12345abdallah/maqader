<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Moon, Sun, Languages, Trash2, RotateCcw, Users, Store, Boxes } from 'lucide-vue-next'
import { NCard, NBadge, NButton, NField, NSelect, NSwitch, NTable, NStat } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader.vue'
import Icon from '@/components/shared/Icon.vue'
import { COMPANY, BRANCHES, USERS, ROLES, ACCESS, TAX_GROUPS } from '@/data/org'
import { CURRENCIES } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { useCatalogStore } from '@/stores/catalog'
import { useOpsStore } from '@/stores/ops'
import { useSupportStore } from '@/stores/support'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const { t } = useI18n()
const catalog = useCatalogStore()
const ops = useOpsStore()
const support = useSupportStore()
const ui = useUiStore()
const fmt = useFmt()

const isDark = computed({
  get: () => ui.theme === 'dark',
  set: () => ui.toggleTheme(),
})
const isArabic = computed({
  get: () => ui.locale === 'ar',
  set: (v) => ui.setLocale(v ? 'ar' : 'en'),
})

const userRows = computed(() =>
  USERS.map((u) => ({
    id: u.id,
    name: fmt.name(u),
    role: fmt.name(ROLES[u.role]),
    roleKey: u.role,
    tone: u.tone,
    branch: fmt.name(BRANCHES.find((b) => b.id === u.branchId)),
    pin: u.pin,
    modules: Object.entries(ACCESS)
      .filter(([, roles]) => roles.includes(u.role))
      .map(([m]) => t(`nav.${m}`)),
  })),
)

const userColumns = computed(() => [
  { key: 'name', label: t('common.name') },
  { key: 'role', label: t('auth.role') },
  { key: 'branch', label: t('common.branch') },
  { key: 'pin', label: t('settings.pin'), align: 'center' },
  { key: 'modules', label: t('settings.modules') },
])

function resetLive() {
  ops.resetLive()
  ui.toast(t('settings.resetDone'), 'sky', t('settings.resetLiveHint'))
}
function resetSupport() {
  support.resetSupport()
  ui.toast(t('settings.resetDone'), 'sky', t('support.resetMineHint'))
}
function resetCatalog() {
  catalog.resetOverrides()
  ui.toast(t('settings.resetDone'), 'sky')
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('settings.title')" :subtitle="t('settings.subtitle')" emoji="⚙️" tone="ink" />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NStat :label="t('settings.branches')" :value="fmt.int(BRANCHES.length)" tone="tomato" />
      <NStat :label="t('settings.stations')" :value="fmt.int(catalog.stations.length)" tone="plum" />
      <NStat :label="t('settings.warehouses')" :value="fmt.int(ops.warehouses.length)" tone="basil" />
      <NStat :label="t('settings.users')" :value="fmt.int(USERS.length)" tone="sky" />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- الشركة -->
      <NCard :title="t('settings.company')" emoji="🏢" tone="ink">
        <dl class="flex flex-col gap-2 text-sm font-extrabold">
          <div class="flex justify-between gap-2"><dt class="opacity-60">{{ t('common.name') }}</dt><dd>{{ COMPANY.nameAr }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="opacity-60">السجل الضريبي</dt><dd class="tabular">{{ COMPANY.taxId }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="opacity-60">{{ t('settings.vatRate') }}</dt><dd class="tabular">{{ fmt.pct(COMPANY.vatPct, 0) }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="opacity-60">{{ t('settings.serviceRate') }}</dt><dd class="tabular">{{ fmt.pct(COMPANY.serviceChargePct, 0) }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="opacity-60">{{ t('settings.currency') }}</dt><dd>{{ ui.currency }}</dd></div>
        </dl>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <NBadge v-for="tx in TAX_GROUPS" :key="tx.id" tone="sky" size="sm">
            {{ fmt.name(tx) }}
          </NBadge>
        </div>
      </NCard>

      <!-- المظهر -->
      <NCard :title="t('settings.appearance')" emoji="🎨" tone="berry">
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-3">
            <span class="flex items-center gap-2 text-sm font-extrabold">
              <component :is="isDark ? Moon : Sun" class="size-4" :stroke-width="3" />
              {{ t('common.theme') }}
            </span>
            <NSwitch v-model="isDark" tone="berry" :label="isDark ? t('common.dark') : t('common.light')" />
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="flex items-center gap-2 text-sm font-extrabold">
              <Languages class="size-4" :stroke-width="3" />
              {{ t('common.language') }}
            </span>
            <NSwitch v-model="isArabic" tone="sky" :label="isArabic ? 'العربية' : 'English'" />
          </div>
          <NField :label="t('settings.currency')">
            <NSelect
              :model-value="ui.currency"
              :options="Object.values(CURRENCIES).map((c) => ({ value: c.code, label: `${c.code} — ${c.symbolAr}` }))"
              @update:model-value="(v) => (ui.currency = v)"
            />
          </NField>
        </div>
      </NCard>
    </div>

    <!-- الفروع -->
    <NCard :title="t('settings.branches')" emoji="🏬" tone="tomato" :padded="false">
      <ul class="grid gap-0 sm:grid-cols-3">
        <li v-for="b in BRANCHES" :key="b.id" class="border-b-[3px] border-e-[3px] border-ink/10 p-4">
          <div class="flex items-center gap-2">
            <span :class="cn('grid size-9 place-items-center brut-thin', TONES[b.tone].soft)">
              <Store class="size-4" :stroke-width="3" />
            </span>
            <div class="min-w-0">
              <p class="truncate font-extrabold">{{ fmt.name(b) }}</p>
              <p class="text-[10px] font-bold opacity-55">{{ b.code }} · {{ b.seats }} {{ t('settings.seats') }}</p>
            </div>
            <NBadge v-if="b.isDefault" tone="basil" size="sm" class="ms-auto">افتراضي</NBadge>
          </div>
        </li>
      </ul>
    </NCard>

    <!-- أقسام المطبخ -->
    <NCard :title="t('settings.stations')" emoji="👨‍🍳" tone="plum" :padded="false">
      <ul class="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="st in catalog.stations" :key="st.id" class="border-b-[3px] border-e-[3px] border-ink/10 p-4">
          <div class="flex items-center gap-2">
            <span :class="cn('grid size-9 place-items-center brut-thin', TONES[st.tone].soft)">
              <Icon :name="st.icon" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="truncate font-extrabold">{{ fmt.name(st) }}</p>
              <p class="text-[10px] font-bold opacity-55">
                {{ st.slaMin ? `${t('settings.slaMin')}: ${st.slaMin}` : t('recipes.prepItems') }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </NCard>

    <!-- المخازن -->
    <NCard :title="t('settings.warehouses')" emoji="📦" tone="basil" :padded="false">
      <ul class="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="w in ops.warehouses" :key="w.id" class="border-b-[3px] border-e-[3px] border-ink/10 p-4">
          <div class="flex items-center gap-2">
            <span class="grid size-9 place-items-center brut-thin bg-basil-soft">
              <Boxes class="size-4" :stroke-width="3" />
            </span>
            <div class="min-w-0">
              <p class="truncate font-extrabold">{{ fmt.name(w) }}</p>
              <p class="text-[10px] font-bold opacity-55">
                {{ fmt.name(BRANCHES.find((b) => b.id === w.branchId)) }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </NCard>

    <!-- المستخدمون -->
    <NCard :title="t('settings.users')" emoji="👥" tone="sky" :padded="false">
      <NTable :columns="userColumns" :rows="userRows" row-key="id" class="!border-0 !shadow-none">
        <template #cell-name="{ row }">
          <NBadge :tone="row.tone" size="sm" dot>{{ row.name }}</NBadge>
        </template>
        <template #cell-pin="{ row }">
          <span class="brut-thin bg-paper-2 px-1.5 py-0.5 text-xs tabular">{{ row.pin }}</span>
        </template>
        <template #cell-modules="{ row }">
          <span class="flex flex-wrap gap-1">
            <NBadge v-for="m in row.modules" :key="m" tone="ink" size="sm">{{ m }}</NBadge>
          </span>
        </template>
      </NTable>
    </NCard>

    <!-- البيانات -->
    <NCard :title="t('settings.data')" emoji="🧹" tone="saffron">
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3 brut-thin bg-paper-2 px-3 py-2.5">
          <div>
            <p class="text-sm font-extrabold">{{ t('settings.resetLive') }}</p>
            <p class="text-[11px] font-bold opacity-60">{{ t('settings.resetLiveHint') }}</p>
          </div>
          <NButton tone="tomato" variant="soft" size="sm" @click="resetLive">
            <Trash2 class="size-4" :stroke-width="3" />{{ t('common.reset') }}
          </NButton>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 brut-thin bg-paper-2 px-3 py-2.5">
          <div>
            <p class="text-sm font-extrabold">{{ t('settings.resetCatalog') }}</p>
            <p class="text-[11px] font-bold opacity-60">
              {{ Object.keys(catalog.ingredientOverrides).length }} مادة ·
              {{ Object.keys(catalog.recipeOverrides).length }} وصفة معدّلة
            </p>
          </div>
          <NButton tone="berry" variant="soft" size="sm" @click="resetCatalog">
            <RotateCcw class="size-4" :stroke-width="3" />{{ t('common.reset') }}
          </NButton>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 brut-thin bg-paper-2 px-3 py-2.5">
          <div>
            <p class="text-sm font-extrabold">{{ t('support.resetMine') }}</p>
            <p class="text-[11px] font-bold opacity-60">{{ t('support.resetMineHint') }}</p>
          </div>
          <NButton tone="plum" variant="soft" size="sm" @click="resetSupport">
            <RotateCcw class="size-4" :stroke-width="3" />{{ t('common.reset') }}
          </NButton>
        </div>
      </div>
    </NCard>
  </div>
</template>
