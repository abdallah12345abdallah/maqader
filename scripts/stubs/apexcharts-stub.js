/** بديل ApexCharts أثناء الـ smoke test — المكتبة الحقيقية محتاجة متصفح */
import { h } from 'vue'

export default {
  name: 'ApexChartStub',
  props: ['type', 'series', 'options', 'height', 'width'],
  render() {
    return h('div', { class: 'apex-stub' }, String(this.type || ''))
  },
  install() {},
}
