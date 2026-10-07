/**
 * تحقّق من صحة المحرك والبيانات — يشتغل بدون متصفح.
 *   npm run verify
 *
 * بيفحص: التكلفة المتداخلة، الوحدات، توازن القيود، منطقية قائمة الدخل،
 * وسلامة أرصدة المخزون.
 */
/* تخزين محلي وهمي — الـ stores بتقرأ منه */
const memStore = new Map()
globalThis.localStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
  clear: () => memStore.clear(),
  key: (i) => [...memStore.keys()][i] ?? null,
  get length() {
    return memStore.size
  },
}

import { setActivePinia, createPinia } from 'pinia'
import { INGREDIENTS } from '../src/data/catalog.js'
import { RECIPES } from '../src/data/recipes.js'
import { CATEGORIES } from '../src/data/menu.js'
import { buildSeed } from '../src/data/seed.js'
import { createCostEngine } from '../src/lib/costing.js'
import { incomeStatement, trialBalance } from '../src/lib/gl.js'
import { round, sum, safeDiv, addDays } from '../src/lib/utils.js'

let failures = 0
let checks = 0

const ok = (label, extra = '') => {
  checks += 1
  console.log(`  ✓ ${label}${extra ? ` — ${extra}` : ''}`)
}
const fail = (label, detail) => {
  checks += 1
  failures += 1
  console.log(`  ✗ ${label} — ${detail}`)
}
const assert = (cond, label, detail = '') => (cond ? ok(label, detail) : fail(label, detail || 'assertion failed'))
const section = (name) => console.log(`\n== ${name} ==`)

/* ---------------- 1) محرك التكلفة ---------------- */
section('محرك التكلفة')

const engine = createCostEngine({ ingredients: INGREDIENTS, recipes: RECIPES })
const catMap = new Map(CATEGORIES.map((c) => [c.id, c]))

const costErrors = []
for (const r of RECIPES) {
  const c = engine.recipeCost(r.id)
  if (c.error) costErrors.push(`${r.id}:${c.error}`)
  if (!(c.batchCost > 0)) costErrors.push(`${r.id}:ZERO_COST`)
}
assert(costErrors.length === 0, 'كل الوصفات بتحسب تكلفة بدون أخطاء', costErrors.slice(0, 6).join(', '))

// تحقق يدوي: ثوم مجهز — 1 كجم ثوم بـ 95 + 60 مل زيت زيتون بـ 340/لتر
const garlic = engine.recipeCost('PREP-GARLIC')
const expectedGarlic = (1000 / 1000) * 95 / (1 - 0.18) + 60 * (340 / 1000)
assert(
  Math.abs(garlic.batchCost - expectedGarlic) < 0.05,
  'تكلفة دفعة الثوم المجهز مطابقة للحساب اليدوي',
  `${round(garlic.batchCost, 2)} ≈ ${round(expectedGarlic, 2)}`,
)

// فقد التنظيف لازم يرفع التكلفة
const tomatoPerBase = engine.ingredientCostPerBase('ING-040')
const tomatoPurchase = engine.ingredientPurchaseCostPerBase('ING-040')
assert(tomatoPerBase > tomatoPurchase, 'فقد التنظيف يرفع تكلفة الوحدة المستخدمة',
  `${round(tomatoPerBase, 4)} > ${round(tomatoPurchase, 4)}`)

// التعشيش: بيتزا مارجريتا بتعتمد على عجينة + صوص + جبن، والصوص بيعتمد على ثوم مجهز
const marg = engine.recipeCost('M-PIZZAMARG')
assert(marg.depth >= 3, 'عمق التعشيش في بيتزا مارجريتا 3 مستويات على الأقل', `depth=${marg.depth}`)

