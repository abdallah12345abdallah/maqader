<script setup>
import { ref, computed } from 'vue'
import { ChevronDown, ChevronRight, Package, Utensils, AlertTriangle } from 'lucide-vue-next'
import { cn, safeDiv } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog'
import { useFmt } from '@/composables/useFmt'

/** عقدة في شجرة الوصفة — تستدعي نفسها لأي عمق */
const props = defineProps({
  node: { type: Object, required: true },
  total: { type: Number, default: 0 },
  defaultOpen: { type: Boolean, default: true },
})

const catalog = useCatalogStore()
const fmt = useFmt()
const open = ref(props.defaultOpen)

const entity = computed(() =>
  props.node.type === 'ingredient'
    ? catalog.ingredientMap.get(props.node.refId)
    : catalog.recipeMap.get(props.node.refId),
)
const hasChildren = computed(() => props.node.children?.length > 0)
const share = computed(() => safeDiv(props.node.cost, props.total))
</script>

<template>
  <li>
    <div
      :class="cn(
        'flex items-center gap-2 border-b-[3px] border-ink/10 py-2',
        node.level > 0 && 'bg-paper-2/40',
      )"
      :style="{ paddingInlineStart: `${node.level * 1.25}rem` }"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="grid size-6 shrink-0 place-items-center brut-thin bg-paper cursor-pointer"
        @click="open = !open"
      >
        <component :is="open ? ChevronDown : ChevronRight" class="size-3" :stroke-width="3" />
      </button>
      <span v-else class="grid size-6 shrink-0 place-items-center opacity-40">
        <Package v-if="node.type === 'ingredient'" class="size-3.5" :stroke-width="3" />
        <Utensils v-else class="size-3.5" :stroke-width="3" />
      </span>

      <span class="min-w-0 flex-1 truncate text-sm font-extrabold">
        {{ fmt.name(entity) }}
        <i v-if="node.note" class="text-[11px] font-bold not-italic opacity-50">· {{ node.note }}</i>
      </span>

      <AlertTriangle v-if="node.error" class="size-4 shrink-0 text-tomato" :stroke-width="3" :title="node.error" />

      <span class="w-24 shrink-0 text-end text-xs font-bold tabular opacity-70">
        {{ fmt.qty(node.qty) }} {{ fmt.unit(node.unit) }}
      </span>
      <span class="w-20 shrink-0 text-end text-sm font-extrabold tabular">{{ fmt.money(node.cost) }}</span>
      <span class="hidden w-14 shrink-0 text-end text-[11px] font-bold tabular opacity-60 sm:block">
        {{ fmt.pct(share, 0) }}
      </span>
    </div>

    <ul v-if="hasChildren && open">
      <CostTreeNode
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :total="total"
        :default-open="false"
      />
    </ul>
  </li>
</template>
