import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const AppShell = () => import('@/layouts/AppShell.vue')

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true, titleKey: 'auth.login' } },

  // شاشات تشغيلية بملء الشاشة — بدون قائمة جانبية
  { path: '/pos', name: 'pos', component: () => import('@/views/pos/PosView.vue'), meta: { module: 'pos', titleKey: 'nav.pos' } },
  { path: '/kds', name: 'kds', component: () => import('@/views/kds/KdsView.vue'), meta: { module: 'kds', titleKey: 'nav.kds' } },

  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { module: 'dashboard', titleKey: 'nav.dashboard' } },

      { path: 'recipes', name: 'recipes', component: () => import('@/views/recipes/RecipesView.vue'), meta: { module: 'recipes', titleKey: 'nav.recipesList' } },
      { path: 'recipes/costing', name: 'recipeCosting', component: () => import('@/views/recipes/CostingView.vue'), meta: { module: 'recipes', titleKey: 'nav.recipeCosting' } },
      { path: 'recipes/engineering', name: 'menuEngineering', component: () => import('@/views/recipes/EngineeringView.vue'), meta: { module: 'recipes', titleKey: 'nav.menuEngineering' } },
      { path: 'recipes/production', name: 'production', component: () => import('@/views/recipes/ProductionView.vue'), meta: { module: 'recipes', titleKey: 'nav.production' } },
      { path: 'recipes/:id', name: 'recipeDetail', component: () => import('@/views/recipes/RecipeDetailView.vue'), meta: { module: 'recipes', titleKey: 'nav.recipesList' } },

      { path: 'inventory', name: 'inventory', component: () => import('@/views/inventory/StockView.vue'), meta: { module: 'inventory', titleKey: 'nav.stock' } },
      { path: 'inventory/items', name: 'inventoryItems', component: () => import('@/views/inventory/ItemsView.vue'), meta: { module: 'inventory', titleKey: 'nav.items' } },
      { path: 'inventory/purchases', name: 'purchases', component: () => import('@/views/inventory/PurchasesView.vue'), meta: { module: 'inventory', titleKey: 'nav.purchases' } },
      { path: 'inventory/counts', name: 'counts', component: () => import('@/views/inventory/CountsView.vue'), meta: { module: 'inventory', titleKey: 'nav.counts' } },
      { path: 'inventory/waste', name: 'waste', component: () => import('@/views/inventory/WasteView.vue'), meta: { module: 'inventory', titleKey: 'nav.waste' } },
      { path: 'inventory/variance', name: 'variance', component: () => import('@/views/inventory/VarianceView.vue'), meta: { module: 'inventory', titleKey: 'nav.variance' } },

      { path: 'accounting', name: 'incomeStatement', component: () => import('@/views/accounting/IncomeStatementView.vue'), meta: { module: 'accounting', titleKey: 'nav.incomeStatement' } },
      { path: 'accounting/profitability', name: 'profitability', component: () => import('@/views/accounting/ProfitabilityView.vue'), meta: { module: 'accounting', titleKey: 'nav.profitability' } },
      { path: 'accounting/journal', name: 'journal', component: () => import('@/views/accounting/JournalView.vue'), meta: { module: 'accounting', titleKey: 'nav.journal' } },
      { path: 'accounting/expenses', name: 'expenses', component: () => import('@/views/accounting/ExpensesView.vue'), meta: { module: 'accounting', titleKey: 'nav.expenses' } },
      { path: 'accounting/shifts', name: 'shifts', component: () => import('@/views/accounting/ShiftsView.vue'), meta: { module: 'accounting', titleKey: 'nav.shifts' } },

      { path: 'settings', name: 'settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { module: 'settings', titleKey: 'nav.settings' } },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (!auth.isAuthed) return { path: '/login', query: { next: to.fullPath } }
  if (to.meta.module && !auth.can(to.meta.module)) return { path: '/' }
  return true
})

export default router
