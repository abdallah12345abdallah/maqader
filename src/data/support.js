/**
 * خدمة الدعم — بيانات مرجعية ومولّد حتمي لتاريخ التذاكر.
 *
 * التصنيفات والأولويات واتفاقية مستوى الخدمة (SLA) وقنوات التواصل وفريق
 * الدعم وقاعدة المعرفة كلها من هنا — محرك الـ SLA في `src/lib/support.js`
 * والشاشات بيقروا منها بس.
 */

import { BRANCHES, USERS } from './org'
import { addDays, round, sum } from '@/lib/utils'

/* ====================== الباقة والتغطية ====================== */

export const SUPPORT_PLAN = {
  id: 'PLAN-PRO',
  nameAr: 'باقة الدعم الاحترافية',
  nameEn: 'Professional Support',
  tone: 'berry',
  coverageAr: 'كل يوم 9ص — 1ص · أعطال توقف التشغيل 24/7',
  coverageEn: 'Daily 9:00–01:00 · Outages 24/7',
  /** ساعات الدعم الفني المشمولة شهريًا */
  includedHours: 20,
  /** زيارات ميدانية مشمولة شهريًا */
  includedVisits: 2,
  usedVisits: 1,
  /** يوم تجديد الباقة في الشهر */
  renewalDay: 1,
  channels: ['app', 'whatsapp', 'phone', 'email'],
}

export const SUPPORT_CHANNELS = [
  {
    id: 'app',
    nameAr: 'تذكرة داخل النظام',
    nameEn: 'In-app ticket',
    icon: 'LifeBuoy',
    tone: 'berry',
    value: '',
    href: '',
    hoursAr: 'متاحة 24/7 — الرد حسب أولوية التذكرة',
    hoursEn: 'Open 24/7 — reply per ticket priority',
    noteAr: 'أفضل قناة: التذكرة بتتبع الـ SLA وبتوصل معاها بيانات تشخيص النظام',
    noteEn: 'Preferred: tickets are SLA-tracked and carry a diagnostics snapshot',
  },
  {
    id: 'whatsapp',
    nameAr: 'واتساب الدعم',
    nameEn: 'Support WhatsApp',
    icon: 'MessageCircle',
    tone: 'basil',
    value: '+20 100 777 4455',
    href: 'https://wa.me/201007774455',
    hoursAr: 'كل يوم 9ص — 1ص',
    hoursEn: 'Daily 9:00–01:00',
    noteAr: 'للأسئلة السريعة وصور الشاشة',
    noteEn: 'Quick questions and screenshots',
  },
  {
    id: 'phone',
    nameAr: 'الخط الساخن',
    nameEn: 'Hotline',
    icon: 'PhoneCall',
    tone: 'tomato',
    value: '16045',
    href: 'tel:16045',
    hoursAr: '24/7 لأعطال توقف التشغيل',
    hoursEn: '24/7 for outages',
    noteAr: 'الفرع واقف؟ اتصل فورًا وبعدها افتح تذكرة بأولوية «توقف تشغيل»',
    noteEn: 'Branch down? Call first, then open an Outage ticket',
  },
  {
    id: 'email',
    nameAr: 'البريد الإلكتروني',
    nameEn: 'Email',
    icon: 'Mail',
    tone: 'sky',
    value: 'support@maqader.app',
    href: 'mailto:support@maqader.app',
    hoursAr: 'الرد خلال يوم عمل',
    hoursEn: 'Reply within one business day',
    noteAr: 'للمرفقات الكبيرة والتقارير والفواتير',
    noteEn: 'Large attachments, reports and invoices',
  },
]

/* ====================== التصنيفات والأولويات ====================== */

/** تصنيف التذكرة — `module` و`route` بيوصّلوا لشاشة النظام المرتبطة */
export const SUPPORT_CATEGORIES = [
  { id: 'CAT-POS', nameAr: 'الكاشير والفواتير', nameEn: 'POS & Invoices', tone: 'saffron', icon: 'ScanLine', module: 'pos', route: '/pos' },
  { id: 'CAT-KDS', nameAr: 'شاشة المطبخ', nameEn: 'Kitchen Display', tone: 'plum', icon: 'ChefHat', module: 'kds', route: '/kds' },
  { id: 'CAT-HW', nameAr: 'أجهزة وطابعات وشبكة', nameEn: 'Hardware & Network', tone: 'tomato', icon: 'Printer', module: null, route: '/support/health' },
  { id: 'CAT-INV', nameAr: 'المخزون والجرد', nameEn: 'Inventory & Counts', tone: 'basil', icon: 'Boxes', module: 'inventory', route: '/inventory' },
  { id: 'CAT-RCP', nameAr: 'الوصفات والتكلفة', nameEn: 'Recipes & Costing', tone: 'berry', icon: 'BookOpen', module: 'recipes', route: '/recipes/costing' },
  { id: 'CAT-ACC', nameAr: 'الحسابات والتقارير', nameEn: 'Accounting & Reports', tone: 'sky', icon: 'Scale', module: 'accounting', route: '/accounting' },
  { id: 'CAT-USR', nameAr: 'المستخدمين والصلاحيات', nameEn: 'Users & Access', tone: 'ink', icon: 'ShieldCheck', module: 'settings', route: '/settings' },
  { id: 'CAT-REQ', nameAr: 'طلب ميزة أو تدريب', nameEn: 'Feature or Training', tone: 'saffron', icon: 'Sparkles', module: null, route: '' },
]

/**
 * الأولوية هي اللي بتحدد الـ SLA: زمن أول رد وزمن الحل المستهدف بالدقايق.
 * لو عدّلتها، عدّل نص التغطية في `SUPPORT_PLAN` ونصوص i18n معاها.
 */
