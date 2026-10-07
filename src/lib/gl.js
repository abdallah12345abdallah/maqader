import { ACCOUNTS, PAYMENT_METHODS } from '@/data/org'
import { round, sum, safeDiv, inRange } from './utils'

/**
 * دفتر اليومية وقائمة الدخل.
 *
 * كل حركة تشغيلية (بيع، شراء، هدر، فرق جرد، مصروف) بتتحول لقيد مزدوج
 * متوازن، وقائمة الدخل بتُبنى من القيود نفسها — مش من أرقام محفوظة.
 */

export const ACC = new Map(ACCOUNTS.map((a) => [a.id, a]))
const PAY = new Map(PAYMENT_METHODS.map((p) => [p.id, p]))

const REVENUE_BY_TYPE = { dine_in: 'A-4010', takeaway: 'A-4020', delivery: 'A-4030' }

let entrySeq = 0
const nextEntryNo = () => {
  entrySeq += 1
  return `JV-${String(Date.now()).slice(-6)}${entrySeq}`
}

export function makeEntry({ date, memoAr, memoEn, source, refId, branchId, lines }) {
  const clean = lines
    .filter((l) => round(l.debit || 0, 2) !== 0 || round(l.credit || 0, 2) !== 0)
    .map((l) => ({
      accountId: l.accountId,
      debit: round(l.debit || 0, 2),
      credit: round(l.credit || 0, 2),
      dim: l.dim || null,
    }))
  const debit = round(sum(clean, (l) => l.debit), 2)
  const credit = round(sum(clean, (l) => l.credit), 2)
  return {
    id: nextEntryNo(),
    date: date || new Date().toISOString(),
    memoAr,
    memoEn,
    source,
    refId,
    branchId,
    lines: clean,
    debit,
    credit,
    isBalanced: Math.abs(debit - credit) < 0.02,
  }
}

/**
 * قيود البيع: قيد الإيراد + قيد تكلفة المبيعات + قيد عمولات الدفع.
 * @param order الأوردر بعد الدفع
 * @param totals ناتج computeOrderTotals
 * @param costSplit تقسيم التكلفة على الحسابات { 'A-5010': 120, 'A-5020': 15, 'A-6050': 4 }
 */
export function buildSaleEntries(order, totals, costSplit = {}) {
  const entries = []
  const revenueAccount = REVENUE_BY_TYPE[order.type] || 'A-4010'
  const dim = { branchId: order.branchId, orderId: order.id, orderType: order.type }

  // 1) الإيراد
  const payLines = (order.payments || []).map((p) => ({
    accountId: PAY.get(p.method)?.accountId || 'A-1010',
    debit: p.amount,
    dim,
  }))
  entries.push(
    makeEntry({
      date: order.closedAt || order.createdAt,
      memoAr: `مبيعات أوردر ${order.number}`,
      memoEn: `Sales for order ${order.number}`,
      source: 'sale',
      refId: order.id,
      branchId: order.branchId,
      lines: [
        ...payLines,
        { accountId: 'A-4090', debit: totals.discount, dim },
        // الإيراد قبل الخصم = الصافي الخاضع + الخصم — بنحسبه كده مش من grossNet
        // عشان تقريب السطور ما يخلّيش القيد يختلف بقروش
        { accountId: revenueAccount, credit: round(totals.taxableTotal + totals.discount, 2), dim },
        { accountId: 'A-4030', credit: totals.deliveryFee, dim },
        { accountId: 'A-2030', credit: totals.service, dim },
        { accountId: 'A-2020', credit: totals.vat, dim },
      ],
    }),
  )

  // 2) تكلفة المبيعات مقابل المخزون
  const cogsLines = Object.entries(costSplit)
    .filter(([, v]) => round(v, 2) > 0)
    .map(([accountId, v]) => ({ accountId, debit: round(v, 2), dim }))
  const cogsTotal = round(sum(cogsLines, (l) => l.debit), 2)
  if (cogsTotal > 0) {
    entries.push(
      makeEntry({
        date: order.closedAt || order.createdAt,
        memoAr: `تكلفة مبيعات أوردر ${order.number}`,
        memoEn: `COGS for order ${order.number}`,
        source: 'cogs',
        refId: order.id,
        branchId: order.branchId,
        lines: [...cogsLines, { accountId: 'A-1100', credit: cogsTotal, dim }],
      }),
    )
  }

  // 3) عمولات الدفع والتطبيقات
  const feeLines = []
  for (const p of order.payments || []) {
    const method = PAY.get(p.method)
    const fee = round((p.amount || 0) * (method?.feePct || 0), 2)
    if (fee > 0) {
      feeLines.push({ accountId: 'A-6070', debit: fee, dim })
      feeLines.push({ accountId: method.accountId, credit: fee, dim })
    }
  }
  if (feeLines.length) {
    entries.push(
      makeEntry({
        date: order.closedAt || order.createdAt,
        memoAr: `عمولات دفع أوردر ${order.number}`,
        memoEn: `Payment fees for order ${order.number}`,
        source: 'fee',
        refId: order.id,
        branchId: order.branchId,
        lines: feeLines,
      }),
    )
  }

  return entries
}

