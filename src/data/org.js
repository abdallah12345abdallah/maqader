/**
 * بيانات المنظمة — فروع، أقسام المطبخ، مخازن، مستخدمين، ضرائب، شجرة حسابات.
 * كله mock seed؛ الـ stores تقرأ من هنا مرة واحدة ثم تحفظ في localStorage.
 */

export const COMPANY = {
  nameAr: 'مطاعم مقادير',
  nameEn: 'Maqader Restaurants',
  taxId: '300-456-789',
  currency: 'EGP',
  serviceChargePct: 0.12,
  vatPct: 0.14,
  fiscalYearStart: '01-01',
}

/** بيانات الإصدار والترخيص — تظهر في فحص النظام وتتبعت مع تذاكر الدعم */
export const APP_INFO = {
  version: '1.4.2',
  build: '2026-09-28',
  edition: 'restaurant',
  licenseId: 'MQD-EG-00418',
  licensedTo: 'مطاعم مقادير',
  supportPlanId: 'PLAN-PRO',
  seats: 12,
}

export const BRANCHES = [
  { id: 'BR-01', code: 'MAADI', nameAr: 'فرع المعادي', nameEn: 'Maadi', tone: 'tomato', seats: 86, isDefault: true },
  { id: 'BR-02', code: 'ZMLK', nameAr: 'فرع الزمالك', nameEn: 'Zamalek', tone: 'berry', seats: 64 },
  { id: 'BR-03', code: 'NCAIRO', nameAr: 'فرع التجمع', nameEn: 'New Cairo', tone: 'sky', seats: 120 },
]

/** أقسام التجهيز داخل المطبخ — كل وصفة بتتوجّه لقسم، وكل قسم له شاشة KDS */
export const STATIONS = [
  { id: 'ST-GRILL', nameAr: 'المشاوي', nameEn: 'Grill', tone: 'tomato', icon: 'Flame', slaMin: 14, sort: 1 },
  { id: 'ST-OVEN', nameAr: 'الأفران والبيتزا', nameEn: 'Oven & Pizza', tone: 'saffron', icon: 'Pizza', slaMin: 12, sort: 2 },
  { id: 'ST-COLD', nameAr: 'البارد والسلطات', nameEn: 'Cold & Salads', tone: 'basil', icon: 'Salad', slaMin: 6, sort: 3 },
  { id: 'ST-FRY', nameAr: 'التحمير', nameEn: 'Fryer', tone: 'plum', icon: 'Soup', slaMin: 8, sort: 4 },
  { id: 'ST-PASTRY', nameAr: 'الحلويات', nameEn: 'Pastry', tone: 'berry', icon: 'CakeSlice', slaMin: 9, sort: 5 },
  { id: 'ST-BAR', nameAr: 'المشروبات', nameEn: 'Beverages', tone: 'sky', icon: 'CupSoda', slaMin: 4, sort: 6 },
  { id: 'ST-PREP', nameAr: 'التجهيز المسبق', nameEn: 'Prep Kitchen', tone: 'ink', icon: 'ChefHat', slaMin: 0, sort: 7 },
]

export const WAREHOUSES = [
  { id: 'WH-MAIN', nameAr: 'المخزن الرئيسي', nameEn: 'Main Store', branchId: 'BR-01', type: 'store', isDefault: true },
  { id: 'WH-KIT', nameAr: 'مخزن المطبخ', nameEn: 'Kitchen Store', branchId: 'BR-01', type: 'kitchen' },
  { id: 'WH-BAR', nameAr: 'مخزن البار', nameEn: 'Bar Store', branchId: 'BR-01', type: 'bar' },
  { id: 'WH-ZMLK', nameAr: 'مخزن الزمالك', nameEn: 'Zamalek Store', branchId: 'BR-02', type: 'store' },
]

export const ROLES = {
  owner: { nameAr: 'المالك', nameEn: 'Owner' },
  manager: { nameAr: 'مدير الفرع', nameEn: 'Branch Manager' },
  accountant: { nameAr: 'محاسب', nameEn: 'Accountant' },
  chef: { nameAr: 'شيف تنفيذي', nameEn: 'Head Chef' },
  cashier: { nameAr: 'كاشير', nameEn: 'Cashier' },
  storekeeper: { nameAr: 'أمين مخزن', nameEn: 'Storekeeper' },
}