export const SUPPORT_PRIORITIES = [
  {
    id: 'P1', nameAr: 'توقف تشغيل', nameEn: 'Outage', tone: 'tomato',
    responseMins: 15, resolveMins: 240,
    hintAr: 'الفرع واقف — الكاشير أو المطبخ مش شغال خلاص',
    hintEn: 'Branch is down — POS or kitchen unusable',
  },
  {
    id: 'P2', nameAr: 'عالية', nameEn: 'High', tone: 'saffron',
    responseMins: 60, resolveMins: 480,
    hintAr: 'الشغل ماشي بحل مؤقت أو بتأخير واضح',
    hintEn: 'Working with a workaround or a clear delay',
  },
  {
    id: 'P3', nameAr: 'عادية', nameEn: 'Normal', tone: 'sky',
    responseMins: 240, resolveMins: 1440,
    hintAr: 'خطأ أو سؤال مش موقف الشغل',
    hintEn: 'A question or bug that does not stop service',
  },
  {
    id: 'P4', nameAr: 'منخفضة', nameEn: 'Low', tone: 'ink',
    responseMins: 480, resolveMins: 4320,
    hintAr: 'تحسين أو طلب ميزة أو تدريب',
    hintEn: 'Improvement, feature request or training',
  },
]

/**
 * حالات التذكرة. `stopsClock` معناها إن عدّاد الـ SLA بيتوقف —
 * الوقت اللي الدعم مستني فيه رد العميل ما يُحسبش عليه.
 */
export const SUPPORT_STATUS = {
  open: { nameAr: 'مفتوحة', nameEn: 'Open', tone: 'tomato', isOpen: true, sort: 1 },
  in_progress: { nameAr: 'قيد المعالجة', nameEn: 'In Progress', tone: 'saffron', isOpen: true, sort: 2 },
  waiting_customer: { nameAr: 'بانتظار ردك', nameEn: 'Awaiting You', tone: 'sky', isOpen: true, stopsClock: true, sort: 3 },
  resolved: { nameAr: 'تم الحل', nameEn: 'Resolved', tone: 'basil', isOpen: false, sort: 4 },
  closed: { nameAr: 'مغلقة', nameEn: 'Closed', tone: 'ink', isOpen: false, sort: 5 },
}

export const SUPPORT_AGENTS = [
  { id: 'AG-01', nameAr: 'نورهان الدعم', nameEn: 'Nourhan', titleAr: 'أخصائي دعم أول', titleEn: 'Senior Support', tone: 'berry', avatar: '👩‍💻' },
  { id: 'AG-02', nameAr: 'محمود فني', nameEn: 'Mahmoud', titleAr: 'دعم أجهزة وطابعات', titleEn: 'Hardware Support', tone: 'tomato', avatar: '🧰' },
  { id: 'AG-03', nameAr: 'سلمى حسابات', nameEn: 'Salma', titleAr: 'دعم محاسبي', titleEn: 'Accounting Support', tone: 'sky', avatar: '📊' },
  { id: 'AG-04', nameAr: 'فريق المنتج', nameEn: 'Product Team', titleAr: 'طلبات الميزات', titleEn: 'Feature Requests', tone: 'saffron', avatar: '🛠️' },
]

/** توجيه تلقائي: كل تصنيف بيروح لمين */
export const CATEGORY_ROUTING = {
  'CAT-POS': 'AG-01',
  'CAT-KDS': 'AG-01',
  'CAT-HW': 'AG-02',
  'CAT-INV': 'AG-01',
  'CAT-RCP': 'AG-01',
  'CAT-ACC': 'AG-03',
  'CAT-USR': 'AG-01',
  'CAT-REQ': 'AG-04',
}

/* ====================== قاعدة المعرفة ====================== */

/**
 * مقالات حل المشاكل. `route` بيفتح شاشة النظام المعنية مباشرة،
 * عشان المستخدم يجرّب الحل بنفسه قبل ما يفتح تذكرة.
 */