// النشر لازم يوصل لمواد خام فقط، وفيها الثوم اللي جوه الصوص
const explodedMarg = engine.explodeDetailed('M-PIZZAMARG', 1, 'portion')
assert(explodedMarg.length > 5, 'نشر البيتزا بيرجّع مواد خام متعددة', `${explodedMarg.length} مادة`)
assert(
  explodedMarg.some((r) => r.ingredientId === 'ING-042'),
  'النشر بيوصل للثوم جوه صوص الطماطم (مستوى ثالث)',
)

// تكلفة النشر لازم تساوي تكلفة الوصفة تقريبًا
const explodedCost = sum(explodedMarg, (r) => r.cost)
assert(
  Math.abs(explodedCost - marg.unitCost) / marg.unitCost < 0.02,
  'تكلفة المواد المنشورة = تكلفة الوصفة',
  `${round(explodedCost, 3)} ≈ ${round(marg.unitCost, 3)}`,
)

// وصفات التجهيز لازم تظهر في النشر الوسيط
const preps = engine.explodePreps('M-PIZZAMARG', 1, 'portion')
assert(preps.has('PREP-DOUGH') && preps.has('PREP-GARLIC'), 'نشر وصفات التجهيز بيشمل المستويات العميقة')

// حماية من المرجع الدائري
const cyclic = createCostEngine({
  ingredients: INGREDIENTS,
  recipes: [
    { id: 'X1', nameAr: 'x1', type: 'prep', yieldQty: 1, yieldUnit: 'g', lines: [{ type: 'recipe', refId: 'X2', qty: 1, unit: 'g' }] },
    { id: 'X2', nameAr: 'x2', type: 'prep', yieldQty: 1, yieldUnit: 'g', lines: [{ type: 'recipe', refId: 'X1', qty: 1, unit: 'g' }] },
  ],
})
const cyc = cyclic.recipeCost('X1')
assert(cyc.error === 'CIRCULAR_REFERENCE' || cyc.lines.some((l) => l.error === 'CIRCULAR_REFERENCE'),
  'المرجع الدائري بيترصد بدل ما يعلّق المتصفح', cyc.error || 'line error')

// خطأ الوحدة لازم يترصد
const badUnit = createCostEngine({
  ingredients: INGREDIENTS,
  recipes: [{ id: 'Y1', nameAr: 'y', type: 'prep', yieldQty: 1, yieldUnit: 'g', lines: [{ type: 'ingredient', refId: 'ING-040', qty: 1, unit: 'l' }] }],
})
assert(badUnit.recipeCost('Y1').error === 'UNIT_DIM_MISMATCH', 'خلط وحدة حجم مع مادة وزن بيرجّع خطأ واضح')

/* ---------------- 2) اقتصاديات القائمة ---------------- */
section('اقتصاديات القائمة')

const menu = RECIPES.filter((r) => r.type === 'menu')
const ecos = menu.map((r) => ({
  r,
  e: engine.menuEconomics(r, { vatRate: 0, targetFoodCostPct: catMap.get(r.categoryId)?.targetFoodCostPct }),
}))

assert(ecos.every((x) => x.e.cost > 0 && x.e.grossPrice > 0), 'كل طبق له تكلفة وسعر')
assert(ecos.every((x) => x.e.margin > 0), 'كل طبق بيحقق هامش موجب',
  ecos.filter((x) => x.e.margin <= 0).map((x) => x.r.id).join(', '))

const avgFc = safeDiv(sum(ecos, (x) => x.e.foodCostPct), ecos.length)
assert(avgFc > 0.12 && avgFc < 0.45, 'متوسط نسبة تكلفة الطعام في المدى المنطقي', `${round(avgFc * 100, 1)}%`)

const extreme = ecos.filter((x) => x.e.foodCostPct > 0.6)
assert(extreme.length === 0, 'مافيش طبق نسبة تكلفته فوق 60%', extreme.map((x) => `${x.r.id}:${round(x.e.foodCostPct * 100)}%`).join(', '))

/* ---------------- 3) البيانات المولّدة ---------------- */
section('البيانات المولّدة')

const t0 = Date.now()
const seed = buildSeed()
const genMs = Date.now() - t0

