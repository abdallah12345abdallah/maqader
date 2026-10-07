import { MODIFIER_GROUPS, CATEGORY_MODIFIERS, RECIPE_MODIFIERS, PACKAGING_RULES } from '@/data/menu'
import { TAX_GROUPS, ORDER_TYPES } from '@/data/org'
import { toBase } from './units'
import { round, safeDiv, sum } from './utils'

/**
 * تسعير الأوردر.
 * أسعار القائمة **صافية** (قبل الضريبة): الضريبة ورسم الخدمة يُضافان فوقها،
 * عشان قائمة الدخل تقرأ الإيراد الصافي مباشرة.
 */

const MG = new Map(MODIFIER_GROUPS.map((g) => [g.id, g]))
const TAX = new Map(TAX_GROUPS.map((t) => [t.id, t]))
const OTYPE = new Map(ORDER_TYPES.map((t) => [t.id, t]))

export const taxRateOf = (taxGroupId) => TAX.get(taxGroupId)?.rate ?? 0

/** مجموعات الإضافات المتاحة لطبق: تخصيص الوصفة يسبق تصنيفها */
export function modifierGroupsFor(recipe) {
  if (!recipe) return []
  const ids = RECIPE_MODIFIERS[recipe.id] ?? CATEGORY_MODIFIERS[recipe.categoryId] ?? []
  return ids.map((id) => MG.get(id)).filter(Boolean)
}

export function defaultOptionsFor(recipe) {
  const out = []
  for (const g of modifierGroupsFor(recipe)) {
    const def = g.options.find((o) => o.isDefault)
    if (def) out.push(def.id)
    else if (g.required && g.min > 0) out.push(g.options[0].id)
  }
  return out
}

const ALL_OPTIONS = new Map(
  MODIFIER_GROUPS.flatMap((g) => g.options.map((o) => [o.id, { ...o, groupId: g.id }])),
)
export const optionById = (id) => ALL_OPTIONS.get(id)

/** مضاعف الكمية من الإضافات (مثال: بيتزا كبيرة ×1.55) */
export function qtyFactorOf(optionIds = []) {
  return optionIds.reduce((f, id) => f * (ALL_OPTIONS.get(id)?.qtyFactor ?? 1), 1)
}

/** سعر الوحدة الصافي = سعر الوصفة × معامل قائمة السعر + فروق الإضافات */
export function unitPriceOf(recipe, optionIds = [], priceFactor = 1) {
  const base = (recipe?.price || 0) * priceFactor
  const deltas = sum(optionIds, (id) => ALL_OPTIONS.get(id)?.priceDelta || 0)
  return round(base + deltas, 2)
}

/** سطور تكلفة إضافية من الإضافات */
export function extraCostLinesOf(optionIds = []) {
  return optionIds.flatMap((id) => ALL_OPTIONS.get(id)?.costLines || [])
}

/** سطور التغليف حسب نوع الأوردر والتصنيف */
export function packagingLinesOf(recipe, orderType) {
  if (orderType === 'dine_in') return []
  return PACKAGING_RULES[recipe?.categoryId] || PACKAGING_RULES.default
}

/** تكلفة وحدة واحدة من السطر: الوصفة × المضاعف + الإضافات + التغليف */
export function unitCostOf(engine, recipe, optionIds = [], orderType = 'dine_in') {
  if (!recipe) return { cost: 0, breakdown: { recipe: 0, extras: 0, packaging: 0 } }
  const factor = qtyFactorOf(optionIds)
  const recipeCost = engine.recipeCost(recipe.id).unitCost * factor
  const extras = sum(extraCostLinesOf(optionIds), (l) => engine.lineCost(l).cost)
  const packaging = sum(packagingLinesOf(recipe, orderType), (l) => engine.lineCost(l).cost)
  return {
    cost: round(recipeCost + extras + packaging, 4),
    breakdown: {
      recipe: round(recipeCost, 4),
      extras: round(extras, 4),
      packaging: round(packaging, 4),
    },
  }
}

/** نص مختصر للإضافات المختارة */
export function optionsLabel(optionIds = [], locale = 'ar') {
  return optionIds
    .map((id) => ALL_OPTIONS.get(id))
    .filter(Boolean)
    .filter((o) => o.priceDelta !== 0 || !o.isDefault)
    .map((o) => (locale === 'ar' ? o.nameAr : o.nameEn))
    .join(' · ')
}

/**
 * حساب إجماليات الأوردر.
 * الخصم يتوزّع على السطور بالتناسب حتى تكون الضريبة وتحليل الربحية صحيحين لكل سطر.
 */
