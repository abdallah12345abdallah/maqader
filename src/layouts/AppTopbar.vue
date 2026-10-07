<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Menu, Moon, Sun, Languages, LogOut, Store, ScanLine, ChefHat } from 'lucide-vue-next'
import { NButton, NSelect } from '@/components/ui'
import { BRANCHES, ROLES } from '@/data/org'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const emit = defineEmits(['toggle-drawer'])
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const fmt = useFmt()

const branchOptions = computed(() => BRANCHES.map((b) => ({ value: b.id, label: fmt.name(b) })))
const userTone = computed(() => (TONES[auth.user?.tone] || TONES.ink).soft)
const pageTitle = computed(() => (route.meta?.titleKey ? t(route.meta.titleKey) : t('common.appName')))

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center gap-2 border-b-[3px] border-ink bg-paper/95 px-3 py-2.5 backdrop-blur sm:px-4">
    <button
      type="button"
      class="grid size-11 shrink-0 place-items-center brut bg-paper brut-press-sm cursor-pointer lg:hidden"
      @click="emit('toggle-drawer')"
    >
      <Menu class="size-5" :stroke-width="3" />
    </button>

    <h2 class="me-auto truncate font-display text-lg sm:text-xl">{{ pageTitle }}</h2>

    <!-- دخول سريع للشاشات التشغيلية -->
    <NButton v-if="auth.can('pos')" tone="saffron" size="sm" class="hidden sm:inline-flex" @click="router.push('/pos')">
      <ScanLine class="size-4" :stroke-width="3" />
      {{ t('nav.pos') }}
    </NButton>
    <NButton v-if="auth.can('kds')" tone="plum" size="sm" class="hidden sm:inline-flex" @click="router.push('/kds')">
      <ChefHat class="size-4" :stroke-width="3" />
      {{ t('nav.kds') }}
    </NButton>

    <div class="hidden w-40 md:block">
      <NSelect :model-value="auth.branchId" :options="branchOptions" size="sm" @update:model-value="auth.setBranch" />
    </div>

    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center brut bg-paper brut-press-sm cursor-pointer"
      :title="t('common.theme')"
      @click="ui.toggleTheme()"
    >
      <component :is="ui.theme === 'dark' ? Sun : Moon" class="size-4" :stroke-width="3" />
    </button>

    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center brut bg-paper brut-press-sm cursor-pointer"
      :title="t('common.language')"
      @click="ui.setLocale(ui.locale === 'ar' ? 'en' : 'ar')"
    >
      <Languages class="size-4" :stroke-width="3" />
    </button>

    <div v-if="auth.user" :class="cn('hidden items-center gap-2 brut px-2.5 py-1.5 shadow-brut-sm sm:flex', userTone)">
      <Store class="size-4 shrink-0" :stroke-width="3" />
      <div class="leading-tight">
        <p class="text-xs font-extrabold">{{ fmt.name(auth.user) }}</p>
        <p class="text-[10px] font-bold opacity-70">{{ fmt.name(ROLES[auth.role]) }}</p>
      </div>
    </div>

    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center brut bg-paper brut-press-sm cursor-pointer"
      :title="t('auth.logout')"
      @click="logout"
    >
      <LogOut class="size-4" :stroke-width="3" />
    </button>
  </header>
</template>