assert(genMs < 8000, 'التوليد بيخلّص في وقت مقبول', `${genMs}ms`)
assert(seed.orders.length > 500, 'عدد الأوردرات كافي للتقارير', `${seed.orders.length} أوردر`)
assert(seed.journal.length > 500, 'دفتر اليومية مليان', `${seed.journal.length} قيد`)

const openOrders = seed.orders.filter((o) => ['sent', 'ready'].includes(o.status))
assert(openOrders.length > 0, 'في أوردرات مفتوحة لشاشة المطبخ', `${openOrders.length}`)
assert(
  openOrders.every((o) => o.lines.every((l) => l.stationId)),
  'كل سطر في الأوردرات المفتوحة موجّه لقسم مطبخ',
)

const paid = seed.orders.filter((o) => o.status === 'paid')
assert(paid.every((o) => o.payments.length > 0), 'كل أوردر مدفوع له دفعة واحدة على الأقل')

const payMismatch = paid.filter((o) => Math.abs(sum(o.payments, (p) => p.amount) - o.totals.total) > 0.05)
assert(payMismatch.length === 0, 'مجموع الدفعات = إجمالي الفاتورة', `${payMismatch.length} أوردر مختلف`)

const negCost = paid.filter((o) => !(o.totals.cost > 0))
assert(negCost.length === 0, 'كل أوردر له تكلفة محسوبة', `${negCost.length}`)

const avgTicket = safeDiv(sum(paid, (o) => o.totals.taxableTotal), paid.length)
assert(avgTicket > 100 && avgTicket < 2000, 'متوسط الفاتورة منطقي', `${round(avgTicket, 1)}`)

/* ---------------- 4) توازن القيود ---------------- */
section('القيود المحاسبية')

const unbalanced = seed.journal.filter((e) => !e.isBalanced)
assert(unbalanced.length === 0, 'كل قيد متوازن (مدين = دائن)', `${unbalanced.length} قيد غير متوازن`)

const emptyEntries = seed.journal.filter((e) => !e.lines.length)
assert(emptyEntries.length === 0, 'مافيش قيد فاضي', `${emptyEntries.length}`)

const to = new Date()
const from = addDays(to, -30)
const tb = trialBalance(seed.journal, { from, to })
assert(tb.isBalanced, 'ميزان المراجعة متوازن',
  `مدين ${round(tb.totalDebit, 2)} / دائن ${round(tb.totalCredit, 2)}`)

/* ---------------- 5) قائمة الدخل ---------------- */
section('قائمة الدخل')

const pnl = incomeStatement(seed.journal, { from, to })
assert(pnl.netRevenue > 0, 'الإيراد الصافي موجب', `${round(pnl.netRevenue, 0)}`)
assert(pnl.cogs > 0, 'تكلفة المبيعات موجبة', `${round(pnl.cogs, 0)}`)
assert(
  pnl.foodCostPct > 0.15 && pnl.foodCostPct < 0.5,
  'نسبة تكلفة الطعام في المدى المنطقي',
  `${round(pnl.foodCostPct * 100, 1)}%`,
)
assert(
  Math.abs(pnl.grossProfit - (pnl.netRevenue - pnl.cogs)) < 0.5,
  'الربح الإجمالي = الإيراد الصافي − تكلفة المبيعات',
)
assert(
  Math.abs(pnl.netProfit - (pnl.grossProfit - pnl.expenses)) < 0.5,
  'صافي الربح = الربح الإجمالي − المصروفات',
)
assert(pnl.expenses > 0, 'المصروفات التشغيلية مقيّدة', `${round(pnl.expenses, 0)}`)
assert(
  pnl.netMarginPct > 0.03 && pnl.netMarginPct < 0.2,
  'هامش صافي الربح في مدى واقعي لمطعم (3%–20%)',
  `${round(pnl.netMarginPct * 100, 1)}%`,
)
assert(
  safeDiv(pnl.expenses, pnl.netRevenue) > 0.35 && safeDiv(pnl.expenses, pnl.netRevenue) < 0.7,
  'المصروفات التشغيلية نسبتها منطقية من الإيراد',
  `${round(safeDiv(pnl.expenses, pnl.netRevenue) * 100, 1)}%`,
)
assert(pnl.breakEvenRevenue > 0, 'نقطة التعادل محسوبة', `${round(pnl.breakEvenRevenue, 0)}`)