export const USERS = [
  { id: 'U-01', nameAr: 'عبدالله مقادير', nameEn: 'Abdallah', role: 'owner', pin: '1111', branchId: 'BR-01', tone: 'tomato' },
  { id: 'U-02', nameAr: 'منى شاهين', nameEn: 'Mona Shaheen', role: 'manager', pin: '2222', branchId: 'BR-01', tone: 'berry' },
  { id: 'U-03', nameAr: 'الشيف كريم', nameEn: 'Chef Karim', role: 'chef', pin: '3333', branchId: 'BR-01', tone: 'saffron' },
  { id: 'U-04', nameAr: 'هالة عادل', nameEn: 'Hala Adel', role: 'accountant', pin: '4444', branchId: 'BR-01', tone: 'sky' },
  { id: 'U-05', nameAr: 'يوسف سامي', nameEn: 'Youssef Samy', role: 'cashier', pin: '5555', branchId: 'BR-01', tone: 'basil' },
  { id: 'U-06', nameAr: 'سيد المخزن', nameEn: 'Sayed Store', role: 'storekeeper', pin: '6666', branchId: 'BR-01', tone: 'plum' },
]

/** صلاحيات الوصول للموديولات — المصدر الوحيد للراوتر والقائمة */
export const ACCESS = {
  dashboard: ['owner', 'manager', 'accountant', 'chef'],
  pos: ['owner', 'manager', 'cashier'],
  kds: ['owner', 'manager', 'chef'],
  recipes: ['owner', 'manager', 'chef', 'accountant'],
  inventory: ['owner', 'manager', 'storekeeper', 'chef'],
  accounting: ['owner', 'manager', 'accountant'],
  // الدعم متاح لكل الأدوار — أي حد على الأرض يقدر يفتح تذكرة
  support: ['owner', 'manager', 'accountant', 'chef', 'cashier', 'storekeeper'],
  settings: ['owner', 'manager'],
}

export const TAX_GROUPS = [
  { id: 'TX-14', nameAr: 'قيمة مضافة 14%', nameEn: 'VAT 14%', rate: 0.14 },
  { id: 'TX-0', nameAr: 'معفى', nameEn: 'Exempt', rate: 0 },
]

export const ORDER_TYPES = [
  { id: 'dine_in', nameAr: 'صالة', nameEn: 'Dine-in', icon: 'Utensils', tone: 'tomato', service: true },
  { id: 'takeaway', nameAr: 'تيك أواي', nameEn: 'Takeaway', icon: 'ShoppingBag', tone: 'saffron', service: false },
  { id: 'delivery', nameAr: 'دليفري', nameEn: 'Delivery', icon: 'Bike', tone: 'sky', service: false, deliveryFee: 25 },
]

export const PAYMENT_METHODS = [
  { id: 'cash', nameAr: 'نقدي', nameEn: 'Cash', icon: 'Banknote', accountId: 'A-1010' },
  { id: 'card', nameAr: 'بطاقة', nameEn: 'Card', icon: 'CreditCard', accountId: 'A-1020', feePct: 0.015 },
  { id: 'wallet', nameAr: 'محفظة إلكترونية', nameEn: 'E-Wallet', icon: 'Smartphone', accountId: 'A-1030', feePct: 0.01 },
  { id: 'aggregator', nameAr: 'تطبيق توصيل', nameEn: 'Aggregator', icon: 'Bike', accountId: 'A-1040', feePct: 0.2 },
]

