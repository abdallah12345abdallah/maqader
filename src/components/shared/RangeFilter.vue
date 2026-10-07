<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSegment, NSelect } from '@/components/ui'
import { DATE_PRESETS } from '@/lib/constants'
import { BRANCHES } from '@/data/org'
import { useReportsStore } from '@/stores/reports'
import { useFmt } from '@/composables/useFmt'

const props = defineProps({ branch: { type: Boolean, default: true } })
const { t } = useI18n()
const reports = useReportsStore()
const fmt = useFmt()

const presets = computed(() =>
  DATE_PRESETS.map((p) => ({ value: p.days, label: t(`common.${p.key}`) })),
)
const branchOptions = computed(() => [
  { value: '', label: t('common.allBranches') },
  ...BRANCHES.map((b) => ({ value: b.id, label: fmt.name(b) })),
])
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <NSegment
      :model-value="reports.days"
      :options="presets"
      tone="tomato"
      size="sm"
      :scroll="false"
      @update:model-value="reports.setRange"
    />
    <div v-if="props.branch" class="w-44">
      <NSelect
        :model-value="reports.branchId || ''"
        :options="branchOptions"
        size="sm"
        @update:model-value="(v) => reports.setBranch(v || null)"
      />
    </div>
  </div>
</template>
