import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

let seq = 0
export function uid(prefix = 'ID') {
  seq += 1
  return `${prefix}-${Date.now().toString(36).slice(-5)}${seq.toString(36)}`.toUpperCase()
}

export const round = (n, d = 2) => {
  const f = 10 ** d
  return Math.round((Number(n) || 0) * f + Number.EPSILON) / f
}

export const sum = (arr, pick = (x) => x) =>
  arr.reduce((acc, x) => acc + (Number(pick(x)) || 0), 0)

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

export function groupBy(arr, key) {
  const fn = typeof key === 'function' ? key : (x) => x[key]
  return arr.reduce((acc, item) => {
    const k = fn(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export const byId = (arr) => new Map(arr.map((x) => [x.id, x]))

export const safeDiv = (a, b) => (!b ? 0 : a / b)

/** بداية/نهاية اليوم بتوقيت الجهاز */
export const startOfDay = (d = new Date()) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const endOfDay = (d = new Date()) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const isoDate = (d = new Date()) => {
  const x = startOfDay(d)
  const m = String(x.getMonth() + 1).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${String(x.getDate()).padStart(2, '0')}`
}

/** هل التاريخ داخل المدى (شامل الطرفين) */
export function inRange(dateLike, from, to) {
  const t = new Date(dateLike).getTime()
  return t >= startOfDay(from).getTime() && t <= endOfDay(to).getTime()
}

/** تخزين محلي آمن — الـ mock backend بيعتمد عليه */
const NS = 'maqader:'
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value))
    } catch {
      /* الحصة ممتلئة — نتجاهل */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(NS + key)
    } catch {
      /* ignore */
    }
  },
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(NS))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  },
}

/** تأخير اصطناعي لمحاكاة شبكة */
export const sleep = (ms = 180) => new Promise((r) => setTimeout(r, ms))
