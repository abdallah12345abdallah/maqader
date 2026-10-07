/**
 * وحدات القياس — كل وحدة ترجع لوحدة أساس داخل بُعدها:
 *   وزن → جرام (g) · حجم → مللي (ml) · عدد → وحدة (pc)
 * التحويل بين وحدات نفس البُعد فقط؛ أي خلط بين الأبعاد يرجّع خطأ واضح.
 */
export const DIMENSIONS = { WEIGHT: 'weight', VOLUME: 'volume', COUNT: 'count' }

export const UNITS = [
  { code: 'g', dim: 'weight', factor: 1, nameAr: 'جرام', nameEn: 'Gram', abbrAr: 'جم' },
  { code: 'kg', dim: 'weight', factor: 1000, nameAr: 'كيلوجرام', nameEn: 'Kilogram', abbrAr: 'كجم' },
  { code: 'ml', dim: 'volume', factor: 1, nameAr: 'مللي لتر', nameEn: 'Millilitre', abbrAr: 'مل' },
  { code: 'l', dim: 'volume', factor: 1000, nameAr: 'لتر', nameEn: 'Litre', abbrAr: 'لتر' },
  { code: 'pc', dim: 'count', factor: 1, nameAr: 'قطعة', nameEn: 'Piece', abbrAr: 'قطعة' },
  { code: 'dz', dim: 'count', factor: 12, nameAr: 'دستة', nameEn: 'Dozen', abbrAr: 'دستة' },
  { code: 'portion', dim: 'count', factor: 1, nameAr: 'حصة', nameEn: 'Portion', abbrAr: 'حصة' },
  { code: 'tray', dim: 'count', factor: 1, nameAr: 'صينية', nameEn: 'Tray', abbrAr: 'صينية' },
  { code: 'tbsp', dim: 'volume', factor: 15, nameAr: 'ملعقة كبيرة', nameEn: 'Tablespoon', abbrAr: 'م.ك' },
  { code: 'tsp', dim: 'volume', factor: 5, nameAr: 'ملعقة صغيرة', nameEn: 'Teaspoon', abbrAr: 'م.ص' },
]

const MAP = new Map(UNITS.map((u) => [u.code, u]))

export const getUnit = (code) => MAP.get(code)

export const unitLabel = (code, locale = 'ar') => {
  const u = MAP.get(code)
  if (!u) return code
  return locale === 'ar' ? u.abbrAr : u.nameEn
}

export const unitsOfDim = (dim) => UNITS.filter((u) => u.dim === dim)

export const baseUnitOf = (dim) => ({ weight: 'g', volume: 'ml', count: 'pc' })[dim] || 'pc'

/** كمية → كمية بوحدة الأساس لنفس البُعد */
export function toBase(qty, unitCode) {
  const u = MAP.get(unitCode)
  if (!u) throw new Error(`UNKNOWN_UNIT:${unitCode}`)
  return (Number(qty) || 0) * u.factor
}

/** كمية بالأساس → وحدة مطلوبة */
export function fromBase(baseQty, unitCode) {
  const u = MAP.get(unitCode)
  if (!u) throw new Error(`UNKNOWN_UNIT:${unitCode}`)
  return (Number(baseQty) || 0) / u.factor
}

/** تحويل مباشر بين وحدتين — لازم نفس البُعد */
export function convert(qty, fromUnit, toUnit) {
  const a = MAP.get(fromUnit)
  const b = MAP.get(toUnit)
  if (!a) throw new Error(`UNKNOWN_UNIT:${fromUnit}`)
  if (!b) throw new Error(`UNKNOWN_UNIT:${toUnit}`)
  if (a.dim !== b.dim) throw new Error(`DIM_MISMATCH:${fromUnit}->${toUnit}`)
  return (Number(qty) || 0) * (a.factor / b.factor)
}

/** هل التحويل ممكن بدون كثافة؟ */
export const sameDim = (a, b) => MAP.get(a)?.dim === MAP.get(b)?.dim
