<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import BrandMark from '@/components/shared/BrandMark.vue'
import Icon from '@/components/shared/Icon.vue'
import { NAV, TONES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useOpsStore } from '@/stores/ops'
import { useSupportStore } from '@/stores/support'

const emit = defineEmits(['navigate'])
const route = useRoute()
const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const ops = useOpsStore()
const support = useSupportStore()

const items = computed(() => NAV.filter((n) => auth.can(n.module)))
const collapsed = computed(() => ui.sidebarCollapsed)

const isActive = (item) =>
  item.route === '/' ? route.path === '/' : route.path.startsWith(item.route)

const openTicketsCount = computed(() => ops.openOrders.length)
const openSupportCount = computed(() => support.openTickets.length)

const badgeFor = (item) => {
  if (item.key === 'pos' || item.key === 'kds') return openTicketsCount.value || null
  if (item.key === 'support') return openSupportCount.value || null
  return null
}
</script>

<template>
  <aside
    :class="cn(
      'flex h-full flex-col border-e-[3px] border-ink bg-paper-2 transition-[width] duration-200',
      collapsed ? 'w-[76px]' : 'w-[248px]',
    )"
  >
    <!-- الهوية -->
    <div class="flex items-center gap-2.5 border-b-[3px] border-ink p-3">
      <RouterLink to="/" class="block shrink-0" @click="emit('navigate')">
        <BrandMark class="size-11" />
      </RouterLink>
      <div v-if="!collapsed" class="min-w-0 flex-1">
        <p class="font-display text-lg leading-none">{{ t('common.appName') }}</p>
        <p class="truncate text-[10px] font-bold opacity-60">{{ t('common.tagline') }}</p>
      </div>
    </div>

    <!-- القائمة -->
    <nav class="min-h-0 flex-1 overflow-y-auto p-2.5">
      <ul class="flex flex-col gap-1.5">
        <li v-for="item in items" :key="item.key">
          <RouterLink
            :to="item.route"
            :class="cn(
              'group flex items-center gap-2.5 brut px-2.5 py-2.5 font-extrabold brut-press-sm',
              isActive(item) ? (TONES[item.tone] || TONES.ink).solid : 'border-transparent bg-transparent shadow-brut-none hover:bg-paper',
              collapsed && 'justify-center px-0',
            )"
            :title="collapsed ? t(`nav.${item.key}`) : undefined"
            @click="emit('navigate')"
          >
            <Icon :name="item.icon" class="size-5 shrink-0" />
            <span v-if="!collapsed" class="flex-1 truncate text-sm">{{ t(`nav.${item.key}`) }}</span>
            <span
              v-if="badgeFor(item) && !collapsed"
              class="brut-thin bg-tomato px-1.5 text-[10px] text-paper tabular"
            >{{ badgeFor(item) }}</span>
          </RouterLink>

          <!-- الشاشات الفرعية -->
          <ul
            v-if="item.children && isActive(item) && !collapsed"
            class="mt-1 flex flex-col gap-0.5 border-s-[3px] border-ink/20 ps-2.5 ms-4"
          >
            <li v-for="child in item.children" :key="child.key">
              <RouterLink
                :to="child.route"
                :class="cn(
                  'block brut-thin px-2.5 py-1.5 text-xs font-extrabold transition-colors',
                  route.path === child.route
                    ? 'bg-ink text-paper'
                    : 'border-transparent opacity-70 hover:bg-paper hover:opacity-100',
                )"
                @click="emit('navigate')"
              >{{ t(`nav.${child.key}`) }}</RouterLink>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- طيّ القائمة -->
    <div class="border-t-[3px] border-ink p-2.5">
      <button
        type="button"
        :class="cn(
          'flex w-full items-center gap-2 brut bg-paper px-3 py-2 text-xs font-extrabold brut-press-sm cursor-pointer',
          collapsed && 'justify-center px-0',
        )"
        @click="ui.toggleSidebar()"
      >
        <component :is="collapsed ? PanelLeftOpen : PanelLeftClose" class="size-4 shrink-0" :stroke-width="3" />
        <span v-if="!collapsed">{{ t('common.openMenu') }}</span>
      </button>
    </div>
  </aside>
</template>