export const KB_ARTICLES = [
  {
    id: 'KB-PRINTER',
    categoryId: 'CAT-HW',
    titleAr: 'الطابعة مش بتطبع الفاتورة',
    titleEn: 'Receipt printer is not printing',
    summaryAr: 'أشهر سبب: طابور طباعة متعلّق أو الطابعة مش هي الافتراضية على الجهاز.',
    summaryEn: 'Most common cause: a stuck print queue or the wrong default printer.',
    tagsAr: ['طابعة', 'فاتورة', 'طباعة', 'كاشير'],
    tagsEn: ['printer', 'receipt', 'print', 'pos'],
    stepsAr: [
      'اتأكد إن لمبة الطابعة خضرا وفيها ورق، وجرّب تطفيها وتشغّلها.',
      'من إعدادات الجهاز: افتح طابور الطباعة وامسح أي أمر متعلّق.',
      'خلّي الطابعة هي الافتراضية، وجرّب صفحة اختبار من إعدادات الويندوز.',
      'لو صفحة الاختبار طبعت والفاتورة لأ: افتح الأوردر من الكاشير واضغط «طباعة الفاتورة» تاني.',
      'لسه؟ افتح تذكرة بأولوية «عالية» ومعاها رقم الفاتورة واسم الفرع.',
    ],
    stepsEn: [
      'Check the printer light and paper, then power-cycle it.',
      'Open the print queue on the device and clear any stuck job.',
      'Set it as the default printer and print a Windows test page.',
      'If the test page prints but the receipt does not, reopen the order and hit Print receipt.',
      'Still stuck? Open a High ticket with the invoice number and branch.',
    ],
    route: '/pos',
    readMins: 2,
    views: 412,
    helpful: 96,
    updatedDaysAgo: 6,
  },
  {
    id: 'KB-KDS',
    categoryId: 'CAT-KDS',
    titleAr: 'الأوردر مش ظاهر على شاشة المطبخ',
    titleEn: 'Order is missing from the kitchen screen',
    summaryAr: 'كل سطر بيروح لقسم الوصفة بس — والأوردر لازم يكون اتبعت للمطبخ فعلًا.',
    summaryEn: 'Each line routes to its recipe station only — and the order must be sent first.',
    tagsAr: ['مطبخ', 'شاشة', 'أقسام', 'أوردر'],
    tagsEn: ['kitchen', 'kds', 'station', 'order'],
    stepsAr: [
      'على الكاشير: اتأكد إن حالة الأوردر «في المطبخ» مش «مسودة».',
      'على شاشة المطبخ: اختر «كل الأقسام» — السطر بيظهر في قسمه هو بس.',
      'السطور اللي حالتها «جاهز» بتخرج من الطابور، شوفها في فلتر «جاهز».',
      'لو طبق معيّن مش بيوصل لأي قسم: افتح الوصفة وتأكد إن ليها قسم تجهيز.',
      'لسه مش ظاهر؟ افتح تذكرة ومعاها رقم الأوردر والقسم المتوقع.',
    ],
    stepsEn: [
      'On the POS, confirm the order status is In Kitchen, not Draft.',
      'On the kitchen screen pick All stations — a line shows only in its own station.',
      'Lines marked Ready leave the queue; check the Ready filter.',
      'If one dish never routes anywhere, open its recipe and set a station.',
      'Still missing? Open a ticket with the order number and expected station.',
    ],
    route: '/kds',
    readMins: 2,
    views: 268,
    helpful: 88,
    updatedDaysAgo: 11,
  },
  {
    id: 'KB-SHIFT',
    categoryId: 'CAT-ACC',
    titleAr: 'فرق نقدية عند إقفال وردية الكاشير',
    titleEn: 'Cash difference when closing a shift',
    summaryAr: 'المتوقع = عهدة البداية + مبيعات النقدي فقط. الشبكة والمحافظ مش في الدرج.',
    summaryEn: 'Expected = opening float + cash sales only. Card and wallet never hit the drawer.',
    tagsAr: ['وردية', 'خزينة', 'نقدي', 'إقفال'],
    tagsEn: ['shift', 'cash', 'drawer', 'closing'],
    stepsAr: [
      'راجع المتوقع: عهدة البداية + مبيعات النقدي فقط (بدون شبكة أو محفظة أو تطبيقات).',
      'اتأكد إن مفيش فاتورة اتدفعت نقدي واتسجلت شبكة بالغلط أو العكس.',
      'شوف المصروفات النقدية اللي خرجت من الدرج في نفس الوردية.',
      'فرق أقل من 1% عادي ويتسجّل؛ فرق أكبر سجّله وافتح تذكرة بالتفاصيل.',
    ],
    stepsEn: [
      'Recheck expected cash: opening float + cash sales only.',
      'Make sure no cash sale was recorded as card, or the other way round.',
      'Review cash expenses paid out of the drawer in the same shift.',
      'Under 1% is normal; log anything larger and open a ticket.',
    ],
    route: '/accounting/shifts',
    readMins: 3,
    views: 193,
    helpful: 74,
    updatedDaysAgo: 4,
  },
  {
    id: 'KB-VARIANCE',
    categoryId: 'CAT-INV',
    titleAr: 'فرق الجرد كبير — إزاي أقرأه؟',
    titleEn: 'Reading a large inventory variance',
    summaryAr: 'الفرق = الاستهلاك النظري − الفعلي. أغلبه هدر غير مسجّل أو خلط وحدات.',
    summaryEn: 'Variance = theoretical minus actual usage. Usually unlogged waste or unit mix-ups.',
    tagsAr: ['جرد', 'فرق', 'مخزون', 'هدر'],
    tagsEn: ['count', 'variance', 'stock', 'waste'],
    stepsAr: [
      'ابدأ من شاشة «فروق الاستهلاك» ورتّب بالقيمة — أعلى 5 مواد بتفسّر أغلب الفرق.',
      'راجع الهدر: أي كمية اترمت بدون تسجيل بتظهر كفرق.',
      'اتأكد إن وحدة الشراء ووحدة الوصفة من نفس البُعد (وزن مع وزن، حجم مع حجم).',
      'المواد اللي ليها فقد تنظيف لازم تكون نسبة الفقد مظبوطة فيها، وإلا الفرق يطلع وهمي.',
      'بعد الإصلاح رحّل جرد جديد — النظام بيقيّد الفرق على حساب فروق الجرد تلقائيًا.',
    ],
    stepsEn: [
      'Start from the Consumption variance screen sorted by value; the top 5 items explain most of it.',
      'Check waste: anything binned without a record shows up as variance.',
      'Confirm purchase unit and recipe unit share one dimension (weight with weight, volume with volume).',
      'Items with trim loss need a correct trim percentage, otherwise the gap is artificial.',
      'Post a fresh count afterwards — the system journals the difference automatically.',
    ],
    route: '/inventory/variance',
    readMins: 4,
    views: 221,
    helpful: 81,
    updatedDaysAgo: 9,
  },
  {
    id: 'KB-FOODCOST',
    categoryId: 'CAT-RCP',
    titleAr: 'نسبة تكلفة الطعام طلعت عالية',
    titleEn: 'Food cost percentage is too high',
    summaryAr: 'اقرأها على مستوى الطبق الأول — هندسة القائمة بتوريك مين بياكل الربح.',
    summaryEn: 'Read it per dish first — menu engineering shows what eats the margin.',
    tagsAr: ['تكلفة', 'سعر', 'هامش', 'قائمة'],
    tagsEn: ['cost', 'price', 'margin', 'menu'],
    stepsAr: [
      'افتح «هندسة القائمة»: الأطباق المصنّفة «حصان» شعبية وربحها قليل — ابدأ منها.',
      'في «بطاقة التكلفة» شوف أعلى 3 مكوّنات في الطبق — هي اللي بتتحرك مع الأسعار.',
      'قارن سعر البيع بالسعر المقترح على نسبة التكلفة المستهدفة للتصنيف.',
      'راجع أسعار شراء المواد الأعلى تأثيرًا، ومعاها فقد التنظيف وفقد التشغيل.',
      'الهدر والفرق بيزوّدوا النسبة الفعلية حتى لو الوصفة مظبوطة — راجعهم بعد كده.',
    ],
    stepsEn: [
      'Open Menu engineering: Plowhorse dishes are popular with thin margin — start there.',
      'In the cost card look at the top 3 ingredients; they drive the moves.',
      'Compare the sell price with the suggested price at the category target.',
      'Review purchase prices of the heaviest items, plus trim and batch loss.',
      'Waste and variance inflate the actual percentage even with perfect recipes.',
    ],
    route: '/recipes/engineering',
    readMins: 4,
    views: 310,
    helpful: 102,
    updatedDaysAgo: 2,
  },
  {
    id: 'KB-PRICE',
    categoryId: 'CAT-RCP',
    titleAr: 'عدّلت سعر مادة — إيه اللي بيتغيّر؟',
    titleEn: 'I changed an ingredient price — what moves?',
    summaryAr: 'التكلفة بتتحسب لحظيًا لكل وصفة بتستخدم المادة، بأي عمق تعشيش.',
    summaryEn: 'Costs recompute instantly for every recipe using it, at any nesting depth.',
    tagsAr: ['سعر', 'مواد', 'وصفة', 'تكلفة'],
    tagsEn: ['price', 'ingredient', 'recipe', 'cost'],
    stepsAr: [
      'التعديل بيتحفظ كتغيير فوق البيانات الأصلية — تقدر ترجّعه من الإعدادات في أي وقت.',
      'كل وصفة بتستخدم المادة (وكل وصفة بتستخدم الوصفة دي) تكلفتها بتتغيّر فورًا.',
      'شوف «استُخدمت في» جوه المادة عشان تعرف مدى التأثير قبل ما تحفظ.',
      'الأوردرات القديمة متتغيّرش — تكلفتها محفوظة بسعر وقت البيع.',
      'بعد التعديل راجع «بطاقة التكلفة» و«هندسة القائمة» للأطباق المتأثرة.',
    ],
    stepsEn: [
      'The edit is stored as an override on top of the original data and can be reset any time.',
      'Every recipe using it — and every recipe using those — recosts immediately.',
      'Check Used in on the ingredient to see the blast radius before saving.',
      'Past orders never change; their cost is frozen at sale time.',
      'Afterwards review the cost card and menu engineering for the affected dishes.',
    ],
    route: '/recipes/costing',
    readMins: 3,
    views: 174,
    helpful: 69,
    updatedDaysAgo: 14,
  },
  {
    id: 'KB-REORDER',
    categoryId: 'CAT-INV',
    titleAr: 'ضبط حد إعادة الطلب ومستوى الأمان',
    titleEn: 'Setting reorder point and par level',
    summaryAr: 'حد إعادة الطلب = استهلاك اليوم × أيام التوريد + مخزون أمان.',
    summaryEn: 'Reorder point = daily usage × lead time + safety stock.',
    tagsAr: ['مخزون', 'طلب', 'مورد', 'نقص'],
    tagsEn: ['stock', 'reorder', 'supplier', 'shortage'],
    stepsAr: [
      'خُد متوسط الاستهلاك اليومي للمادة من شاشة المخزون أو من فروق الاستهلاك.',
      'اضربه في أيام التوريد عند المورد، وزوّد 20%–30% مخزون أمان.',
      'المواد سريعة التلف: خلّي المستوى أقل وزوّد عدد مرات التوريد.',
      'شاشة المخزون بتلوّن أي مادة تحت الحد وبتقترح كمية الطلب.',
    ],
    stepsEn: [
      'Take the average daily usage from the stock or variance screen.',
      'Multiply by the supplier lead time and add 20–30% safety stock.',
      'For perishables keep the level lower and order more often.',
      'The stock screen flags anything below the point and suggests an order quantity.',
    ],
    route: '/inventory',
    readMins: 3,
    views: 142,
    helpful: 58,
    updatedDaysAgo: 18,
  },
  {
    id: 'KB-ACCESS',
    categoryId: 'CAT-USR',
    titleAr: 'مستخدم مش شايف شاشة معيّنة',
    titleEn: 'A user cannot see a screen',
    summaryAr: 'الصلاحيات بالدور مش بالشخص — الشاشة بتختفي من القائمة لو الدور مش مسموح له.',
    summaryEn: 'Access is by role, not by person — the screen hides when the role is not allowed.',
    tagsAr: ['صلاحيات', 'مستخدم', 'دور', 'دخول'],
    tagsEn: ['access', 'user', 'role', 'login'],
    stepsAr: [
      'من الإعدادات: شوف جدول المستخدمين وعمود «الموديولات المتاحة» للدور.',
      'لو الدور صح والشاشة مختفية: اعمل تسجيل خروج ودخول تاني بالرقم السري.',
      'الكاشير وشاشة المطبخ بيفتحوا بملء الشاشة بره القائمة الجانبية — دخولهم من الشريط العلوي.',
      'عايز توسّع صلاحية دور؟ افتح تذكرة بتصنيف «المستخدمين والصلاحيات» واسم الدور والشاشة.',
    ],
    stepsEn: [
      'In Settings, check the users table and the Modules column for that role.',
      'If the role is right but the screen is hidden, sign out and back in with the PIN.',
      'POS and the kitchen screen open full-screen outside the sidebar — use the top bar.',
      'Need a role widened? Open a Users & Access ticket naming the role and screen.',
    ],
    route: '/settings',
    readMins: 2,
    views: 157,
    helpful: 61,
    updatedDaysAgo: 21,
  },
  {
    id: 'KB-SLOW',
    categoryId: 'CAT-HW',
    titleAr: 'النظام بطيء على فرع واحد',
    titleEn: 'The system is slow at one branch',
    summaryAr: 'ابدأ من فحص النظام جوه الشاشة — بيفرّق بين مشكلة بيانات ومشكلة جهاز.',
    summaryEn: 'Start from the in-app health check — it separates data issues from device issues.',
    tagsAr: ['بطء', 'شبكة', 'جهاز', 'أداء'],
    tagsEn: ['slow', 'network', 'device', 'performance'],
    stepsAr: [
      'افتح «فحص النظام» واتأكد إن كل الفحوصات خضرا.',
      'اقفل تابات المتصفح الزيادة، والشاشات التشغيلية سيبها على تاب واحد لكل جهاز.',
      'جرّب تحديث الصفحة مرة واحدة — الحركات المحفوظة متتأثرش.',
      'لو الجهاز قديم: شاشة المطبخ تحب رام 4 جيجا على الأقل.',
      'افتح التذكرة من شاشة الفحص عشان بيانات التشخيص تتبعت معاها تلقائيًا.',
    ],
    stepsEn: [
      'Open System health and confirm every check is green.',
      'Close extra browser tabs; keep one operational screen per device.',
      'Refresh once — saved activity is not affected.',
      'On older devices the kitchen screen wants at least 4GB of RAM.',
      'Open the ticket from the health screen so diagnostics are attached automatically.',
    ],
    route: '/support/health',
    readMins: 3,
    views: 128,
    helpful: 47,
    updatedDaysAgo: 7,
  },
  {
    id: 'KB-DISCOUNT',
    categoryId: 'CAT-POS',
    titleAr: 'الخصم والضريبة في الفاتورة',
    titleEn: 'Discounts and tax on the invoice',
    summaryAr: 'أسعار القائمة صافية؛ الخصم بيتوزّع على السطور والضريبة بتُحسب بعده.',
    summaryEn: 'Menu prices are net; the discount spreads across lines and tax applies after it.',
    tagsAr: ['خصم', 'ضريبة', 'فاتورة', 'سعر'],
    tagsEn: ['discount', 'tax', 'invoice', 'price'],
    stepsAr: [
      'أسعار القائمة قبل الضريبة — الضريبة ورسم الخدمة بيتضافوا فوق الإجمالي.',
      'الخصم بيتوزّع على كل سطر بالتناسب، فربحية كل طبق وضريبته تطلع صح.',
      'رسم الخدمة بيتحسب على الصالة بس حسب نوع الأوردر.',
      'لو الإجمالي مش مطابق لتوقّعك: افتح الفاتورة وقارن «قبل الضريبة» بالضريبة ورسم الخدمة سطرًا بسطر.',
    ],
    stepsEn: [
      'Menu prices exclude tax; tax and service are added on top.',
      'A discount is prorated across lines so per-dish tax and margin stay correct.',
      'Service charge applies to dine-in only, per order type.',
      'If a total looks off, open the invoice and compare net, tax and service line by line.',
    ],
    route: '/pos',
    readMins: 2,
    views: 236,
    helpful: 79,
    updatedDaysAgo: 5,
  },
]

