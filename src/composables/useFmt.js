import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import {
  fmtMoney, fmtMoneyShort, fmtNum, fmtQty, fmtPct, fmtPctRaw,
  fmtDate, fmtDayMonth, fmtTime, fmtDateTime, fmtDuration, fmtSpan, fmtClock,
} from '@/lib/format'
import { unitLabel } from '@/lib/units'

/** تنسيق مربوط بلغة الواجهة وعملة الشركة — يُستخدم في كل الشاشات */
export function useFmt() {
  const ui = useUiStore()
  const locale = computed(() => ui.locale)
  const currency = computed(() => ui.currency)

  return {
    locale,
    money: (n, decimals) => fmtMoney(n, currency.value, locale.value, decimals),
    money0: (n) => fmtMoney(n, currency.value, locale.value, 0),
    moneyShort: (n) => fmtMoneyShort(n, currency.value, locale.value),
    num: fmtNum,
    int: (n) => fmtNum(n, 0),
    qty: fmtQty,
    pct: fmtPct,
    pctRaw: fmtPctRaw,
    date: (d) => fmtDate(d, locale.value),
    dayMonth: (d) => fmtDayMonth(d, locale.value),
    time: (d) => fmtTime(d, locale.value),
    dateTime: (d) => fmtDateTime(d, locale.value),
    duration: (m) => fmtDuration(m, locale.value),
    span: (m) => fmtSpan(m, locale.value),
    clock: fmtClock,
    unit: (code) => unitLabel(code, locale.value),
    /** اسم أي كيان فيه nameAr/nameEn */
    name: (entity) => (!entity ? '—' : locale.value === 'ar' ? entity.nameAr : entity.nameEn || entity.nameAr),
  }
}
