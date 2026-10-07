/**
 * القائمة — التصنيفات، الإضافات (modifiers)، وقواعد التغليف.
 * الأطباق نفسها وصفات من النوع 'menu' في recipes.js — القائمة مجرد عرض وتسعير فوقها.
 */

export const CATEGORIES = [
  { id: 'CAT-GRILL', nameAr: 'مشاوي', nameEn: 'Grill', tone: 'tomato', emoji: '🔥', targetFoodCostPct: 0.37, sort: 1 },
  { id: 'CAT-PIZZA', nameAr: 'بيتزا وفطائر', nameEn: 'Pizza & Pies', tone: 'saffron', emoji: '🍕', targetFoodCostPct: 0.32, sort: 2 },
  { id: 'CAT-SAND', nameAr: 'ساندويتشات', nameEn: 'Sandwiches', tone: 'berry', emoji: '🍔', targetFoodCostPct: 0.34, sort: 3 },
  { id: 'CAT-COLD', nameAr: 'مقبلات باردة', nameEn: 'Cold Mezze', tone: 'basil', emoji: '🥗', targetFoodCostPct: 0.27, sort: 4 },
  { id: 'CAT-HOT', nameAr: 'مقبلات ساخنة', nameEn: 'Hot Starters', tone: 'plum', emoji: '🍟', targetFoodCostPct: 0.3, sort: 5 },
  { id: 'CAT-DESS', nameAr: 'حلويات', nameEn: 'Desserts', tone: 'berry', emoji: '🍰', targetFoodCostPct: 0.28, sort: 6 },
  { id: 'CAT-BEV', nameAr: 'مشروبات', nameEn: 'Beverages', tone: 'sky', emoji: '🥤', targetFoodCostPct: 0.25, sort: 7 },
]

/**
 * مجموعات الإضافات.
 * priceDelta  = تغيير سعر البيع
 * costLines   = مكوّنات تُضاف لحساب التكلفة (نفس شكل سطور الوصفة)
 * qtyFactor   = مضاعف على كل سطور الوصفة الأصلية (للحجم الأكبر)
 */
export const MODIFIER_GROUPS = [
  {
    id: 'MG-SIZE',
    nameAr: 'الحجم',
    nameEn: 'Size',
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: 'OPT-SZ-M', nameAr: 'وسط 30 سم', nameEn: 'Medium 30cm', priceDelta: 0, qtyFactor: 1, isDefault: true },
      { id: 'OPT-SZ-L', nameAr: 'كبير 40 سم', nameEn: 'Large 40cm', priceDelta: 120, qtyFactor: 1.55 },
    ],
  },
  {
    id: 'MG-EXTRAS-PIZZA',
    nameAr: 'إضافات البيتزا',
    nameEn: 'Pizza Extras',
    required: false,
    min: 0,
    max: 4,
    options: [
      { id: 'OPT-XCHEESE', nameAr: 'جبنة إضافية', nameEn: 'Extra Cheese', priceDelta: 60, costLines: [{ type: 'recipe', refId: 'PREP-CHEESEMIX', qty: 70, unit: 'g' }] },
      { id: 'OPT-XPEPP', nameAr: 'بيبروني إضافي', nameEn: 'Extra Pepperoni', priceDelta: 75, costLines: [{ type: 'ingredient', refId: 'ING-004', qty: 50, unit: 'g' }] },
      { id: 'OPT-XMUSH', nameAr: 'فطر إضافي', nameEn: 'Extra Mushroom', priceDelta: 25, costLines: [{ type: 'ingredient', refId: 'ING-051', qty: 50, unit: 'g' }] },
      { id: 'OPT-XOLIVE', nameAr: 'زيتون إضافي', nameEn: 'Extra Olives', priceDelta: 20, costLines: [{ type: 'ingredient', refId: 'ING-052', qty: 35, unit: 'g' }] },
    ],
  },
  {
    id: 'MG-DONENESS',
    nameAr: 'درجة الاستواء',
    nameEn: 'Doneness',
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: 'OPT-DN-M', nameAr: 'ميديم', nameEn: 'Medium', priceDelta: 0, isDefault: true },
      { id: 'OPT-DN-MW', nameAr: 'ميديم ويل', nameEn: 'Medium Well', priceDelta: 0 },
      { id: 'OPT-DN-WD', nameAr: 'ويل دون', nameEn: 'Well Done', priceDelta: 0 },
    ],
  },
  {
    id: 'MG-SANDEXTRA',
    nameAr: 'إضافات الساندويتش',
    nameEn: 'Sandwich Extras',
    required: false,
    min: 0,
    max: 3,
    options: [
      { id: 'OPT-XPATTY', nameAr: 'قرص لحم إضافي', nameEn: 'Extra Patty', priceDelta: 170, costLines: [{ type: 'recipe', refId: 'PREP-BURGPATTY', qty: 1, unit: 'pc' }] },
      { id: 'OPT-XROUMY', nameAr: 'جبنة رومي إضافية', nameEn: 'Extra Roumy', priceDelta: 30, costLines: [{ type: 'ingredient', refId: 'ING-021', qty: 30, unit: 'g' }] },
      { id: 'OPT-XTOUM', nameAr: 'ثومية إضافية', nameEn: 'Extra Toum', priceDelta: 15, costLines: [{ type: 'recipe', refId: 'PREP-GARLICSAUCE', qty: 25, unit: 'ml' }] },
    ],
  },
  {
    id: 'MG-SPICE',
    nameAr: 'الحرارة',
    nameEn: 'Spice Level',
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: 'OPT-SP-0', nameAr: 'بدون حار', nameEn: 'Not Spicy', priceDelta: 0, isDefault: true },
      { id: 'OPT-SP-1', nameAr: 'حار', nameEn: 'Spicy', priceDelta: 0, costLines: [{ type: 'ingredient', refId: 'ING-064', qty: 2, unit: 'g' }] },
    ],
  },
  {
    id: 'MG-SUGAR',
    nameAr: 'السكر',
    nameEn: 'Sugar',
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: 'OPT-SG-0', nameAr: 'سادة', nameEn: 'No Sugar', priceDelta: 0 },
      { id: 'OPT-SG-1', nameAr: 'سكر خفيف', nameEn: 'Light', priceDelta: 0, isDefault: true },
      { id: 'OPT-SG-2', nameAr: 'سكر زيادة', nameEn: 'Extra Sugar', priceDelta: 0, costLines: [{ type: 'ingredient', refId: 'ING-062', qty: 10, unit: 'g' }] },
    ],
  },
  {
    id: 'MG-SIDE',
    nameAr: 'طبق جانبي',
    nameEn: 'Add a Side',
    required: false,
    min: 0,
    max: 2,
    options: [
      { id: 'OPT-SD-FRIES', nameAr: 'بطاطس مقلية', nameEn: 'Fries', priceDelta: 45, costLines: [{ type: 'recipe', refId: 'PREP-FRIES', qty: 180, unit: 'g' }] },
      { id: 'OPT-SD-SALAD', nameAr: 'سلطة صغيرة', nameEn: 'Side Salad', priceDelta: 35, costLines: [{ type: 'ingredient', refId: 'ING-043', qty: 90, unit: 'g' }, { type: 'ingredient', refId: 'ING-040', qty: 60, unit: 'g' }] },
    ],
  },
]

