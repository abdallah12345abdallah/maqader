import { INGREDIENTS, ITEM_GROUPS } from './catalog'
import { RECIPES } from './recipes'
import { CATEGORIES, WASTE_REASONS, DISCOUNT_REASONS, PRICE_LISTS } from './menu'
import { BRANCHES, WAREHOUSES, USERS, SUPPLIERS, COMPANY, ORDER_TYPES, TABLES } from './org'
import { createCostEngine } from '@/lib/costing'
import { computeOrderTotals, explodeOrder, unitPriceOf, unitCostOf, defaultOptionsFor, orderNumber } from '@/lib/pricing'
import { buildSaleEntries, buildPurchaseEntry, buildWasteEntry, buildVarianceEntry, makeEntry } from '@/lib/gl'
import { round, sum, addDays, startOfDay, isoDate, uid, safeDiv } from '@/lib/utils'
import { toBase, fromBase } from '@/lib/units'

/**
 * مولّد بيانات تشغيلية حقيقية لآخر 30 يوم.
 *
 * عمدًا حتمي (نفس البذرة = نفس الأرقام) عشان الشاشات والتقارير تتطابق
 * بين كل تحميل، ومش محتاجين نحفظ ميجابايتات في localStorage.
 *
 * السلسلة: أوردرات → استهلاك مواد خام → مشتريات تغطّيه → رصيد مخزون
 *          → قيود يومية (بيع + تكلفة + مشتريات + هدر + مصروفات + فروق جرد)
 */

const DAYS = 30
const SEED = 20260407

/** مولّد أرقام شبه عشوائي حتمي */
function rng(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)]
const between = (rand, a, b) => a + rand() * (b - a)
const intBetween = (rand, a, b) => Math.floor(between(rand, a, b + 0.999))

function weightedPick(rand, items) {
  const total = sum(items, (x) => x.w)
  let r = rand() * total
  for (const it of items) {
    r -= it.w
    if (r <= 0) return it.v
  }
  return items[items.length - 1].v
}

/* ====================== أوزان الشعبية ====================== */

const POPULARITY = {
  'M-PIZZAMARG': 10, 'M-PIZZAPEPP': 9, 'M-BURGER': 9, 'M-SHAWARMA': 8, 'M-KOFTA': 7,
  'M-TAWOOK': 7, 'M-PIZZASUJUK': 5, 'M-PIZZAVEG': 4, 'M-DBLBURGER': 4, 'M-KOFTASAND': 5,
  'M-MIXGRILL': 3, 'M-HALFCHICK': 4, 'M-LAMBCHOP': 2, 'M-CALZONE': 3, 'M-CHEESEFAT': 4,
}
const STARTERS = {
  'M-FRIES': 10, 'M-HUMMUS': 6, 'M-MOZZSTICK': 5, 'M-SAMBOSAK': 4,
  'M-BABAGH': 3, 'M-TABOULEH': 3, 'M-CAESAR': 4, 'M-GREEKSAL': 3, 'M-KIBBEH': 3,
}
const DRINKS = {
  'M-SOFTDRINK': 10, 'M-WATER': 8, 'M-TEA': 6, 'M-MANGOJCE': 5,
  'M-LEMONMINT': 5, 'M-LATTE': 4, 'M-TURKCOF': 3,
}
const DESSERTS = { 'M-OMALI': 5, 'M-CHEESECAKE': 4, 'M-BROWNIE': 4, 'M-CREMECAR': 2 }

const toWeights = (map) => Object.entries(map).map(([v, w]) => ({ v, w }))

/** معامل حجم المبيعات لكل فرع */
const BRANCH_FACTOR = { 'BR-01': 1, 'BR-02': 0.55, 'BR-03': 0.8 }
const BASE_ORDERS_PER_DAY = 40

/** الخميس والجمعة والسبت أعلى (0=الأحد) */
const DOW_FACTOR = [0.85, 0.8, 0.82, 0.9, 1.15, 1.35, 1.25]

