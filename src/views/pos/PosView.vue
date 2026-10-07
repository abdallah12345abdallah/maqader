<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ArrowLeft, Receipt, FolderOpen, Plus, ShoppingCart } from 'lucide-vue-next'
import { NButton, NBadge, NModal, NEmpty, NInput, NField } from '@/components/ui'
import PosItemGrid from '@/components/pos/PosItemGrid.vue'
import PosTicket from '@/components/pos/PosTicket.vue'
import ModifierSheet from '@/components/pos/ModifierSheet.vue'
import PaymentSheet from '@/components/pos/PaymentSheet.vue'
import TableMapSheet from '@/components/pos/TableMapSheet.vue'
import DiscountSheet from '@/components/pos/DiscountSheet.vue'
import ReceiptSheet from '@/components/pos/ReceiptSheet.vue'
import { cn } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import { usePosStore } from '@/stores/pos'
import { useOpsStore } from '@/stores/ops'
import { useUiStore } from '@/stores/ui'
import { useCatalogStore } from '@/stores/catalog'
import { useFmt } from '@/composables/useFmt'

const router = useRouter()
const { t } = useI18n()
const pos = usePosStore()
const ops = useOpsStore()
const ui = useUiStore()
const catalog = useCatalogStore()
const fmt = useFmt()

const sheet = ref(null) // modifier | payment | table | discount | receipt | open | note | cart
const configRecipe = ref(null)
const configLine = ref(null)
const lastSale = ref(null)
const noteLine = ref(null)
const noteDraft = ref('')

const openTickets = computed(() => ops.openOrders)
const BackIcon = computed(() => (ui.isRtl ? ArrowLeft : ArrowRight))

