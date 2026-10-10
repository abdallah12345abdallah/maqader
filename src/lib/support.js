/**
 * محرك خدمة الدعم — دوال نقية: حساب الـ SLA لكل تذكرة، مؤشرات الخدمة،
 * بحث قاعدة المعرفة، وفحوصات صحة النظام.
 *
 * عدّاد الـ SLA بيتوقف وقت ما التذكرة مستنية رد العميل (`pauses`)،
 * عشان ما نحاسبش الدعم على وقت مش في يده.
 */

import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUS,
  SUPPORT_CATEGORIES,
  KB_ARTICLES,
  CATEGORY_ROUTING,
} from '@/data/support'
import { round, sum, safeDiv, clamp } from './utils'

const PRI = new Map(SUPPORT_PRIORITIES.map((p) => [p.id, p]))
const CAT = new Map(SUPPORT_CATEGORIES.map((c) => [c.id, c]))

export const priorityOf = (id) => PRI.get(id) || PRI.get('P3')
export const categoryOf = (id) => CAT.get(id) || null
export const statusOf = (id) => SUPPORT_STATUS[id] || SUPPORT_STATUS.open
export const isOpenStatus = (id) => !!statusOf(id).isOpen
export const agentForCategory = (categoryId) => CATEGORY_ROUTING[categoryId] || 'AG-01'

const minsBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 60000

/** الدقائق اللي التذكرة قعدتها مستنية رد العميل لحد وقت معيّن */
export function pausedMins(ticket, until = Date.now()) {
  const end = new Date(until).getTime()
  return sum(ticket?.pauses || [], (p) => {
    const from = new Date(p.from).getTime()
    const to = p.to ? new Date(p.to).getTime() : end
    return Math.max(0, (Math.min(to, end) - from) / 60000)
  })
}

/**
 * حالة الـ SLA لتذكرة واحدة.
 *
 * الهدف النشط = زمن أول رد قبل ما الدعم يرد، وزمن الحل بعد كده.
 * - `state`: met | missed | paused | running | due_soon | breached
 * - `remainingMins` سالبة معناها تأخير عن الهدف.
 */
export function ticketSla(ticket, now = Date.now()) {
  const pri = priorityOf(ticket?.priorityId)
  const status = statusOf(ticket?.status)
  const createdAt = ticket?.createdAt || new Date(now).toISOString()
  const endedAt = ticket?.resolvedAt || ticket?.closedAt || null

  const responseTargetMins = pri.responseMins
  const resolveTargetMins = pri.resolveMins

  const firstResponseMins = ticket?.firstResponseAt
    ? round(minsBetween(createdAt, ticket.firstResponseAt), 1)
    : null
  const responseMet = firstResponseMins === null ? null : firstResponseMins <= responseTargetMins

  const paused = round(pausedMins(ticket, endedAt || now), 1)
  const rawElapsed = minsBetween(createdAt, endedAt || now)
  const clockMins = round(Math.max(0, rawElapsed - paused), 1)

  const resolutionMins = endedAt ? clockMins : null
  const resolutionMet = endedAt ? resolutionMins <= resolveTargetMins : null

  /** الهدف النشط ومتى يستحق */
  const targetMins = ticket?.firstResponseAt ? resolveTargetMins : responseTargetMins
  const dueAt = new Date(new Date(createdAt).getTime() + (targetMins + paused) * 60000).toISOString()
  const remainingMins = status.isOpen ? round(targetMins - clockMins, 1) : null
  const overdue = status.isOpen ? remainingMins < 0 : false
  const progress = clamp(safeDiv(clockMins, targetMins), 0, 1)

  let state
  if (!status.isOpen) state = responseMet !== false && resolutionMet !== false ? 'met' : 'missed'
  else if (status.stopsClock) state = 'paused'
  else if (overdue) state = 'breached'
  else if (remainingMins <= targetMins * 0.25) state = 'due_soon'
  else state = 'running'

  const tone = {
    met: 'basil',
    missed: 'saffron',
    paused: 'sky',
    running: 'basil',
    due_soon: 'saffron',
    breached: 'tomato',
  }[state]

  return {
    priority: pri,
    status,
    responseTargetMins,
    resolveTargetMins,
    targetMins,
    firstResponseMins,
    responseMet,
    resolutionMins,
    resolutionMet,
    pausedMins: paused,
    clockMins,
    dueAt,
    remainingMins,
    overdue,
    progress,
    state,
    tone,
  }
}

