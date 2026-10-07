<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Delete, LogIn } from 'lucide-vue-next'
import { NButton, NBadge } from '@/components/ui'
import { USERS, ROLES, COMPANY } from '@/data/org'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const fmt = useFmt()

const selected = ref(USERS[0].id)
const pin = ref('')
const error = ref('')

const user = computed(() => USERS.find((u) => u.id === selected.value))

function press(d) {
  error.value = ''
  if (pin.value.length >= 4) return
  pin.value += String(d)
  if (pin.value.length === 4) submit()
}

function submit() {
  const result = auth.loginWithPin(pin.value)
  if (!result.ok) {
    error.value = t('auth.wrongPin')
    pin.value = ''
    return
  }
  ui.toast(`${t('auth.welcome')} — ${fmt.name(result.user)}`, 'basil')
  router.push(route.query.next || '/')
}

function quickLogin(u) {
  selected.value = u.id
  pin.value = u.pin
  submit()
}
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-paper p-4 sm:p-8">
    <div class="grid w-full max-w-5xl gap-5 lg:grid-cols-[1.1fr_1fr]">
      <!-- الهوية -->
      <section class="flex flex-col justify-between gap-6 brut bg-saffron shadow-brut-lg p-6 sm:p-8">
        <div>
          <div class="grid size-16 place-items-center brut bg-paper shadow-brut text-3xl">🍳</div>
          <h1 class="mt-5 font-display text-5xl leading-none text-ink sm:text-6xl">
            {{ t('common.appName') }}
          </h1>
          <p class="mt-3 max-w-sm text-sm font-extrabold text-ink/80">{{ t('common.tagline') }}</p>
        </div>

        <ul class="flex flex-col gap-2 text-sm font-extrabold text-ink">
          <li class="flex items-center gap-2 brut-thin bg-paper/70 px-3 py-2">🧾 نقطة بيع كاملة بالوصفات والإضافات</li>
          <li class="flex items-center gap-2 brut-thin bg-paper/70 px-3 py-2">👨‍🍳 تجهيز داخل المطبخ لكل قسم</li>
          <li class="flex items-center gap-2 brut-thin bg-paper/70 px-3 py-2">📦 جرد وفروق استهلاك نظري/فعلي</li>
          <li class="flex items-center gap-2 brut-thin bg-paper/70 px-3 py-2">📈 قوائم دخل وربحية لكل طبق</li>
        </ul>

        <p class="text-xs font-bold text-ink/70">{{ COMPANY.nameAr }} · {{ COMPANY.taxId }}</p>
      </section>

      <!-- الدخول -->
      <section class="flex flex-col gap-4 brut bg-paper shadow-brut-lg p-5 sm:p-6">
        <div>
          <h2 class="font-display text-2xl">{{ t('auth.welcome') }}</h2>
          <p class="mt-1 text-xs font-bold opacity-65">{{ t('auth.subtitle') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="u in USERS"
            :key="u.id"
            type="button"
            :class="cn(
              'flex flex-col items-start gap-1 brut px-2.5 py-2 text-start brut-press-sm cursor-pointer',
              selected === u.id ? (TONES[u.tone] || TONES.ink).solid : 'bg-paper',
            )"
            @click="quickLogin(u)"
          >
            <span class="truncate text-xs font-extrabold">{{ fmt.name(u) }}</span>
            <span class="text-[10px] font-bold opacity-70">{{ fmt.name(ROLES[u.role]) }}</span>
            <span class="brut-thin bg-paper/80 px-1 text-[10px] text-ink tabular">PIN {{ u.pin }}</span>
          </button>
        </div>

        <!-- لوحة الأرقام -->
        <div class="flex items-center justify-between gap-3 brut-thin bg-paper-2 px-4 py-3">
          <span class="text-xs font-extrabold opacity-70">{{ t('auth.pin') }}</span>
          <div class="flex gap-2">
            <i
              v-for="n in 4"
              :key="n"
              :class="cn(
                'size-4 brut-thin not-italic',
                pin.length >= n ? 'bg-ink' : 'bg-paper',
              )"
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <NButton v-for="d in [1,2,3,4,5,6,7,8,9]" :key="d" variant="outline" size="lg" class="font-display text-xl" @click="press(d)">
            {{ d }}
          </NButton>
          <NButton variant="soft" tone="tomato" size="lg" @click="pin = ''">
            <Delete class="size-5" :stroke-width="3" />
          </NButton>
          <NButton variant="outline" size="lg" class="font-display text-xl" @click="press(0)">0</NButton>
          <NButton tone="basil" size="lg" :disabled="pin.length < 4" @click="submit">
            <LogIn class="size-5" :stroke-width="3" />
          </NButton>
        </div>

        <p v-if="error" class="brut-thin bg-tomato-soft px-3 py-2 text-center text-xs font-extrabold">{{ error }}</p>
        <div class="mt-auto flex items-center justify-between gap-2">
          <NBadge tone="sky" size="sm">{{ t('auth.demoHint') }}</NBadge>
          <span v-if="user" class="text-xs font-extrabold opacity-70">{{ fmt.name(user) }}</span>
        </div>
      </section>
    </div>
  </div>
</template>
