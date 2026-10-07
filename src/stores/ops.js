import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildSeed } from '@/data/seed'
import { ITEM_GROUPS } from '@/data/catalog'
import { WAREHOUSES, COMPANY, BRANCHES } from '@/data/org'
import { WASTE_REASONS } from '@/data/menu'
import { buildSaleEntries, buildWasteEntry, buildPurchaseEntry, buildVarianceEntry, buildExpenseEntry } from '@/lib/gl'
import { explodeOrder, computeOrderTotals } from '@/lib/pricing'
import { storage, uid, round, sum, safeDiv } from '@/lib/utils'
import { toBase } from '@/lib/units'
import { useCatalogStore } from './catalog'

const GROUP_ACC = new Map(ITEM_GROUPS.map((g) => [g.id, g.cogsAccountId]))
const EMPTY_LIVE = () => ({
  orders: [],
  journal: [],
  movements: [],
  purchases: [],
  waste: [],
  counts: [],
  expenses: [],
  batchStatus: {},
  stockDelta: {},
  shifts: [],
})

/**
 * طبقة التشغيل — هي الـ backend الوهمي.
 *
 * البيانات التاريخية تُولَّد حتميًا عند كل تحميل (مش محفوظة)، وأي حركة
 * ينشئها المستخدم تُحفظ كـ delta فوقها. كده الحفظ خفيف والأرقام ثابتة.
 */