/** مؤشرات الخدمة لمجموعة تذاكر — نفس الأرقام اللي العميل بيحاسبنا عليها */
export function ticketMetrics(tickets = [], now = Date.now()) {
  const slas = tickets.map((t) => ({ ticket: t, sla: ticketSla(t, now) }))
  const open = slas.filter((x) => x.sla.status.isOpen)
  const answered = slas.filter((x) => x.sla.firstResponseMins !== null)
  const ended = slas.filter((x) => x.sla.resolutionMins !== null)

  const byStatus = {}
  for (const key of Object.keys(SUPPORT_STATUS)) byStatus[key] = 0
  for (const x of slas) byStatus[x.ticket.status] = (byStatus[x.ticket.status] || 0) + 1

  const byPriority = {}
  for (const p of SUPPORT_PRIORITIES) byPriority[p.id] = 0
  for (const x of slas) byPriority[x.ticket.priorityId] = (byPriority[x.ticket.priorityId] || 0) + 1

  const byCategory = SUPPORT_CATEGORIES.map((c) => ({
    category: c,
    count: slas.filter((x) => x.ticket.categoryId === c.id).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  const rated = tickets.filter((t) => t.csat?.stars)

  return {
    total: tickets.length,
    open: open.length,
    openTickets: open.map((x) => x.ticket),
    byStatus,
    byPriority,
    byCategory,
    breached: open.filter((x) => x.sla.state === 'breached').map((x) => x.ticket),
    dueSoon: open.filter((x) => x.sla.state === 'due_soon').map((x) => x.ticket),
    awaitingCustomer: open.filter((x) => x.sla.status.stopsClock).map((x) => x.ticket),
    avgFirstResponseMins: round(safeDiv(sum(answered, (x) => x.sla.firstResponseMins), answered.length), 1),
    avgResolutionMins: round(safeDiv(sum(ended, (x) => x.sla.resolutionMins), ended.length), 1),
    responseSlaPct: safeDiv(answered.filter((x) => x.sla.responseMet).length, answered.length),
    resolveSlaPct: safeDiv(ended.filter((x) => x.sla.resolutionMet).length, ended.length),
    resolvedCount: ended.length,
    csatAvg: round(safeDiv(sum(rated, (t) => t.csat.stars), rated.length), 2),
    csatCount: rated.length,
    deflectionReady: tickets.filter((t) => t.articleId).length,
  }
}

/* ====================== قاعدة المعرفة ====================== */

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[ـً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const fieldsOf = (article, locale) =>
  locale === 'en'
    ? {
        title: article.titleEn,
        summary: article.summaryEn,
        tags: article.tagsEn || [],
        steps: article.stepsEn || [],
      }
    : {
        title: article.titleAr,
        summary: article.summaryAr,
        tags: article.tagsAr || [],
        steps: article.stepsAr || [],
      }

/** ترتيب مقالات قاعدة المعرفة: العنوان أهم من الوسم، والوسم أهم من المتن */
export function searchArticles(query, { locale = 'ar', categoryId = '', articles = KB_ARTICLES } = {}) {
  const pool = categoryId ? articles.filter((a) => a.categoryId === categoryId) : articles
  const q = normalize(query)
  if (!q) return [...pool].sort((a, b) => b.views - a.views)

  const terms = q.split(' ').filter((w) => w.length > 1)
  if (!terms.length) return [...pool].sort((a, b) => b.views - a.views)

  return pool
    .map((article) => {
      const f = fieldsOf(article, locale)
      const title = normalize(f.title)
      const summary = normalize(f.summary)
      const tags = normalize(f.tags.join(' '))
      const steps = normalize(f.steps.join(' '))
      let score = 0
      for (const term of terms) {
        if (title.includes(term)) score += 4
        if (tags.includes(term)) score += 2.5
        if (summary.includes(term)) score += 1.5
        if (steps.includes(term)) score += 1
      }
      return { article, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.article.views - a.article.views)
    .map((r) => r.article)
}

/** مقالات مقترحة قبل فتح التذكرة — بتقلّل التذاكر المتكررة */
export function suggestArticles(
  { subject = '', categoryId = '', body = '' },
  { locale = 'ar', limit = 3, articles = KB_ARTICLES } = {},
) {
  const text = `${subject} ${body}`.trim()
  const hits = text ? searchArticles(text, { locale, articles }) : []
  const sameCat = categoryId ? articles.filter((a) => a.categoryId === categoryId) : []
  const seen = new Set()
  const out = []
  for (const a of [...hits, ...sameCat]) {
    if (seen.has(a.id)) continue
    seen.add(a.id)
    out.push(a)
    if (out.length >= limit) break
  }
  return out
}

/* ====================== فحص صحة النظام ====================== */

const stateTone = { ok: 'basil', warn: 'saffron', fail: 'tomato' }

const check = (id, nameAr, nameEn, status, detailAr, detailEn, route = '') => ({
  id,
  nameAr,
  nameEn,
  status,
  detailAr,
  detailEn,
  route,
  tone: stateTone[status],
})

/**
 * نفس روح `npm run verify` بس جوه الشاشة: بيفرّق لفريق الدعم
 * بين مشكلة بيانات ومشكلة جهاز قبل أي تذكرة.
 */
export function runHealthChecks(input = {}) {
  const {
    ledgerBalanced = true,
    ledgerDebit = 0,
    ledgerCredit = 0,
    negativeStockRows = 0,
    lowStockCount = 0,
    expiringCount = 0,
    recipeErrors = [],
    stuckOrders = 0,
    openOrders = 0,
    wastePct = 0,
    foodCostPct = 0,
    storageKb = 0,
    lastCountDays = null,
  } = input

  const checks = [
    check(
      'ledger',
      'توازن دفتر اليومية',
      'Journal balance',
      ledgerBalanced ? 'ok' : 'fail',
      ledgerBalanced
        ? 'كل القيود متوازنة مدين = دائن'
        : `فرق ${round(Math.abs(ledgerDebit - ledgerCredit), 2)} بين المدين والدائن`,
      ledgerBalanced ? 'All entries balanced' : `Out by ${round(Math.abs(ledgerDebit - ledgerCredit), 2)}`,
      '/accounting/journal',
    ),
    check(
      'stock',
      'أرصدة المخزون',
      'Stock balances',
      negativeStockRows ? 'fail' : 'ok',
      negativeStockRows ? `${negativeStockRows} سطر برصيد سالب` : 'مافيش رصيد سالب',
      negativeStockRows ? `${negativeStockRows} rows below zero` : 'No negative balances',
      '/inventory',
    ),
    check(
      'recipes',
      'حساب تكلفة الوصفات',
      'Recipe costing',
      recipeErrors.length ? 'fail' : 'ok',
      recipeErrors.length
        ? `${recipeErrors.length} وصفة تكلفتها مش بتتحسب: ${recipeErrors.slice(0, 3).join(' · ')}`
        : 'كل الوصفات بتحسب تكلفة بدون أخطاء',
      recipeErrors.length ? `${recipeErrors.length} recipes fail to cost` : 'All recipes cost cleanly',
      '/recipes/costing',
    ),
    check(
      'reorder',
      'مواد تحت حد الطلب',
      'Items below reorder point',
      lowStockCount > 8 ? 'warn' : 'ok',
      lowStockCount ? `${lowStockCount} مادة محتاجة توريد` : 'كل المواد فوق الحد',
      lowStockCount ? `${lowStockCount} items need ordering` : 'All items above the point',
      '/inventory',
    ),
    check(
      'expiry',
      'مواد قربت تنتهي',
      'Items expiring soon',
      expiringCount > 5 ? 'warn' : 'ok',
      expiringCount ? `${expiringCount} مادة صلاحيتها خلال أسبوع` : 'مافيش صلاحيات قريبة',
      expiringCount ? `${expiringCount} items expire within a week` : 'Nothing expiring soon',
      '/inventory',
    ),
    check(
      'stuck',
      'أوردرات متعلّقة',
      'Stuck open orders',
      stuckOrders ? 'warn' : 'ok',
      stuckOrders
        ? `${stuckOrders} أوردر مفتوح من أكتر من ساعتين من إجمالي ${openOrders}`
        : `${openOrders} أوردر مفتوح، كلهم في الزمن الطبيعي`,
      stuckOrders ? `${stuckOrders} of ${openOrders} open orders are over 2h old` : `${openOrders} open orders, all fresh`,
      '/pos',
    ),
    check(
      'waste',
      'نسبة الهدر',
      'Waste ratio',
      wastePct > 0.03 ? 'warn' : 'ok',
      `${round(wastePct * 100, 1)}% من المبيعات (الحد المقبول 3%)`,
      `${round(wastePct * 100, 1)}% of sales (3% tolerance)`,
      '/inventory/waste',
    ),
    check(
      'foodcost',
      'نسبة تكلفة الطعام',
      'Food cost ratio',
      foodCostPct > 0.4 ? 'warn' : 'ok',
      `${round(foodCostPct * 100, 1)}% من الإيراد الصافي`,
      `${round(foodCostPct * 100, 1)}% of net revenue`,
      '/accounting',
    ),
    check(
      'counts',
      'آخر جرد مرحّل',
      'Last posted count',
      lastCountDays === null || lastCountDays > 14 ? 'warn' : 'ok',
      lastCountDays === null ? 'مافيش جرد مرحّل' : `آخر جرد منذ ${lastCountDays} يوم`,
      lastCountDays === null ? 'No posted count' : `Last count ${lastCountDays} days ago`,
      '/inventory/counts',
    ),
    check(
      'storage',
      'مساحة الحفظ على الجهاز',
      'Local storage usage',
      storageKb > 3500 ? 'warn' : 'ok',
      `${round(storageKb, 0)} كيلوبايت محفوظة محليًا`,
      `${round(storageKb, 0)} KB stored locally`,
      '/settings',
    ),
  ]

  return checks
}

/** درجة صحة واحدة من الفحوصات — الفشل بيوزن أتقل من التحذير */
export function healthScore(checks = []) {
  const fail = checks.filter((c) => c.status === 'fail').length
  const warn = checks.filter((c) => c.status === 'warn').length
  const penalty = fail * 1 + warn * 0.35
  const score = clamp(safeDiv(checks.length - penalty, checks.length), 0, 1)
  return {
    score,
    fail,
    warn,
    ok: checks.length - fail - warn,
    total: checks.length,
    status: fail ? 'fail' : warn ? 'warn' : 'ok',
    tone: fail ? 'tomato' : warn ? 'saffron' : 'basil',
  }
}