/* ---------------- 6) المخزون ---------------- */
section('المخزون')

const negative = seed.stock.filter((s) => s.qtyBase < 0)
assert(negative.length === 0, 'مافيش رصيد مخزون سالب', `${negative.length} سطر`)

const invValue = round(sum(seed.stock, (s) => s.qtyBase * s.avgCostPerBase), 2)
assert(invValue > 0, 'قيمة المخزون موجبة', `${invValue}`)

const consumedIds = new Set(seed.consumption.map((c) => c.ingredientId))
assert(consumedIds.size > 30, 'الاستهلاك بيغطي معظم المواد', `${consumedIds.size} مادة`)

const purchasedIds = new Set(seed.purchases.flatMap((p) => p.lines.map((l) => l.ingredientId)))
const uncovered = [...consumedIds].filter((id) => !purchasedIds.has(id))
assert(uncovered.length === 0, 'كل مادة مستهلكة لها مشتريات تغطّيها', `${uncovered.length} مادة بدون شراء`)

assert(seed.counts.length > 0 && seed.waste.length > 0, 'في جلسات جرد وحركات هدر',
  `${seed.counts.length} جرد · ${seed.waste.length} هدر`)
assert(seed.shifts.length > 0, 'في ورديات كاشير مقفولة', `${seed.shifts.length}`)

/* ---------------- 7) العمليات الكتابية ---------------- */
section('العمليات الكتابية')

setActivePinia(createPinia())
const { useAuthStore } = await import('../src/stores/auth.js')
const { useOpsStore } = await import('../src/stores/ops.js')
const { usePosStore } = await import('../src/stores/pos.js')
const { useCatalogStore } = await import('../src/stores/catalog.js')

const auth = useAuthStore()
const opsStore = useOpsStore()
const pos = usePosStore()
const catalog = useCatalogStore()

auth.loginWithPin('1111')
opsStore.init()
opsStore.resetLive()

const journalBefore = opsStore.journal.length
const stockOf = (ingId) => opsStore.stockByIngredient.get(ingId)?.qtyBase || 0

/* --- بيع كامل على الـ POS --- */
pos.newTicket('dine_in')
pos.setType('dine_in')
pos.addItem('M-PIZZAMARG')
pos.addItem('M-PIZZAMARG')
pos.addItem('M-BURGER')
pos.addItem('M-TEA')
assert(pos.totals.qty === 4, 'إضافة أطباق للتذكرة بتجمع الكميات', `qty=${pos.totals.qty}`)
assert(pos.totals.total > 0 && pos.totals.cost > 0, 'التذكرة بتحسب إجمالي وتكلفة', `total=${round(pos.totals.total, 2)}`)

const doughBefore = stockOf('ING-060')
const expectedTotal = pos.totals.total
const sale = pos.pay([{ method: 'cash', amount: expectedTotal }])
assert(sale.ok, 'الدفع بينجح ويقفل الأوردر')
assert(sale.order.status === 'paid' && sale.order.number, 'الأوردر بيتسجّل مدفوع وبرقم', sale.order?.number)
assert(
  Math.abs(sale.totals.total - expectedTotal) < 0.02,
  'إجمالي الفاتورة بعد الدفع = اللي كان معروض',
)
assert(pos.isEmpty, 'التذكرة بتفضى بعد البيع')

const doughAfter = stockOf('ING-060')
assert(doughAfter < doughBefore, 'بيع البيتزا خصم الدقيق من المخزون',
  `${round(doughBefore, 1)} → ${round(doughAfter, 1)}`)