/** توزيع ساعات العمل 11ص — 1ص */
const HOUR_WEIGHTS = [
  { v: 11, w: 2 }, { v: 12, w: 5 }, { v: 13, w: 9 }, { v: 14, w: 10 }, { v: 15, w: 7 },
  { v: 16, w: 4 }, { v: 17, w: 4 }, { v: 18, w: 6 }, { v: 19, w: 10 }, { v: 20, w: 12 },
  { v: 21, w: 11 }, { v: 22, w: 8 }, { v: 23, w: 5 }, { v: 0, w: 2 },
]

/** المصروفات الشهرية لكل فرع — تُستحق يوميًا بالتناسب */
const MONTHLY_EXPENSES = {
  'BR-01': { 'A-6010': 292000, 'A-6020': 198000, 'A-6030': 76000, 'A-6040': 34000, 'A-6060': 21000, 'A-6080': 37000 },
  'BR-02': { 'A-6010': 179000, 'A-6020': 137000, 'A-6030': 47000, 'A-6040': 21000, 'A-6060': 15000, 'A-6080': 26000 },
  'BR-03': { 'A-6010': 231000, 'A-6020': 168000, 'A-6030': 58000, 'A-6040': 29000, 'A-6060': 19000, 'A-6080': 32000 },
}

const PAYMENT_MIX = {
  dine_in: [{ v: 'cash', w: 45 }, { v: 'card', w: 44 }, { v: 'wallet', w: 11 }],
  takeaway: [{ v: 'cash', w: 60 }, { v: 'card', w: 30 }, { v: 'wallet', w: 10 }],
  delivery: [{ v: 'aggregator', w: 62 }, { v: 'cash', w: 30 }, { v: 'wallet', w: 8 }],
}

/* ====================== المولّد ====================== */

