/**
 * ثوابت العرض — الألوان كـ class كاملة (عشان ماسح Tailwind يشوفها)،
 * والقائمة والصلاحيات من هنا فقط.
 */

export const TONES = {
  tomato: { solid: 'bg-tomato text-paper', soft: 'bg-tomato-soft text-ink', dot: 'bg-tomato', text: 'text-tomato', fill: '#ff4d2e' },
  saffron: { solid: 'bg-saffron text-ink', soft: 'bg-saffron-soft text-ink', dot: 'bg-saffron', text: 'text-saffron', fill: '#ffc300' },
  basil: { solid: 'bg-basil text-paper', soft: 'bg-basil-soft text-ink', dot: 'bg-basil', text: 'text-basil', fill: '#12b76a' },
  berry: { solid: 'bg-berry text-paper', soft: 'bg-berry-soft text-ink', dot: 'bg-berry', text: 'text-berry', fill: '#7c3aed' },
  sky: { solid: 'bg-sky text-ink', soft: 'bg-sky-soft text-ink', dot: 'bg-sky', text: 'text-sky', fill: '#2bb3ff' },
  plum: { solid: 'bg-plum text-paper', soft: 'bg-plum-soft text-ink', dot: 'bg-plum', text: 'text-plum', fill: '#ff2d8a' },
  ink: { solid: 'bg-ink text-paper', soft: 'bg-paper-2 text-ink', dot: 'bg-ink', text: 'text-ink', fill: '#14110f' },
}

export const toneOf = (tone) => TONES[tone] || TONES.ink

export const CHART_COLORS = ['#ff4d2e', '#ffc300', '#12b76a', '#7c3aed', '#2bb3ff', '#ff2d8a', '#14110f']

/** حالات أوردر الـ POS */
export const ORDER_STATUS = {
  draft: { nameAr: 'مسودة', nameEn: 'Draft', tone: 'ink' },
  sent: { nameAr: 'في المطبخ', nameEn: 'In Kitchen', tone: 'saffron' },
  ready: { nameAr: 'جاهز', nameEn: 'Ready', tone: 'basil' },
  served: { nameAr: 'تم التقديم', nameEn: 'Served', tone: 'sky' },
  paid: { nameAr: 'مدفوع', nameEn: 'Paid', tone: 'basil' },
  void: { nameAr: 'ملغي', nameEn: 'Void', tone: 'tomato' },
}

/** حالات تذكرة المطبخ لكل قسم */
export const TICKET_STATUS = {
  queued: { nameAr: 'في الانتظار', nameEn: 'Queued', tone: 'ink' },
  firing: { nameAr: 'تحت التجهيز', nameEn: 'Firing', tone: 'saffron' },
  ready: { nameAr: 'جاهز للتقديم', nameEn: 'Ready', tone: 'basil' },
  served: { nameAr: 'تم التسليم', nameEn: 'Served', tone: 'sky' },
}

export const MOVEMENT_TYPES = {
  purchase: { nameAr: 'شراء', nameEn: 'Purchase', tone: 'basil', sign: 1 },
  consume: { nameAr: 'استهلاك بيع', nameEn: 'Sales Consumption', tone: 'tomato', sign: -1 },
  production_in: { nameAr: 'إنتاج داخل', nameEn: 'Production In', tone: 'sky', sign: 1 },
  production_out: { nameAr: 'صرف للإنتاج', nameEn: 'Issued to Production', tone: 'berry', sign: -1 },
  waste: { nameAr: 'هدر', nameEn: 'Waste', tone: 'plum', sign: -1 },
  transfer_in: { nameAr: 'تحويل داخل', nameEn: 'Transfer In', tone: 'basil', sign: 1 },
  transfer_out: { nameAr: 'تحويل خارج', nameEn: 'Transfer Out', tone: 'saffron', sign: -1 },
  count_adj: { nameAr: 'تسوية جرد', nameEn: 'Count Adjustment', tone: 'ink', sign: 1 },
  return: { nameAr: 'مرتجع لمورد', nameEn: 'Supplier Return', tone: 'berry', sign: -1 },
}

/** القائمة الجانبية — module يطابق مفاتيح ACCESS في org.js */
export const NAV = [
  { key: 'dashboard', route: '/', icon: 'LayoutDashboard', module: 'dashboard', tone: 'tomato' },
  { key: 'pos', route: '/pos', icon: 'ScanLine', module: 'pos', tone: 'saffron', fullscreen: true },
  { key: 'kds', route: '/kds', icon: 'ChefHat', module: 'kds', tone: 'plum', fullscreen: true },
  {
    key: 'recipes',
    route: '/recipes',
    icon: 'BookOpen',
    module: 'recipes',
    tone: 'berry',
    children: [
      { key: 'recipesList', route: '/recipes' },
      { key: 'recipeCosting', route: '/recipes/costing' },
      { key: 'menuEngineering', route: '/recipes/engineering' },
      { key: 'production', route: '/recipes/production' },
    ],
  },
  {
    key: 'inventory',
    route: '/inventory',
    icon: 'Boxes',
    module: 'inventory',
    tone: 'basil',
    children: [
      { key: 'stock', route: '/inventory' },
      { key: 'items', route: '/inventory/items' },
      { key: 'purchases', route: '/inventory/purchases' },
      { key: 'counts', route: '/inventory/counts' },
      { key: 'waste', route: '/inventory/waste' },
      { key: 'variance', route: '/inventory/variance' },
    ],
  },
  {
    key: 'accounting',
    route: '/accounting',
    icon: 'Scale',
    module: 'accounting',
    tone: 'sky',
    children: [
      { key: 'incomeStatement', route: '/accounting' },
      { key: 'profitability', route: '/accounting/profitability' },
      { key: 'journal', route: '/accounting/journal' },
      { key: 'expenses', route: '/accounting/expenses' },
      { key: 'shifts', route: '/accounting/shifts' },
    ],
  },
  {
    key: 'support',
    route: '/support',
    icon: 'LifeBuoy',
    module: 'support',
    tone: 'plum',
    children: [
      { key: 'supportTickets', route: '/support' },
      { key: 'knowledge', route: '/support/kb' },
      { key: 'systemHealth', route: '/support/health' },
    ],
  },
  { key: 'settings', route: '/settings', icon: 'SlidersHorizontal', module: 'settings', tone: 'ink' },
]

/** مدى التاريخ السريع في التقارير */
export const DATE_PRESETS = [
  { key: 'today', days: 0 },
  { key: 'week', days: 6 },
  { key: 'month', days: 29 },
  { key: 'quarter', days: 89 },
]

/** تصنيف هندسة القائمة — نجوم/أحصنة/ألغاز/كلاب */
export const MENU_CLASSES = {
  star: { nameAr: 'نجم', nameEn: 'Star', tone: 'basil', hintAr: 'شعبية عالية وربح عالي — حافظ عليه وأبرزه' },
  plowhorse: { nameAr: 'حصان', nameEn: 'Plowhorse', tone: 'saffron', hintAr: 'شعبية عالية وربح منخفض — راجع التكلفة أو ارفع السعر' },
  puzzle: { nameAr: 'لغز', nameEn: 'Puzzle', tone: 'sky', hintAr: 'ربح عالي وشعبية منخفضة — يحتاج ترويج' },
  dog: { nameAr: 'كلب', nameEn: 'Dog', tone: 'tomato', hintAr: 'شعبية وربح منخفضان — مرشّح للحذف' },
}