const newEntries = opsStore.journal.slice(journalBefore)
assert(newEntries.length >= 2, 'البيع سجّل قيد إيراد وقيد تكلفة', `${newEntries.length} قيد`)
assert(newEntries.every((e) => e.isBalanced), 'قيود البيع الجديدة متوازنة')
const saleEntry = newEntries.find((e) => e.source === 'sale')
assert(
  saleEntry && Math.abs(sum(saleEntry.lines, (l) => l.debit) - sum(saleEntry.lines, (l) => l.credit)) < 0.005,
  'قيد البيع متوازن بالقرش',
)
const cogsEntry = newEntries.find((e) => e.source === 'cogs')
assert(cogsEntry && cogsEntry.debit > 0, 'قيد تكلفة المبيعات بقيمة موجبة', `${round(cogsEntry?.debit || 0, 2)}`)

/* --- الإضافات بتغيّر السعر والتكلفة --- */
pos.newTicket('delivery')
const lineA = pos.addItem('M-PIZZAMARG')
const priceBase = lineA.unitPrice
const costBase = lineA.unitCost
pos.setOptions(lineA.id, ['OPT-SZ-L', 'OPT-XCHEESE'])
const after = pos.ticket.lines[0]
assert(after.unitPrice > priceBase, 'اختيار الحجم الكبير بيرفع السعر', `${priceBase} → ${after.unitPrice}`)
assert(after.unitCost > costBase, 'الحجم الكبير + الجبنة الزيادة بيرفعوا التكلفة',
  `${round(costBase, 2)} → ${round(after.unitCost, 2)}`)
assert(after.unitCost > costBase * 1.5, 'مضاعف كمية الحجم الكبير مطبّق على كل المكوّنات')
pos.newTicket()

/* --- هدر --- */
const tomatoBefore = stockOf('ING-040')
const wasteRec = opsStore.recordWaste({
  branchId: 'BR-01',
  warehouseId: 'WH-KIT',
  reasonId: 'WR-EXPIRE',
  lines: [{ ingredientId: 'ING-040', qty: 3, unit: 'kg' }],
})
assert(wasteRec.value > 0, 'الهدر بيتسعّر بتكلفة الشراء', `${round(wasteRec.value, 2)}`)
assert(
  Math.abs(stockOf('ING-040') - (tomatoBefore - 3000)) < 1,
  'الهدر خصم 3 كجم طماطم من المخزون',
)

/* --- شراء --- */
const purchaseRec = opsStore.recordPurchase({
  supplierId: 'SP-02',
  branchId: 'BR-01',
  warehouseId: 'WH-MAIN',
  lines: [{ ingredientId: 'ING-040', qty: 20, unit: 'kg', unitCost: 26 }],
})
assert(Math.abs(purchaseRec.net - 520) < 0.01, 'صافي الفاتورة = الكمية × السعر', `${purchaseRec.net}`)
assert(Math.abs(purchaseRec.total - 520 * 1.14) < 0.02, 'الإجمالي بيضيف القيمة المضافة')
assert(
  stockOf('ING-040') > tomatoBefore - 3000,
  'الشراء رجّع الرصيد فوق',
)

/* --- جرد --- */
const countRec = opsStore.postCount({
  warehouseId: 'WH-MAIN',
  branchId: 'BR-01',
  countedBy: 'U-01',
  lines: [{ ingredientId: 'ING-063', systemBase: 5000, countedBase: 4800, unit: 'g' }],
})
assert(countRec.varianceValue < 0, 'الجرد الناقص بيسجّل فرق سالب', `${countRec.varianceValue}`)
const varianceEntry = opsStore.journal.find((e) => e.source === 'variance' && e.refId === countRec.id)
assert(varianceEntry && varianceEntry.isBalanced, 'قيد فرق الجرد موجود ومتوازن')

/* --- مصروف --- */
opsStore.recordExpense({ accountId: 'A-6030', amount: 1500, memoAr: 'فاتورة كهرباء', branchId: 'BR-01' })
const expEntry = opsStore.journal.find((e) => e.source === 'expense' && e.lines.some((l) => l.debit === 1500))
assert(expEntry && expEntry.isBalanced, 'قيد المصروف اليدوي متوازن')