/* ====================== مولّد تاريخ التذاكر ====================== */

const SEED = 20260509
const HISTORY_DAYS = 60

/** مولّد أرقام شبه عشوائي حتمي — نفس بذرة `seed.js` */
function rng(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)]
const between = (rand, a, b) => a + rand() * (b - a)

/** سيناريوهات حقيقية — كل واحد بيولّد تذكرة بخيط رسائل مفهوم */
const SCENARIOS = [
  {
    categoryId: 'CAT-HW', priorityId: 'P1', agentId: 'AG-02', articleId: 'KB-PRINTER', channel: 'phone',
    subjectAr: 'طابعة الكاشير واقفة والفرع زحمة',
    subjectEn: 'Cashier printer down during peak',
    bodyAr: 'الطابعة بتاعة الكاشير الأول مش بتطبع خلاص من نص ساعة، والفرع مليان. بنكتب الأوردرات بالورقة.',
    bodyEn: 'The first cashier printer stopped printing half an hour ago and the branch is full. We are writing orders by hand.',
    agentAr: 'طابور الطباعة كان متعلّق بأمر قديم. مسحناه وعملنا إعادة تعيين للطابعة الافتراضية، وفاتورة تجريبية طبعت تمام. مرفق مقال الطابعة لو حصلت تاني.',
    agentEn: 'The print queue was stuck on an old job. We cleared it, reset the default printer, and a test receipt printed fine. Printer article attached in case it recurs.',
  },
  {
    categoryId: 'CAT-KDS', priorityId: 'P2', agentId: 'AG-01', articleId: 'KB-KDS', channel: 'app',
    subjectAr: 'أوردر دليفري مش ظاهر لقسم المشاوي',
    subjectEn: 'Delivery order missing from the grill station',
    bodyAr: 'أوردر فيه كفتة وفراخ ظهر في قسم البارد وما ظهرش في المشاوي، والشيف مستني.',
    bodyEn: 'An order with kofta and chicken showed in Cold but never in Grill, and the chef is waiting.',
    agentAr: 'السطور كانت موجّهة صح، بس الشاشة كانت مفلترة على قسم البارد. غيّرنا الفلتر لكل الأقسام فظهروا فورًا، وشرحنا للفريق إزاي يرجّعه.',
    agentEn: 'Routing was correct but the screen was filtered to Cold. Switching to All stations showed them instantly; we walked the team through it.',
  },
  {
    categoryId: 'CAT-ACC', priorityId: 'P2', agentId: 'AG-03', articleId: 'KB-SHIFT', channel: 'app',
    subjectAr: 'فرق نقدية في وردية المسا',
    subjectEn: 'Cash difference on the evening shift',
    bodyAr: 'عند إقفال الوردية المتوقع أكبر من المعدود، والكاشير متأكد إنه سلّم كل حاجة.',
    bodyEn: 'At shift close the expected cash is higher than counted, and the cashier is sure nothing is missing.',
    agentAr: 'لقينا فاتورتين اتدفعوا بالبطاقة واتسجلوا نقدي. صحّحنا طريقة الدفع والفرق رجع في حدود 0.4%، وبعتنا خطوات المراجعة للكاشير.',
    agentEn: 'Two invoices paid by card were recorded as cash. We corrected the payment method, the gap dropped to 0.4%, and shared the checklist with the cashier.',
  },
  {
    categoryId: 'CAT-INV', priorityId: 'P3', agentId: 'AG-01', articleId: 'KB-VARIANCE', channel: 'app',
    subjectAr: 'فرق جرد كبير في الموتزاريلا',
    subjectEn: 'Large count variance on mozzarella',
    bodyAr: 'الجرد الأسبوعي طلع ناقص جبنة بفرق كبير، مع إن البيتزا ماشية بالوصفة.',
    bodyEn: 'The weekly count shows a big cheese shortage even though pizza follows the recipe.',
    agentAr: 'السبب كان الجبنة الزيادة في الإضافات مش محسوبة كاستهلاك إضافي. ظبطنا إعداد الإضافة والفرق رجع لـ 1.2%.',
    agentEn: 'The extra-cheese modifier was not adding consumption. We fixed the modifier and the variance came back to 1.2%.',
  },
  {
    categoryId: 'CAT-RCP', priorityId: 'P3', agentId: 'AG-01', articleId: 'KB-FOODCOST', channel: 'app',
    subjectAr: 'نسبة تكلفة البرجر عالية بعد زيادة اللحمة',
    subjectEn: 'Burger cost percentage up after the beef price rise',
    bodyAr: 'بعد ما سعر اللحمة زاد، البرجر بقى هامشه ضعيف. محتاج أعرف أرفع السعر كام.',
    bodyEn: 'After the beef price increase the burger margin is thin. I need to know how much to raise the price.',
    agentAr: 'حسبناها على نسبة التكلفة المستهدفة للتصنيف: السعر المقترح أعلى من الحالي بفرق بسيط. الأفضل تعديل الحجم أو السعر بالتدريج ومتابعة الشعبية في هندسة القائمة.',
    agentEn: 'We ran it at the category target: the suggested price is slightly above the current one. Adjust portion or price gradually and watch popularity in menu engineering.',
  },
  {
    categoryId: 'CAT-POS', priorityId: 'P2', agentId: 'AG-03', articleId: 'KB-DISCOUNT', channel: 'whatsapp',
    subjectAr: 'إجمالي الفاتورة مش مطابق بعد الخصم',
    subjectEn: 'Invoice total looks wrong after a discount',
    bodyAr: 'عميل خد خصم 10% والإجمالي طلع رقم مش متوقع. فيه حساب غلط في الضريبة؟',
    bodyEn: 'A guest got a 10% discount and the total came out unexpected. Is the tax wrong?',
    agentAr: 'الحساب سليم: الخصم بيتوزّع على السطور، الضريبة بتُحسب بعد الخصم، ورسم الخدمة على الصالة بس. بعتنا تفصيل الفاتورة سطرًا بسطر.',
    agentEn: 'The math is right: the discount prorates across lines, tax applies after it, and service is dine-in only. We sent the line-by-line breakdown.',
  },
  {
    categoryId: 'CAT-USR', priorityId: 'P3', agentId: 'AG-01', articleId: 'KB-ACCESS', channel: 'app',
    subjectAr: 'أمين المخزن مش شايف شاشة الحسابات',
    subjectEn: 'Storekeeper cannot see the accounting screen',
    bodyAr: 'عايز أمين المخزن يشوف تقرير المشتريات والقيود بتاعتها.',
    bodyEn: 'I want the storekeeper to see purchase reports and their journal entries.',
    agentAr: 'شاشات الحسابات متاحة للمالك والمدير والمحاسب. سجّلنا طلب توسيع صلاحية «قيود المشتريات» لأمين المخزن للإصدار القادم، والمشتريات نفسها ظاهرة له بالفعل.',
    agentEn: 'Accounting is limited to owner, manager and accountant. We logged a request to expose purchase journals to storekeepers next release; purchases themselves are already visible.',
  },
  {
    categoryId: 'CAT-REQ', priorityId: 'P4', agentId: 'AG-04', articleId: '', channel: 'email',
    subjectAr: 'طلب: تقرير ربحية لكل ساعة',
    subjectEn: 'Request: hourly profitability report',
    bodyAr: 'محتاجين نشوف الربح بالساعة مش المبيعات بس، عشان نظبط عدد الشيفات في الذروة.',
    bodyEn: 'We need profit by hour, not just sales, to staff the kitchen at peak.',
    agentAr: 'الطلب دخل خطة المنتج. مؤقتًا شاشة المبيعات بالساعة مع ربحية الأطباق بتوصّلك لنفس القرار، وبعتنا الطريقة.',
    agentEn: 'Added to the product plan. For now the hourly sales screen plus item profitability gets you to the same decision; we sent the method.',
  },
  {
    categoryId: 'CAT-HW', priorityId: 'P2', agentId: 'AG-02', articleId: 'KB-SLOW', channel: 'phone',
    subjectAr: 'شاشة المطبخ بتهنج في وقت الذروة',
    subjectEn: 'Kitchen screen freezes at peak',
    bodyAr: 'جهاز المطبخ بيبقى بطيء جدًا الساعة 9 بالليل، وبنضطر نعمل تحديث للصفحة.',
    bodyEn: 'The kitchen device gets very slow around 9pm and we keep refreshing the page.',
    agentAr: 'الجهاز كان فاتح 7 تابات، منهم تابين لنفس الشاشة. قفلنا الزيادة وفحص النظام طلع كله أخضر، والأداء رجع طبيعي.',
    agentEn: 'The device had 7 tabs open, two on the same screen. We closed the extras, the health check came back green, and performance recovered.',
  },
  {
    categoryId: 'CAT-INV', priorityId: 'P3', agentId: 'AG-01', articleId: 'KB-REORDER', channel: 'app',
    subjectAr: 'مواد بتخلص قبل التوريد',
    subjectEn: 'Items run out before delivery',
    bodyAr: 'الخضار بيخلص قبل ما المورد يجي، ومحتاج أظبط حد إعادة الطلب صح.',
    bodyEn: 'Vegetables run out before the supplier arrives; I need the reorder point set properly.',
    agentAr: 'ظبطنا الحد على استهلاك اليوم × أيام التوريد + 25% أمان للمواد السريعة، وشاشة المخزون بقت تقترح كمية الطلب تلقائيًا.',
    agentEn: 'We set the point to daily usage × lead time + 25% safety for perishables; the stock screen now suggests the order quantity.',
  },
]

