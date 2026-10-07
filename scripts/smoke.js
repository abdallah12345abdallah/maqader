/**
 * Smoke test: يرسم كل شاشة فعليًا (SSR) ويمسك أخطاء التشغيل — بدون متصفح.
 *   npm run smoke
 *
 * بيشغّل setup() والقوالب بالبيانات الحقيقية، فأي خاصية غلط أو import ناقص
 * أو computed بيضرب بيظهر هنا.
 */

/* ---- تهيئة بيئة متصفح مبسطة قبل تحميل أي كود واجهة ---- */
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
}
const classList = { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false }
globalThis.document = {
  documentElement: { classList, lang: 'ar', dir: 'rtl', style: {} },
  body: { style: {} },
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  print: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  location: { pathname: '/', search: '', hash: '' },
  navigator: { userAgent: 'node' },
  document: globalThis.document,
}
globalThis.history = {
  state: {},
  length: 1,
  scrollRestoration: 'auto',
  pushState: () => {},
  replaceState: () => {},
  go: () => {},
  back: () => {},
  forward: () => {},
}
globalThis.window.history = globalThis.history
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)

const { createSSRApp, h } = await import('vue')
const { renderToString } = await import('vue/server-renderer')
const { createPinia } = await import('pinia')
const { createI18n } = await import('vue-i18n')
const { createRouter, createMemoryHistory } = await import('vue-router')

const ar = (await import('../src/locales/ar.json')).default
const en = (await import('../src/locales/en.json')).default
const { useOpsStore } = await import('../src/stores/ops.js')
const { useAuthStore } = await import('../src/stores/auth.js')

/* ---- الشاشات ---- */
const SCREENS = [
  ['LoginView', '/login', () => import('../src/views/LoginView.vue')],
  ['DashboardView', '/', () => import('../src/views/DashboardView.vue')],
  ['PosView', '/pos', () => import('../src/views/pos/PosView.vue')],
  ['KdsView', '/kds', () => import('../src/views/kds/KdsView.vue')],
  ['RecipesView', '/recipes', () => import('../src/views/recipes/RecipesView.vue')],
  ['RecipeDetailView', '/recipes/M-PIZZAMARG', () => import('../src/views/recipes/RecipeDetailView.vue')],
  ['RecipeDetailView (prep)', '/recipes/PREP-TOMSAUCE', () => import('../src/views/recipes/RecipeDetailView.vue')],
  ['CostingView', '/recipes/costing', () => import('../src/views/recipes/CostingView.vue')],
  ['EngineeringView', '/recipes/engineering', () => import('../src/views/recipes/EngineeringView.vue')],
  ['ProductionView', '/recipes/production', () => import('../src/views/recipes/ProductionView.vue')],
  ['StockView', '/inventory', () => import('../src/views/inventory/StockView.vue')],
  ['ItemsView', '/inventory/items', () => import('../src/views/inventory/ItemsView.vue')],
  ['PurchasesView', '/inventory/purchases', () => import('../src/views/inventory/PurchasesView.vue')],
  ['CountsView', '/inventory/counts', () => import('../src/views/inventory/CountsView.vue')],
  ['WasteView', '/inventory/waste', () => import('../src/views/inventory/WasteView.vue')],
  ['VarianceView', '/inventory/variance', () => import('../src/views/inventory/VarianceView.vue')],
  ['IncomeStatementView', '/accounting', () => import('../src/views/accounting/IncomeStatementView.vue')],
  ['ProfitabilityView', '/accounting/profitability', () => import('../src/views/accounting/ProfitabilityView.vue')],
  ['JournalView', '/accounting/journal', () => import('../src/views/accounting/JournalView.vue')],
  ['ExpensesView', '/accounting/expenses', () => import('../src/views/accounting/ExpensesView.vue')],
  ['ShiftsView', '/accounting/shifts', () => import('../src/views/accounting/ShiftsView.vue')],
  ['SettingsView', '/settings', () => import('../src/views/settings/SettingsView.vue')],
  ['AppSidebar', '/', () => import('../src/layouts/AppSidebar.vue')],
  ['AppTopbar', '/', () => import('../src/layouts/AppTopbar.vue')],
]

let failures = 0
let seedOnce = null

for (const [name, path, loader] of SCREENS) {
  const warnings = []
  try {
    const Component = (await loader()).default
    const pinia = createPinia()
    const i18n = createI18n({ legacy: false, globalInjection: true, locale: 'ar', fallbackLocale: 'ar', messages: { ar, en } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        // لازم نعرّف مسار الـ param الحقيقي، وإلا شاشة التفاصيل ترسم حالة "غير موجود"
        { path: '/recipes/:id', component: { render: () => h('div') }, meta: { titleKey: 'nav.recipesList' } },
        { path: '/:pathMatch(.*)*', component: { render: () => h('div') }, meta: { titleKey: 'nav.dashboard' } },
      ],
    })

    const app = createSSRApp({ render: () => h(Component) })
    app.use(pinia)
    app.use(i18n)
    app.use(router)
    app.config.warnHandler = (msg) => {
      // تجاهل تحذيرات الـ hydration/Teleport المتوقعة في SSR
      if (/Teleport target|Hydration/i.test(msg)) return
      warnings.push(msg.split('\n')[0])
    }

    // تسجيل دخول + توليد البيانات مرة واحدة ثم إعادة استخدامها
    const auth = useAuthStore(pinia)
    auth.loginWithPin('1111')
    const ops = useOpsStore(pinia)
    if (!seedOnce) {
      ops.init()
      seedOnce = ops.seed
    } else {
      ops.seed = seedOnce
    }

    await router.push(path)
    await router.isReady()

    const html = await renderToString(app)
    const len = html.length
    if (len < 80) throw new Error(`رسم فاضي (${len} حرف)`)

    const warnNote = warnings.length ? ` | ${warnings.length} تحذير: ${warnings[0].slice(0, 90)}` : ''
    console.log(`  ✓ ${name} — ${len} حرف${warnNote}`)
    if (warnings.length) failures += 1
  } catch (e) {
    failures += 1
    const first = String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')
    console.log(`  ✗ ${name} — ${first}`)
  }
}

console.log(`\n${failures === 0 ? '✓ كل الشاشات رسمت بدون أخطاء' : `✗ ${failures} شاشة فيها مشكلة`} (${SCREENS.length} شاشة)`)
process.exit(failures === 0 ? 0 : 1)
