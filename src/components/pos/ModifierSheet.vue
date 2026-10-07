<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import { NModal, NButton, NBadge, NField, NInput } from '@/components/ui'
import { cn } from '@/lib/utils'
import { modifierGroupsFor, defaultOptionsFor, unitPriceOf, unitCostOf, optionById } from '@/lib/pricing'
import { useCatalogStore } from '@/stores/catalog'
import { usePosStore } from '@/stores/pos'
import { useFmt } from '@/composables/useFmt'

/** اختيار الإضافات لطبق — يشتغل للإضافة الجديدة وللتعديل على سطر موجود */
const props = defineProps({
  open: Boolean,
  recipe: { type: Object, default: null },
  /** سطر موجود للتعديل */
  line: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const { t } = useI18n()
const catalog = useCatalogStore()
const pos = usePosStore()
const fmt = useFmt()

const selected = ref([])
const note = ref('')

watch(
  () => [props.open, props.recipe?.id, props.line?.id],
  () => {
    if (!props.open) return
    selected.value = props.line ? [...(props.line.options || [])] : defaultOptionsFor(props.recipe)
    note.value = props.line?.note || ''
  },
  { immediate: true },
)

const groups = computed(() => modifierGroupsFor(props.recipe))

const isOn = (id) => selected.value.includes(id)

function toggle(group, option) {
  const inGroup = group.options.map((o) => o.id)
  const currentInGroup = selected.value.filter((id) => inGroup.includes(id))

  if (group.max === 1) {
    selected.value = [...selected.value.filter((id) => !inGroup.includes(id)), option.id]
    return
  }
  if (isOn(option.id)) {
    if (group.required && currentInGroup.length <= (group.min || 0)) return
    selected.value = selected.value.filter((id) => id !== option.id)
    return
  }
  if (currentInGroup.length >= (group.max || 99)) return
  selected.value = [...selected.value, option.id]
}

const preview = computed(() => {
  if (!props.recipe) return null
  const price = unitPriceOf(props.recipe, selected.value, pos.priceFactor)
  const { cost, breakdown } = unitCostOf(catalog.engine, props.recipe, selected.value, pos.ticket.type)
  return { price, cost, breakdown, margin: price - cost, foodCostPct: price ? cost / price : 0 }
})

function confirm() {
  if (props.line) {
    pos.setOptions(props.line.id, [...selected.value])
    pos.setLineNote(props.line.id, note.value)
  } else {
    const line = pos.addItem(props.recipe.id, [...selected.value])
    if (line && note.value) pos.setLineNote(line.id, note.value)
  }
  emit('close')
}
</script>

<template>
  <NModal
    :open="open"
    :title="recipe ? fmt.name(recipe) : ''"
    :subtitle="t('pos.modifiers')"
    :emoji="recipe?.emoji"
    tone="berry"
    size="lg"
    @close="emit('close')"
  >
    <div v-if="recipe" class="flex flex-col gap-4">
      <div
        v-for="g in groups"
        :key="g.id"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <h4 class="text-sm">{{ fmt.name(g) }}</h4>
          <NBadge :tone="g.required ? 'tomato' : 'ink'" size="sm">
            {{ g.required ? t('common.required') : t('common.optional') }}
          </NBadge>
          <span v-if="g.max > 1" class="text-[11px] font-bold opacity-55">حتى {{ g.max }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="o in g.options"
            :key="o.id"
            type="button"
            :class="cn(
              'flex items-center justify-between gap-2 brut px-3 py-2.5 text-start brut-press-sm cursor-pointer',
              isOn(o.id) ? 'bg-berry text-paper' : 'bg-paper',
            )"
            @click="toggle(g, o)"
          >
            <span class="min-w-0 flex-1 truncate text-xs font-extrabold">{{ fmt.name(o) }}</span>
            <span v-if="o.priceDelta" class="shrink-0 text-xs font-extrabold tabular">+{{ fmt.money0(o.priceDelta) }}</span>
            <Check v-else-if="isOn(o.id)" class="size-4 shrink-0" :stroke-width="3" />
          </button>
        </div>
      </div>

      <NField :label="t('pos.lineNote')">
        <NInput v-model="note" :placeholder="t('pos.lineNotePlaceholder')" />
      </NField>

      <!-- أثر الاختيارات على السعر والتكلفة -->
      <div v-if="preview" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div class="brut-thin bg-paper-2 px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase opacity-60">{{ t('common.price') }}</p>
          <p class="font-display text-lg tabular">{{ fmt.money0(preview.price) }}</p>
        </div>
        <div class="brut-thin bg-paper-2 px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase opacity-60">{{ t('common.cost') }}</p>
          <p class="font-display text-lg tabular">{{ fmt.money(preview.cost) }}</p>
        </div>
        <div class="brut-thin bg-paper-2 px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase opacity-60">{{ t('recipes.foodCostPct') }}</p>
          <p class="font-display text-lg tabular">{{ fmt.pct(preview.foodCostPct) }}</p>
        </div>
        <div class="brut-thin bg-basil-soft px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase opacity-60">{{ t('common.profit') }}</p>
          <p class="font-display text-lg tabular">{{ fmt.money0(preview.margin) }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <span v-if="preview" class="text-xs font-extrabold opacity-70">
          {{ t('inventory.purchaseCost') }}: {{ fmt.money(preview.breakdown.recipe) }}
          <template v-if="preview.breakdown.extras">+ {{ fmt.money(preview.breakdown.extras) }}</template>
          <template v-if="preview.breakdown.packaging">+ {{ fmt.money(preview.breakdown.packaging) }} 📦</template>
        </span>
        <div class="flex gap-2">
          <NButton variant="outline" @click="emit('close')">{{ t('common.cancel') }}</NButton>
          <NButton tone="basil" @click="confirm">
            <Check class="size-4" :stroke-width="3" />
            {{ line ? t('common.save') : t('common.add') }}
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>