const CUSTOMER_FOLLOWUPS = [
  { ar: 'تمام، جرّبنا الخطوات وشغّال. شكرًا للسرعة.', en: 'Tried the steps and it works. Thanks for the quick help.' },
  { ar: 'الحل مشي، ولو حصل تاني هفتح نفس التذكرة.', en: 'The fix worked; I will reopen this ticket if it recurs.' },
  { ar: 'شكرًا، الشرح كان واضح والفريق فهم.', en: 'Thanks, the explanation was clear and the team got it.' },
]

const WAITING_ASKS = [
  { ar: 'ممكن تبعتلنا رقم الأوردر وصورة للشاشة من الجهاز اللي عليه المشكلة؟', en: 'Could you send the order number and a screenshot from the affected device?' },
  { ar: 'محتاجين اسم الفرع والجهاز ووقت المشكلة بالظبط عشان نراجع السجل.', en: 'We need the branch, the device and the exact time to check the log.' },
]

const iso = (d) => new Date(d).toISOString()
const minsAfter = (d, mins) => new Date(new Date(d).getTime() + mins * 60000)

/**
 * تاريخ تذاكر حتمي لآخر 60 يوم — مزيج حالات مقصود: تذاكر مفتوحة،
 * واحدة بانتظار رد العميل، تنتين متأخرين عن الـ SLA، والباقي محلول ومقيّم.
 */