function openConfigForRecipe(recipe) {
  configRecipe.value = recipe
  configLine.value = null
  sheet.value = 'modifier'
}
function openConfigForLine(line) {
  configRecipe.value = catalog.recipeMap.get(line.recipeId)
  configLine.value = line
  sheet.value = 'modifier'
}
function openNote(line) {
  noteLine.value = line
  noteDraft.value = line.note || ''
  sheet.value = 'note'
}
function saveNote() {
  pos.setLineNote(noteLine.value.id, noteDraft.value)
  sheet.value = null
}
function onPaid(result) {
  lastSale.value = result
  sheet.value = 'receipt'
}
function startNew() {
  pos.newTicket()
  lastSale.value = null
  sheet.value = null
}
function resumeTicket(order) {
  pos.loadOrder(order.id)
  sheet.value = null
  ui.toast(`${t('pos.ticket')} ${order.number}`, 'sky')
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-paper">
    <!-- شريط التشغيل -->
    <header class="flex shrink-0 items-center gap-2 border-b-[3px] border-ink bg-paper-2 px-3 py-2.5">
      <NButton variant="outline" size="sm" @click="router.push('/')">
        <component :is="BackIcon" class="size-4" :stroke-width="3" />
        <span class="hidden sm:inline">{{ t('nav.dashboard') }}</span>
      </NButton>

      <div class="flex items-center gap-2">
        <span class="grid size-9 place-items-center brut bg-saffron shadow-brut-sm text-lg">🧾</span>
        <div class="leading-tight">
          <p class="font-display text-base">{{ t('pos.title') }}</p>
          <p class="text-[10px] font-bold opacity-60">
            {{ pos.ticket.number || t('pos.newOrder') }}
          </p>
        </div>
      </div>

      <div class="ms-auto flex items-center gap-2">
        <NBadge v-if="pos.ticket.status !== 'draft'" :tone="ORDER_STATUS[pos.ticket.status]?.tone" size="sm">
          {{ fmt.name(ORDER_STATUS[pos.ticket.status]) }}
        </NBadge>

        <NButton variant="outline" size="sm" @click="sheet = 'open'">
          <FolderOpen class="size-4" :stroke-width="3" />
          <span class="hidden sm:inline">{{ t('pos.openTickets') }}</span>
          <span class="brut-thin bg-tomato px-1 text-[10px] text-paper tabular">{{ openTickets.length }}</span>
        </NButton>

        <NButton tone="ink" size="sm" @click="startNew">
          <Plus class="size-4" :stroke-width="3" />
          <span class="hidden sm:inline">{{ t('pos.newOrder') }}</span>
        </NButton>
      </div>
    </header>

    <!-- المنطقة الرئيسية -->
    <div class="flex min-h-0 flex-1">
      <div class="flex min-w-0 flex-1 flex-col p-3">
        <PosItemGrid @configure="openConfigForRecipe" />
      </div>

      <!-- التذكرة: ثابتة على الشاشات الكبيرة -->
      <aside class="hidden w-[380px] shrink-0 border-s-[3px] border-ink bg-paper-2 p-3 lg:block xl:w-[420px]">
        <PosTicket
          @configure-line="openConfigForLine"
          @discount="sheet = 'discount'"
          @pay="sheet = 'payment'"
          @table="sheet = 'table'"
          @note="openNote"
        />
      </aside>
    </div>

    <!-- شريط التذكرة على الموبايل -->
    <button
      type="button"
      class="flex shrink-0 items-center gap-3 border-t-[3px] border-ink bg-ink px-4 py-3 text-paper lg:hidden"
      @click="sheet = 'cart'"
    >
      <ShoppingCart class="size-5" :stroke-width="3" />
      <span class="text-sm font-extrabold">{{ pos.totals.qty }} {{ t('common.items') }}</span>
      <span class="ms-auto font-display text-xl tabular">{{ fmt.money(pos.totals.total) }}</span>
    </button>

    <!-- النوافذ -->
    <ModifierSheet
      :open="sheet === 'modifier'"
      :recipe="configRecipe"
      :line="configLine"
      @close="sheet = null"
    />
    <PaymentSheet :open="sheet === 'payment'" @close="sheet = null" @done="onPaid" />
    <TableMapSheet :open="sheet === 'table'" @close="sheet = null" />
    <DiscountSheet :open="sheet === 'discount'" @close="sheet = null" />
    <ReceiptSheet
      :open="sheet === 'receipt'"
      :order="lastSale?.order"
      :totals="lastSale?.totals"
      @close="sheet = null"
      @new="startNew"
    />

    <!-- التذكرة كنافذة على الموبايل -->
    <NModal :open="sheet === 'cart'" :title="t('pos.ticket')" emoji="🧾" tone="saffron" size="md" @close="sheet = null">
      <div class="h-[70vh]">
        <PosTicket
          @configure-line="openConfigForLine"
          @discount="sheet = 'discount'"
          @pay="sheet = 'payment'"
          @table="sheet = 'table'"
          @note="openNote"
        />
      </div>
    </NModal>

    <!-- الأوردرات المفتوحة -->
    <NModal :open="sheet === 'open'" :title="t('pos.openTickets')" emoji="📂" tone="sky" size="lg" @close="sheet = null">
      <NEmpty v-if="!openTickets.length" :text="t('common.empty')" emoji="📭" />
      <ul v-else class="grid gap-2 sm:grid-cols-2">
        <li v-for="o in openTickets" :key="o.id">
          <button
            type="button"
            :class="cn('flex w-full items-center gap-3 brut bg-paper p-3 text-start brut-press-sm cursor-pointer')"
            @click="resumeTicket(o)"
          >
            <Receipt class="size-5 shrink-0" :stroke-width="3" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-display text-sm tabular">{{ o.number }}</p>
              <p class="text-[11px] font-bold opacity-60">
                {{ o.lines.length }} {{ t('common.items') }} · {{ fmt.time(o.createdAt) }}
              </p>
            </div>
            <NBadge :tone="ORDER_STATUS[o.status]?.tone" size="sm">{{ fmt.name(ORDER_STATUS[o.status]) }}</NBadge>
          </button>
        </li>
      </ul>
    </NModal>

    <!-- ملاحظة سطر -->
    <NModal :open="sheet === 'note'" :title="t('pos.lineNote')" emoji="📝" tone="ink" size="sm" @close="sheet = null">
      <NField :label="t('common.note')">
        <NInput v-model="noteDraft" :placeholder="t('pos.lineNotePlaceholder')" @enter="saveNote" />
      </NField>
      <template #footer>
        <div class="flex gap-2">
          <NButton variant="outline" block @click="sheet = null">{{ t('common.cancel') }}</NButton>
          <NButton tone="basil" block @click="saveNote">{{ t('common.save') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
