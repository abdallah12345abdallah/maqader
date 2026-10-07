import { toBase, fromBase, getUnit } from './units'
import { round, safeDiv } from './utils'

/**
 * محرك التكلفة.
 *
 * يبني نفسه من (المواد الخام + الوصفات) ويحسب:
 *  - تكلفة وحدة الأساس لكل مادة بعد فقد التنظيف (trim)
 *  - تكلفة الوصفة بالتعشيش لأي عمق، مع فقد التشغيل (batch loss)
 *  - نشر أي وصفة إلى مواد خام (للمخزون والاستهلاك النظري)
 *  - اقتصاديات الطبق: نسبة تكلفة الطعام والهامش والسعر المقترح
 *
 * المحرك عديم الحالة من الخارج (pure factory): أي تعديل في البيانات = أعِد بناءه.
 */
export function createCostEngine({ ingredients = [], recipes = [] } = {}) {
  const ingMap = new Map(ingredients.map((x) => [x.id, x]))
  const recMap = new Map(recipes.map((x) => [x.id, x]))

  const recipeCache = new Map()
  const visiting = new Set()

  /** تكلفة وحدة الأساس كما تُشترى (جم / مل / قطعة) */
  function ingredientPurchaseCostPerBase(ingId) {
    const ing = ingMap.get(ingId)
    if (!ing) return 0
    const basePerPurchase = toBase(1, ing.purchaseUnit)
    return safeDiv(ing.purchaseCost, basePerPurchase)
  }

  /** التكلفة الفعلية للوحدة المستخدمة = تكلفة الشراء ÷ (1 − فقد التنظيف) */
  function ingredientCostPerBase(ingId) {
    const ing = ingMap.get(ingId)
    if (!ing) return 0
    const trim = Math.min(Math.max(ing.trimPct || 0, 0), 0.9)
    return safeDiv(ingredientPurchaseCostPerBase(ingId), 1 - trim)
  }

  /** تكلفة المادة بوحدة معيّنة (مثال: تكلفة الكيلو) */
  function ingredientCostPerUnit(ingId, unit) {
    const perBase = ingredientCostPerBase(ingId)
    return perBase * toBase(1, unit)
  }

  /** تكلفة سطر واحد (مادة خام أو وصفة فرعية) — يرجّع الخطأ بدل ما يرمي */
  function lineCost(line) {
    try {
      if (!line || !line.refId) return { cost: 0, error: 'EMPTY_LINE' }
      const qtyBase = toBase(line.qty, line.unit)

      if (line.type === 'ingredient') {
        const ing = ingMap.get(line.refId)
        if (!ing) return { cost: 0, error: 'MISSING_INGREDIENT' }
        if (getUnit(line.unit)?.dim !== ing.dim) return { cost: 0, error: 'UNIT_DIM_MISMATCH' }
        return { cost: qtyBase * ingredientCostPerBase(line.refId), error: null }
      }

      const sub = recipeCost(line.refId)
      if (sub.error) return { cost: 0, error: sub.error }
      const subDim = getUnit(sub.yieldUnit)?.dim
      if (getUnit(line.unit)?.dim !== subDim) return { cost: 0, error: 'UNIT_DIM_MISMATCH' }
      return { cost: qtyBase * sub.costPerBase, error: null }
    } catch (e) {
      return { cost: 0, error: String(e.message || e) }
    }
  }

  /**
   * تكلفة الوصفة.
   * costPerBase = تكلفة وحدة أساس واحدة من الناتج الصافي (بعد فقد التشغيل)
   * costPerYieldUnit = تكلفة وحدة الناتج (كجم/لتر/قطعة/حصة)
   * unitCost = تكلفة الدفعة كاملة كما هي معرّفة (= تكلفة الحصة لأطباق القائمة)
   */
  function recipeCost(recipeId) {
    if (recipeCache.has(recipeId)) return recipeCache.get(recipeId)

    const recipe = recMap.get(recipeId)
    if (!recipe) {
      const miss = { id: recipeId, batchCost: 0, costPerBase: 0, costPerYieldUnit: 0, unitCost: 0, yieldUnit: 'pc', lines: [], error: 'MISSING_RECIPE' }
      recipeCache.set(recipeId, miss)
      return miss
    }

    if (visiting.has(recipeId)) {
      return { id: recipeId, batchCost: 0, costPerBase: 0, costPerYieldUnit: 0, unitCost: 0, yieldUnit: recipe.yieldUnit, lines: [], error: 'CIRCULAR_REFERENCE' }
    }
    visiting.add(recipeId)

    const lines = (recipe.lines || []).map((line) => {
      const { cost, error } = lineCost(line)
      return { ...line, cost: round(cost, 4), error }
    })

    const batchCost = lines.reduce((a, l) => a + l.cost, 0)
    const loss = Math.min(Math.max(recipe.batchLossPct || 0, 0), 0.9)
    const yieldBase = toBase(recipe.yieldQty || 1, recipe.yieldUnit || 'pc')
    const netYieldBase = yieldBase * (1 - loss)
    const costPerBase = safeDiv(batchCost, netYieldBase)
    const costPerYieldUnit = costPerBase * toBase(1, recipe.yieldUnit || 'pc')

    const result = {
      id: recipeId,
      batchCost: round(batchCost, 4),
      costPerBase,
      costPerYieldUnit: round(costPerYieldUnit, 4),
      /** تكلفة الوصفة كما تُستهلك مرة واحدة — للأطباق دي تكلفة الحصة */
      unitCost: round(safeDiv(batchCost, 1 - loss) / (recipe.yieldQty || 1), 4),
      yieldUnit: recipe.yieldUnit || 'pc',
      yieldQty: recipe.yieldQty || 1,
      yieldBase,
      netYieldBase,
      lossPct: loss,
      lines: lines.map((l) => ({ ...l, sharePct: safeDiv(l.cost, batchCost) })),
      error: lines.find((l) => l.error)?.error || null,
      depth: maxDepth(recipeId),
    }

    visiting.delete(recipeId)
    recipeCache.set(recipeId, result)
    return result
  }

  /** عمق التعشيش — مفيد لعرض شجرة الوصفة والتحقق منها */
  function maxDepth(recipeId, seen = new Set()) {
    if (seen.has(recipeId)) return 0
    seen.add(recipeId)
    const recipe = recMap.get(recipeId)
    if (!recipe) return 0
    const subs = (recipe.lines || []).filter((l) => l.type === 'recipe')
    if (!subs.length) return 1
    return 1 + Math.max(...subs.map((l) => maxDepth(l.refId, new Set(seen))))
  }

  /**
   * شجرة الوصفة كاملة — لكل مستوى الاسم والكمية والتكلفة والنسبة من الإجمالي.
   * بتُستخدم في شاشة بطاقة التكلفة.
   */
  function costTree(recipeId, qty = null, unit = null, level = 0, seen = new Set()) {
    const recipe = recMap.get(recipeId)
    if (!recipe || seen.has(recipeId)) return []
    const nextSeen = new Set(seen).add(recipeId)
    const cost = recipeCost(recipeId)

    const scale =
      qty === null ? 1 : safeDiv(toBase(qty, unit || cost.yieldUnit), cost.netYieldBase)

    return (recipe.lines || []).map((line) => {
      const lc = lineCost(line)
      const node = {
        key: `${recipeId}:${line.type}:${line.refId}:${level}`,
        level,
        type: line.type,
        refId: line.refId,
        qty: round((line.qty || 0) * scale, 4),
        unit: line.unit,
        note: line.note,
        cost: round(lc.cost * scale, 4),
        error: lc.error,
        children: line.type === 'recipe' ? costTree(line.refId, (line.qty || 0) * scale, line.unit, level + 1, nextSeen) : [],
      }
      return node
    })
  }

  /**
   * نشر وصفة إلى مواد خام.
   * الكميات المرجّعة = الكمية الإجمالية الخارجة من المخزن (بما فيها فقد التنظيف).
   * @returns {Map<string, number>} معرّف المادة → كمية بوحدة الأساس
   */
  function explode(recipeId, qty = 1, unit = null, acc = new Map(), seen = new Set()) {
    const recipe = recMap.get(recipeId)
    if (!recipe || seen.has(recipeId)) return acc
    const nextSeen = new Set(seen).add(recipeId)

    const loss = Math.min(Math.max(recipe.batchLossPct || 0, 0), 0.9)
    const yieldBase = toBase(recipe.yieldQty || 1, recipe.yieldUnit || 'pc')
    const netYieldBase = yieldBase * (1 - loss)
    const wantedBase = toBase(qty, unit || recipe.yieldUnit || 'pc')
    const scale = safeDiv(wantedBase, netYieldBase)

    for (const line of recipe.lines || []) {
      let lineBase = 0
      try {
        lineBase = toBase(line.qty, line.unit) * scale
      } catch {
        continue
      }
      if (line.type === 'ingredient') {
        const ing = ingMap.get(line.refId)
        if (!ing) continue
        const trim = Math.min(Math.max(ing.trimPct || 0, 0), 0.9)
        const gross = safeDiv(lineBase, 1 - trim)
        acc.set(line.refId, (acc.get(line.refId) || 0) + gross)
      } else {
        explode(line.refId, lineBase, baseUnitFor(line.refId), acc, nextSeen)
      }
    }
    return acc
  }

  /**
   * نشر وصفة إلى وصفات التجهيز المطلوبة لها (بأي عمق).
   * دي الأساس لخطة التجهيز اليومية: كم دفعة من كل نصف مصنع نحتاج.
   * @returns {Map<string, number>} معرّف وصفة التجهيز → كمية بوحدة أساس ناتجها
   */
  function explodePreps(recipeId, qty = 1, unit = null, acc = new Map(), seen = new Set()) {
    const recipe = recMap.get(recipeId)
    if (!recipe || seen.has(recipeId)) return acc
    const nextSeen = new Set(seen).add(recipeId)

    const loss = Math.min(Math.max(recipe.batchLossPct || 0, 0), 0.9)
    const netYieldBase = toBase(recipe.yieldQty || 1, recipe.yieldUnit || 'pc') * (1 - loss)
    const scale = safeDiv(toBase(qty, unit || recipe.yieldUnit || 'pc'), netYieldBase)

    for (const line of recipe.lines || []) {
      if (line.type !== 'recipe') continue
      let lineBase = 0
      try {
        lineBase = toBase(line.qty, line.unit) * scale
      } catch {
        continue
      }
      acc.set(line.refId, (acc.get(line.refId) || 0) + lineBase)
      explodePreps(line.refId, lineBase, baseUnitFor(line.refId), acc, nextSeen)
    }
    return acc
  }

  function baseUnitFor(recipeId) {
    const dim = getUnit(recMap.get(recipeId)?.yieldUnit || 'pc')?.dim
    return { weight: 'g', volume: 'ml', count: 'pc' }[dim] || 'pc'
  }

  /** نشر مع تفاصيل جاهزة للعرض */
  function explodeDetailed(recipeId, qty = 1, unit = null) {
    const map = explode(recipeId, qty, unit)
    return [...map.entries()]
      .map(([ingId, baseQty]) => {
        const ing = ingMap.get(ingId)
        const unitOut = ing?.recipeUnit || 'g'
        return {
          ingredientId: ingId,
          ingredient: ing,
          baseQty: round(baseQty, 4),
          qty: round(fromBase(baseQty, unitOut), 4),
          unit: unitOut,
          cost: round(baseQty * ingredientPurchaseCostPerBase(ingId), 4),
        }
      })
      .sort((a, b) => b.cost - a.cost)
  }

  /**
   * اقتصاديات طبق القائمة.
   * السعر المعروض شامل الضريبة؛ نسبة تكلفة الطعام تُحسب على السعر الصافي.
   */
  function menuEconomics(recipe, { price, vatRate = 0, targetFoodCostPct } = {}) {
    const cost = recipeCost(recipe.id)
    const grossPrice = price ?? recipe.price ?? 0
    const netPrice = safeDiv(grossPrice, 1 + vatRate)
    const plateCost = cost.unitCost
    const foodCostPct = safeDiv(plateCost, netPrice)
    const margin = netPrice - plateCost
    const target = targetFoodCostPct || recipe.targetFoodCostPct || 0.3
    return {
      grossPrice: round(grossPrice, 2),
      netPrice: round(netPrice, 2),
      cost: round(plateCost, 2),
      foodCostPct,
      margin: round(margin, 2),
      marginPct: safeDiv(margin, netPrice),
      targetFoodCostPct: target,
      /** السعر اللي يحقق نسبة التكلفة المستهدفة (شامل الضريبة) */
      suggestedPrice: round(safeDiv(plateCost, target) * (1 + vatRate), 2),
      offTarget: foodCostPct - target,
      error: cost.error,
    }
  }

  return {
    ingredients: ingMap,
    recipes: recMap,
    ingredientPurchaseCostPerBase,
    ingredientCostPerBase,
    ingredientCostPerUnit,
    lineCost,
    recipeCost,
    costTree,
    explode,
    explodePreps,
    explodeDetailed,
    menuEconomics,
    maxDepth,
    /** مسح الكاش — بعد أي تعديل على البيانات */
    invalidate: () => recipeCache.clear(),
  }
}

/** تسمية المكوّن للعرض — تشتغل مع مادة خام أو وصفة */
export function lineRefName(line, { ingMap, recMap }, locale = 'ar') {
  const src = line.type === 'ingredient' ? ingMap.get(line.refId) : recMap.get(line.refId)
  if (!src) return line.refId
  return locale === 'ar' ? src.nameAr : src.nameEn
}