export function buildSupportSeed() {
  const rand = rng(SEED)
  const now = new Date()
  const tickets = []

  /** الحالة المقصودة لكل تذكرة بالترتيب (من الأحدث للأقدم) */
  const PLAN = [
    { status: 'open', ageMins: 8, breach: false },
    { status: 'in_progress', ageMins: 95, breach: false },
    { status: 'in_progress', ageMins: 320, breach: true },
    { status: 'waiting_customer', ageMins: 700, breach: false },
    { status: 'open', ageMins: 1500, breach: true },
    ...Array.from({ length: 9 }, () => ({ status: 'resolved', breach: false })),
    ...Array.from({ length: 10 }, () => ({ status: 'closed', breach: false })),
  ]

  PLAN.forEach((planned, i) => {
    const sc = SCENARIOS[i % SCENARIOS.length]
    const pri = SUPPORT_PRIORITIES.find((p) => p.id === sc.priorityId)
    const branch = pick(rand, BRANCHES)
    const reporter = pick(rand, USERS.filter((u) => u.role !== 'owner'))
    const ageMins = planned.ageMins ?? Math.round(between(rand, 60 * 24 * 2, 60 * 24 * HISTORY_DAYS))
    const createdAt = minsAfter(now, -ageMins)
    const number = `SP-${String(PLAN.length - i).padStart(4, '0')}`
    const id = `SUP-${number.slice(3)}`

    const ticket = {
      id,
      number,
      subjectAr: sc.subjectAr,
      subjectEn: sc.subjectEn,
      categoryId: sc.categoryId,
      priorityId: sc.priorityId,
      status: planned.status,
      branchId: branch.id,
      createdBy: reporter.id,
      createdAt: iso(createdAt),
      channel: sc.channel,
      assigneeId: planned.status === 'open' ? null : sc.agentId,
      articleId: sc.articleId || null,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      reopenCount: 0,
      csat: null,
      pauses: [],
      diagnostics: null,
      messages: [
        {
          id: `${id}-M1`,
          author: 'customer',
          userId: reporter.id,
          bodyAr: sc.bodyAr,
          bodyEn: sc.bodyEn,
          at: iso(createdAt),
        },
        {
          id: `${id}-M2`,
          author: 'system',
          bodyAr: `استلمنا تذكرتك. أولوية «${pri.nameAr}» — أول رد متوقع خلال ${pri.responseMins} دقيقة.`,
          bodyEn: `Ticket received. Priority ${pri.nameEn} — first reply expected within ${pri.responseMins} minutes.`,
          at: iso(minsAfter(createdAt, 1)),
        },
      ],
    }

    if (planned.status !== 'open') {
      /** أول رد: جوه الـ SLA عادةً، ومتأخر في الحالات المقصودة */
      const respMins = planned.breach
        ? Math.round(pri.responseMins * between(rand, 1.6, 3.2))
        : Math.round(pri.responseMins * between(rand, 0.15, 0.85))
      const firstResponseAt = minsAfter(createdAt, respMins)
      ticket.firstResponseAt = iso(firstResponseAt)
      ticket.messages.push({
        id: `${id}-M3`,
        author: 'agent',
        agentId: sc.agentId,
        bodyAr: 'شغّالين عليها حالًا. أول خطوة: بنراجع السجل وبنجرّب نعيد المشكلة على نفس الإعدادات.',
        bodyEn: 'On it now. First step: reviewing the log and reproducing it on the same setup.',
        at: iso(firstResponseAt),
      })

      if (planned.status === 'waiting_customer') {
        const ask = pick(rand, WAITING_ASKS)
        const askAt = minsAfter(firstResponseAt, Math.round(between(rand, 20, 70)))
        ticket.messages.push({
          id: `${id}-M4`, author: 'agent', agentId: sc.agentId,
          bodyAr: ask.ar, bodyEn: ask.en, at: iso(askAt),
        })
        ticket.pauses = [{ from: iso(askAt), to: null }]
      }

      if (planned.status === 'resolved' || planned.status === 'closed') {
        const fixMins = Math.round(pri.resolveMins * between(rand, 0.2, 0.8))
        const resolvedAt = minsAfter(firstResponseAt, fixMins)
        ticket.resolvedAt = iso(resolvedAt)
        ticket.messages.push({
          id: `${id}-M4`, author: 'agent', agentId: sc.agentId,
          bodyAr: sc.agentAr, bodyEn: sc.agentEn, at: iso(resolvedAt),
        })

        const follow = pick(rand, CUSTOMER_FOLLOWUPS)
        const followAt = minsAfter(resolvedAt, Math.round(between(rand, 15, 240)))
        ticket.messages.push({
          id: `${id}-M5`, author: 'customer', userId: reporter.id,
          bodyAr: follow.ar, bodyEn: follow.en, at: iso(followAt),
        })

        const stars = rand() < 0.76 ? 5 : rand() < 0.75 ? 4 : 3
        ticket.csat = {
          stars,
          commentAr: stars >= 4 ? 'رد سريع وحل واضح.' : 'الحل تمام بس الرد اتأخر شوية.',
          commentEn: stars >= 4 ? 'Fast reply, clear fix.' : 'The fix was fine but the reply was slow.',
          at: iso(followAt),
        }
        if (planned.status === 'closed') ticket.closedAt = iso(minsAfter(followAt, 60))
      }
    }

    tickets.push(ticket)
  })

  return { tickets }
}