/* --- الدفتر لسه متوازن بعد كل ده --- */
const tb2 = trialBalance(opsStore.journal, { from: addDays(new Date(), -40), to: new Date() })
assert(tb2.isBalanced, 'ميزان المراجعة متوازن بعد كل الحركات الجديدة',
  `${round(tb2.totalDebit, 2)} / ${round(tb2.totalCredit, 2)}`)

const negStock = opsStore.stock.filter((s) => s.qtyBase < -0.5)
assert(negStock.length === 0, 'مافيش رصيد سالب بعد الحركات', `${negStock.length} سطر`)

/* --- bump من شاشة المطبخ على أوردر من بيانات العرض --- */
const kitchenOrder = opsStore.openOrders.find((o) => o.lines.some((l) => l.kdsStatus === 'queued'))
assert(!!kitchenOrder, 'في أوردر مفتوح فيه سطر في الانتظار')
if (kitchenOrder) {
  const line = kitchenOrder.lines.find((l) => l.kdsStatus === 'queued')
  opsStore.setLineStatus(kitchenOrder.id, line.id, 'firing')
  const updated = opsStore.openOrders.find((o) => o.id === kitchenOrder.id)
  const updatedLine = updated?.lines.find((l) => l.id === line.id)
  assert(updatedLine?.kdsStatus === 'firing', 'تغيير حالة السطر من KDS بيتسجّل', updatedLine?.kdsStatus)
  assert(
    opsStore.live.orders.some((o) => o.id === kitchenOrder.id),
    'أوردر العرض بينتقل للطبقة الحيّة أول تعديل عليه',
  )

  // تجهيز كل السطور بيخلّي الأوردر جاهز
  for (const l of updated.lines) if (!l.isVoid) opsStore.setLineStatus(kitchenOrder.id, l.id, 'ready')
  const ready = opsStore.openOrders.find((o) => o.id === kitchenOrder.id)
  assert(ready?.status === 'ready', 'تجهيز كل السطور بيحوّل الأوردر لـ جاهز', ready?.status)

  /* --- استكمال أوردر مفتوح على الكاشير ودفعه --- */
  const loaded = pos.loadOrder(kitchenOrder.id)
  assert(loaded, 'الكاشير بيقدر يفتح أوردر مفتوح')
  assert(pos.ticket.number === kitchenOrder.number, 'التذكرة المفتوحة بنفس الرقم', pos.ticket.number)
  const resumeTotal = pos.totals.total
  const resumed = pos.pay([{ method: 'card', amount: resumeTotal }])
  assert(resumed.ok && resumed.order.status === 'paid', 'دفع أوردر مفتوح بيقفله')
  assert(
    !opsStore.openOrders.some((o) => o.id === kitchenOrder.id),
    'الأوردر المدفوع خرج من قائمة المفتوحة',
  )
}

/* --- تعديل سعر مادة يعيد حساب الوصفات --- */
const margBefore = catalog.costOf('M-PIZZAMARG').unitCost
catalog.updateIngredient('ING-020', { purchaseCost: 400 })
const margAfter = catalog.costOf('M-PIZZAMARG').unitCost
assert(margAfter > margBefore, 'رفع سعر الموتزاريلا رفع تكلفة البيتزا فورًا',
  `${round(margBefore, 2)} → ${round(margAfter, 2)}`)
catalog.resetOverrides()
assert(
  Math.abs(catalog.costOf('M-PIZZAMARG').unitCost - margBefore) < 0.01,
  'إرجاع الكتالوج بيرجّع التكلفة الأصلية',
)

/* ---------------- النتيجة ---------------- */
console.log(`\n${failures === 0 ? '✓ كل الفحوصات نجحت' : `✗ ${failures} فحص فشل`} (${checks} فحص)`)
process.exit(failures === 0 ? 0 : 1)