/** طاولات الصالة — خريطة مبسطة بالفرع */
export const TABLES = [
  { id: 'T-01', nameAr: 'طاولة 1', seats: 2, zone: 'الصالة' },
  { id: 'T-02', nameAr: 'طاولة 2', seats: 2, zone: 'الصالة' },
  { id: 'T-03', nameAr: 'طاولة 3', seats: 4, zone: 'الصالة' },
  { id: 'T-04', nameAr: 'طاولة 4', seats: 4, zone: 'الصالة' },
  { id: 'T-05', nameAr: 'طاولة 5', seats: 6, zone: 'الصالة' },
  { id: 'T-06', nameAr: 'طاولة 6', seats: 6, zone: 'التراس' },
  { id: 'T-07', nameAr: 'طاولة 7', seats: 4, zone: 'التراس' },
  { id: 'T-08', nameAr: 'طاولة 8', seats: 8, zone: 'التراس' },
  { id: 'T-09', nameAr: 'طاولة 9', seats: 2, zone: 'البار' },
  { id: 'T-10', nameAr: 'طاولة 10', seats: 2, zone: 'البار' },
  { id: 'T-11', nameAr: 'طاولة 11', seats: 10, zone: 'العائلات' },
  { id: 'T-12', nameAr: 'طاولة 12', seats: 10, zone: 'العائلات' },
]

/**
 * شجرة الحسابات — أرقام من 1 للأصول حتى 6 للمصروفات.
 * type يحدد اتجاه الرصيد الطبيعي: debit أو credit.
 */