/**
 * استهلاك الباقة في الشهر الحالي — تقدير ساعات الدعم:
 * 10 دقايق تعامل لكل تذكرة + ربع زمن المعالجة الفعلي.
 */
export function planUsage(tickets, { now = Date.now() } = {}) {
  const monthStart = new Date(now)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const inMonth = tickets.filter((t) => new Date(t.createdAt) >= monthStart)
  const handledMins = sum(inMonth, (t) => {
    const end = t.resolvedAt || t.closedAt || now
    return Math.max(0, (new Date(end) - new Date(t.createdAt)) / 60000)
  })
  const workedMins = inMonth.length * 10 + handledMins * 0.25
  const usedHours = round(workedMins / 60, 1)

  const renewsAt = new Date(monthStart)
  renewsAt.setMonth(renewsAt.getMonth() + 1)
  renewsAt.setDate(SUPPORT_PLAN.renewalDay)

  return {
    tickets: inMonth.length,
    usedHours,
    includedHours: SUPPORT_PLAN.includedHours,
    remainingHours: round(Math.max(0, SUPPORT_PLAN.includedHours - usedHours), 1),
    usedPct: Math.min(1, usedHours / SUPPORT_PLAN.includedHours),
    renewsAt: renewsAt.toISOString(),
    daysToRenew: Math.max(0, Math.ceil((renewsAt - now) / 86400000)),
  }
}

export const supportCategoryMap = new Map(SUPPORT_CATEGORIES.map((c) => [c.id, c]))
export const supportPriorityMap = new Map(SUPPORT_PRIORITIES.map((p) => [p.id, p]))
export const supportAgentMap = new Map(SUPPORT_AGENTS.map((a) => [a.id, a]))
export const kbArticleMap = new Map(KB_ARTICLES.map((a) => [a.id, a]))

/** تاريخ آخر تحديث لمقال — نسبي عشان يفضل منطقي مع مرور الوقت */
export const articleUpdatedAt = (article) =>
  addDays(new Date(), -(article?.updatedDaysAgo || 0)).toISOString()
