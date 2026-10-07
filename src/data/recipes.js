/**
 * الوصفات — عمود السيستم.
 *
 * type: 'prep' = وصفة تجهيز (نصف مصنع) تُنتج دفعة تُستخدم في وصفات أخرى.
 *       'menu' = طبق يُباع على الـ POS.
 *
 * yieldQty/yieldUnit  = ناتج الدفعة (لوصفة التجهيز) أو حجم الحصة الواحدة (لطبق القائمة).
 * batchLossPct        = فقد التشغيل (تبخير/التصاق/تقطيع) — يرفع تكلفة الوحدة الناتجة.
 * lines[]             = مكوّنات: مادة خام (ingredient) أو وصفة تجهيز أخرى (recipe) — والتعشيش مسموح لأي عمق.
 * steps[]             = خطوات التجهيز، كل خطوة لقسم مطبخ ومدة — دي اللي تظهر على شاشة KDS.
 */

const i = (refId, qty, unit, note) => ({ type: 'ingredient', refId, qty, unit, note })
const r = (refId, qty, unit, note) => ({ type: 'recipe', refId, qty, unit, note })
const s = (stationId, durationMin, textAr, textEn, critical = false) => ({
  stationId,
  durationMin,
  textAr,
  textEn,
  critical,
})

export const RECIPES = [
  /* ===================== وصفات التجهيز (نصف مصنعة) ===================== */
  {
    id: 'PREP-GARLIC', code: 'P-001', nameAr: 'ثوم مفروم مجهز', nameEn: 'Prepped Minced Garlic',
    type: 'prep', stationId: 'ST-PREP', emoji: '🧄',
    yieldQty: 850, yieldUnit: 'g', batchLossPct: 0.03, shelfLifeHours: 72,
    lines: [i('ING-042', 1000, 'g'), i('ING-081', 60, 'ml', 'لتغطية السطح')],
    steps: [
      s('ST-PREP', 12, 'تقشير الثوم وإزالة القلب الأخضر', 'Peel garlic, remove green core'),
      s('ST-PREP', 6, 'فرم ناعم في الكتر ثم تغطية بزيت الزيتون', 'Fine-chop and cover with olive oil', true),
    ],
  },
  {
    id: 'PREP-TOMSAUCE', code: 'P-002', nameAr: 'صوص طماطم للبيتزا', nameEn: 'Pizza Tomato Sauce',
    type: 'prep', stationId: 'ST-PREP', emoji: '🥫',
    yieldQty: 3000, yieldUnit: 'ml', batchLossPct: 0.08, shelfLifeHours: 96,
    lines: [
      i('ING-040', 4000, 'g'), r('PREP-GARLIC', 120, 'g'), i('ING-081', 150, 'ml'),
      i('ING-063', 40, 'g'), i('ING-062', 25, 'g', 'لموازنة الحمضية'), i('ING-065', 15, 'g'),
    ],
    steps: [
      s('ST-PREP', 10, 'سلق الطماطم وتقشيرها', 'Blanch and peel tomatoes'),
      s('ST-PREP', 8, 'تشويح الثوم المجهز في زيت الزيتون', 'Sweat prepped garlic in olive oil'),
      s('ST-PREP', 35, 'طهي على نار هادئة حتى التكثيف ثم الهرس', 'Simmer until reduced, then blend', true),
    ],
  },
  {
    id: 'PREP-CHEESEMIX', code: 'P-003', nameAr: 'خلطة جبن البيتزا', nameEn: 'Pizza Cheese Blend',
    type: 'prep', stationId: 'ST-PREP', emoji: '🧀',
    yieldQty: 2000, yieldUnit: 'g', batchLossPct: 0.01, shelfLifeHours: 48,
    lines: [i('ING-020', 1500, 'g'), i('ING-021', 500, 'g')],
    steps: [s('ST-PREP', 10, 'تبريش الجبن وخلطه بنسبة 3:1', 'Shred and blend cheeses 3:1')],
  },
  {
    id: 'PREP-DOUGH', code: 'P-004', nameAr: 'عجينة بيتزا', nameEn: 'Pizza Dough',
    type: 'prep', stationId: 'ST-PREP', emoji: '🍥',
    yieldQty: 4800, yieldUnit: 'g', batchLossPct: 0.03, shelfLifeHours: 48,
    lines: [
      i('ING-060', 3000, 'g'), i('ING-061', 30, 'g'), i('ING-063', 60, 'g'),
      i('ING-062', 40, 'g'), i('ING-081', 120, 'ml'),
    ],
    steps: [
      s('ST-PREP', 14, 'عجن المكونات 14 دقيقة حتى الشبكة الجلوتينية', 'Knead 14 min to gluten window', true),
      s('ST-PREP', 90, 'تخمير أولي 90 دقيقة في درجة حرارة الغرفة', 'Bulk ferment 90 min at room temp'),
      s('ST-PREP', 20, 'تقسيم كور 320 جم وتبريد', 'Divide 320g balls and chill', true),
    ],
  },
  {
    id: 'PREP-KOFTA', code: 'P-005', nameAr: 'خلطة كفتة', nameEn: 'Kofta Mix',
    type: 'prep', stationId: 'ST-PREP', emoji: '🥩',
    yieldQty: 5000, yieldUnit: 'g', batchLossPct: 0.02, shelfLifeHours: 24,
    lines: [
      i('ING-001', 4000, 'g'), i('ING-041', 700, 'g'), i('ING-046', 250, 'g'),
      i('ING-065', 60, 'g'), i('ING-063', 50, 'g'), i('ING-064', 15, 'g'),
    ],
    steps: [
      s('ST-PREP', 10, 'فرم البصل والبقدونس وتصفيتهما جيدًا', 'Mince onion and parsley, drain well', true),
      s('ST-PREP', 12, 'خلط اللحم مع الخلطة حتى التماسك', 'Mix with beef until bound'),
      s('ST-PREP', 60, 'راحة في الثلاجة ساعة قبل التشكيل', 'Rest 1h chilled before shaping'),
    ],
  },
  {
    id: 'PREP-BURGPATTY', code: 'P-006', nameAr: 'أقراص برجر 150 جم', nameEn: 'Burger Patty 150g',
    type: 'prep', stationId: 'ST-PREP', emoji: '🍔',
    yieldQty: 20, yieldUnit: 'pc', batchLossPct: 0.02, shelfLifeHours: 24,
    lines: [
      i('ING-001', 2800, 'g'), i('ING-041', 200, 'g'), i('ING-071', 150, 'g'),
      i('ING-063', 35, 'g'), i('ING-064', 12, 'g'),
    ],
    steps: [
      s('ST-PREP', 10, 'خلط اللحم بالبقسماط والبهارات بخلط خفيف', 'Mix beef gently with crumbs and spices'),
      s('ST-PREP', 15, 'تشكيل أقراص 150 جم بفاصل ورقي', 'Form 150g patties with paper dividers', true),
    ],
  },
  {
    id: 'PREP-TAWOOK', code: 'P-007', nameAr: 'دجاج طاووق متبّل', nameEn: 'Marinated Tawook',
    type: 'prep', stationId: 'ST-PREP', emoji: '🍗',
    yieldQty: 4300, yieldUnit: 'g', batchLossPct: 0.02, shelfLifeHours: 24,
    lines: [
      i('ING-010', 4000, 'g'), i('ING-028', 500, 'g'), i('ING-048', 200, 'g'),
      r('PREP-GARLIC', 80, 'g'), i('ING-065', 60, 'g'), i('ING-080', 150, 'ml'),
    ],
    steps: [
      s('ST-PREP', 15, 'تقطيع الصدور مكعبات 3 سم', 'Cube breast into 3cm pieces'),
      s('ST-PREP', 10, 'خلط التتبيلة وتغليف الدجاج بها', 'Mix marinade and coat chicken'),
      s('ST-PREP', 240, 'تتبيل 4 ساعات على الأقل مبرّدًا', 'Marinate 4h minimum, chilled', true),
    ],
  },
  {
    id: 'PREP-SHAWARMA', code: 'P-008', nameAr: 'فراخ شاورما متبّلة', nameEn: 'Marinated Shawarma Chicken',
    type: 'prep', stationId: 'ST-PREP', emoji: '🌯',
    yieldQty: 4200, yieldUnit: 'g', batchLossPct: 0.03, shelfLifeHours: 24,
    lines: [
      i('ING-011', 4000, 'g'), i('ING-028', 400, 'g'), i('ING-067', 50, 'g'),
      i('ING-065', 60, 'g'), r('PREP-GARLIC', 60, 'g'), i('ING-080', 200, 'ml'),
    ],
    steps: [
      s('ST-PREP', 18, 'تقطيع الأوراك شرائح رفيعة', 'Slice thigh meat thin'),
      s('ST-PREP', 300, 'تتبيل 5 ساعات ثم الرصّ على السيخ', 'Marinate 5h then stack on spit', true),
    ],
  },
  {
    id: 'PREP-TAHINASAUCE', code: 'P-009', nameAr: 'صوص طحينة', nameEn: 'Tahini Sauce',
    type: 'prep', stationId: 'ST-PREP', emoji: '🥣',
    yieldQty: 2000, yieldUnit: 'ml', batchLossPct: 0.02, shelfLifeHours: 72,
    lines: [i('ING-070', 900, 'g'), i('ING-048', 300, 'g'), r('PREP-GARLIC', 50, 'g'), i('ING-063', 25, 'g')],
    steps: [
      s('ST-PREP', 8, 'خفق الطحينة مع عصير الليمون تدريجيًا', 'Whisk tahini with lemon juice gradually', true),
      s('ST-PREP', 4, 'تخفيف بالماء المثلج للقوام المطلوب', 'Thin with iced water to consistency'),
    ],
  },
  {
    id: 'PREP-GARLICSAUCE', code: 'P-010', nameAr: 'صوص ثومية', nameEn: 'Garlic Toum',
    type: 'prep', stationId: 'ST-PREP', emoji: '🧂',
    yieldQty: 1000, yieldUnit: 'ml', batchLossPct: 0.02, shelfLifeHours: 120,
    lines: [r('PREP-GARLIC', 200, 'g'), i('ING-080', 600, 'ml'), i('ING-048', 100, 'g'), i('ING-063', 15, 'g')],
    steps: [s('ST-PREP', 12, 'إضافة الزيت نقطة نقطة حتى الاستحلاب', 'Emulsify adding oil drop by drop', true)],
  },
  {
    id: 'PREP-CAESAR', code: 'P-011', nameAr: 'دريسنج سيزر', nameEn: 'Caesar Dressing',
    type: 'prep', stationId: 'ST-PREP', emoji: '🥗',
    yieldQty: 1500, yieldUnit: 'ml', batchLossPct: 0.02, shelfLifeHours: 48,
    lines: [
      i('ING-023', 200, 'g'), i('ING-029', 6, 'pc'), i('ING-081', 700, 'ml'),
      i('ING-048', 120, 'g'), r('PREP-GARLIC', 40, 'g'), i('ING-064', 10, 'g'),
    ],
    steps: [s('ST-PREP', 14, 'استحلاب الصفار مع الزيت ثم إضافة البارميزان', 'Emulsify yolks with oil, fold parmesan', true)],
  },
  {
    id: 'PREP-HUMMUS', code: 'P-012', nameAr: 'حمص مطبوخ ومهروس', nameEn: 'Hummus Base',
    type: 'prep', stationId: 'ST-PREP', emoji: '🫘',
    yieldQty: 3000, yieldUnit: 'g', batchLossPct: 0.04, shelfLifeHours: 72,
    lines: [
      i('ING-069', 1200, 'g'), r('PREP-TAHINASAUCE', 400, 'ml'), i('ING-048', 200, 'g'),
      i('ING-063', 30, 'g'), i('ING-066', 15, 'g'),
    ],
    steps: [
      s('ST-PREP', 720, 'نقع الحمص 12 ساعة', 'Soak chickpeas 12h', true),
      s('ST-PREP', 75, 'سلق حتى الطرى الكامل', 'Boil until fully tender'),
      s('ST-PREP', 12, 'هرس ساخن مع صوص الطحينة', 'Blend hot with tahini sauce', true),
    ],
  },
  {
    id: 'PREP-BABAGH', code: 'P-013', nameAr: 'بابا غنوج', nameEn: 'Baba Ghanoush',
    type: 'prep', stationId: 'ST-PREP', emoji: '🍆',
    yieldQty: 2000, yieldUnit: 'g', batchLossPct: 0.12, shelfLifeHours: 48,
    lines: [i('ING-050', 3000, 'g'), r('PREP-TAHINASAUCE', 300, 'ml'), i('ING-048', 100, 'g'), i('ING-063', 20, 'g')],
    steps: [
      s('ST-GRILL', 25, 'شوي الباذنجان على اللهب المباشر حتى التفحم', 'Char eggplant over open flame', true),
      s('ST-PREP', 15, 'تقشير وتصفية ثم خلط بصوص الطحينة', 'Peel, drain, fold with tahini sauce'),
    ],
  },
  {
    id: 'PREP-FRIES', code: 'P-014', nameAr: 'بطاطس مقطعة مجهزة', nameEn: 'Prepped Fries',
    type: 'prep', stationId: 'ST-PREP', emoji: '🥔',
    yieldQty: 8000, yieldUnit: 'g', batchLossPct: 0.05, shelfLifeHours: 24,
    lines: [i('ING-049', 10000, 'g'), i('ING-073', 80, 'g', 'للقرمشة')],
    steps: [
      s('ST-PREP', 25, 'تقطيع أعواد 10 مم ونقع لإزالة النشا', 'Cut 10mm batons, soak to remove starch'),
      s('ST-FRY', 8, 'سلق أولي في الزيت على 140°م', 'Blanch in oil at 140°C', true),
    ],
  },
  {
    id: 'PREP-SYRUP', code: 'P-015', nameAr: 'شراب سكر', nameEn: 'Simple Syrup',
    type: 'prep', stationId: 'ST-BAR', emoji: '🍯',
    yieldQty: 1500, yieldUnit: 'ml', batchLossPct: 0.02, shelfLifeHours: 336,
    lines: [i('ING-062', 1000, 'g'), i('ING-048', 30, 'g', 'قطرات ليمون')],
    steps: [s('ST-BAR', 10, 'تسخين السكر بالماء 1:1 حتى الذوبان', 'Heat sugar and water 1:1 until dissolved')],
  },
  {
    id: 'PREP-MANGOPUREE', code: 'P-016', nameAr: 'بيوريه مانجو', nameEn: 'Mango Purée',
    type: 'prep', stationId: 'ST-BAR', emoji: '🥭',
    yieldQty: 2600, yieldUnit: 'ml', batchLossPct: 0.03, shelfLifeHours: 48,
    lines: [i('ING-053', 2500, 'g'), r('PREP-SYRUP', 200, 'ml'), i('ING-048', 60, 'g')],
    steps: [s('ST-BAR', 8, 'هرس المانجو مع الشراب والليمون وتصفية', 'Blend mango with syrup and lemon, strain')],
  },
  {
    id: 'PREP-OMALI', code: 'P-017', nameAr: 'خلطة أم علي الجافة', nameEn: 'Om Ali Dry Mix',
    type: 'prep', stationId: 'ST-PASTRY', emoji: '🥮',
    yieldQty: 1200, yieldUnit: 'g', batchLossPct: 0.02, shelfLifeHours: 168,
    lines: [i('ING-092', 600, 'g'), i('ING-102', 300, 'g'), i('ING-105', 150, 'g'), i('ING-062', 180, 'g')],
    steps: [
      s('ST-PASTRY', 12, 'تحميص الرقاق حتى الذهبي', 'Toast roqaq until golden', true),
      s('ST-PASTRY', 8, 'تكسير وخلط بالمكسرات وجوز الهند', 'Crush and blend with nuts and coconut'),
    ],
  },
  {
    id: 'PREP-BROWNIE', code: 'P-018', nameAr: 'صاج براوني', nameEn: 'Brownie Tray',
    type: 'prep', stationId: 'ST-PASTRY', emoji: '🍫',
    yieldQty: 24, yieldUnit: 'pc', batchLossPct: 0.06, shelfLifeHours: 96,
    lines: [
      i('ING-100', 600, 'g'), i('ING-026', 450, 'g'), i('ING-062', 800, 'g'),
      i('ING-029', 8, 'pc'), i('ING-060', 400, 'g'), i('ING-101', 120, 'g'),
    ],
    steps: [
      s('ST-PASTRY', 10, 'إذابة الشوكولاتة والزبدة على حمام مائي', 'Melt chocolate and butter over bain-marie'),
      s('ST-PASTRY', 12, 'خفق البيض بالسكر ثم الدمج', 'Whip eggs with sugar then fold'),
      s('ST-PASTRY', 28, 'خبز 28 دقيقة على 175°م', 'Bake 28 min at 175°C', true),
    ],
  },
  {
    id: 'PREP-CHZCAKE', code: 'P-019', nameAr: 'تشيز كيك كامل', nameEn: 'Cheesecake Whole',
    type: 'prep', stationId: 'ST-PASTRY', emoji: '🍰',
    yieldQty: 12, yieldUnit: 'pc', batchLossPct: 0.05, shelfLifeHours: 96,
    lines: [
      i('ING-027', 1200, 'g'), i('ING-062', 350, 'g'), i('ING-029', 4, 'pc'),
      i('ING-024', 250, 'ml'), i('ING-071', 300, 'g'), i('ING-026', 150, 'g'), i('ING-103', 20, 'ml'),
    ],
    steps: [
      s('ST-PASTRY', 10, 'تجهيز قاعدة البقسماط بالزبدة', 'Press crumb base with butter'),
      s('ST-PASTRY', 12, 'خلط الجبنة بالسكر والبيض بدون هواء', 'Mix cheese, sugar, eggs without aerating', true),
      s('ST-PASTRY', 55, 'خبز بحمام مائي 55 دقيقة ثم تبريد ليلة', 'Water-bath bake 55 min, chill overnight', true),
    ],
  },

  /* ===================== المشاوي ===================== */
  {
    id: 'M-KOFTA', code: 'M-101', nameAr: 'كفتة مشوية', nameEn: 'Grilled Kofta',
    type: 'menu', categoryId: 'CAT-GRILL', stationId: 'ST-GRILL', emoji: '🍢',
    yieldQty: 1, yieldUnit: 'portion', price: 350, taxGroupId: 'TX-14', prepTimeMin: 14,
    lines: [r('PREP-KOFTA', 320, 'g'), r('PREP-TAHINASAUCE', 60, 'ml'), i('ING-091', 2, 'pc'), i('ING-046', 8, 'g')],
    steps: [
      s('ST-GRILL', 4, 'تشكيل 4 أصابع كفتة على السيخ', 'Shape 4 kofta fingers on skewer'),
      s('ST-GRILL', 9, 'شوي على فحم متوسط مع التقليب', 'Grill over medium charcoal, turning', true),
      s('ST-COLD', 1, 'التقديم مع الطحينة والعيش والبقدونس', 'Plate with tahini, bread, parsley'),
    ],
  },
  {
    id: 'M-TAWOOK', code: 'M-102', nameAr: 'شيش طاووق', nameEn: 'Shish Tawook',
    type: 'menu', categoryId: 'CAT-GRILL', stationId: 'ST-GRILL', emoji: '🍗',
    yieldQty: 1, yieldUnit: 'portion', price: 240, taxGroupId: 'TX-14', prepTimeMin: 15,
    lines: [r('PREP-TAWOOK', 300, 'g'), r('PREP-GARLICSAUCE', 50, 'ml'), i('ING-091', 2, 'pc'), i('ING-045', 40, 'g')],
    steps: [
      s('ST-GRILL', 3, 'رصّ المكعبات مع الفلفل على السيخ', 'Skewer cubes with peppers'),
      s('ST-GRILL', 11, 'شوي حتى 74°م في القلب', 'Grill to 74°C core temp', true),
      s('ST-COLD', 1, 'التقديم مع الثومية', 'Plate with toum'),
    ],
  },
  {
    id: 'M-LAMBCHOP', code: 'M-103', nameAr: 'ريش ضاني مشوية', nameEn: 'Grilled Lamb Chops',
    type: 'menu', categoryId: 'CAT-GRILL', stationId: 'ST-GRILL', emoji: '🥩',
    yieldQty: 1, yieldUnit: 'portion', price: 650, taxGroupId: 'TX-14', prepTimeMin: 18,
    lines: [i('ING-002', 300, 'g'), i('ING-065', 10, 'g'), i('ING-081', 20, 'ml'), r('PREP-GARLIC', 10, 'g')],
    steps: [
      s('ST-PREP', 3, 'تنظيف الريش وتتبيل سريع', 'Trim chops and quick-season'),
      s('ST-GRILL', 12, 'شوي 6 دقائق لكل وجه — ميديم', 'Grill 6 min per side — medium', true),
      s('ST-GRILL', 3, 'راحة 3 دقائق قبل التقديم', 'Rest 3 min before plating', true),
    ],
  },
  {
    id: 'M-MIXGRILL', code: 'M-104', nameAr: 'مشكل مشاوي', nameEn: 'Mixed Grill',
    type: 'menu', categoryId: 'CAT-GRILL', stationId: 'ST-GRILL', emoji: '🍖',
    yieldQty: 1, yieldUnit: 'portion', price: 580, taxGroupId: 'TX-14', prepTimeMin: 22,
    lines: [
      r('PREP-KOFTA', 180, 'g'), r('PREP-TAWOOK', 180, 'g'), i('ING-002', 150, 'g'),
      r('PREP-TAHINASAUCE', 70, 'ml'), i('ING-091', 3, 'pc'),
    ],
    steps: [
      s('ST-GRILL', 5, 'تجهيز الأسياخ الثلاثة', 'Prepare the three skewers'),
      s('ST-GRILL', 15, 'شوي مرتّب حسب زمن كل نوع', 'Grill staggered by cooking time', true),
      s('ST-COLD', 2, 'ترتيب الصينية والمقبلات', 'Arrange platter and sides'),
    ],
  },
  {
    id: 'M-HALFCHICK', code: 'M-105', nameAr: 'نص فرخة مشوية', nameEn: 'Half Grilled Chicken',
    type: 'menu', categoryId: 'CAT-GRILL', stationId: 'ST-GRILL', emoji: '🐔',
    yieldQty: 1, yieldUnit: 'portion', price: 380, taxGroupId: 'TX-14', prepTimeMin: 25,
    lines: [i('ING-012', 700, 'g'), r('PREP-GARLICSAUCE', 60, 'ml'), i('ING-065', 12, 'g'), i('ING-091', 2, 'pc')],
    steps: [
      s('ST-PREP', 4, 'تفصيل نصف الفرخة وتتبيل', 'Butterfly half chicken and season'),
      s('ST-GRILL', 20, 'شوي بطيء ثم تحمير السطح', 'Slow grill then crisp the skin', true),
    ],
  },

  /* ===================== بيتزا وفطائر ===================== */
  {
    id: 'M-PIZZAMARG', code: 'M-201', nameAr: 'بيتزا مارجريتا', nameEn: 'Margherita Pizza',
    type: 'menu', categoryId: 'CAT-PIZZA', stationId: 'ST-OVEN', emoji: '🍕',
    yieldQty: 1, yieldUnit: 'portion', price: 230, taxGroupId: 'TX-14', prepTimeMin: 12,
    lines: [r('PREP-DOUGH', 320, 'g'), r('PREP-TOMSAUCE', 120, 'ml'), r('PREP-CHEESEMIX', 180, 'g'), i('ING-081', 10, 'ml')],
    steps: [
      s('ST-OVEN', 3, 'فرد العجينة يدويًا 30 سم', 'Hand-stretch dough to 30cm', true),
      s('ST-OVEN', 2, 'توزيع الصوص والجبن', 'Spread sauce and cheese'),
      s('ST-OVEN', 7, 'خبز على 320°م حتى تنقيط القشرة', 'Bake at 320°C until leoparded', true),
    ],
  },
  {
    id: 'M-PIZZAPEPP', code: 'M-202', nameAr: 'بيتزا بيبروني', nameEn: 'Pepperoni Pizza',
    type: 'menu', categoryId: 'CAT-PIZZA', stationId: 'ST-OVEN', emoji: '🍕',
    yieldQty: 1, yieldUnit: 'portion', price: 320, taxGroupId: 'TX-14', prepTimeMin: 12,
    lines: [
      r('PREP-DOUGH', 320, 'g'), r('PREP-TOMSAUCE', 120, 'ml'),
      r('PREP-CHEESEMIX', 180, 'g'), i('ING-004', 70, 'g'),
    ],
    steps: [
      s('ST-OVEN', 3, 'فرد العجينة', 'Stretch the dough'),
      s('ST-OVEN', 2, 'توزيع الصوص والجبن والبيبروني', 'Top with sauce, cheese, pepperoni'),
      s('ST-OVEN', 7, 'خبز على 320°م', 'Bake at 320°C', true),
    ],
  },
  {
    id: 'M-PIZZAVEG', code: 'M-203', nameAr: 'بيتزا خضار', nameEn: 'Vegetable Pizza',
    type: 'menu', categoryId: 'CAT-PIZZA', stationId: 'ST-OVEN', emoji: '🫑',
    yieldQty: 1, yieldUnit: 'portion', price: 250, taxGroupId: 'TX-14', prepTimeMin: 13,
    lines: [
      r('PREP-DOUGH', 320, 'g'), r('PREP-TOMSAUCE', 120, 'ml'), r('PREP-CHEESEMIX', 160, 'g'),
      i('ING-051', 60, 'g'), i('ING-045', 60, 'g'), i('ING-052', 40, 'g'), i('ING-041', 40, 'g'),
    ],
    steps: [
      s('ST-COLD', 4, 'تقطيع الخضار شرائح متساوية', 'Slice vegetables evenly'),
      s('ST-OVEN', 3, 'فرد وتوزيع المكونات', 'Stretch and top'),
      s('ST-OVEN', 7, 'خبز على 320°م', 'Bake at 320°C', true),
    ],
  },
  {
    id: 'M-PIZZASUJUK', code: 'M-204', nameAr: 'بيتزا سجق شرقي', nameEn: 'Oriental Sausage Pizza',
    type: 'menu', categoryId: 'CAT-PIZZA', stationId: 'ST-OVEN', emoji: '🌶️',
    yieldQty: 1, yieldUnit: 'portion', price: 320, taxGroupId: 'TX-14', prepTimeMin: 14,
    lines: [
      r('PREP-DOUGH', 320, 'g'), r('PREP-TOMSAUCE', 130, 'ml'), r('PREP-CHEESEMIX', 170, 'g'),
      i('ING-005', 100, 'g'), i('ING-045', 40, 'g'),
    ],
    steps: [
      s('ST-FRY', 4, 'تشويح السجق لتصفية الدهن', 'Pre-sear sausage to render fat', true),
      s('ST-OVEN', 3, 'فرد وتوزيع', 'Stretch and top'),
      s('ST-OVEN', 7, 'خبز على 320°م', 'Bake at 320°C', true),
    ],
  },
  {
    id: 'M-CALZONE', code: 'M-205', nameAr: 'كالزوني لحم وجبن', nameEn: 'Beef Calzone',
    type: 'menu', categoryId: 'CAT-PIZZA', stationId: 'ST-OVEN', emoji: '🥟',
    yieldQty: 1, yieldUnit: 'portion', price: 360, taxGroupId: 'TX-14', prepTimeMin: 16,
    lines: [
      r('PREP-DOUGH', 300, 'g'), r('PREP-CHEESEMIX', 150, 'g'), i('ING-003', 120, 'g'),
      r('PREP-TOMSAUCE', 80, 'ml'), i('ING-041', 40, 'g'),
    ],
    steps: [
      s('ST-FRY', 6, 'تشويح مكعبات اللحم مع البصل', 'Sear beef cubes with onion', true),
      s('ST-OVEN', 4, 'الحشو والقفل وعمل فتحة بخار', 'Fill, seal, cut a steam vent', true),
      s('ST-OVEN', 9, 'خبز حتى الذهبي', 'Bake until golden'),
    ],
  },
  {
    id: 'M-CHEESEFAT', code: 'M-206', nameAr: 'فطيرة جبنة رومي', nameEn: 'Roumy Cheese Fatayer',
    type: 'menu', categoryId: 'CAT-PIZZA', stationId: 'ST-OVEN', emoji: '🧆',
    yieldQty: 1, yieldUnit: 'portion', price: 220, taxGroupId: 'TX-14', prepTimeMin: 11,
    lines: [r('PREP-DOUGH', 250, 'g'), i('ING-021', 120, 'g'), i('ING-020', 80, 'g')],
    steps: [
      s('ST-OVEN', 3, 'فرد العجينة في الصينية', 'Press dough into the pan'),
      s('ST-OVEN', 8, 'خبز حتى تحمير الجبن', 'Bake until cheese browns', true),
    ],
  },

  /* ===================== مقبلات باردة ===================== */
  {
    id: 'M-HUMMUS', code: 'M-301', nameAr: 'حمص بالطحينة', nameEn: 'Hummus',
    type: 'menu', categoryId: 'CAT-COLD', stationId: 'ST-COLD', emoji: '🫓',
    yieldQty: 1, yieldUnit: 'portion', price: 70, taxGroupId: 'TX-14', prepTimeMin: 4,
    lines: [r('PREP-HUMMUS', 220, 'g'), i('ING-081', 15, 'ml'), i('ING-091', 1, 'pc'), i('ING-066', 1, 'g')],
    steps: [s('ST-COLD', 3, 'تسوية الطبق وتزيين بالزيت والكمون', 'Swirl plate, finish with oil and cumin')],
  },
  {
    id: 'M-BABAGH', code: 'M-302', nameAr: 'بابا غنوج', nameEn: 'Baba Ghanoush',
    type: 'menu', categoryId: 'CAT-COLD', stationId: 'ST-COLD', emoji: '🍆',
    yieldQty: 1, yieldUnit: 'portion', price: 80, taxGroupId: 'TX-14', prepTimeMin: 4,
    lines: [r('PREP-BABAGH', 200, 'g'), i('ING-081', 15, 'ml'), i('ING-046', 5, 'g'), i('ING-091', 1, 'pc')],
    steps: [s('ST-COLD', 3, 'التسوية والتزيين بالزيت والبقدونس', 'Plate and garnish with oil and parsley')],
  },
  {
    id: 'M-TABOULEH', code: 'M-303', nameAr: 'تبولة', nameEn: 'Tabouleh',
    type: 'menu', categoryId: 'CAT-COLD', stationId: 'ST-COLD', emoji: '🥬',
    yieldQty: 1, yieldUnit: 'portion', price: 85, taxGroupId: 'TX-14', prepTimeMin: 6,
    lines: [
      i('ING-068', 60, 'g'), i('ING-040', 150, 'g'), i('ING-046', 80, 'g'),
      i('ING-047', 20, 'g'), i('ING-048', 40, 'g'), i('ING-081', 30, 'ml'), i('ING-063', 2, 'g'),
    ],
    steps: [
      s('ST-COLD', 3, 'نقع البرغل في عصير الليمون', 'Soak bulgur in lemon juice', true),
      s('ST-COLD', 3, 'خلط الخضروات المفرومة والتقديم فورًا', 'Fold chopped herbs, serve immediately'),
    ],
  },
  {
    id: 'M-CAESAR', code: 'M-304', nameAr: 'سلطة سيزر بالدجاج', nameEn: 'Chicken Caesar Salad',
    type: 'menu', categoryId: 'CAT-COLD', stationId: 'ST-COLD', emoji: '🥗',
    yieldQty: 1, yieldUnit: 'portion', price: 240, taxGroupId: 'TX-14', prepTimeMin: 9,
    lines: [
      i('ING-043', 180, 'g'), r('PREP-CAESAR', 60, 'ml'), r('PREP-TAWOOK', 120, 'g'),
      i('ING-023', 25, 'g'), i('ING-071', 30, 'g'),
    ],
    steps: [
      s('ST-GRILL', 7, 'شوي مكعبات الدجاج', 'Grill the chicken cubes', true),
      s('ST-COLD', 3, 'خلط الخس بالدريسنج والتزيين', 'Toss lettuce with dressing and garnish'),
    ],
  },
  {
    id: 'M-GREEKSAL', code: 'M-305', nameAr: 'سلطة يونانية', nameEn: 'Greek Salad',
    type: 'menu', categoryId: 'CAT-COLD', stationId: 'ST-COLD', emoji: '🫒',
    yieldQty: 1, yieldUnit: 'portion', price: 130, taxGroupId: 'TX-14', prepTimeMin: 6,
    lines: [
      i('ING-044', 120, 'g'), i('ING-040', 120, 'g'), i('ING-022', 80, 'g'),
      i('ING-052', 40, 'g'), i('ING-045', 60, 'g'), i('ING-081', 25, 'ml'), i('ING-067', 2, 'g'),
    ],
    steps: [s('ST-COLD', 5, 'تقطيع خشن وخلط بالزيت والسماق', 'Rough-cut, dress with oil and sumac')],
  },

  /* ===================== مقبلات ساخنة ===================== */
  {
    id: 'M-FRIES', code: 'M-401', nameAr: 'بطاطس مقلية', nameEn: 'French Fries',
    type: 'menu', categoryId: 'CAT-HOT', stationId: 'ST-FRY', emoji: '🍟',
    yieldQty: 1, yieldUnit: 'portion', price: 55, taxGroupId: 'TX-14', prepTimeMin: 6,
    lines: [r('PREP-FRIES', 250, 'g'), i('ING-080', 40, 'ml', 'امتصاص الزيت'), i('ING-063', 3, 'g')],
    steps: [s('ST-FRY', 5, 'تحمير نهائي على 180°م حتى القرمشة', 'Finish fry at 180°C until crisp', true)],
  },
  {
    id: 'M-MOZZSTICK', code: 'M-402', nameAr: 'أصابع موتزاريلا', nameEn: 'Mozzarella Sticks',
    type: 'menu', categoryId: 'CAT-HOT', stationId: 'ST-FRY', emoji: '🧀',
    yieldQty: 1, yieldUnit: 'portion', price: 210, taxGroupId: 'TX-14', prepTimeMin: 8,
    lines: [
      i('ING-020', 180, 'g'), i('ING-071', 80, 'g'), i('ING-029', 1, 'pc'),
      i('ING-060', 40, 'g'), i('ING-080', 50, 'ml'), r('PREP-TOMSAUCE', 50, 'ml'),
    ],
    steps: [
      s('ST-PREP', 4, 'تغليف مزدوج وتجميد 20 دقيقة', 'Double-bread and freeze 20 min', true),
      s('ST-FRY', 3, 'تحمير سريع على 175°م', 'Flash fry at 175°C'),
    ],
  },
  {
    id: 'M-KIBBEH', code: 'M-403', nameAr: 'كبيبة مقلية (4 حبات)', nameEn: 'Fried Kibbeh (4 pcs)',
    type: 'menu', categoryId: 'CAT-HOT', stationId: 'ST-FRY', emoji: '🥚',
    yieldQty: 1, yieldUnit: 'portion', price: 230, taxGroupId: 'TX-14', prepTimeMin: 9,
    lines: [
      i('ING-068', 100, 'g'), i('ING-001', 120, 'g'), i('ING-041', 60, 'g'),
      i('ING-065', 8, 'g'), i('ING-080', 40, 'ml'), i('ING-102', 10, 'g'),
    ],
    steps: [
      s('ST-PREP', 6, 'تشكيل الكبيبة بالحشو', 'Shape kibbeh around the filling', true),
      s('ST-FRY', 5, 'تحمير على 170°م', 'Fry at 170°C'),
    ],
  },
  {
    id: 'M-SAMBOSAK', code: 'M-404', nameAr: 'سمبوسك جبنة (5 حبات)', nameEn: 'Cheese Sambousek (5 pcs)',
    type: 'menu', categoryId: 'CAT-HOT', stationId: 'ST-FRY', emoji: '🥟',
    yieldQty: 1, yieldUnit: 'portion', price: 95, taxGroupId: 'TX-14', prepTimeMin: 8,
    lines: [r('PREP-DOUGH', 150, 'g'), i('ING-022', 120, 'g'), i('ING-046', 15, 'g'), i('ING-080', 45, 'ml')],
    steps: [
      s('ST-PREP', 5, 'فرد وقص دوائر وحشو وقفل', 'Roll, cut discs, fill and seal'),
      s('ST-FRY', 4, 'تحمير حتى الذهبي', 'Fry until golden', true),
    ],
  },

  /* ===================== ساندويتشات ===================== */
  {
    id: 'M-BURGER', code: 'M-501', nameAr: 'برجر لحم كلاسيك', nameEn: 'Classic Beef Burger',
    type: 'menu', categoryId: 'CAT-SAND', stationId: 'ST-GRILL', emoji: '🍔',
    yieldQty: 1, yieldUnit: 'portion', price: 250, taxGroupId: 'TX-14', prepTimeMin: 11,
    lines: [
      r('PREP-BURGPATTY', 1, 'pc'), i('ING-090', 1, 'pc'), i('ING-021', 30, 'g'),
      i('ING-040', 40, 'g'), i('ING-043', 25, 'g'), r('PREP-GARLICSAUCE', 25, 'ml'),
    ],
    steps: [
      s('ST-GRILL', 6, 'شوي القرص على صاج ساخن 3 دقائق لكل وجه', 'Sear patty 3 min per side', true),
      s('ST-GRILL', 2, 'إذابة الجبن وتحميص الخبز', 'Melt cheese, toast the bun'),
      s('ST-COLD', 2, 'التجميع والتغليف', 'Assemble and wrap'),
    ],
  },
  {
    id: 'M-DBLBURGER', code: 'M-502', nameAr: 'دوبل برجر', nameEn: 'Double Burger',
    type: 'menu', categoryId: 'CAT-SAND', stationId: 'ST-GRILL', emoji: '🍔',
    yieldQty: 1, yieldUnit: 'portion', price: 420, taxGroupId: 'TX-14', prepTimeMin: 13,
    lines: [
      r('PREP-BURGPATTY', 2, 'pc'), i('ING-090', 1, 'pc'), i('ING-021', 60, 'g'),
      i('ING-040', 40, 'g'), i('ING-043', 25, 'g'), r('PREP-GARLICSAUCE', 30, 'ml'),
    ],
    steps: [
      s('ST-GRILL', 8, 'شوي قرصين مع تذويب الجبن بينهما', 'Sear two patties, cheese between'),
      s('ST-COLD', 2, 'التجميع والتغليف', 'Assemble and wrap'),
    ],
  },
  {
    id: 'M-SHAWARMA', code: 'M-503', nameAr: 'ساندويتش شاورما فراخ', nameEn: 'Chicken Shawarma Sandwich',
    type: 'menu', categoryId: 'CAT-SAND', stationId: 'ST-GRILL', emoji: '🌯',
    yieldQty: 1, yieldUnit: 'portion', price: 140, taxGroupId: 'TX-14', prepTimeMin: 7,
    lines: [
      r('PREP-SHAWARMA', 180, 'g'), i('ING-091', 1, 'pc'), r('PREP-TAHINASAUCE', 40, 'ml'),
      i('ING-040', 30, 'g'), i('ING-046', 6, 'g'),
    ],
    steps: [
      s('ST-GRILL', 4, 'قشط الشاورما من السيخ وتحمير على الصاج', 'Shave from spit and crisp on plancha', true),
      s('ST-COLD', 2, 'لف الساندويتش وكيّه', 'Roll and press the sandwich'),
    ],
  },
  {
    id: 'M-KOFTASAND', code: 'M-504', nameAr: 'ساندويتش كفتة', nameEn: 'Kofta Sandwich',
    type: 'menu', categoryId: 'CAT-SAND', stationId: 'ST-GRILL', emoji: '🥙',
    yieldQty: 1, yieldUnit: 'portion', price: 190, taxGroupId: 'TX-14', prepTimeMin: 9,
    lines: [
      r('PREP-KOFTA', 160, 'g'), i('ING-091', 1, 'pc'), r('PREP-TAHINASAUCE', 35, 'ml'),
      i('ING-046', 10, 'g'), i('ING-041', 20, 'g'),
    ],
    steps: [
      s('ST-GRILL', 7, 'شوي إصبعين كفتة', 'Grill two kofta fingers', true),
      s('ST-COLD', 2, 'اللف مع الطحينة والسلطة', 'Roll with tahini and salad'),
    ],
  },

  /* ===================== حلويات ===================== */
  {
    id: 'M-OMALI', code: 'M-601', nameAr: 'أم علي', nameEn: 'Om Ali',
    type: 'menu', categoryId: 'CAT-DESS', stationId: 'ST-PASTRY', emoji: '🥮',
    yieldQty: 1, yieldUnit: 'portion', price: 150, taxGroupId: 'TX-14', prepTimeMin: 12,
    lines: [r('PREP-OMALI', 120, 'g'), i('ING-025', 250, 'ml'), i('ING-024', 80, 'ml'), i('ING-062', 30, 'g')],
    steps: [
      s('ST-PASTRY', 4, 'ترتيب الخلطة في الفرن الفردي وسكب اللبن', 'Layer mix in ramekin, pour hot milk'),
      s('ST-OVEN', 7, 'جراتان حتى تحمير الوجه', 'Gratinate until the top browns', true),
    ],
  },
  {
    id: 'M-BROWNIE', code: 'M-602', nameAr: 'براوني ساخن', nameEn: 'Warm Brownie',
    type: 'menu', categoryId: 'CAT-DESS', stationId: 'ST-PASTRY', emoji: '🍫',
    yieldQty: 1, yieldUnit: 'portion', price: 150, taxGroupId: 'TX-14', prepTimeMin: 6,
    lines: [r('PREP-BROWNIE', 1, 'pc'), i('ING-100', 20, 'g'), i('ING-024', 30, 'ml'), i('ING-102', 10, 'g')],
    steps: [
      s('ST-PASTRY', 3, 'تسخين القطعة وتحضير صوص الشوكولاتة', 'Warm the slice, prepare chocolate sauce'),
      s('ST-PASTRY', 2, 'التقديم مع المكسرات', 'Plate with nuts'),
    ],
  },
  {
    id: 'M-CHEESECAKE', code: 'M-603', nameAr: 'تشيز كيك', nameEn: 'Cheesecake',
    type: 'menu', categoryId: 'CAT-DESS', stationId: 'ST-PASTRY', emoji: '🍰',
    yieldQty: 1, yieldUnit: 'portion', price: 185, taxGroupId: 'TX-14', prepTimeMin: 4,
    lines: [r('PREP-CHZCAKE', 1, 'pc'), i('ING-104', 15, 'g'), i('ING-102', 8, 'g')],
    steps: [s('ST-PASTRY', 3, 'تقطيع نظيف بسكين ساخن والتزيين', 'Clean-cut with hot knife and garnish')],
  },
  {
    id: 'M-CREMECAR', code: 'M-604', nameAr: 'كريم كراميل', nameEn: 'Crème Caramel',
    type: 'menu', categoryId: 'CAT-DESS', stationId: 'ST-PASTRY', emoji: '🍮',
    yieldQty: 1, yieldUnit: 'portion', price: 85, taxGroupId: 'TX-14', prepTimeMin: 5,
    lines: [i('ING-025', 200, 'ml'), i('ING-029', 2, 'pc'), i('ING-062', 60, 'g'), i('ING-103', 5, 'ml')],
    steps: [
      s('ST-PASTRY', 3, 'تجهيز الكراميل في القالب', 'Set caramel in the mould'),
      s('ST-PASTRY', 2, 'سكب الكسترد والتقديم مبردًا', 'Pour custard, serve chilled'),
    ],
  },

  /* ===================== مشروبات ===================== */
  {
    id: 'M-MANGOJCE', code: 'M-701', nameAr: 'عصير مانجو', nameEn: 'Mango Juice',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '🥭',
    yieldQty: 1, yieldUnit: 'portion', price: 110, taxGroupId: 'TX-14', prepTimeMin: 3,
    lines: [r('PREP-MANGOPUREE', 220, 'ml'), r('PREP-SYRUP', 20, 'ml'), i('ING-122', 1, 'pc')],
    steps: [s('ST-BAR', 2, 'خلط البيوريه بالثلج والتقديم', 'Blend purée with ice and serve')],
  },
  {
    id: 'M-LEMONMINT', code: 'M-702', nameAr: 'ليمون بالنعناع', nameEn: 'Lemon Mint',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '🍋',
    yieldQty: 1, yieldUnit: 'portion', price: 65, taxGroupId: 'TX-14', prepTimeMin: 3,
    lines: [i('ING-048', 120, 'g'), i('ING-047', 15, 'g'), r('PREP-SYRUP', 40, 'ml'), i('ING-122', 1, 'pc')],
    steps: [s('ST-BAR', 3, 'عصر الليمون وخلطه بالنعناع والشراب', 'Juice lemons, blend with mint and syrup')],
  },
  {
    id: 'M-TEA', code: 'M-703', nameAr: 'شاي', nameEn: 'Tea',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '🫖',
    yieldQty: 1, yieldUnit: 'portion', price: 30, taxGroupId: 'TX-14', prepTimeMin: 3,
    lines: [i('ING-110', 6, 'g'), i('ING-062', 15, 'g'), i('ING-047', 3, 'g')],
    steps: [s('ST-BAR', 3, 'تحضير الشاي وتقديمه بالنعناع', 'Brew and serve with mint')],
  },
  {
    id: 'M-TURKCOF', code: 'M-704', nameAr: 'قهوة تركي', nameEn: 'Turkish Coffee',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '☕',
    yieldQty: 1, yieldUnit: 'portion', price: 40, taxGroupId: 'TX-14', prepTimeMin: 4,
    lines: [i('ING-111', 12, 'g'), i('ING-062', 10, 'g')],
    steps: [s('ST-BAR', 4, 'الغلي على الرمل حتى الوجه الرغوي', 'Brew on sand until foam forms', true)],
  },
  {
    id: 'M-LATTE', code: 'M-705', nameAr: 'لاتيه', nameEn: 'Latte',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '🥛',
    yieldQty: 1, yieldUnit: 'portion', price: 95, taxGroupId: 'TX-14', prepTimeMin: 3,
    lines: [i('ING-112', 18, 'g'), i('ING-025', 220, 'ml'), i('ING-122', 1, 'pc')],
    steps: [
      s('ST-BAR', 1, 'استخلاص 18 جم في 27 ثانية', 'Extract 18g in 27 seconds', true),
      s('ST-BAR', 2, 'بخار اللبن وصبّ الرسم', 'Steam milk and pour art'),
    ],
  },
  {
    id: 'M-SOFTDRINK', code: 'M-706', nameAr: 'مشروب غازي', nameEn: 'Soft Drink',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '🥤',
    yieldQty: 1, yieldUnit: 'portion', price: 45, taxGroupId: 'TX-14', prepTimeMin: 1,
    lines: [i('ING-113', 1, 'pc')],
    steps: [s('ST-BAR', 1, 'التقديم باردًا مع كوب ثلج', 'Serve chilled with an ice glass')],
  },
  {
    id: 'M-WATER', code: 'M-707', nameAr: 'مياه معدنية', nameEn: 'Mineral Water',
    type: 'menu', categoryId: 'CAT-BEV', stationId: 'ST-BAR', emoji: '💧',
    yieldQty: 1, yieldUnit: 'portion', price: 25, taxGroupId: 'TX-0', prepTimeMin: 1,
    lines: [i('ING-114', 1, 'pc')],
    steps: [s('ST-BAR', 1, 'التقديم', 'Serve')],
  },
]
