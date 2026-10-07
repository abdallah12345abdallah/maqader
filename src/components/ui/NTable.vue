<script setup>
import { computed, ref } from 'vue'
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import NEmpty from './NEmpty.vue'

/**
 * جدول بروتاليست: رأس ثابت، صفوف بحدود سميكة، وترتيب بالنقر.
 * columns: [{ key, label, align, width, sortable, numeric }]
 */
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: 'id' },
  dense: Boolean,
  emptyText: { type: String, default: '' },
  maxHeight: { type: String, default: '' },
  stickyHeader: { type: Boolean, default: true },
})

const sortKey = ref(null)
const sortDir = ref('desc')

const keyOf = (row, i) =>
  typeof props.rowKey === 'function' ? props.rowKey(row) : (row[props.rowKey] ?? i)

const sorted = computed(() => {
  if (!sortKey.value) return props.rows
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const x = a[sortKey.value]
    const y = b[sortKey.value]
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
    return String(x ?? '').localeCompare(String(y ?? ''), 'ar') * dir
  })
})

function toggleSort(col) {
  if (!col.sortable) return
  if (sortKey.value === col.key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = col.key
    sortDir.value = 'desc'
  }
}

const alignOf = (col) =>
  col.align === 'end' || col.numeric ? 'text-end' : col.align === 'center' ? 'text-center' : 'text-start'
</script>

<template>
  <div class="brut shadow-brut overflow-hidden bg-paper">
    <div class="overflow-auto" :style="maxHeight ? { maxHeight } : undefined">
      <table class="w-full border-collapse text-sm">
        <thead :class="cn('bg-ink text-paper', stickyHeader && 'sticky top-0 z-10')">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="cn(
                'whitespace-nowrap px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide',
                alignOf(col),
                col.sortable && 'cursor-pointer select-none',
              )"
              :style="col.width ? { width: col.width } : undefined"
              @click="toggleSort(col)"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <template v-if="col.sortable">
                  <ChevronsUpDown v-if="sortKey !== col.key" class="size-3 opacity-50" :stroke-width="3" />
                  <ChevronUp v-else-if="sortDir === 'asc'" class="size-3" :stroke-width="3" />
                  <ChevronDown v-else class="size-3" :stroke-width="3" />
                </template>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in sorted"
            :key="keyOf(row, i)"
            :class="cn(
              'border-t-[3px] border-ink/15 transition-colors hover:bg-saffron-soft',
              i % 2 === 1 && 'bg-paper-2/60',
            )"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="cn(
                'px-3 font-bold',
                dense ? 'py-1.5' : 'py-2.5',
                alignOf(col),
                col.numeric && 'tabular',
              )"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="i">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="$slots.footer" class="border-t-[3px] bg-paper-2 font-display">
          <slot name="footer" :rows="sorted" />
        </tfoot>
      </table>
    </div>
    <NEmpty v-if="!rows.length" :text="emptyText" class="border-t-[3px]" />
  </div>
</template>
