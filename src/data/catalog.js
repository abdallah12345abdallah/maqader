/**
 * كتالوج المواد الخام.
 *
 * purchaseUnit/purchaseCost = كما نشتري (كجم، لتر، قطعة).
 * trimPct = نسبة الفقد في التنظيف/التقطيع — المحرك يرفع التكلفة الفعلية بها:
 *           التكلفة المستخدمة = تكلفة الوحدة ÷ (1 − trimPct)
 * reorderBase/parBase = بوحدة الأساس (جم / مل / قطعة).
 */

export const ITEM_GROUPS = [
  { id: 'G-MEAT', nameAr: 'لحوم', nameEn: 'Meat', tone: 'tomato', cogsAccountId: 'A-5010' },
  { id: 'G-POUL', nameAr: 'دواجن', nameEn: 'Poultry', tone: 'saffron', cogsAccountId: 'A-5010' },
  { id: 'G-DAIRY', nameAr: 'ألبان وأجبان', nameEn: 'Dairy', tone: 'sky', cogsAccountId: 'A-5010' },
  { id: 'G-PROD', nameAr: 'خضروات وفواكه', nameEn: 'Produce', tone: 'basil', cogsAccountId: 'A-5010' },
  { id: 'G-DRY', nameAr: 'جاف وبهارات', nameEn: 'Dry & Spices', tone: 'berry', cogsAccountId: 'A-5010' },
  { id: 'G-OIL', nameAr: 'زيوت', nameEn: 'Oils', tone: 'saffron', cogsAccountId: 'A-5010' },
  { id: 'G-BAKE', nameAr: 'مخبوزات', nameEn: 'Bakery', tone: 'plum', cogsAccountId: 'A-5010' },
  { id: 'G-SWEET', nameAr: 'حلويات ومكسرات', nameEn: 'Sweets & Nuts', tone: 'berry', cogsAccountId: 'A-5010' },
  { id: 'G-BEV', nameAr: 'مشروبات', nameEn: 'Beverages', tone: 'sky', cogsAccountId: 'A-5020' },
  { id: 'G-PACK', nameAr: 'تغليف', nameEn: 'Packaging', tone: 'ink', cogsAccountId: 'A-6050' },
]

export const STORAGE_TYPES = [
  { id: 'dry', nameAr: 'مخزن جاف', nameEn: 'Dry', tone: 'saffron' },
  { id: 'chiller', nameAr: 'ثلاجة', nameEn: 'Chiller', tone: 'sky' },
  { id: 'freezer', nameAr: 'فريزر', nameEn: 'Freezer', tone: 'berry' },
]

const ing = (id, sku, nameAr, nameEn, groupId, dim, purchaseUnit, purchaseCost, recipeUnit, opts = {}) => ({
  id,
  sku,
  nameAr,
  nameEn,
  groupId,
  dim,
  purchaseUnit,
  purchaseCost,
  recipeUnit,
  trimPct: opts.trimPct || 0,
  storage: opts.storage || 'dry',
  shelfLifeDays: opts.shelfLifeDays || 180,
  supplierId: opts.supplierId || 'SP-04',
  reorderBase: opts.reorderBase || 0,
  parBase: opts.parBase || 0,
  allergens: opts.allergens || [],
  isActive: opts.isActive !== false,
})