export const ACCOUNTS = [
  { id: 'A-1000', code: '1000', nameAr: 'الأصول', nameEn: 'Assets', type: 'debit', group: 'asset', isHeader: true },
  { id: 'A-1010', code: '1010', nameAr: 'الخزينة — نقدي', nameEn: 'Cash on Hand', type: 'debit', group: 'asset', parentId: 'A-1000' },
  { id: 'A-1020', code: '1020', nameAr: 'حساب البنك — شبكة', nameEn: 'Bank — Card', type: 'debit', group: 'asset', parentId: 'A-1000' },
  { id: 'A-1030', code: '1030', nameAr: 'محافظ إلكترونية', nameEn: 'E-Wallets', type: 'debit', group: 'asset', parentId: 'A-1000' },
  { id: 'A-1040', code: '1040', nameAr: 'مستحق من تطبيقات التوصيل', nameEn: 'Aggregator Receivable', type: 'debit', group: 'asset', parentId: 'A-1000' },
  { id: 'A-1100', code: '1100', nameAr: 'مخزون المواد الخام', nameEn: 'Raw Materials Inventory', type: 'debit', group: 'asset', parentId: 'A-1000' },
  { id: 'A-1110', code: '1110', nameAr: 'مخزون نصف مصنع', nameEn: 'Work in Progress', type: 'debit', group: 'asset', parentId: 'A-1000' },

  { id: 'A-2000', code: '2000', nameAr: 'الخصوم', nameEn: 'Liabilities', type: 'credit', group: 'liability', isHeader: true },
  { id: 'A-2010', code: '2010', nameAr: 'موردون', nameEn: 'Suppliers Payable', type: 'credit', group: 'liability', parentId: 'A-2000' },
  { id: 'A-2020', code: '2020', nameAr: 'ضريبة قيمة مضافة مستحقة', nameEn: 'VAT Payable', type: 'credit', group: 'liability', parentId: 'A-2000' },
  { id: 'A-2030', code: '2030', nameAr: 'رسوم خدمة مستحقة', nameEn: 'Service Charge Payable', type: 'credit', group: 'liability', parentId: 'A-2000' },

  { id: 'A-3000', code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'credit', group: 'equity', isHeader: true },
  { id: 'A-3010', code: '3010', nameAr: 'رأس المال', nameEn: 'Capital', type: 'credit', group: 'equity', parentId: 'A-3000' },

  { id: 'A-4000', code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', type: 'credit', group: 'revenue', isHeader: true },
  { id: 'A-4010', code: '4010', nameAr: 'إيراد المبيعات — صالة', nameEn: 'Sales — Dine-in', type: 'credit', group: 'revenue', parentId: 'A-4000' },
  { id: 'A-4020', code: '4020', nameAr: 'إيراد المبيعات — تيك أواي', nameEn: 'Sales — Takeaway', type: 'credit', group: 'revenue', parentId: 'A-4000' },
  { id: 'A-4030', code: '4030', nameAr: 'إيراد المبيعات — دليفري', nameEn: 'Sales — Delivery', type: 'credit', group: 'revenue', parentId: 'A-4000' },
  { id: 'A-4090', code: '4090', nameAr: 'خصومات المبيعات', nameEn: 'Sales Discounts', type: 'debit', group: 'revenue', parentId: 'A-4000', contra: true },

  { id: 'A-5000', code: '5000', nameAr: 'تكلفة المبيعات', nameEn: 'Cost of Sales', type: 'debit', group: 'cogs', isHeader: true },
  { id: 'A-5010', code: '5010', nameAr: 'تكلفة الطعام', nameEn: 'Food Cost', type: 'debit', group: 'cogs', parentId: 'A-5000' },
  { id: 'A-5020', code: '5020', nameAr: 'تكلفة المشروبات', nameEn: 'Beverage Cost', type: 'debit', group: 'cogs', parentId: 'A-5000' },
  { id: 'A-5030', code: '5030', nameAr: 'الهدر والتلف', nameEn: 'Waste & Spoilage', type: 'debit', group: 'cogs', parentId: 'A-5000' },
  { id: 'A-5040', code: '5040', nameAr: 'فروق الجرد', nameEn: 'Inventory Variance', type: 'debit', group: 'cogs', parentId: 'A-5000' },

  { id: 'A-6000', code: '6000', nameAr: 'المصروفات التشغيلية', nameEn: 'Operating Expenses', type: 'debit', group: 'expense', isHeader: true },
  { id: 'A-6010', code: '6010', nameAr: 'رواتب وأجور', nameEn: 'Salaries & Wages', type: 'debit', group: 'expense', parentId: 'A-6000', fixed: true },
  { id: 'A-6020', code: '6020', nameAr: 'إيجار', nameEn: 'Rent', type: 'debit', group: 'expense', parentId: 'A-6000', fixed: true },
  { id: 'A-6030', code: '6030', nameAr: 'كهرباء وغاز ومياه', nameEn: 'Utilities', type: 'debit', group: 'expense', parentId: 'A-6000' },
  { id: 'A-6040', code: '6040', nameAr: 'تسويق وإعلان', nameEn: 'Marketing', type: 'debit', group: 'expense', parentId: 'A-6000' },
  { id: 'A-6050', code: '6050', nameAr: 'مستهلكات تغليف', nameEn: 'Packaging', type: 'debit', group: 'expense', parentId: 'A-6000' },
  { id: 'A-6060', code: '6060', nameAr: 'صيانة', nameEn: 'Maintenance', type: 'debit', group: 'expense', parentId: 'A-6000' },
  { id: 'A-6070', code: '6070', nameAr: 'عمولات الدفع والتطبيقات', nameEn: 'Payment & App Fees', type: 'debit', group: 'expense', parentId: 'A-6000' },
  { id: 'A-6080', code: '6080', nameAr: 'إهلاك', nameEn: 'Depreciation', type: 'debit', group: 'expense', parentId: 'A-6000', fixed: true },
]

export const SUPPLIERS = [
  { id: 'SP-01', nameAr: 'مجزر النيل للحوم', nameEn: 'Nile Meat', phone: '0100 111 2233', terms: 15, rating: 4.6 },
  { id: 'SP-02', nameAr: 'مزارع الوادي للخضروات', nameEn: 'Wadi Farms', phone: '0100 222 3344', terms: 7, rating: 4.2 },
  { id: 'SP-03', nameAr: 'ألبان الدلتا', nameEn: 'Delta Dairy', phone: '0100 333 4455', terms: 21, rating: 4.8 },
  { id: 'SP-04', nameAr: 'البقالة الكبرى للجملة', nameEn: 'Grand Grocers', phone: '0100 444 5566', terms: 30, rating: 4.0 },
  { id: 'SP-05', nameAr: 'مخابز الشرق', nameEn: 'Sharq Bakery', phone: '0100 555 6677', terms: 7, rating: 4.4 },
  { id: 'SP-06', nameAr: 'مشروبات ماس', nameEn: 'Mass Beverages', phone: '0100 666 7788', terms: 14, rating: 3.9 },
]