/** شراء من مورد: مخزون مدين، مورد دائن (الضريبة على المشتريات تُخصم من المستحق) */
export function buildPurchaseEntry(purchase) {
  const net = round(purchase.net || 0, 2)
  const vat = round(purchase.vat || 0, 2)
  return makeEntry({
    date: purchase.date,
    memoAr: `فاتورة مشتريات ${purchase.number}`,
    memoEn: `Purchase invoice ${purchase.number}`,
    source: 'purchase',
    refId: purchase.id,
    branchId: purchase.branchId,
    lines: [
      { accountId: 'A-1100', debit: net, dim: { supplierId: purchase.supplierId } },
      { accountId: 'A-2020', debit: vat },
      { accountId: 'A-2010', credit: round(net + vat, 2), dim: { supplierId: purchase.supplierId } },
    ],
  })
}

/** هدر/تلف: مصروف هدر مدين، المخزون دائن */
export function buildWasteEntry(waste) {
  const value = round(waste.value || 0, 2)
  return makeEntry({
    date: waste.date,
    memoAr: `هدر — ${waste.reasonAr || ''}`,
    memoEn: `Waste — ${waste.reasonEn || ''}`,
    source: 'waste',
    refId: waste.id,
    branchId: waste.branchId,
    lines: [
      { accountId: 'A-5030', debit: value, dim: { reasonId: waste.reasonId } },
      { accountId: 'A-1100', credit: value },
    ],
  })
}

/** فرق جرد: العجز مصروف، والزيادة ترجع للمخزون */
export function buildVarianceEntry(count) {
  const v = round(count.varianceValue || 0, 2)
  if (v === 0) return null
  const shortage = v < 0
  const amount = Math.abs(v)
  return makeEntry({
    date: count.date,
    memoAr: `فروق جرد ${count.number}`,
    memoEn: `Inventory variance ${count.number}`,
    source: 'variance',
    refId: count.id,
    branchId: count.branchId,
    lines: shortage
      ? [
          { accountId: 'A-5040', debit: amount },
          { accountId: 'A-1100', credit: amount },
        ]
      : [
          { accountId: 'A-1100', debit: amount },
          { accountId: 'A-5040', credit: amount },
        ],
  })
}

/** مصروف تشغيلي مدفوع نقدًا أو بالبنك */
export function buildExpenseEntry(expense) {
  const amount = round(expense.amount || 0, 2)
  return makeEntry({
    date: expense.date,
    memoAr: expense.memoAr || 'مصروف تشغيلي',
    memoEn: expense.memoEn || 'Operating expense',
    source: 'expense',
    refId: expense.id,
    branchId: expense.branchId,
    lines: [
      { accountId: expense.accountId, debit: amount },
      { accountId: expense.paidFrom || 'A-1010', credit: amount },
    ],
  })
}

