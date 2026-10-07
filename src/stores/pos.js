import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { COMPANY, TABLES } from '@/data/org'
import { PRICE_LISTS } from '@/data/menu'
import {
  computeOrderTotals, unitPriceOf, unitCostOf, defaultOptionsFor, orderNumber, optionsLabel,
} from '@/lib/pricing'
import { storage, uid, round } from '@/lib/utils'
import { useCatalogStore } from './catalog'
import { useOpsStore } from './ops'
import { useAuthStore } from './auth'

const priceFactorFor = (type) => PRICE_LISTS.find((p) => p.appliesTo.includes(type))?.factor ?? 1

export const usePosStore = defineStore('pos', () => {
  const catalog = () => useCatalogStore()
  const ops = () => useOpsStore()
  const auth = () => useAuthStore()

  const seq = ref(storage.get('posSeq', 1))
  const ticket = ref(blankTicket())
  const activeCategoryId = ref(null)
  const search = ref('')
  const lineSeq = ref(1)

  function blankTicket(type = 'dine_in') {
    return {
      id: uid('ORD'),
      number: null,
      type,
      status: 'draft',
      tableId: null,
      guests: 1,
      customer: null,
      lines: [],
      discount: null,
      payments: [],
      note: '',
      createdAt: new Date().toISOString(),
    }
  }

  const priceFactor = computed(() => priceFactorFor(ticket.value.type))

  /** الأطباق المعروضة بعد الفلترة والبحث */
  const visibleItems = computed(() => {
    const q = search.value.trim().toLowerCase()
    return catalog()
      .menuRecipes.filter((r) => (activeCategoryId.value ? r.categoryId === activeCategoryId.value : true))
      .filter((r) =>
        !q ? true : [r.nameAr, r.nameEn, r.code].some((v) => String(v || '').toLowerCase().includes(q)),
      )
  })

  const totals = computed(() =>
    computeOrderTotals(ticket.value, {
      engine: catalog().engine,
      recipeMap: catalog().recipeMap,
      vatPct: COMPANY.vatPct,
      servicePct: COMPANY.serviceChargePct,
    }),
  )

  const isEmpty = computed(() => !ticket.value.lines.some((l) => !l.isVoid))
  const table = computed(() => TABLES.find((t) => t.id === ticket.value.tableId) || null)

  /** الطاولات المشغولة من الأوردرات المفتوحة */
  const occupiedTables = computed(() => {
    const map = new Map()
    for (const o of ops().openOrders) if (o.tableId) map.set(o.tableId, o)
    return map
  })

  /* ---------------- تعديل التذكرة ---------------- */

  function recalcLine(line) {
    const recipe = catalog().recipeMap.get(line.recipeId)
    return {
      ...line,
      unitPrice: unitPriceOf(recipe, line.options, priceFactor.value),
      unitCost: unitCostOf(catalog().engine, recipe, line.options, ticket.value.type).cost,
      priceFactor: priceFactor.value,
      optionsLabel: optionsLabel(line.options),
    }
  }

  function addItem(recipeId, options = null) {
    const recipe = catalog().recipeMap.get(recipeId)
    if (!recipe) return null
    const opts = options || defaultOptionsFor(recipe)
    const signature = JSON.stringify([...opts].sort())

    const existing = ticket.value.lines.find(
      (l) => l.recipeId === recipeId && !l.isVoid && !l.sentAt && JSON.stringify([...l.options].sort()) === signature,
    )
    if (existing) {
      existing.qty += 1
      return existing
    }

    const line = recalcLine({
      id: `L${lineSeq.value++}`,
      recipeId,
      qty: 1,
      options: opts,
      stationId: recipe.stationId,
      kdsStatus: null,
      sentAt: null,
      note: '',
    })
    ticket.value.lines.push(line)
    return line
  }

  function setQty(lineId, qty) {
    const line = ticket.value.lines.find((l) => l.id === lineId)
    if (!line) return
    if (qty <= 0) return removeLine(lineId)
    line.qty = qty
  }

  const inc = (lineId) => setQty(lineId, (ticket.value.lines.find((l) => l.id === lineId)?.qty || 0) + 1)
  const dec = (lineId) => setQty(lineId, (ticket.value.lines.find((l) => l.id === lineId)?.qty || 0) - 1)

  function removeLine(lineId) {
    const line = ticket.value.lines.find((l) => l.id === lineId)
    if (!line) return
    // سطر وصل المطبخ يُلغى بإلغاء موثّق، مش بالحذف
    if (line.sentAt) line.isVoid = true
    else ticket.value.lines = ticket.value.lines.filter((l) => l.id !== lineId)
  }

  function setOptions(lineId, options) {
    const idx = ticket.value.lines.findIndex((l) => l.id === lineId)
    if (idx < 0) return
    ticket.value.lines[idx] = recalcLine({ ...ticket.value.lines[idx], options })
  }

  function setLineNote(lineId, note) {
    const line = ticket.value.lines.find((l) => l.id === lineId)
    if (line) line.note = note
  }

  function setType(type) {
    ticket.value.type = type
    if (type !== 'dine_in') {
      ticket.value.tableId = null
      ticket.value.guests = 1
    }
    ticket.value.lines = ticket.value.lines.map(recalcLine)
  }

  const setTable = (tableId) => {
    ticket.value.tableId = tableId
    const t = TABLES.find((x) => x.id === tableId)
    if (t) ticket.value.guests = Math.min(t.seats, Math.max(ticket.value.guests, 2))
  }
  const setGuests = (n) => (ticket.value.guests = Math.max(1, n))
  const setNote = (note) => (ticket.value.note = note)
  const setCustomer = (customer) => (ticket.value.customer = customer)

  function applyDiscount(discount) {
    ticket.value.discount = discount
  }
  const clearDiscount = () => (ticket.value.discount = null)

  /* ---------------- أوامر الدورة ---------------- */

  function nextNumber() {
    const n = seq.value
    seq.value += 1
    storage.set('posSeq', seq.value)
    return orderNumber(auth().branch.code, n)
  }

  /** إرسال السطور الجديدة للمطبخ */
  function sendToKitchen() {
    if (isEmpty.value) return { ok: false, error: 'EMPTY_TICKET' }
    const now = new Date().toISOString()
    ticket.value.number = ticket.value.number || nextNumber()
    ticket.value.branchId = auth().branchId
    ticket.value.cashierId = auth().userId
    ticket.value.lines = ticket.value.lines.map((l) =>
      l.sentAt || l.isVoid ? l : { ...l, sentAt: now, kdsStatus: 'queued' },
    )
    ticket.value.status = 'sent'
    ops().saveOpenOrder({ ...ticket.value })
    return { ok: true, order: { ...ticket.value } }
  }

  /** الدفع والإقفال */
  function pay(payments) {
    if (isEmpty.value) return { ok: false, error: 'EMPTY_TICKET' }
    ticket.value.number = ticket.value.number || nextNumber()
    ticket.value.branchId = auth().branchId
    ticket.value.cashierId = auth().userId
    ticket.value.payments = payments
    const now = new Date().toISOString()
    ticket.value.lines = ticket.value.lines.map((l) =>
      l.sentAt || l.isVoid ? l : { ...l, sentAt: now, kdsStatus: 'queued' },
    )
    const result = ops().checkoutOrder({ ...ticket.value })
    const done = result.order
    ticket.value = blankTicket(ticket.value.type)
    return { ok: true, order: done, totals: result.totals }
  }

  /** فتح أوردر محفوظ للتعديل أو الدفع */
  function loadOrder(orderId) {
    const order = ops().orders.find((o) => o.id === orderId)
    if (!order) return false
    ticket.value = JSON.parse(JSON.stringify(order))
    lineSeq.value = ticket.value.lines.length + 1
    return true
  }

  function park() {
    if (isEmpty.value) return { ok: false, error: 'EMPTY_TICKET' }
    ticket.value.number = ticket.value.number || nextNumber()
    ticket.value.branchId = auth().branchId
    ticket.value.status = ticket.value.status === 'draft' ? 'sent' : ticket.value.status
    ops().saveOpenOrder({ ...ticket.value })
    ticket.value = blankTicket(ticket.value.type)
    return { ok: true }
  }

  function newTicket(type) {
    ticket.value = blankTicket(type || ticket.value.type)
    lineSeq.value = 1
  }

  /** تكلفة وربح التذكرة الحالية — الكاشير يشوف الربح لحظيًا */
  const liveEconomics = computed(() => {
    const t = totals.value
    return {
      cost: t.cost,
      profit: t.grossProfit,
      foodCostPct: t.foodCostPct,
      marginPct: t.marginPct,
    }
  })

  return {
    ticket, activeCategoryId, search, seq,
    visibleItems, totals, isEmpty, table, occupiedTables, priceFactor, liveEconomics,
    addItem, setQty, inc, dec, removeLine, setOptions, setLineNote,
    setType, setTable, setGuests, setNote, setCustomer,
    applyDiscount, clearDiscount,
    sendToKitchen, pay, loadOrder, park, newTicket,
  }
})