export const useOpsStore = defineStore('ops', () => {
  const seed = ref(null)
  const live = ref({ ...EMPTY_LIVE(), ...(storage.get('live', {}) || {}) })
  const ready = computed(() => !!seed.value)

  const persist = () => storage.set('live', live.value)

  function init(force = false) {
    if (seed.value && !force) return
    seed.value = buildSeed()
  }

  /* ---------------- قراءة ---------------- */

  const orders = computed(() => [...live.value.orders, ...(seed.value?.orders || [])])
  const journal = computed(() => [...(seed.value?.journal || []), ...live.value.journal])
  const movements = computed(() => [...live.value.movements, ...(seed.value?.movements || [])])
  const purchases = computed(() => [...live.value.purchases, ...(seed.value?.purchases || [])])
  const waste = computed(() => [...live.value.waste, ...(seed.value?.waste || [])])
  const counts = computed(() => [...live.value.counts, ...(seed.value?.counts || [])])
  const shifts = computed(() => [...live.value.shifts, ...(seed.value?.shifts || [])])
  const expenses = computed(() => live.value.expenses)

  const batches = computed(() =>
    (seed.value?.batches || []).map((b) => ({ ...b, status: live.value.batchStatus[b.id] || b.status })),
  )

  const warehouses = computed(() => WAREHOUSES)

  /** رصيد المخزون = رصيد الـ seed + دلتا الحركات الجديدة */
  const stock = computed(() =>
    (seed.value?.stock || []).map((row) => {
      const key = `${row.warehouseId}:${row.ingredientId}`
      const delta = live.value.stockDelta[key] || 0
      return { ...row, qtyBase: round(row.qtyBase + delta, 3) }
    }),
  )

  const stockByIngredient = computed(() => {
    const map = new Map()
    for (const row of stock.value) {
      const cur = map.get(row.ingredientId) || { qtyBase: 0, value: 0, rows: [] }
      cur.qtyBase += row.qtyBase
      cur.value += row.qtyBase * row.avgCostPerBase
      cur.rows.push(row)
      map.set(row.ingredientId, cur)
    }
    return map
  })

  const inventoryValue = computed(() =>
    round(sum(stock.value, (r) => r.qtyBase * r.avgCostPerBase), 2),
  )

  /** استهلاك نظري لكل مادة في الفترة (من نشر الأوردرات) */
  const theoreticalConsumption = computed(() => {
    const map = new Map()
    for (const row of seed.value?.consumption || []) map.set(row.ingredientId, row.baseQty)
    return map
  })

  /** أوردرات لسه مفتوحة — من حركات المستخدم ومن بيانات العرض */
  const openOrders = computed(() => {
    const livePaid = new Set(live.value.orders.map((o) => o.id))
    return [
      ...live.value.orders.filter((o) => ['sent', 'ready', 'served', 'draft'].includes(o.status)),
      ...(seed.value?.orders || []).filter(
        (o) => ['sent', 'ready', 'served'].includes(o.status) && !livePaid.has(o.id),
      ),
    ]
  })

  /* ---------------- كتابة ---------------- */

  function applyStockDelta(ingredientId, baseQty, warehouseId) {
    const key = `${warehouseId}:${ingredientId}`
    const next = { ...live.value.stockDelta }
    next[key] = round((next[key] || 0) + baseQty, 4)
    live.value.stockDelta = next
  }

  const kitchenWarehouseOf = (branchId) =>
    WAREHOUSES.find((w) => w.branchId === branchId && w.type === 'kitchen')?.id ||
    WAREHOUSES.find((w) => w.branchId === branchId)?.id ||
    'WH-MAIN'

  /**
   * إقفال أوردر: يحفظه، يخصم المخزون باستهلاكه النظري،
   * ويقيّد الإيراد وتكلفة المبيعات والعمولات.
   */
  function checkoutOrder(order) {
    const catalog = useCatalogStore()
    const engine = catalog.engine
    const recipeMap = catalog.recipeMap

    const totals = computeOrderTotals(order, {
      engine,
      recipeMap,
      vatPct: COMPANY.vatPct,
      servicePct: COMPANY.serviceChargePct,
    })

    const exploded = explodeOrder(order, { engine, recipeMap })
    const warehouseId = kitchenWarehouseOf(order.branchId)
    const costSplit = {}
    const movementLines = []

    for (const [ingId, baseQty] of exploded.entries()) {
      const ing = catalog.ingredientMap.get(ingId)
      if (!ing) continue
      const costPerBase = engine.ingredientPurchaseCostPerBase(ingId)
      const acc = GROUP_ACC.get(ing.groupId) || 'A-5010'
      costSplit[acc] = round((costSplit[acc] || 0) + baseQty * costPerBase, 4)
      movementLines.push({ ingredientId: ingId, baseQty: round(baseQty, 4), costPerBase })
      applyStockDelta(ingId, -baseQty, warehouseId)
    }

    const stored = {
      ...order,
      status: 'paid',
      closedAt: new Date().toISOString(),
      totals: {
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
      },
    }

    live.value.orders = [stored, ...live.value.orders.filter((o) => o.id !== order.id)]
    live.value.journal = [...live.value.journal, ...buildSaleEntries(stored, totals, costSplit)]
    live.value.movements = [
      {
        id: uid('MV'),
        type: 'consume',
        date: stored.closedAt,
        warehouseId,
        branchId: order.branchId,
        refType: 'order',
        refId: order.id,
        refNumber: order.number,
        value: round(sum(Object.values(costSplit)), 2),
        lines: movementLines,
      },
      ...live.value.movements,
    ]
    persist()
    return { order: stored, totals }
  }

  /** أوردر مفتوح (أُرسل للمطبخ ولم يُدفع بعد) */
  function saveOpenOrder(order) {
    live.value.orders = [
      { ...order, status: order.status || 'sent' },
      ...live.value.orders.filter((o) => o.id !== order.id),
    ]
    persist()
  }

  /** تعديل أوردر — لو كان من بيانات العرض يُنقل للطبقة الحيّة أول مرة */
  function updateOrder(orderId, patch) {
    const inLive = live.value.orders.some((o) => o.id === orderId)
    if (!inLive) {
      const fromSeed = (seed.value?.orders || []).find((o) => o.id === orderId)
      if (!fromSeed) return
      live.value.orders = [{ ...JSON.parse(JSON.stringify(fromSeed)), ...patch }, ...live.value.orders]
      persist()
      return
    }
    live.value.orders = live.value.orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o))
    persist()
  }

  function voidOrder(orderId, reason) {
    updateOrder(orderId, { status: 'void', voidReason: reason, voidedAt: new Date().toISOString() })
  }

  /** حالة سطر في المطبخ — تظهر فورًا على شاشة القسم */
  function setLineStatus(orderId, lineId, status) {
    const order = openOrders.value.find((o) => o.id === orderId)
    if (!order) return
    const lines = order.lines.map((l) =>
      l.id === lineId
        ? { ...l, kdsStatus: status, [status === 'firing' ? 'firedAt' : 'readyAt']: new Date().toISOString() }
        : l,
    )
    const allReady = lines.every((l) => l.isVoid || l.kdsStatus === 'ready' || l.kdsStatus === 'served')
    updateOrder(orderId, { lines, status: allReady ? 'ready' : order.status })
  }

  function recordWaste({ branchId, warehouseId, reasonId, lines, note }) {
    const catalog = useCatalogStore()
    const reason = WASTE_REASONS.find((r) => r.id === reasonId)
    const priced = lines.map((l) => {
      const costPerBase = catalog.engine.ingredientPurchaseCostPerBase(l.ingredientId)
      const baseQty = toBase(l.qty, l.unit)
      return { ...l, baseQty: round(baseQty, 4), costPerBase, value: round(baseQty * costPerBase, 2) }
    })
    const value = round(sum(priced, (l) => l.value), 2)
    const record = {
      id: uid('WST'),
      number: `WS-${String(waste.value.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString(),
      branchId,
      warehouseId,
      reasonId,
      reasonAr: reason?.nameAr,
      reasonEn: reason?.nameEn,
      note,
      lines: priced,
      value,
    }
    live.value.waste = [record, ...live.value.waste]
    live.value.journal = [...live.value.journal, buildWasteEntry(record)]
    live.value.movements = [
      {
        id: uid('MV'), type: 'waste', date: record.date, warehouseId, branchId,
        refType: 'waste', refId: record.id, refNumber: record.number, value, lines: priced,
      },
      ...live.value.movements,
    ]
    for (const l of priced) applyStockDelta(l.ingredientId, -l.baseQty, warehouseId)
    persist()
    return record
  }

  function recordPurchase({ supplierId, branchId, warehouseId, lines, note }) {
    const priced = lines.map((l) => ({
      ...l,
      baseQty: toBase(l.qty, l.unit),
      total: round(l.qty * l.unitCost, 2),
    }))
    const net = round(sum(priced, (l) => l.total), 2)
    const record = {
      id: uid('PO'),
      number: `PI-${String(purchases.value.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString(),
      supplierId,
      branchId,
      warehouseId,
      status: 'received',
      note,
      lines: priced,
      net,
      vat: round(net * COMPANY.vatPct, 2),
      total: round(net * (1 + COMPANY.vatPct), 2),
    }
    live.value.purchases = [record, ...live.value.purchases]
    live.value.journal = [...live.value.journal, buildPurchaseEntry(record)]
    live.value.movements = [
      {
        id: uid('MV'), type: 'purchase', date: record.date, warehouseId, branchId,
        refType: 'purchase', refId: record.id, refNumber: record.number, value: net,
        lines: priced.map((l) => ({ ingredientId: l.ingredientId, baseQty: l.baseQty, costPerBase: safeDiv(l.total, l.baseQty) })),
      },
      ...live.value.movements,
    ]
    for (const l of priced) applyStockDelta(l.ingredientId, l.baseQty, warehouseId)
    persist()
    return record
  }

  /** ترحيل جرد: يسوّي الرصيد ويقيّد الفرق */
  function postCount({ warehouseId, branchId, lines, countedBy }) {
    const catalog = useCatalogStore()
    const priced = lines.map((l) => {
      const costPerBase = catalog.engine.ingredientPurchaseCostPerBase(l.ingredientId)
      const varianceBase = round(l.countedBase - l.systemBase, 4)
      return { ...l, costPerBase, varianceBase, varianceValue: round(varianceBase * costPerBase, 2) }
    })
    const varianceValue = round(sum(priced, (l) => l.varianceValue), 2)
    const record = {
      id: uid('CNT'),
      number: `CT-${String(counts.value.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString(),
      warehouseId,
      branchId,
      status: 'posted',
      countedBy,
      lines: priced,
      varianceValue,
      accuracyPct: safeDiv(
        sum(priced, (l) => Math.min(l.countedBase, l.systemBase)),
        sum(priced, (l) => l.systemBase),
      ),
    }
    live.value.counts = [record, ...live.value.counts]
    const entry = buildVarianceEntry(record)
    if (entry) live.value.journal = [...live.value.journal, entry]
    live.value.movements = [
      {
        id: uid('MV'), type: 'count_adj', date: record.date, warehouseId, branchId,
        refType: 'count', refId: record.id, refNumber: record.number, value: varianceValue,
        lines: priced.map((l) => ({ ingredientId: l.ingredientId, baseQty: l.varianceBase, costPerBase: l.costPerBase })),
      },
      ...live.value.movements,
    ]
    for (const l of priced) applyStockDelta(l.ingredientId, l.varianceBase, warehouseId)
    persist()
    return record
  }

  function recordExpense({ accountId, amount, memoAr, memoEn, branchId, paidFrom }) {
    const record = {
      id: uid('EXP'),
      date: new Date().toISOString(),
      accountId,
      amount: round(amount, 2),
      memoAr,
      memoEn,
      branchId,
      paidFrom: paidFrom || 'A-1010',
    }
    live.value.expenses = [record, ...live.value.expenses]
    live.value.journal = [...live.value.journal, buildExpenseEntry(record)]
    persist()
    return record
  }

  function setBatchStatus(batchId, status) {
    live.value.batchStatus = { ...live.value.batchStatus, [batchId]: status }
    persist()
  }

  /** مسح كل حركات المستخدم والعودة لبيانات العرض فقط */
  function resetLive() {
    live.value = EMPTY_LIVE()
    persist()
  }

  return {
    seed, live, ready, init,
    orders, journal, movements, purchases, waste, counts, shifts, expenses, batches,
    stock, stockByIngredient, inventoryValue, theoreticalConsumption, openOrders, warehouses,
    checkoutOrder, saveOpenOrder, updateOrder, voidOrder, setLineStatus,
    recordWaste, recordPurchase, postCount, recordExpense, setBatchStatus, resetLive,
    branches: computed(() => BRANCHES),
  }
})