/** أي مجموعات إضافات تظهر لأي تصنيف — والوصفة تقدر تتخصص فوقها */
export const CATEGORY_MODIFIERS = {
  'CAT-PIZZA': ['MG-SIZE', 'MG-EXTRAS-PIZZA', 'MG-SPICE'],
  'CAT-GRILL': ['MG-DONENESS', 'MG-SPICE', 'MG-SIDE'],
  'CAT-SAND': ['MG-DONENESS', 'MG-SANDEXTRA', 'MG-SIDE'],
  'CAT-HOT': ['MG-SPICE'],
  'CAT-COLD': [],
  'CAT-DESS': [],
  'CAT-BEV': [],
}

export const RECIPE_MODIFIERS = {
  'M-TEA': ['MG-SUGAR'],
  'M-TURKCOF': ['MG-SUGAR'],
  'M-LATTE': ['MG-SUGAR'],
  'M-SOFTDRINK': [],
  'M-WATER': [],
  'M-CHEESEFAT': ['MG-SPICE'],
  'M-HALFCHICK': ['MG-SPICE', 'MG-SIDE'],
}

/**
 * التغليف للتيك أواي والدليفري — يُحمَّل تلقائيًا على تكلفة السطر.
 * المفتاح تصنيف، والقيمة سطور مواد تغليف.
 */
export const PACKAGING_RULES = {
  'CAT-PIZZA': [{ type: 'ingredient', refId: 'ING-123', qty: 1, unit: 'pc' }],
  'CAT-BEV': [{ type: 'ingredient', refId: 'ING-122', qty: 1, unit: 'pc' }],
  default: [{ type: 'ingredient', refId: 'ING-120', qty: 1, unit: 'pc' }],
}

/** قوائم أسعار — فرق الدليفري بيعلى السعر 12% */
export const PRICE_LISTS = [
  { id: 'PL-DINE', nameAr: 'سعر الصالة', nameEn: 'Dine-in', factor: 1, appliesTo: ['dine_in'], isDefault: true },
  { id: 'PL-TAKE', nameAr: 'سعر التيك أواي', nameEn: 'Takeaway', factor: 1, appliesTo: ['takeaway'] },
  { id: 'PL-DLV', nameAr: 'سعر الدليفري', nameEn: 'Delivery', factor: 1.12, appliesTo: ['delivery'] },
]

export const DISCOUNT_REASONS = [
  { id: 'DR-STAFF', nameAr: 'خصم موظفين', nameEn: 'Staff', maxPct: 0.3 },
  { id: 'DR-PROMO', nameAr: 'عرض ترويجي', nameEn: 'Promotion', maxPct: 0.25 },
  { id: 'DR-COMP', nameAr: 'تعويض شكوى', nameEn: 'Complaint', maxPct: 1 },
  { id: 'DR-MGR', nameAr: 'تقدير إداري', nameEn: 'Manager', maxPct: 0.5 },
]

export const WASTE_REASONS = [
  { id: 'WR-EXPIRE', nameAr: 'انتهاء صلاحية', nameEn: 'Expired', tone: 'tomato' },
  { id: 'WR-BURN', nameAr: 'حرق أو خطأ تجهيز', nameEn: 'Cooking Error', tone: 'saffron' },
  { id: 'WR-DROP', nameAr: 'سقوط أو كسر', nameEn: 'Dropped', tone: 'plum' },
  { id: 'WR-RETURN', nameAr: 'مرتجع عميل', nameEn: 'Customer Return', tone: 'berry' },
  { id: 'WR-TEST', nameAr: 'تذوق واختبار', nameEn: 'Tasting & R&D', tone: 'sky' },
]