export const INGREDIENTS = [
  // ===== لحوم =====
  ing('ING-001', 'MT-BEEF-MINC', 'لحم بقري مفروم', 'Minced Beef', 'G-MEAT', 'weight', 'kg', 420, 'g', { trimPct: 0.02, storage: 'chiller', shelfLifeDays: 3, supplierId: 'SP-01', reorderBase: 8000, parBase: 25000 }),
  ing('ING-002', 'MT-LAMB-CHOP', 'ريش ضاني', 'Lamb Chops', 'G-MEAT', 'weight', 'kg', 680, 'g', { trimPct: 0.14, storage: 'chiller', shelfLifeDays: 3, supplierId: 'SP-01', reorderBase: 5000, parBase: 15000 }),
  ing('ING-003', 'MT-BEEF-CUBE', 'مكعبات لحم بقري', 'Beef Cubes', 'G-MEAT', 'weight', 'kg', 460, 'g', { trimPct: 0.08, storage: 'chiller', shelfLifeDays: 3, supplierId: 'SP-01', reorderBase: 4000, parBase: 12000 }),
  ing('ING-004', 'MT-PEPPERONI', 'بيبروني', 'Pepperoni', 'G-MEAT', 'weight', 'kg', 520, 'g', { storage: 'chiller', shelfLifeDays: 40, supplierId: 'SP-04', reorderBase: 2000, parBase: 6000 }),
  ing('ING-005', 'MT-SAUSAGE', 'سجق شرقي', 'Oriental Sausage', 'G-MEAT', 'weight', 'kg', 380, 'g', { storage: 'freezer', shelfLifeDays: 90, supplierId: 'SP-01', reorderBase: 2000, parBase: 6000 }),

  // ===== دواجن =====
  ing('ING-010', 'PL-CHK-BRST', 'صدور دجاج', 'Chicken Breast', 'G-POUL', 'weight', 'kg', 195, 'g', { trimPct: 0.06, storage: 'chiller', shelfLifeDays: 2, supplierId: 'SP-01', reorderBase: 10000, parBase: 30000 }),
  ing('ING-011', 'PL-CHK-THGH', 'أوراك دجاج', 'Chicken Thigh', 'G-POUL', 'weight', 'kg', 155, 'g', { trimPct: 0.1, storage: 'chiller', shelfLifeDays: 2, supplierId: 'SP-01', reorderBase: 8000, parBase: 24000 }),
  ing('ING-012', 'PL-CHK-WHOLE', 'دجاج كامل', 'Whole Chicken', 'G-POUL', 'weight', 'kg', 135, 'g', { trimPct: 0.22, storage: 'chiller', shelfLifeDays: 2, supplierId: 'SP-01', reorderBase: 10000, parBase: 28000 }),

  // ===== ألبان وأجبان =====
  ing('ING-020', 'DR-MOZZ', 'جبنة موتزاريلا', 'Mozzarella', 'G-DAIRY', 'weight', 'kg', 265, 'g', { storage: 'chiller', shelfLifeDays: 25, supplierId: 'SP-03', reorderBase: 10000, parBase: 30000, allergens: ['milk'] }),
  ing('ING-021', 'DR-ROUMY', 'جبنة رومي', 'Roumy Cheese', 'G-DAIRY', 'weight', 'kg', 330, 'g', { storage: 'chiller', shelfLifeDays: 60, supplierId: 'SP-03', reorderBase: 4000, parBase: 10000, allergens: ['milk'] }),
  ing('ING-022', 'DR-FETA', 'جبنة فيتا', 'Feta', 'G-DAIRY', 'weight', 'kg', 145, 'g', { storage: 'chiller', shelfLifeDays: 45, supplierId: 'SP-03', reorderBase: 3000, parBase: 9000, allergens: ['milk'] }),
  ing('ING-023', 'DR-PARM', 'جبنة بارميزان', 'Parmesan', 'G-DAIRY', 'weight', 'kg', 720, 'g', { storage: 'chiller', shelfLifeDays: 90, supplierId: 'SP-03', reorderBase: 1000, parBase: 3000, allergens: ['milk'] }),
  ing('ING-024', 'DR-CREAM', 'كريمة طهي', 'Cooking Cream', 'G-DAIRY', 'volume', 'l', 98, 'ml', { storage: 'chiller', shelfLifeDays: 30, supplierId: 'SP-03', reorderBase: 5000, parBase: 15000, allergens: ['milk'] }),
  ing('ING-025', 'DR-MILK', 'لبن طازج', 'Fresh Milk', 'G-DAIRY', 'volume', 'l', 42, 'ml', { storage: 'chiller', shelfLifeDays: 7, supplierId: 'SP-03', reorderBase: 10000, parBase: 30000, allergens: ['milk'] }),
  ing('ING-026', 'DR-BUTTER', 'زبدة', 'Butter', 'G-DAIRY', 'weight', 'kg', 395, 'g', { storage: 'chiller', shelfLifeDays: 60, supplierId: 'SP-03', reorderBase: 3000, parBase: 8000, allergens: ['milk'] }),
  ing('ING-027', 'DR-CRMCHS', 'جبنة كريمي', 'Cream Cheese', 'G-DAIRY', 'weight', 'kg', 310, 'g', { storage: 'chiller', shelfLifeDays: 30, supplierId: 'SP-03', reorderBase: 2000, parBase: 7000, allergens: ['milk'] }),
  ing('ING-028', 'DR-YOGHRT', 'زبادي', 'Yoghurt', 'G-DAIRY', 'weight', 'kg', 58, 'g', { storage: 'chiller', shelfLifeDays: 12, supplierId: 'SP-03', reorderBase: 3000, parBase: 9000, allergens: ['milk'] }),
  ing('ING-029', 'DR-EGG', 'بيض', 'Eggs', 'G-DAIRY', 'count', 'pc', 4.75, 'pc', { storage: 'chiller', shelfLifeDays: 21, supplierId: 'SP-02', reorderBase: 180, parBase: 600, allergens: ['egg'] }),

  // ===== خضروات وفواكه =====
  ing('ING-040', 'PR-TOMATO', 'طماطم', 'Tomato', 'G-PROD', 'weight', 'kg', 24, 'g', { trimPct: 0.08, storage: 'chiller', shelfLifeDays: 6, supplierId: 'SP-02', reorderBase: 12000, parBase: 35000 }),
  ing('ING-041', 'PR-ONION', 'بصل', 'Onion', 'G-PROD', 'weight', 'kg', 19, 'g', { trimPct: 0.12, storage: 'dry', shelfLifeDays: 30, supplierId: 'SP-02', reorderBase: 10000, parBase: 30000 }),
  ing('ING-042', 'PR-GARLIC', 'ثوم', 'Garlic', 'G-PROD', 'weight', 'kg', 95, 'g', { trimPct: 0.18, storage: 'dry', shelfLifeDays: 45, supplierId: 'SP-02', reorderBase: 2000, parBase: 6000 }),
  ing('ING-043', 'PR-LETTUCE', 'خس رومين', 'Romaine Lettuce', 'G-PROD', 'weight', 'kg', 32, 'g', { trimPct: 0.2, storage: 'chiller', shelfLifeDays: 5, supplierId: 'SP-02', reorderBase: 5000, parBase: 14000 }),
  ing('ING-044', 'PR-CUCUMB', 'خيار', 'Cucumber', 'G-PROD', 'weight', 'kg', 21, 'g', { trimPct: 0.07, storage: 'chiller', shelfLifeDays: 7, supplierId: 'SP-02', reorderBase: 4000, parBase: 12000 }),
  ing('ING-045', 'PR-BELLPEP', 'فلفل ألوان', 'Bell Peppers', 'G-PROD', 'weight', 'kg', 48, 'g', { trimPct: 0.15, storage: 'chiller', shelfLifeDays: 8, supplierId: 'SP-02', reorderBase: 3000, parBase: 9000 }),
  ing('ING-046', 'PR-PARSLEY', 'بقدونس', 'Parsley', 'G-PROD', 'weight', 'kg', 18, 'g', { trimPct: 0.25, storage: 'chiller', shelfLifeDays: 4, supplierId: 'SP-02', reorderBase: 1500, parBase: 4000 }),
  ing('ING-047', 'PR-MINT', 'نعناع', 'Mint', 'G-PROD', 'weight', 'kg', 24, 'g', { trimPct: 0.3, storage: 'chiller', shelfLifeDays: 4, supplierId: 'SP-02', reorderBase: 800, parBase: 2500 }),
  ing('ING-048', 'PR-LEMON', 'ليمون', 'Lemon', 'G-PROD', 'weight', 'kg', 38, 'g', { trimPct: 0.35, storage: 'chiller', shelfLifeDays: 14, supplierId: 'SP-02', reorderBase: 4000, parBase: 12000 }),
  ing('ING-049', 'PR-POTATO', 'بطاطس', 'Potato', 'G-PROD', 'weight', 'kg', 17, 'g', { trimPct: 0.18, storage: 'dry', shelfLifeDays: 21, supplierId: 'SP-02', reorderBase: 20000, parBase: 60000 }),
  ing('ING-050', 'PR-EGGPL', 'باذنجان', 'Eggplant', 'G-PROD', 'weight', 'kg', 22, 'g', { trimPct: 0.12, storage: 'chiller', shelfLifeDays: 7, supplierId: 'SP-02', reorderBase: 3000, parBase: 9000 }),
  ing('ING-051', 'PR-MUSHRM', 'فطر', 'Mushroom', 'G-PROD', 'weight', 'kg', 88, 'g', { trimPct: 0.05, storage: 'chiller', shelfLifeDays: 5, supplierId: 'SP-02', reorderBase: 2000, parBase: 6000 }),
  ing('ING-052', 'PR-OLIVE', 'زيتون أسود', 'Black Olives', 'G-PROD', 'weight', 'kg', 125, 'g', { storage: 'chiller', shelfLifeDays: 120, supplierId: 'SP-04', reorderBase: 1500, parBase: 5000 }),
  ing('ING-053', 'PR-MANGO', 'مانجو مجمدة', 'Frozen Mango', 'G-PROD', 'weight', 'kg', 118, 'g', { storage: 'freezer', shelfLifeDays: 270, supplierId: 'SP-02', reorderBase: 5000, parBase: 15000 }),
  ing('ING-054', 'PR-ROCCA', 'جرجير', 'Rocket', 'G-PROD', 'weight', 'kg', 26, 'g', { trimPct: 0.22, storage: 'chiller', shelfLifeDays: 4, supplierId: 'SP-02', reorderBase: 1200, parBase: 3500 }),

  // ===== جاف وبهارات =====
  ing('ING-060', 'DY-FLOUR', 'دقيق فاخر 00', 'Flour 00', 'G-DRY', 'weight', 'kg', 29, 'g', { storage: 'dry', shelfLifeDays: 180, supplierId: 'SP-05', reorderBase: 25000, parBase: 80000, allergens: ['gluten'] }),
  ing('ING-061', 'DY-YEAST', 'خميرة فورية', 'Instant Yeast', 'G-DRY', 'weight', 'kg', 185, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-05', reorderBase: 500, parBase: 2000 }),
  ing('ING-062', 'DY-SUGAR', 'سكر', 'Sugar', 'G-DRY', 'weight', 'kg', 34, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 10000, parBase: 30000 }),
  ing('ING-063', 'DY-SALT', 'ملح', 'Salt', 'G-DRY', 'weight', 'kg', 11, 'g', { storage: 'dry', shelfLifeDays: 730, supplierId: 'SP-04', reorderBase: 3000, parBase: 10000 }),
  ing('ING-064', 'DY-PEPPER', 'فلفل أسود', 'Black Pepper', 'G-DRY', 'weight', 'kg', 420, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 800, parBase: 2500 }),
  ing('ING-065', 'DY-SPICE7', 'بهارات مشكلة', 'Mixed Spices', 'G-DRY', 'weight', 'kg', 295, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 1000, parBase: 3000 }),
  ing('ING-066', 'DY-CUMIN', 'كمون', 'Cumin', 'G-DRY', 'weight', 'kg', 260, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 600, parBase: 2000 }),
  ing('ING-067', 'DY-SUMAC', 'سماق', 'Sumac', 'G-DRY', 'weight', 'kg', 230, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 500, parBase: 1500 }),
  ing('ING-068', 'DY-BURGHL', 'برغل ناعم', 'Fine Bulgur', 'G-DRY', 'weight', 'kg', 47, 'g', { storage: 'dry', shelfLifeDays: 270, supplierId: 'SP-04', reorderBase: 3000, parBase: 9000, allergens: ['gluten'] }),
  ing('ING-069', 'DY-CHICKPEA', 'حمص جاف', 'Dry Chickpeas', 'G-DRY', 'weight', 'kg', 58, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 5000, parBase: 15000 }),
  ing('ING-070', 'DY-TAHINA', 'طحينة خام', 'Raw Tahini', 'G-DRY', 'weight', 'kg', 165, 'g', { storage: 'dry', shelfLifeDays: 180, supplierId: 'SP-04', reorderBase: 3000, parBase: 9000, allergens: ['sesame'] }),
  ing('ING-071', 'DY-BREADCR', 'بقسماط', 'Breadcrumbs', 'G-DRY', 'weight', 'kg', 44, 'g', { storage: 'dry', shelfLifeDays: 120, supplierId: 'SP-05', reorderBase: 2000, parBase: 7000, allergens: ['gluten'] }),
  ing('ING-072', 'DY-BAKPWD', 'بيكنج بودر', 'Baking Powder', 'G-DRY', 'weight', 'kg', 125, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 400, parBase: 1200 }),
  ing('ING-073', 'DY-CORNST', 'نشا', 'Corn Starch', 'G-DRY', 'weight', 'kg', 52, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 1000, parBase: 3000 }),

  // ===== زيوت =====
  ing('ING-080', 'OL-CORN', 'زيت ذرة', 'Corn Oil', 'G-OIL', 'volume', 'l', 88, 'ml', { storage: 'dry', shelfLifeDays: 270, supplierId: 'SP-04', reorderBase: 15000, parBase: 45000 }),
  ing('ING-081', 'OL-OLIVE', 'زيت زيتون بكر', 'Extra Virgin Olive Oil', 'G-OIL', 'volume', 'l', 340, 'ml', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 4000, parBase: 12000 }),

  // ===== مخبوزات =====
  ing('ING-090', 'BK-BURGBUN', 'خبز برجر بريوش', 'Brioche Bun', 'G-BAKE', 'count', 'pc', 6.5, 'pc', { storage: 'dry', shelfLifeDays: 4, supplierId: 'SP-05', reorderBase: 150, parBase: 500, allergens: ['gluten', 'egg'] }),
  ing('ING-091', 'BK-PITA', 'عيش سوري', 'Pita Bread', 'G-BAKE', 'count', 'pc', 3.25, 'pc', { storage: 'dry', shelfLifeDays: 3, supplierId: 'SP-05', reorderBase: 200, parBase: 700, allergens: ['gluten'] }),
  ing('ING-092', 'BK-ROQAQ', 'عيش رقاق', 'Roqaq Sheets', 'G-BAKE', 'weight', 'kg', 62, 'g', { storage: 'dry', shelfLifeDays: 60, supplierId: 'SP-05', reorderBase: 2000, parBase: 6000, allergens: ['gluten'] }),

  // ===== حلويات ومكسرات =====
  ing('ING-100', 'SW-DKCHOC', 'شوكولاتة دارك 55%', 'Dark Chocolate 55%', 'G-SWEET', 'weight', 'kg', 445, 'g', { storage: 'dry', shelfLifeDays: 270, supplierId: 'SP-04', reorderBase: 2000, parBase: 6000, allergens: ['milk', 'soy'] }),
  ing('ING-101', 'SW-COCOA', 'كاكاو خام', 'Cocoa Powder', 'G-SWEET', 'weight', 'kg', 365, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 1000, parBase: 3000 }),
  ing('ING-102', 'SW-NUTS', 'مكسرات مشكلة', 'Mixed Nuts', 'G-SWEET', 'weight', 'kg', 520, 'g', { storage: 'dry', shelfLifeDays: 120, supplierId: 'SP-04', reorderBase: 1500, parBase: 5000, allergens: ['nuts'] }),
  ing('ING-103', 'SW-VANIL', 'فانيليا سائلة', 'Vanilla Extract', 'G-SWEET', 'volume', 'l', 640, 'ml', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 400, parBase: 1200 }),
  ing('ING-104', 'SW-HONEY', 'عسل أبيض', 'Honey', 'G-SWEET', 'weight', 'kg', 245, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-04', reorderBase: 1000, parBase: 3000 }),
  ing('ING-105', 'SW-COCNT', 'جوز هند مبروش', 'Shredded Coconut', 'G-SWEET', 'weight', 'kg', 215, 'g', { storage: 'dry', shelfLifeDays: 180, supplierId: 'SP-04', reorderBase: 800, parBase: 2500 }),

  // ===== مشروبات =====
  ing('ING-110', 'BV-TEA', 'شاي أسود', 'Black Tea', 'G-BEV', 'weight', 'kg', 320, 'g', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-06', reorderBase: 800, parBase: 2500 }),
  ing('ING-111', 'BV-TURKCOF', 'قهوة تركي', 'Turkish Coffee', 'G-BEV', 'weight', 'kg', 480, 'g', { storage: 'dry', shelfLifeDays: 180, supplierId: 'SP-06', reorderBase: 800, parBase: 2500 }),
  ing('ING-112', 'BV-ESPRSO', 'حبوب إسبريسو', 'Espresso Beans', 'G-BEV', 'weight', 'kg', 660, 'g', { storage: 'dry', shelfLifeDays: 120, supplierId: 'SP-06', reorderBase: 1500, parBase: 5000 }),
  ing('ING-113', 'BV-SOFTDRK', 'مشروب غازي كان', 'Soft Drink Can', 'G-BEV', 'count', 'pc', 13, 'pc', { storage: 'dry', shelfLifeDays: 180, supplierId: 'SP-06', reorderBase: 200, parBase: 700 }),
  ing('ING-114', 'BV-WATER', 'مياه معدنية 600مل', 'Mineral Water 600ml', 'G-BEV', 'count', 'pc', 5.5, 'pc', { storage: 'dry', shelfLifeDays: 365, supplierId: 'SP-06', reorderBase: 300, parBase: 900 }),
  ing('ING-115', 'BV-SODA', 'صودا', 'Soda Water', 'G-BEV', 'volume', 'l', 22, 'ml', { storage: 'dry', shelfLifeDays: 180, supplierId: 'SP-06', reorderBase: 5000, parBase: 15000 }),

  // ===== تغليف =====
  ing('ING-120', 'PK-BOX', 'علبة تيك أواي', 'Takeaway Box', 'G-PACK', 'count', 'pc', 4.25, 'pc', { storage: 'dry', shelfLifeDays: 999, supplierId: 'SP-04', reorderBase: 400, parBase: 1500 }),
  ing('ING-121', 'PK-BAG', 'كيس ورقي', 'Paper Bag', 'G-PACK', 'count', 'pc', 1.6, 'pc', { storage: 'dry', shelfLifeDays: 999, supplierId: 'SP-04', reorderBase: 500, parBase: 2000 }),
  ing('ING-122', 'PK-CUP', 'كوب مشروبات', 'Beverage Cup', 'G-PACK', 'count', 'pc', 2.75, 'pc', { storage: 'dry', shelfLifeDays: 999, supplierId: 'SP-04', reorderBase: 500, parBase: 1800 }),
  ing('ING-123', 'PK-PIZZABOX', 'علبة بيتزا', 'Pizza Box', 'G-PACK', 'count', 'pc', 7.5, 'pc', { storage: 'dry', shelfLifeDays: 999, supplierId: 'SP-04', reorderBase: 250, parBase: 900 }),
]
