import { round } from './utils'

export const CURRENCIES = {
  EGP: { code: 'EGP', symbolAr: 'ج.م', symbolEn: 'EGP', decimals: 2 },
  SAR: { code: 'SAR', symbolAr: 'ر.س', symbolEn: 'SAR', decimals: 2 },
  AED: { code: 'AED', symbolAr: 'د.إ', symbolEn: 'AED', decimals: 2 },
  USD: { code: 'USD', symbolAr: '$', symbolEn: '$', decimals: 2 },
}

/* الأرقام لاتينية دائمًا — أوضح في الجداول المالية */
const nf = (min, max) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })

export function fmtNum(n, decimals = 2) {
  return nf(decimals, decimals).format(Number(n) || 0)
}

export function fmtQty(n) {
  const v = round(n, 3)
  return Number.isInteger(v) ? nf(0, 0).format(v) : nf(0, 3).format(v)
}

export function fmtMoney(n, currency = 'EGP', locale = 'ar', decimals) {
  const c = CURRENCIES[currency] || CURRENCIES.EGP
  const d = decimals === undefined ? c.decimals : decimals
  const sym = locale === 'ar' ? c.symbolAr : c.symbolEn
  return `${nf(d, d).format(Number(n) || 0)} ${sym}`
}

export function fmtMoneyShort(n, currency = 'EGP', locale = 'ar') {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const c = CURRENCIES[currency] || CURRENCIES.EGP
  const sym = locale === 'ar' ? c.symbolAr : c.symbolEn
  if (abs >= 1000000) return `${nf(0, 1).format(v / 1000000)}M ${sym}`
  if (abs >= 1000) return `${nf(0, 1).format(v / 1000)}K ${sym}`
  return `${nf(0, 0).format(v)} ${sym}`
}

/** نسبة من كسر عشري: 0.325 → 32.5% */
export function fmtPct(n, decimals = 1) {
  return `${nf(decimals, decimals).format((Number(n) || 0) * 100)}%`
}

/** نسبة جاهزة: 32.5 → 32.5% */
export function fmtPctRaw(n, decimals = 1) {
  return `${nf(decimals, decimals).format(Number(n) || 0)}%`
}

const dateLocale = (locale) => (locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')

export function fmtDate(d, locale = 'ar') {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(dateLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fmtDayMonth(d, locale = 'ar') {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(dateLocale(locale), { day: '2-digit', month: 'short' })
}

export function fmtTime(d, locale = 'ar') {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString(dateLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDateTime(d, locale = 'ar') {
  return `${fmtDate(d, locale)} · ${fmtTime(d, locale)}`
}

/** مدة بالدقائق → "2س 15د" */
export function fmtDuration(minutes, locale = 'ar') {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (locale === 'ar') return h ? `${h}س ${r}د` : `${r}د`
  return h ? `${h}h ${r}m` : `${r}m`
}

/** مدة طويلة بالدقائق → "3ي 4س" / "2س 15د" — لعدّادات الـ SLA */
export function fmtSpan(minutes, locale = 'ar') {
  const total = Math.max(0, Math.round(Math.abs(Number(minutes) || 0)))
  const d = Math.floor(total / 1440)
  const h = Math.floor((total % 1440) / 60)
  const m = total % 60
  if (locale === 'ar') {
    if (d) return `${d}ي ${h}س`
    return h ? `${h}س ${m}د` : `${m}د`
  }
  if (d) return `${d}d ${h}h`
  return h ? `${h}h ${m}m` : `${m}m`
}

/** دقائق منقضية من الآن — لعدّادات المطبخ */
export function elapsedMinutes(since) {
  return (Date.now() - new Date(since).getTime()) / 60000
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
