import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  buildSupportSeed,
  planUsage,
  SUPPORT_STATUS,
  KB_ARTICLES,
  supportPriorityMap,
} from '@/data/support'
import { APP_INFO } from '@/data/org'
import { ticketMetrics, ticketSla, agentForCategory, statusOf } from '@/lib/support'
import { trialBalance } from '@/lib/gl'
import { storage, round, addDays } from '@/lib/utils'
import { useOpsStore } from './ops'
import { useCatalogStore } from './catalog'
import { useAuthStore } from './auth'
import { useUiStore } from './ui'

const EMPTY_LIVE = () => ({
  /** تذاكر أنشأها المستخدم + نسخ معدّلة من تذاكر العرض */
  tickets: [],
  /** تصويت «كان مفيدًا» على مقالات قاعدة المعرفة */
  helpful: {},
})

/**
 * خدمة الدعم — نفس معمارية `ops`: تاريخ تذاكر حتمي يتولّد عند كل تحميل،
 * وأي حركة من المستخدم تُحفظ كـ delta في localStorage فوقه.
 *
 * التعديل على تذكرة من بيانات العرض بينقلها للطبقة الحيّة أول مرة،
 * فالبيانات الأصلية تفضل سليمة و`resetSupport()` بيرجّعها.
 */
export const useSupportStore = defineStore('support', () => {
  const seed = ref(null)
  const live = ref({ ...EMPTY_LIVE(), ...(storage.get('support', {}) || {}) })
  const ready = computed(() => !!seed.value)

  const persist = () => storage.set('support', live.value)

  function init(force = false) {
    if (seed.value && !force) return
    seed.value = buildSupportSeed()
  }

  /* ---------------- قراءة ---------------- */

  const tickets = computed(() => {
    const liveIds = new Set(live.value.tickets.map((t) => t.id))
    return [...live.value.tickets, ...(seed.value?.tickets || []).filter((t) => !liveIds.has(t.id))].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
  })

  const ticketMap = computed(() => new Map(tickets.value.map((t) => [t.id, t])))
  const byId = (id) => ticketMap.value.get(id) || null

  const openTickets = computed(() => tickets.value.filter((t) => statusOf(t.status).isOpen))
  const metrics = computed(() => ticketMetrics(tickets.value))
  const usage = computed(() => planUsage(tickets.value))

  /** مقالات قاعدة المعرفة + تصويت المستخدم المحلي */
  const articles = computed(() =>
    KB_ARTICLES.map((a) => ({
      ...a,
      helpful: a.helpful + (live.value.helpful[a.id] === 1 ? 1 : 0),
      myVote: live.value.helpful[a.id] || 0,
    })),
  )

  const slaOf = (ticket) => ticketSla(ticket)

  /* ---------------- كتابة ---------------- */

  /** نقل تذكرة من بيانات العرض للطبقة الحيّة قبل أول تعديل */
  function materialize(id) {
    const inLive = live.value.tickets.find((t) => t.id === id)
    if (inLive) return inLive
    const fromSeed = (seed.value?.tickets || []).find((t) => t.id === id)
    if (!fromSeed) return null
    const copy = JSON.parse(JSON.stringify(fromSeed))
    live.value.tickets = [copy, ...live.value.tickets]
    return copy
  }

  function patch(id, mutate) {
    const ticket = materialize(id)
    if (!ticket) return null
    live.value.tickets = live.value.tickets.map((t) => (t.id === id ? mutate({ ...t }) : t))
    persist()
    return byId(id)
  }

  const nextNumber = () => {
    const nums = tickets.value
      .map((t) => Number(String(t.number).replace(/\D/g, '')))
      .filter((n) => Number.isFinite(n))
    return `SP-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`
  }

  /** تذكرة جديدة — بتتوجّه تلقائيًا حسب التصنيف وبترد بإيصال استلام فيه الـ SLA */
  function createTicket({
    subject,
    categoryId,
    priorityId,
    body,
    branchId,
    userId,
    channel = 'app',
    articleId = null,
    diagnostics = null,
  }) {
    const number = nextNumber()
    const id = `SUP-${number.slice(3)}-L`
    const at = new Date().toISOString()
    const pri = supportPriorityMap.get(priorityId) || supportPriorityMap.get('P3')

    const ticket = {
      id,
      number,
      subjectAr: subject,
      subjectEn: subject,
      categoryId,
      priorityId: pri.id,
      status: 'open',
      branchId,
      createdBy: userId,
      createdAt: at,
      channel,
      assigneeId: agentForCategory(categoryId),
      articleId,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      reopenCount: 0,
      csat: null,
      pauses: [],
      diagnostics,
      messages: [
        { id: `${id}-M1`, author: 'customer', userId, bodyAr: body, bodyEn: body, at },
        {
          id: `${id}-M2`,
          author: 'system',
          bodyAr: `استلمنا تذكرتك. أولوية «${pri.nameAr}» — أول رد متوقع خلال ${pri.responseMins} دقيقة.`,
          bodyEn: `Ticket received. Priority ${pri.nameEn} — first reply expected within ${pri.responseMins} minutes.`,
          at,
        },
      ],
    }

    live.value.tickets = [ticket, ...live.value.tickets]
    persist()
    return ticket
  }

  /**
   * رد العميل — بيقفل فترة الانتظار، ولو التذكرة كانت متحلّة
   * الرد بيعيد فتحها ويرجّع عدّاد الـ SLA للشغل.
   */
  function reply(id, body) {
    const at = new Date().toISOString()
    return patch(id, (t) => {
      const wasOpen = statusOf(t.status).isOpen
      return {
        ...t,
        messages: [
          ...t.messages,
          { id: `${t.id}-M${t.messages.length + 1}`, author: 'customer', userId: t.createdBy, bodyAr: body, bodyEn: body, at },
        ],
        pauses: (t.pauses || []).map((p) => (p.to ? p : { ...p, to: at })),
        status: 'in_progress',
        resolvedAt: wasOpen ? t.resolvedAt : null,
        closedAt: wasOpen ? t.closedAt : null,
        reopenCount: wasOpen ? t.reopenCount || 0 : (t.reopenCount || 0) + 1,
      }
    })
  }

  /** العميل بيقفل التذكرة بنفسه — المشكلة اتحلّت أو الحل وصل */
  function resolveTicket(id, noteAr = '') {
    const at = new Date().toISOString()
    return patch(id, (t) => ({
      ...t,
      status: 'resolved',
      resolvedAt: at,
      firstResponseAt: t.firstResponseAt || at,
      pauses: (t.pauses || []).map((p) => (p.to ? p : { ...p, to: at })),
      messages: [
        ...t.messages,
        {
          id: `${t.id}-M${t.messages.length + 1}`,
          author: 'system',
          bodyAr: noteAr || 'العميل أكّد إن المشكلة اتحلّت.',
          bodyEn: 'Customer confirmed the issue is resolved.',
          at,
        },
      ],
    }))
  }

  function closeTicket(id) {
    const at = new Date().toISOString()
    return patch(id, (t) => ({ ...t, status: 'closed', closedAt: at, resolvedAt: t.resolvedAt || at }))
  }

  /** إعادة فتح — بترجّع العدّاد للشغل من جديد */
  function reopenTicket(id, body) {
    const at = new Date().toISOString()
    return patch(id, (t) => ({
      ...t,
      status: 'in_progress',
      resolvedAt: null,
      closedAt: null,
      reopenCount: (t.reopenCount || 0) + 1,
      csat: null,
      messages: [
        ...t.messages,
        {
          id: `${t.id}-M${t.messages.length + 1}`,
          author: 'customer',
          userId: t.createdBy,
          bodyAr: body || 'المشكلة رجعت تاني.',
          bodyEn: body || 'The issue is back.',
          at,
        },
      ],
    }))
  }

  /** تقييم الخدمة بعد الحل */
  function rateTicket(id, stars, comment = '') {
    const at = new Date().toISOString()
    return patch(id, (t) => ({
      ...t,
      csat: { stars: Math.max(1, Math.min(5, Number(stars) || 0)), commentAr: comment, commentEn: comment, at },
    }))
  }

  function voteArticle(articleId, helpful = true) {
    live.value.helpful = { ...live.value.helpful, [articleId]: helpful ? 1 : -1 }
    persist()
  }

  /**
   * لقطة تشخيص بتتبعت مع التذكرة — بتوفّر على الدعم أسئلة
   * «أنت على أي إصدار» و«الفرع إيه» و«البيانات سليمة؟».
   */
  function snapshot() {
    const ops = useOpsStore()
    const catalog = useCatalogStore()
    const auth = useAuthStore()
    const ui = useUiStore()

    const tb = trialBalance(ops.journal, { from: addDays(new Date(), -45), to: new Date() })
    const recipeErrors = catalog.recipes
      .filter((r) => catalog.costOf(r.id)?.error)
      .map((r) => r.id)

    let storageKb = 0
    try {
      storageKb = round(
        Object.keys(localStorage)
          .filter((k) => k.startsWith('maqader:'))
          .reduce((acc, k) => acc + (localStorage.getItem(k)?.length || 0), 0) / 1024,
        1,
      )
    } catch {
      storageKb = 0
    }

    return {
      at: new Date().toISOString(),
      app: { ...APP_INFO },
      user: { id: auth.userId, role: auth.role },
      branchId: auth.branchId,
      locale: ui.locale,
      theme: ui.theme,
      counts: {
        orders: ops.orders.length,
        openOrders: ops.openOrders.length,
        journal: ops.journal.length,
        liveOrders: ops.live.orders.length,
        liveMovements: ops.live.movements.length,
        recipes: catalog.recipes.length,
        ingredients: catalog.ingredients.length,
      },
      integrity: {
        ledgerBalanced: tb.isBalanced,
        negativeStockRows: ops.stock.filter((s) => s.qtyBase < 0).length,
        recipeErrors,
      },
      inventoryValue: ops.inventoryValue,
      storageKb,
      device:
        typeof navigator !== 'undefined'
          ? { ua: String(navigator.userAgent || '').slice(0, 180), lang: navigator.language || '' }
          : { ua: 'server', lang: '' },
    }
  }

  /** مسح تذاكر المستخدم وتصويته والرجوع لبيانات العرض */
  function resetSupport() {
    live.value = EMPTY_LIVE()
    persist()
  }

  return {
    seed, live, ready, init,
    tickets, ticketMap, openTickets, metrics, usage, articles,
    byId, slaOf, statuses: SUPPORT_STATUS,
    createTicket, reply, resolveTicket, closeTicket, reopenTicket, rateTicket, voteArticle,
    snapshot, resetSupport,
  }
})
