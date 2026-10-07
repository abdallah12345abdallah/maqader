import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { USERS, BRANCHES, ROLES, ACCESS } from '@/data/org'
import { storage } from '@/lib/utils'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref(storage.get('userId', null))
  const branchId = ref(storage.get('branchId', BRANCHES.find((b) => b.isDefault)?.id || BRANCHES[0].id))

  const user = computed(() => USERS.find((u) => u.id === userId.value) || null)
  const isAuthed = computed(() => !!user.value)
  const role = computed(() => user.value?.role || null)
  const roleLabel = computed(() => ROLES[role.value] || null)
  const branch = computed(() => BRANCHES.find((b) => b.id === branchId.value) || BRANCHES[0])

  /** دخول بالـ PIN — نفس منطق شاشات الـ POS الحقيقية */
  function loginWithPin(pin) {
    const found = USERS.find((u) => u.pin === String(pin).trim())
    if (!found) return { ok: false, error: 'INVALID_PIN' }
    userId.value = found.id
    branchId.value = found.branchId
    storage.set('userId', found.id)
    storage.set('branchId', found.branchId)
    return { ok: true, user: found }
  }

  function logout() {
    userId.value = null
    storage.remove('userId')
  }

  function setBranch(id) {
    branchId.value = id
    storage.set('branchId', id)
  }

  /** هل الدور الحالي يوصل للموديول؟ */
  function can(module) {
    if (!role.value) return false
    const allowed = ACCESS[module]
    if (!allowed) return true
    return allowed.includes(role.value)
  }

  return { userId, branchId, user, isAuthed, role, roleLabel, branch, loginWithPin, logout, setBranch, can }
})
