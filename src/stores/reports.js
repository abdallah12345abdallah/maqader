import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { incomeStatement, trialBalance } from '@/lib/gl'
import { MENU_CLASSES } from '@/lib/constants'
import { PAYMENT_METHODS, ORDER_TYPES, BRANCHES } from '@/data/org'
import { round, sum, safeDiv, addDays, startOfDay, endOfDay, isoDate, inRange, groupBy } from '@/lib/utils'
import { useOpsStore } from './ops'
import { useCatalogStore } from './catalog'

/**
 * كل الأرقام التحليلية تُحسب من الأوردرات والقيود — لا أرقام مخزّنة.
 * المدى الزمني والفرع هما الفلتر العام لكل التقارير.
 */
export const useReportsStore = defineStore('reports', () => {
  const days = ref(29)
  const branchId = ref(null) // null = كل الفروع

  const to = computed(() => endOfDay(new Date()))
  const from = computed(() => startOfDay(addDays(new Date(), -days.value)))

  const setRange = (d) => (days.value = d)
  const setBranch = (id) => (branchId.value = id)

  const ops = () => useOpsStore()
  const catalog = () => useCatalogStore()

  /** أوردرات الفترة المدفوعة فقط */
  const paidOrders = computed(() =>
    ops().orders.filter(
      (o) =>
        o.status === 'paid' &&
        o.closedAt &&
        inRange(o.closedAt, from.value, to.value) &&
        (!branchId.value || o.branchId === branchId.value),
    ),
  )

  const summary = computed(() => {
    const list = paidOrders.value
    const net = round(sum(list, (o) => o.totals?.taxableTotal || 0), 2)
    const cost = round(sum(list, (o) => o.totals?.cost || 0), 2)
    const discount = round(sum(list, (o) => o.totals?.discount || 0), 2)
    const vat = round(sum(list, (o) => o.totals?.vat || 0), 2)
    const service = round(sum(list, (o) => o.totals?.service || 0), 2)
    const gross = round(sum(list, (o) => o.totals?.total || 0), 2)
    const covers = sum(list, (o) => (o.type === 'dine_in' ? o.guests || 1 : 1))
    return {
      orders: list.length,
      net,
      cost,
      grossProfit: round(net - cost, 2),
      foodCostPct: safeDiv(cost, net),
      marginPct: safeDiv(net - cost, net),
      discount,
      discountPct: safeDiv(discount, net + discount),
      vat,
      service,
      gross,
      covers,
      avgTicket: round(safeDiv(net, list.length), 2),
      avgPerCover: round(safeDiv(net, covers), 2),
      items: sum(list, (o) => o.totals?.qty || 0),
    }
  })

  /** مقارنة بالفترة السابقة بنفس الطول */
  const previousSummary = computed(() => {
    const prevTo = endOfDay(addDays(from.value, -1))
    const prevFrom = startOfDay(addDays(prevTo, -days.value))
    const list = ops().orders.filter(
      (o) =>
        o.status === 'paid' &&
        o.closedAt &&
        inRange(o.closedAt, prevFrom, prevTo) &&
        (!branchId.value || o.branchId === branchId.value),
    )
    const net = round(sum(list, (o) => o.totals?.taxableTotal || 0), 2)
    const cost = round(sum(list, (o) => o.totals?.cost || 0), 2)
    return {
      orders: list.length,
      net,
      cost,
      foodCostPct: safeDiv(cost, net),
      avgTicket: round(safeDiv(net, list.length), 2),
    }
  })

  const delta = computed(() => {
    const now = summary.value
    const prev = previousSummary.value
    const pct = (a, b) => (b ? (a - b) / b : null)
    return {
      net: pct(now.net, prev.net),
      orders: pct(now.orders, prev.orders),
      avgTicket: pct(now.avgTicket, prev.avgTicket),
      foodCostPct: now.foodCostPct - prev.foodCostPct,
    }
  })

  const salesByDay = computed(() => {
    const buckets = new Map()
    for (let d = days.value; d >= 0; d--) {
      const key = isoDate(addDays(new Date(), -d))
      buckets.set(key, { date: key, net: 0, cost: 0, orders: 0 })
    }
    for (const o of paidOrders.value) {
      const key = isoDate(new Date(o.closedAt))
      const b = buckets.get(key)
      if (!b) continue
      b.net += o.totals?.taxableTotal || 0
      b.cost += o.totals?.cost || 0
      b.orders += 1
    }
    return [...buckets.values()].map((b) => ({
      ...b,
      net: round(b.net, 2),
      cost: round(b.cost, 2),
      profit: round(b.net - b.cost, 2),
      foodCostPct: safeDiv(b.cost, b.net),
    }))
  })

  const salesByHour = computed(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, net: 0, orders: 0 }))
    for (const o of paidOrders.value) {
      const h = new Date(o.closedAt).getHours()
      hours[h].net += o.totals?.taxableTotal || 0
      hours[h].orders += 1
    }
    return hours.filter((h) => h.orders > 0).map((h) => ({ ...h, net: round(h.net, 2) }))
  })

  /** أداء كل طبق — الأساس لهندسة القائمة */
  const itemPerformance = computed(() => {
    const cat = catalog()
    const map = new Map()
    for (const o of paidOrders.value) {
      for (const line of o.lines || []) {
        if (line.isVoid) continue
        const cur = map.get(line.recipeId) || { recipeId: line.recipeId, qty: 0, net: 0, cost: 0, orders: 0 }
        const share = safeDiv(line.unitPrice * line.qty, o.totals?.grossNet || 1)
        const lineNet = (o.totals?.taxableTotal || 0) * share
        cur.qty += line.qty
        cur.net += lineNet
        cur.cost += (line.unitCost || 0) * line.qty
        cur.orders += 1
        map.set(line.recipeId, cur)
      }
    }
    const rows = [...map.values()].map((r) => {
      const recipe = cat.recipeMap.get(r.recipeId)
      return {
        ...r,
        recipe,
        category: cat.categoryMap.get(recipe?.categoryId),
        net: round(r.net, 2),
        cost: round(r.cost, 2),
        margin: round(r.net - r.cost, 2),
        unitMargin: round(safeDiv(r.net - r.cost, r.qty), 2),
        marginPct: safeDiv(r.net - r.cost, r.net),
        foodCostPct: safeDiv(r.cost, r.net),
      }
    })

    // تصنيف هندسة القائمة: مقارنة بمتوسط الكمية ومتوسط هامش الوحدة
    const avgQty = safeDiv(sum(rows, (r) => r.qty), rows.length)
    const avgMargin = safeDiv(sum(rows, (r) => r.unitMargin), rows.length)
    return rows
      .map((r) => {
        const popular = r.qty >= avgQty * 0.9
        const profitable = r.unitMargin >= avgMargin
        const key = popular && profitable ? 'star' : popular ? 'plowhorse' : profitable ? 'puzzle' : 'dog'
        return { ...r, menuClass: key, menuClassMeta: MENU_CLASSES[key] }
      })
      .sort((a, b) => b.net - a.net)
  })

  const benchmarks = computed(() => {
    const rows = itemPerformance.value
    return {
      avgQty: safeDiv(sum(rows, (r) => r.qty), rows.length),
      avgUnitMargin: safeDiv(sum(rows, (r) => r.unitMargin), rows.length),
    }
  })

  const salesByCategory = computed(() => {
    const cat = catalog()
    const grouped = groupBy(itemPerformance.value, (r) => r.recipe?.categoryId || 'other')
    return Object.entries(grouped)
      .map(([categoryId, rows]) => {
        const net = round(sum(rows, (r) => r.net), 2)
        const cost = round(sum(rows, (r) => r.cost), 2)
        const category = cat.categoryMap.get(categoryId)
        return {
          categoryId,
          category,
          qty: sum(rows, (r) => r.qty),
          net,
          cost,
          margin: round(net - cost, 2),
          foodCostPct: safeDiv(cost, net),
          targetFoodCostPct: category?.targetFoodCostPct || 0.3,
          share: 0,
        }
      })
      .map((r, _, arr) => ({ ...r, share: safeDiv(r.net, sum(arr, (x) => x.net)) }))
      .sort((a, b) => b.net - a.net)
  })

  const salesByType = computed(() =>
    ORDER_TYPES.map((t) => {
      const list = paidOrders.value.filter((o) => o.type === t.id)
      const net = round(sum(list, (o) => o.totals?.taxableTotal || 0), 2)
      const cost = round(sum(list, (o) => o.totals?.cost || 0), 2)
      return {
        type: t,
        orders: list.length,
        net,
        cost,
        margin: round(net - cost, 2),
        avgTicket: round(safeDiv(net, list.length), 2),
        share: safeDiv(net, summary.value.net),
      }
    }).filter((r) => r.orders > 0),
  )

  const salesByBranch = computed(() =>
    BRANCHES.map((b) => {
      const list = ops().orders.filter(
        (o) => o.status === 'paid' && o.closedAt && inRange(o.closedAt, from.value, to.value) && o.branchId === b.id,
      )
      const net = round(sum(list, (o) => o.totals?.taxableTotal || 0), 2)
      const cost = round(sum(list, (o) => o.totals?.cost || 0), 2)
      return {
        branch: b,
        orders: list.length,
        net,
        cost,
        margin: round(net - cost, 2),
        foodCostPct: safeDiv(cost, net),
        avgTicket: round(safeDiv(net, list.length), 2),
      }
    }),
  )

  const paymentMix = computed(() =>
    PAYMENT_METHODS.map((m) => {
      const amount = round(
        sum(paidOrders.value, (o) => sum((o.payments || []).filter((p) => p.method === m.id), (p) => p.amount)),
        2,
      )
      return { method: m, amount, fee: round(amount * (m.feePct || 0), 2), share: safeDiv(amount, summary.value.gross) }
    }).filter((r) => r.amount > 0),
  )

  /* ---------------- المخزون ---------------- */

  const lowStock = computed(() => {
    const cat = catalog()
    return cat.ingredients
      .map((ing) => {
        const s = ops().stockByIngredient.get(ing.id)
        const qtyBase = s?.qtyBase || 0
        return {
          ingredient: ing,
          qtyBase,
          value: round(s?.value || 0, 2),
          reorderBase: ing.reorderBase,
          parBase: ing.parBase,
          coverPct: safeDiv(qtyBase, ing.parBase || 1),
          isBelowReorder: ing.reorderBase > 0 && qtyBase < ing.reorderBase,
        }
      })
      .filter((r) => r.isBelowReorder)
      .sort((a, b) => a.coverPct - b.coverPct)
  })

  const expiringSoon = computed(() => {
    const limit = addDays(new Date(), 7)
    return ops()
      .stock.filter((s) => s.expiryAt && new Date(s.expiryAt) <= limit)
      .map((s) => ({
        ...s,
        ingredient: catalog().ingredientMap.get(s.ingredientId),
        value: round(s.qtyBase * s.avgCostPerBase, 2),
        isExpired: new Date(s.expiryAt) < new Date(),
      }))
      .sort((a, b) => new Date(a.expiryAt) - new Date(b.expiryAt))
  })

  /**
   * الاستهلاك النظري (من الوصفات) مقابل الفعلي (نظري + هدر + عجز الجرد).
   * الفرق هو مؤشر الانضباط في المطبخ.
   */
  const consumptionVariance = computed(() => {
    const cat = catalog()
    const theo = ops().theoreticalConsumption
    const wasteMap = new Map()
    for (const w of ops().waste) {
      if (!inRange(w.date, from.value, to.value)) continue
      for (const l of w.lines || []) wasteMap.set(l.ingredientId, (wasteMap.get(l.ingredientId) || 0) + l.baseQty)
    }
    const countMap = new Map()
    for (const c of ops().counts) {
      if (!inRange(c.date, from.value, to.value)) continue
      for (const l of c.lines || []) {
        if (l.varianceBase < 0) countMap.set(l.ingredientId, (countMap.get(l.ingredientId) || 0) + Math.abs(l.varianceBase))
      }
    }

    return [...theo.entries()]
      .map(([ingredientId, theoretical]) => {
        const ing = cat.ingredientMap.get(ingredientId)
        const wasteQty = wasteMap.get(ingredientId) || 0
        const shortage = countMap.get(ingredientId) || 0
        const actual = theoretical + wasteQty + shortage
        const costPerBase = cat.engine.ingredientPurchaseCostPerBase(ingredientId)
        return {
          ingredient: ing,
          theoretical: round(theoretical, 2),
          wasteQty: round(wasteQty, 2),
          shortage: round(shortage, 2),
          actual: round(actual, 2),
          gapQty: round(actual - theoretical, 2),
          gapPct: safeDiv(actual - theoretical, theoretical),
          gapValue: round((actual - theoretical) * costPerBase, 2),
          theoreticalValue: round(theoretical * costPerBase, 2),
        }
      })
      .filter((r) => r.ingredient)
      .sort((a, b) => b.gapValue - a.gapValue)
  })

  const wasteSummary = computed(() => {
    const list = ops().waste.filter((w) => inRange(w.date, from.value, to.value) && (!branchId.value || w.branchId === branchId.value))
    const total = round(sum(list, (w) => w.value), 2)
    const byReason = Object.entries(groupBy(list, 'reasonId')).map(([reasonId, rows]) => ({
      reasonId,
      reasonAr: rows[0].reasonAr,
      reasonEn: rows[0].reasonEn,
      value: round(sum(rows, (r) => r.value), 2),
      count: rows.length,
    }))
    return {
      total,
      count: list.length,
      pctOfSales: safeDiv(total, summary.value.net),
      byReason: byReason.sort((a, b) => b.value - a.value),
      events: list,
    }
  })

  /* ---------------- المحاسبة ---------------- */

  const pnl = computed(() =>
    incomeStatement(ops().journal, { from: from.value, to: to.value, branchId: branchId.value }),
  )

  const tb = computed(() =>
    trialBalance(ops().journal, { from: from.value, to: to.value, branchId: branchId.value }),
  )

  /** قائمة الدخل لكل فرع جانب بعضها */
  const pnlByBranch = computed(() =>
    BRANCHES.map((b) => ({
      branch: b,
      statement: incomeStatement(ops().journal, { from: from.value, to: to.value, branchId: b.id }),
    })),
  )

  const journalInRange = computed(() =>
    ops()
      .journal.filter((e) => inRange(e.date, from.value, to.value) && (!branchId.value || e.branchId === branchId.value))
      .slice()
      .reverse(),
  )

  return {
    days, branchId, from, to, setRange, setBranch,
    paidOrders, summary, previousSummary, delta,
    salesByDay, salesByHour, itemPerformance, benchmarks, salesByCategory, salesByType, salesByBranch, paymentMix,
    lowStock, expiringSoon, consumptionVariance, wasteSummary,
    pnl, tb, pnlByBranch, journalInRange,
  }
})
