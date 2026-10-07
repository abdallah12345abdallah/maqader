<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useUiStore } from '@/stores/ui'
import { CHART_COLORS } from '@/lib/constants'

/**
 * غلاف ApexCharts بهوية بروتاليست: بدون تدرّجات ولا ظلال،
 * خطوط سميكة، وخط Cairo، ويتقلب مع الوضع الداكن و RTL.
 */
const props = defineProps({
  type: { type: String, default: 'bar' },
  series: { type: Array, required: true },
  height: { type: [Number, String], default: 280 },
  categories: { type: Array, default: () => [] },
  colors: { type: Array, default: () => CHART_COLORS },
  stacked: Boolean,
  horizontal: Boolean,
  labels: { type: Array, default: () => [] },
  yFormatter: { type: Function, default: null },
  xFormatter: { type: Function, default: null },
  options: { type: Object, default: () => ({}) },
  sparkline: Boolean,
})

const ui = useUiStore()

const merged = computed(() => {
  const dark = ui.theme === 'dark'
  const ink = dark ? '#fffdf5' : '#14110f'

  const base = {
    chart: {
      type: props.type,
      height: props.height,
      stacked: props.stacked,
      fontFamily: 'Cairo Variable, Cairo, sans-serif',
      foreColor: ink,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 420, easing: 'easeout' },
      sparkline: { enabled: props.sparkline },
      parentHeightOffset: 0,
    },
    colors: props.colors,
    theme: { mode: dark ? 'dark' : 'light' },
    grid: {
      show: !props.sparkline,
      borderColor: dark ? 'rgba(255,253,245,.14)' : 'rgba(20,17,15,.14)',
      strokeDashArray: 4,
      padding: { top: 0, right: 6, bottom: 0, left: 6 },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'straight',
      width: props.type === 'line' || props.type === 'area' ? 4 : 0,
      lineCap: 'square',
      colors: props.type === 'bar' ? [ink] : undefined,
    },
    plotOptions: {
      bar: {
        horizontal: props.horizontal,
        borderRadius: 4,
        borderRadiusApplication: 'end',
        columnWidth: props.horizontal ? '68%' : '58%',
        barHeight: '68%',
      },
      pie: { donut: { size: '58%' }, expandOnClick: false },
      radar: { polygons: { strokeColors: ink } },
    },
    fill: { type: 'solid', opacity: props.type === 'area' ? 0.22 : 1 },
    legend: {
      show: !props.sparkline,
      position: 'bottom',
      fontWeight: 800,
      fontSize: '12px',
      markers: { strokeWidth: 2, strokeColor: ink, size: 7 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    labels: props.labels,
    xaxis: {
      categories: props.categories,
      labels: {
        style: { fontWeight: 700, fontSize: '11px' },
        formatter: props.xFormatter || undefined,
        rotate: 0,
        hideOverlappingLabels: true,
      },
      axisBorder: { show: true, color: ink, height: 3 },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { fontWeight: 700, fontSize: '11px' },
        formatter: props.yFormatter || undefined,
      },
    },
    tooltip: {
      theme: dark ? 'dark' : 'light',
      style: { fontFamily: 'Cairo Variable, sans-serif', fontSize: '12px' },
      y: { formatter: props.yFormatter || undefined },
    },
    states: { hover: { filter: { type: 'lighten', value: 0.08 } }, active: { filter: { type: 'none' } } },
    noData: { text: '—', style: { fontWeight: 800 } },
  }

  return deepMerge(base, props.options)
})

function deepMerge(a, b) {
  const out = { ...a }
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(a[k] || {}, v) : v
  }
  return out
}
</script>

<template>
  <VueApexCharts :type="type" :height="height" :series="series" :options="merged" />
</template>