/** تحويل وصفة تجهيز لمخزون نصف مصنع: WIP مدين، المواد الخام دائن */
export function buildProductionEntry(batch) {
  const value = round(batch.cost || 0, 2)
  return makeEntry({
    date: batch.date,
    memoAr: `إنتاج دفعة ${batch.recipeNameAr || ''}`,
    memoEn: `Production batch ${batch.recipeNameEn || ''}`,
    source: 'production',
    refId: batch.id,
    branchId: batch.branchId,
    lines: [
      { accountId: 'A-1110', debit: value, dim: { recipeId: batch.recipeId } },
      { accountId: 'A-1100', credit: value },
    ],
  })
}

/* ======================= التقارير ======================= */

/** صافي حركة حساب خلال فترة، باتجاه رصيده الطبيعي */
export function accountMovement(journal, accountId, from, to, branchId = null) {
  const acc = ACC.get(accountId)
  let debit = 0
  let credit = 0
  for (const e of journal) {
    if (!inRange(e.date, from, to)) continue
    if (branchId && e.branchId !== branchId) continue
    for (const l of e.lines) {
      if (l.accountId !== accountId) continue
      debit += l.debit
      credit += l.credit
    }
  }
  const net = acc?.type === 'credit' ? credit - debit : debit - credit
  return { accountId, debit: round(debit, 2), credit: round(credit, 2), net: round(net, 2) }
}

const childrenOf = (parentId) => ACCOUNTS.filter((a) => a.parentId === parentId)

/**
 * قائمة الدخل.
 * ترتيب مطعمي: الإيراد → تكلفة المبيعات → الربح الإجمالي → المصروفات → صافي الربح.
 */
export function incomeStatement(journal, { from, to, branchId = null } = {}) {
  const groupLines = (parentId) =>
    childrenOf(parentId).map((a) => ({
      account: a,
      ...accountMovement(journal, a.id, from, to, branchId),
    }))

  const revenueLines = groupLines('A-4000')
  const cogsLines = groupLines('A-5000')
  const expenseLines = groupLines('A-6000')

  const revenue = round(sum(revenueLines.filter((l) => !l.account.contra), (l) => l.net), 2)
  const discounts = round(sum(revenueLines.filter((l) => l.account.contra), (l) => l.net), 2)
  const netRevenue = round(revenue - discounts, 2)
  const cogs = round(sum(cogsLines, (l) => l.net), 2)
  const grossProfit = round(netRevenue - cogs, 2)
  const expenses = round(sum(expenseLines, (l) => l.net), 2)
  const netProfit = round(grossProfit - expenses, 2)

  const fixedExpenses = round(sum(expenseLines.filter((l) => l.account.fixed), (l) => l.net), 2)
  const variableExpenses = round(expenses - fixedExpenses, 2)
  const contributionMargin = round(netRevenue - cogs - variableExpenses, 2)

  return {
    from,
    to,
    branchId,
    revenueLines,
    cogsLines,
    expenseLines,
    revenue,
    discounts,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPct: safeDiv(grossProfit, netRevenue),
    foodCostPct: safeDiv(cogs, netRevenue),
    expenses,
    fixedExpenses,
    variableExpenses,
    contributionMargin,
    contributionMarginPct: safeDiv(contributionMargin, netRevenue),
    netProfit,
    netMarginPct: safeDiv(netProfit, netRevenue),
    /** نقطة التعادل بالإيراد = المصروفات الثابتة ÷ نسبة هامش المساهمة */
    breakEvenRevenue: round(safeDiv(fixedExpenses, safeDiv(contributionMargin, netRevenue)), 2),
  }
}

/** ميزان المراجعة — للتأكد إن الدفتر متوازن */
export function trialBalance(journal, { from, to, branchId = null } = {}) {
  const rows = ACCOUNTS.filter((a) => !a.isHeader).map((a) => ({
    account: a,
    ...accountMovement(journal, a.id, from, to, branchId),
  }))
  const totalDebit = round(sum(rows, (r) => r.debit), 2)
  const totalCredit = round(sum(rows, (r) => r.credit), 2)
  return {
    rows: rows.filter((r) => r.debit || r.credit),
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.02,
  }
}
