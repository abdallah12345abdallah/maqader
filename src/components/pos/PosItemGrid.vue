<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, SlidersHorizontal, X } from 'lucide-vue-next'
import { NInput, NEmpty } from '@/components/ui'
import { cn } from '@/lib/utils'
import { TONES } from '@/lib/constants'
import { modifierGroupsFor } from '@/lib/pricing'
import { useCatalogStore } from '@/stores/catalog'
import { usePosStore } from '@/stores/pos'
import { useFmt } from '@/composables/useFmt'

const emit = defineEmits(['configure'])
const { t } = useI18n()
const catalog = useCatalogStore()
const pos = usePosStore()
const fmt = useFmt()

const categories = computed(() => [
  { id: null, nameAr: t('common.all'), nameEn: t('common.all'), emoji: '🍽️', tone: 'ink' },
  ...catalog.categories,
])

const countOf = (categoryId) =>
  categoryId ? catalog.menuRecipes.filter((r) => r.categoryId === categoryId).length : catalog.menuRecipes.length

/** الأطباق اللي لها خيارات لازم تتأكد قبل الإضافة */
const needsConfig = (recipe) => modifierGroupsFor(recipe).some((g) => g.required)

function onPick(recipe) {
  if (needsConfig(recipe)) emit('configure', recipe)
  else pos.addItem(recipe.id)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <!-- البحث -->
    <div class="relative">
      <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" :stroke-width="3" />
      <NInput
        :model-value="pos.search"
        :placeholder="t('pos.search')"
        class="!ps-10"
        @update:model-value="(v) => (pos.search = v)"
      />
      <button
        v-if="pos.search"
        type="button"
        class="absolute end-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center brut-thin bg-paper-2 cursor-pointer"
        @click="pos.search = ''"
      >
        <X class="size-3" :stroke-width="3" />
      </button>
    </div>

    <!-- التصنيفات -->
    <div class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        v-for="c in categories"
        :key="c.id || 'all'"
        type="button"
        :class="cn(
          'flex shrink-0 items-center gap-2 brut px-3.5 py-2.5 font-extrabold brut-press-sm cursor-pointer',
          pos.activeCategoryId === c.id ? (TONES[c.tone] || TONES.ink).solid : 'bg-paper',
        )"
        @click="pos.activeCategoryId = c.id"
      >
        <span class="text-lg leading-none">{{ c.emoji }}</span>
        <span class="text-sm">{{ fmt.name(c) }}</span>
        <span
          :class="cn(
            'min-w-5 brut-thin px-1 text-[10px] tabular',
            pos.activeCategoryId === c.id ? 'bg-paper text-ink' : 'bg-paper-2',
          )"
        >{{ countOf(c.id) }}</span>
      </button>
    </div>

    <!-- الأطباق -->
    <div class="min-h-0 flex-1 overflow-y-auto pb-2">
      <div
        v-if="pos.visibleItems.length"
        class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        <article
          v-for="r in pos.visibleItems"
          :key="r.id"
          :class="cn(
            'group relative flex flex-col gap-1.5 brut bg-paper p-3 text-start brut-press cursor-pointer',
          )"
          @click="onPick(r)"
        >
          <div class="flex items-start justify-between gap-2">
            <span
              :class="cn(
                'grid size-10 shrink-0 place-items-center brut-thin text-xl',
                (TONES[catalog.categoryMap.get(r.categoryId)?.tone] || TONES.ink).soft,
              )"
            >{{ r.emoji }}</span>
            <button
              type="button"
              class="grid size-7 place-items-center brut-thin bg-paper-2 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
              :title="t('pos.modifiers')"
              @click.stop="emit('configure', r)"
            >
              <SlidersHorizontal class="size-3.5" :stroke-width="3" />
            </button>
          </div>

          <h4 class="line-clamp-2 min-h-[2.4em] text-sm leading-tight">{{ fmt.name(r) }}</h4>

          <div class="mt-auto flex items-end justify-between gap-1">
            <span class="font-display text-lg leading-none tabular">{{ fmt.money0(r.price) }}</span>
            <span class="text-[10px] font-extrabold opacity-55 tabular">{{ fmt.duration(r.prepTimeMin) }}</span>
          </div>
        </article>
      </div>

      <NEmpty v-else :text="t('common.noResults')" :hint="t('pos.search')" emoji="🔍" />
    </div>
  </div>
</template>