export function buildSeed({ days = DAYS, seed = SEED } = {}) {
  const rand = rng(seed)
  const engine = createCostEngine({ ingredients: INGREDIENTS, recipes: RECIPES })
  const recipeMap = new Map(RECIPES.map((r) => [r.id, r]))
  const ingMap = new Map(INGREDIENTS.map((x) => [x.id, x]))
  const groupMap = new Map(ITEM_GROUPS.map((g) => [g.id, g]))
  const menuItems = RECIPES.filter((r) => r.type === 'menu')
  const priceListFor = (type) => PRICE_LISTS.find((p) => p.appliesTo.includes(type))?.factor ?? 1

  const today = startOfDay(new Date())
  const firstDay = addDays(today, -(days - 1))

  const orders = []
  const journal = []
  const movements = []
  const consumption = new Map() // ingredientId → base qty مستهلكة في الفترة
  let orderSeq = 0

  const addConsumption = (map) => {
    for (const [k, v] of map.entries()) consumption.set(k, (consumption.get(k) || 0) + v)
  }

  /* ---------- 1) الأوردرات ---------- */
  for (let d = 0; d < days; d++) {
    const day = addDays(firstDay, d)
    const dow = day.getDay()

    for (const branch of BRANCHES) {
      const count = Math.max(
        4,
        Math.round(BASE_ORDERS_PER_DAY * BRANCH_FACTOR[branch.id] * DOW_FACTOR[dow] * between(rand, 0.86, 1.14)),
      )

      for (let n = 0; n < count; n++) {
        const type = weightedPick(rand, [
          { v: 'dine_in', w: 46 },
          { v: 'takeaway', w: 29 },
          { v: 'delivery', w: 25 },
        ])
        const hour = weightedPick(rand, HOUR_WEIGHTS)
        const createdAt = new Date(day)
        createdAt.setHours(hour, intBetween(rand, 0, 59), intBetween(rand, 0, 59), 0)

        const guests = type === 'dine_in' ? intBetween(rand, 1, 6) : 1
        const mainCount = type === 'dine_in' ? Math.max(1, Math.round(guests * between(rand, 0.7, 1.1))) : intBetween(rand, 1, 3)

        const chosen = new Map()
        const addItem = (recipeId, qty = 1) => {
          if (!recipeId) return
          chosen.set(recipeId, (chosen.get(recipeId) || 0) + qty)
        }

        for (let k = 0; k < mainCount; k++) addItem(weightedPick(rand, toWeights(POPULARITY)))
        if (rand() < 0.55) addItem(weightedPick(rand, toWeights(STARTERS)))
        if (rand() < 0.25) addItem(weightedPick(rand, toWeights(STARTERS)))
        if (rand() < 0.7) addItem(weightedPick(rand, toWeights(DRINKS)), type === 'dine_in' ? Math.min(guests, 3) : 1)
        if (rand() < 0.22) addItem(weightedPick(rand, toWeights(DESSERTS)))

        const priceFactor = priceListFor(type)
        const lines = [...chosen.entries()].map(([recipeId, qty], idx) => {
          const recipe = recipeMap.get(recipeId)
          const options = defaultOptionsFor(recipe)
          // إضافات عشوائية على 18% من السطور
          if (rand() < 0.18) {
            const extras = { 'CAT-PIZZA': ['OPT-XCHEESE', 'OPT-XPEPP', 'OPT-XMUSH'], 'CAT-SAND': ['OPT-XPATTY', 'OPT-XROUMY'], 'CAT-GRILL': ['OPT-SD-FRIES', 'OPT-SD-SALAD'] }[recipe.categoryId]
            if (extras) options.push(pick(rand, extras))
          }
          if (recipe.categoryId === 'CAT-PIZZA' && rand() < 0.3) {
            const i = options.indexOf('OPT-SZ-M')
            if (i >= 0) options[i] = 'OPT-SZ-L'
          }
          return {
            id: `L${idx + 1}`,
            recipeId,
            qty,
            options,
            priceFactor,
            unitPrice: unitPriceOf(recipe, options, priceFactor),
            unitCost: unitCostOf(engine, recipe, options, type).cost,
            stationId: recipe.stationId,
            sentAt: createdAt.toISOString(),
          }
        })

        orderSeq += 1
        const discounted = rand() < 0.08
        const reason = discounted ? pick(rand, DISCOUNT_REASONS) : null
        const order = {
          id: uid('ORD'),
          number: orderNumber(branch.code, orderSeq, createdAt),
          branchId: branch.id,
          type,
          status: 'paid',
          tableId: type === 'dine_in' ? pick(rand, TABLES).id : null,
          guests,
          lines,
          discount: discounted ? { type: 'pct', value: round(between(rand, 0.05, 0.2), 2), reasonId: reason.id } : null,
          cashierId: pick(rand, USERS.filter((u) => ['cashier', 'manager'].includes(u.role))).id,
          createdAt: createdAt.toISOString(),
          payments: [],
        }

        const totals = computeOrderTotals(order, { engine, recipeMap, vatPct: COMPANY.vatPct, servicePct: COMPANY.serviceChargePct })

        // الدفع — أحيانًا مقسوم على طريقتين
        const method = weightedPick(rand, PAYMENT_MIX[type])
        if (rand() < 0.07 && totals.total > 200) {
          const first = round(totals.total * between(rand, 0.3, 0.6), 2)
          order.payments = [
            { method, amount: first },
            { method: method === 'cash' ? 'card' : 'cash', amount: round(totals.total - first, 2) },
          ]
        } else {
          order.payments = [{ method, amount: totals.total }]
        }

        const closedAt = new Date(createdAt.getTime() + intBetween(rand, 14, 75) * 60000)
        order.closedAt = closedAt.toISOString()
        order.readyAt = new Date(createdAt.getTime() + intBetween(rand, 8, 26) * 60000).toISOString()
        order.totals = {
          grossNet: totals.grossNet,
          discount: totals.discount,
          taxableTotal: totals.taxableTotal,
          service: totals.service,
          vat: totals.vat,
          deliveryFee: totals.deliveryFee,
          total: totals.total,
          cost: totals.cost,
          grossProfit: totals.grossProfit,
          qty: totals.qty,
        }

        // نشر الاستهلاك + تقسيم التكلفة على حسابات تكلفة المبيعات
        const exploded = explodeOrder(order, { engine, recipeMap })
        addConsumption(exploded)
        const costSplit = {}
        for (const [ingId, baseQty] of exploded.entries()) {
          const ing = ingMap.get(ingId)
          if (!ing) continue
          const acc = groupMap.get(ing.groupId)?.cogsAccountId || 'A-5010'
          costSplit[acc] = (costSplit[acc] || 0) + baseQty * engine.ingredientPurchaseCostPerBase(ingId)
        }

        orders.push(order)
        journal.push(...buildSaleEntries(order, totals, costSplit))
        movements.push({
          id: uid('MV'),
          type: 'consume',
          date: order.closedAt,
          warehouseId: branch.id === 'BR-01' ? 'WH-KIT' : 'WH-ZMLK',
          branchId: branch.id,
          refType: 'order',
          refId: order.id,
          refNumber: order.number,
          value: round(sum(Object.values(costSplit)), 2),
          lines: [...exploded.entries()].map(([ingId, baseQty]) => ({
            ingredientId: ingId,
            baseQty: round(baseQty, 4),
            costPerBase: engine.ingredientPurchaseCostPerBase(ingId),
          })),
        })
      }
    }
  }

  /* ---------- 1b) أوردرات مفتوحة في المطبخ الآن ---------- */
  // دي اللي تظهر على شاشة KDS وفي "أوردرات مفتوحة" على الكاشير —
  // لسه ما دُفعتش، فمش بتدخل الإيراد ولا الاستهلاك.
  const openOrders = []
  const kdsStatuses = ['queued', 'queued', 'firing', 'firing', 'ready']
  for (let n = 0; n < 7; n++) {
    const minutesAgo = intBetween(rand, 2, 34)
    const createdAt = new Date(Date.now() - minutesAgo * 60000)
    const type = weightedPick(rand, [{ v: 'dine_in', w: 60 }, { v: 'takeaway', w: 25 }, { v: 'delivery', w: 15 }])
    const guests = type === 'dine_in' ? intBetween(rand, 2, 6) : 1
    const chosen = new Map()
    const add = (id, q = 1) => chosen.set(id, (chosen.get(id) || 0) + q)
    for (let k = 0; k < intBetween(rand, 2, 4); k++) add(weightedPick(rand, toWeights(POPULARITY)))
    if (rand() < 0.7) add(weightedPick(rand, toWeights(STARTERS)))
    if (rand() < 0.8) add(weightedPick(rand, toWeights(DRINKS)), intBetween(rand, 1, 3))

    const priceFactor = priceListFor(type)
    const lines = [...chosen.entries()].map(([recipeId, qty], idx) => {
      const recipe = recipeMap.get(recipeId)
      const options = defaultOptionsFor(recipe)
      return {
        id: `L${idx + 1}`,
        recipeId,
        qty,
        options,
        priceFactor,
        unitPrice: unitPriceOf(recipe, options, priceFactor),
        unitCost: unitCostOf(engine, recipe, options, type).cost,
        stationId: recipe.stationId,
        sentAt: createdAt.toISOString(),
        kdsStatus: pick(rand, kdsStatuses),
        note: rand() < 0.2 ? pick(rand, ['بدون بصل', 'تسوية زيادة', 'حار شوية', 'الصوص على جانب']) : '',
      }
    })

    orderSeq += 1
    const order = {
      id: uid('ORD'),
      number: orderNumber('MAADI', orderSeq, createdAt),
      branchId: 'BR-01',
      type,
      status: lines.every((l) => l.kdsStatus === 'ready') ? 'ready' : 'sent',
      tableId: type === 'dine_in' ? pick(rand, TABLES).id : null,
      guests,
      lines,
      discount: null,
      cashierId: 'U-05',
      createdAt: createdAt.toISOString(),
      payments: [],
    }
    const t2 = computeOrderTotals(order, { engine, recipeMap, vatPct: COMPANY.vatPct, servicePct: COMPANY.serviceChargePct })
    order.totals = { grossNet: t2.grossNet, taxableTotal: t2.taxableTotal, service: t2.service, vat: t2.vat, total: t2.total, cost: t2.cost, qty: t2.qty, discount: 0, deliveryFee: t2.deliveryFee, grossProfit: t2.grossProfit }
    openOrders.push(order)
  }

  /* ---------- 2) الهدر ---------- */
  const wasteEvents = []
  const perishables = INGREDIENTS.filter((x) => x.shelfLifeDays <= 12 || x.storage === 'chiller')
  for (let d = 0; d < days; d++) {
    if (rand() > 0.45) continue
    const day = addDays(firstDay, d)
    const branch = pick(rand, BRANCHES)
    const linesCount = intBetween(rand, 1, 3)
    const lines = []
    for (let k = 0; k < linesCount; k++) {
      const ing = pick(rand, perishables)
      const baseQty = round(between(rand, 0.4, 3.2) * toBase(1, ing.recipeUnit === 'pc' ? 'pc' : ing.purchaseUnit) * (ing.recipeUnit === 'pc' ? 1 : 0.35), 2)
      lines.push({
        ingredientId: ing.id,
        baseQty,
        costPerBase: engine.ingredientPurchaseCostPerBase(ing.id),
        value: round(baseQty * engine.ingredientPurchaseCostPerBase(ing.id), 2),
      })
    }
    const reason = pick(rand, WASTE_REASONS)
    const date = new Date(day)
    date.setHours(intBetween(rand, 10, 23), 0, 0, 0)
    const value = round(sum(lines, (l) => l.value), 2)
    const w = {
      id: uid('WST'),
      number: `WS-${String(wasteEvents.length + 1).padStart(4, '0')}`,
      date: date.toISOString(),
      branchId: branch.id,
      warehouseId: branch.id === 'BR-01' ? 'WH-KIT' : 'WH-ZMLK',
      reasonId: reason.id,
      reasonAr: reason.nameAr,
      reasonEn: reason.nameEn,
      recordedBy: pick(rand, USERS.filter((u) => ['chef', 'storekeeper', 'manager'].includes(u.role))).id,
      lines,
      value,
    }
    wasteEvents.push(w)
    journal.push(buildWasteEntry(w))
    movements.push({
      id: uid('MV'),
      type: 'waste',
      date: w.date,
      warehouseId: w.warehouseId,
      branchId: w.branchId,
      refType: 'waste',
      refId: w.id,
      refNumber: w.number,
      value,
      lines,
    })
    for (const l of lines) consumption.set(l.ingredientId, (consumption.get(l.ingredientId) || 0) + l.baseQty)
  }

  /* ---------- 3) المشتريات اللي تغطّي الاستهلاك ---------- */
  // المعادلة: المشتريات = الاستهلاك + الرصيد المستهدف في آخر الفترة − الرصيد الافتتاحي.
  // كده الرصيد النهائي = المستهدف بالظبط، ومستحيل يطلع سالب.
  const purchases = []
  const purchased = new Map()
  const openingStock = new Map()
  const bySupplier = new Map()

  for (const ing of INGREDIENTS) {
    const par = ing.parBase || toBase(10, ing.purchaseUnit)
    const opening = round(par * between(rand, 0.4, 0.8), 2)
    // مستهدف نهاية الفترة يتنوّع عشان تطلع مواد تحت حد الطلب وغيرها مكفية
    const ending = round(par * between(rand, 0.22, 0.95), 2)
    openingStock.set(ing.id, opening)

    const used = consumption.get(ing.id) || 0
    const target = Math.max(0, round(used + ending - opening, 2))
    if (target <= 0) continue

    const list = bySupplier.get(ing.supplierId) || []
    list.push({ ing, target })
    bySupplier.set(ing.supplierId, list)
  }

  let invoiceSeq = 0
  for (const [supplierId, items] of bySupplier.entries()) {
    const deliveries = intBetween(rand, 5, 9) // عدد فواتير المورد خلال الفترة
    const dayStep = days / deliveries

    // تواريخ الفواتير
    const dates = Array.from({ length: deliveries }, (_, k) => {
      const dayIndex = Math.min(days - 1, Math.round(k * dayStep + between(rand, 0, dayStep * 0.6)))
      const date = new Date(addDays(firstDay, dayIndex))
      date.setHours(intBetween(rand, 7, 11), 0, 0, 0)
      return date
    })

    // توزيع كمية كل مادة على الفواتير بأوزان تُطبّع لتجمع المستهدف كاملًا
    const buckets = Array.from({ length: deliveries }, () => [])
    for (const { ing, target } of items) {
      const picks = []
      for (let k = 0; k < deliveries; k++) if (rand() < 0.8) picks.push(k)
      if (!picks.length) picks.push(intBetween(rand, 0, deliveries - 1))

      const weights = picks.map(() => between(rand, 0.7, 1.3))
      const weightSum = sum(weights)
      picks.forEach((k, idx) => {
        const baseQty = target * (weights[idx] / weightSum)
        const purchaseQty = round(fromBase(baseQty, ing.purchaseUnit), 3)
        if (purchaseQty <= 0) return
        // تقلّب أسعار الشراء ±6%
        const unitCost = round(ing.purchaseCost * between(rand, 0.94, 1.06), 2)
        buckets[k].push({
          ingredientId: ing.id,
          qty: purchaseQty,
          unit: ing.purchaseUnit,
          baseQty: toBase(purchaseQty, ing.purchaseUnit),
          unitCost,
          total: round(purchaseQty * unitCost, 2),
        })
      })
    }

    for (let k = 0; k < deliveries; k++) {
      const lines = buckets[k]
      if (!lines.length) continue

      invoiceSeq += 1
      const net = round(sum(lines, (l) => l.total), 2)
      const p = {
        id: uid('PO'),
        number: `PI-${String(invoiceSeq).padStart(4, '0')}`,
        date: dates[k].toISOString(),
        supplierId,
        branchId: 'BR-01',
        warehouseId: 'WH-MAIN',
        status: 'received',
        receivedBy: 'U-06',
        lines,
        net,
        vat: round(net * 0.14, 2),
        total: round(net * 1.14, 2),
      }
      purchases.push(p)
      journal.push(buildPurchaseEntry(p))
      movements.push({
        id: uid('MV'),
        type: 'purchase',
        date: p.date,
        warehouseId: p.warehouseId,
        branchId: p.branchId,
        refType: 'purchase',
        refId: p.id,
        refNumber: p.number,
        value: net,
        lines: lines.map((l) => ({ ingredientId: l.ingredientId, baseQty: l.baseQty, costPerBase: safeDiv(l.total, l.baseQty) })),
      })
      for (const l of lines) purchased.set(l.ingredientId, (purchased.get(l.ingredientId) || 0) + l.baseQty)
    }
  }

  /* ---------- 4) أرصدة المخزون ---------- */
  const stock = []
  for (const ing of INGREDIENTS) {
    const opening = openingStock.get(ing.id) || 0
    const inQty = purchased.get(ing.id) || 0
    const outQty = consumption.get(ing.id) || 0
    const current = Math.max(round(toBase(1, ing.purchaseUnit) * 0.5, 2), round(opening + inQty - outQty, 2))
    const avgCostPerBase = engine.ingredientPurchaseCostPerBase(ing.id) * between(rand, 0.97, 1.05)

    const splits = ing.groupId === 'G-BEV' ? [['WH-BAR', 0.6], ['WH-MAIN', 0.4]] : [['WH-MAIN', 0.58], ['WH-KIT', 0.42]]
    for (const [warehouseId, share] of splits) {
      stock.push({
        warehouseId,
        ingredientId: ing.id,
        qtyBase: round(current * share, 2),
        avgCostPerBase: round(avgCostPerBase, 6),
        lastCountAt: addDays(today, -intBetween(rand, 3, 25)).toISOString(),
        expiryAt:
          ing.shelfLifeDays <= 30
            ? addDays(today, intBetween(rand, -1, ing.shelfLifeDays)).toISOString()
            : addDays(today, intBetween(rand, 25, ing.shelfLifeDays)).toISOString(),
      })
    }
  }

  /* ---------- 5) استحقاق المصروفات اليومي ---------- */
  for (let d = 0; d < days; d++) {
    const day = addDays(firstDay, d)
    const date = new Date(day)
    date.setHours(23, 0, 0, 0)
    for (const branch of BRANCHES) {
      const monthly = MONTHLY_EXPENSES[branch.id]
      const lines = []
      let total = 0
      for (const [accountId, amount] of Object.entries(monthly)) {
        const daily = round((amount / 30) * between(rand, 0.9, 1.1), 2)
        lines.push({ accountId, debit: daily })
        total += daily
      }
      lines.push({ accountId: 'A-1010', credit: round(total, 2) })
      journal.push(
        makeEntry({
          date: date.toISOString(),
          memoAr: `استحقاق مصروفات يومية — ${branch.nameAr}`,
          memoEn: `Daily expense accrual — ${branch.nameEn}`,
          source: 'expense',
          refId: `EXP-${branch.id}-${isoDate(day)}`,
          branchId: branch.id,
          lines,
        }),
      )
    }
  }

  /* ---------- 6) جلسات الجرد ---------- */
  const counts = []
  for (const offset of [21, 7]) {
    const date = new Date(addDays(today, -offset))
    date.setHours(23, 30, 0, 0)
    const warehouseId = offset === 21 ? 'WH-MAIN' : 'WH-KIT'
    const rows = stock
      .filter((s) => s.warehouseId === warehouseId)
      .filter(() => rand() < 0.45)
      .map((s) => {
        const ing = ingMap.get(s.ingredientId)
        const systemBase = round(s.qtyBase * between(rand, 0.9, 1.1), 2)
        const drift = rand() < 0.65 ? between(rand, -0.06, 0.01) : between(rand, -0.015, 0.03)
        const countedBase = round(Math.max(0, systemBase * (1 + drift)), 2)
        const costPerBase = engine.ingredientPurchaseCostPerBase(s.ingredientId)
        return {
          ingredientId: s.ingredientId,
          systemBase,
          countedBase,
          varianceBase: round(countedBase - systemBase, 2),
          unit: ing?.recipeUnit || 'g',
          costPerBase,
          varianceValue: round((countedBase - systemBase) * costPerBase, 2),
        }
      })
    const varianceValue = round(sum(rows, (r) => r.varianceValue), 2)
    const c = {
      id: uid('CNT'),
      number: `CT-${String(counts.length + 1).padStart(3, '0')}`,
      date: date.toISOString(),
      warehouseId,
      branchId: 'BR-01',
      status: 'posted',
      countedBy: 'U-06',
      approvedBy: 'U-02',
      lines: rows,
      varianceValue,
      accuracyPct: safeDiv(
        sum(rows, (r) => Math.min(r.countedBase, r.systemBase)),
        sum(rows, (r) => r.systemBase),
      ),
    }
    counts.push(c)
    const entry = buildVarianceEntry(c)
    if (entry) journal.push(entry)
    movements.push({
      id: uid('MV'),
      type: 'count_adj',
      date: c.date,
      warehouseId,
      branchId: 'BR-01',
      refType: 'count',
      refId: c.id,
      refNumber: c.number,
      value: varianceValue,
      lines: rows.map((r) => ({ ingredientId: r.ingredientId, baseQty: r.varianceBase, costPerBase: r.costPerBase })),
    })
  }

  /* ---------- 7) ورديات الكاشير ---------- */
  const shifts = []
  for (let d = 0; d < days; d++) {
    const day = addDays(firstDay, d)
    for (const branch of BRANCHES) {
      const dayOrders = orders.filter(
        (o) => o.branchId === branch.id && isoDate(new Date(o.closedAt)) === isoDate(day),
      )
      if (!dayOrders.length) continue
      const cashExpected = round(
        sum(dayOrders, (o) => sum(o.payments.filter((p) => p.method === 'cash'), (p) => p.amount)),
        2,
      )
      const opening = 2000
      const diff = rand() < 0.6 ? round(between(rand, -45, 25), 2) : 0
      shifts.push({
        id: uid('SHF'),
        number: `SH-${branch.code}-${isoDate(day)}`,
        branchId: branch.id,
        date: isoDate(day),
        openedAt: new Date(new Date(day).setHours(10, 30, 0, 0)).toISOString(),
        closedAt: new Date(new Date(day).setHours(1, 15, 0, 0) + 86400000).toISOString(),
        cashierId: dayOrders[0].cashierId,
        openingFloat: opening,
        ordersCount: dayOrders.length,
        salesTotal: round(sum(dayOrders, (o) => o.totals.total), 2),
        cashExpected,
        cashCounted: round(cashExpected + diff, 2),
        difference: diff,
        status: 'closed',
      })
    }
  }

  /* ---------- 8) خطة الإنتاج (وصفات التجهيز) ---------- */
  // ملاحظة: الإنتاج هنا خطة تشغيل لقسم التجهيز — مش قيد محاسبي،
  // عشان ما نحسبش التكلفة مرتين (الاستهلاك مسجّل على مستوى المادة الخام).
  const prepRecipes = RECIPES.filter((r) => r.type === 'prep')
  const batches = []
  for (const r of prepRecipes) {
    const cost = engine.recipeCost(r.id)
    const neededPerDay = round(between(rand, 0.6, 2.4), 2)
    batches.push({
      id: uid('BT'),
      recipeId: r.id,
      date: new Date(new Date(today).setHours(7, 30, 0, 0)).toISOString(),
      branchId: 'BR-01',
      batches: neededPerDay,
      yieldQty: round(r.yieldQty * neededPerDay, 2),
      yieldUnit: r.yieldUnit,
      cost: round(cost.batchCost * neededPerDay, 2),
      status: rand() < 0.45 ? 'done' : rand() < 0.7 ? 'in_progress' : 'planned',
      assignedTo: pick(rand, USERS.filter((u) => u.role === 'chef')).id,
      stationId: r.stationId,
    })
  }

  journal.sort((a, b) => new Date(a.date) - new Date(b.date))
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  movements.sort((a, b) => new Date(b.date) - new Date(a.date))

  return {
    meta: { days, seed, from: firstDay.toISOString(), to: today.toISOString(), generatedAt: new Date().toISOString() },
    orders: [...openOrders, ...orders],
    journal,
    movements,
    purchases,
    stock,
    counts,
    waste: wasteEvents,
    shifts,
    batches,
    consumption: [...consumption.entries()].map(([ingredientId, baseQty]) => ({ ingredientId, baseQty: round(baseQty, 3) })),
  }
}

/** معلومات مساعدة للشاشات */
export const SEED_INFO = { days: DAYS, categories: CATEGORIES.length, ingredients: INGREDIENTS.length, recipes: RECIPES.length }