export function computeOrderTotals(order, { engine, recipeMap, vatPct = 0.14, servicePct = 0.12 } = {}) {
  const type = OTYPE.get(order.type) || OTYPE.get('dine_in')
  const lines = order.lines || []

  const priced = lines.map((line) => {
    const recipe = recipeMap?.get(line.recipeId)
    const unitPrice = line.unitPrice ?? unitPriceOf(recipe, line.options, line.priceFactor ?? 1)
    const net = round(unitPrice * line.qty, 2)
    const unitCost = line.unitCost ?? (engine ? unitCostOf(engine, recipe, line.options, order.type).cost : 0)
    return {
      ...line,
      recipe,
      unitPrice,
      net,
      unitCost: round(unitCost, 4),
      cost: round(unitCost * line.qty, 4),
      taxRate: taxRateOf(recipe?.taxGroupId || 'TX-14'),
      isVoid: !!line.isVoid,
    }
  })

  const active = priced.filter((l) => !l.isVoid)
  const grossNet = round(sum(active, (l) => l.net), 2)

  // الخصم: نسبة أو مبلغ، بسقف قيمة الأوردر
  const discountValue = order.discount?.type === 'pct'
    ? round(grossNet * (order.discount.value || 0), 2)
    : Math.min(round(order.discount?.value || 0, 2), grossNet)

  const withAlloc = priced.map((l) => {
    if (l.isVoid) return { ...l, discount: 0, taxable: 0, vat: 0, margin: 0 }
    const share = safeDiv(l.net, grossNet)
    const discount = round(discountValue * share, 2)
    const taxable = round(l.net - discount, 2)
    return {
      ...l,
      discount,
      taxable,
      vat: round(taxable * l.taxRate, 2),
      margin: round(taxable - l.cost, 2),
    }
  })

  const taxableTotal = round(sum(withAlloc, (l) => l.taxable), 2)
  const serviceBase = type?.service ? taxableTotal : 0
  const service = round(serviceBase * servicePct, 2)
  const serviceVat = round(service * vatPct, 2)
  const linesVat = round(sum(withAlloc, (l) => l.vat), 2)
  const vat = round(linesVat + serviceVat, 2)
  const deliveryFee = order.type === 'delivery' ? round(order.deliveryFee ?? type?.deliveryFee ?? 0, 2) : 0
  const total = round(taxableTotal + service + vat + deliveryFee, 2)
  const cost = round(sum(withAlloc.filter((l) => !l.isVoid), (l) => l.cost), 2)

  const paid = round(sum(order.payments || [], (p) => p.amount), 2)

  return {
    lines: withAlloc,
    qty: sum(active, (l) => l.qty),
    grossNet,
    discount: discountValue,
    taxableTotal,
    service,
    serviceVat,
    linesVat,
    vat,
    deliveryFee,
    total,
    cost,
    grossProfit: round(taxableTotal - cost, 2),
    foodCostPct: safeDiv(cost, taxableTotal),
    marginPct: safeDiv(taxableTotal - cost, taxableTotal),
    paid,
    due: round(total - paid, 2),
  }
}

/**
 * نشر الأوردر لمواد خام — الأساس للاستهلاك النظري وخصم المخزون.
 * @returns {Map<string, number>} معرّف المادة → كمية بوحدة الأساس
 */
export function explodeOrder(order, { engine, recipeMap }) {
  const acc = new Map()
  const addLine = (line, mult) => {
    if (line.type === 'ingredient') {
      const ing = engine.ingredients.get(line.refId)
      if (!ing) return
      const trim = Math.min(Math.max(ing.trimPct || 0, 0), 0.9)
      let base = 0
      try {
        base = toBase(line.qty, line.unit)
      } catch {
        return
      }
      const gross = safeDiv(base * mult, 1 - trim)
      acc.set(line.refId, (acc.get(line.refId) || 0) + gross)
    } else {
      const sub = engine.explode(line.refId, (line.qty || 0) * mult, line.unit)
      for (const [k, v] of sub.entries()) acc.set(k, (acc.get(k) || 0) + v)
    }
  }

  for (const line of order.lines || []) {
    if (line.isVoid) continue
    const recipe = recipeMap?.get(line.recipeId)
    if (!recipe) continue
    const factor = qtyFactorOf(line.options) * (line.qty || 0)

    const base = engine.explode(recipe.id, factor, 'portion')
    for (const [k, v] of base.entries()) acc.set(k, (acc.get(k) || 0) + v)

    for (const extra of extraCostLinesOf(line.options)) addLine(extra, line.qty || 0)
    for (const pack of packagingLinesOf(recipe, order.type)) addLine(pack, line.qty || 0)
  }
  return acc
}

/** رقم أوردر بصيغة مقروءة: فرع-تاريخ-تسلسل */
export function orderNumber(branchCode, seq, date = new Date()) {
  const y = String(date.getFullYear()).slice(2)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${branchCode}-${y}${m}${d}-${String(seq).padStart(4, '0')}`
}
