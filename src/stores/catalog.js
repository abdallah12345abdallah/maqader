import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { INGREDIENTS, ITEM_GROUPS, STORAGE_TYPES } from '@/data/catalog'
import { RECIPES } from '@/data/recipes'
import { CATEGORIES } from '@/data/menu'
import { STATIONS, SUPPLIERS } from '@/data/org'
import { createCostEngine } from '@/lib/costing'
import { storage, uid, round } from '@/lib/utils'

/**
 * كتالوج المواد والوصفات + محرك التكلفة.
 * تعديلات المستخدم تُحفظ كـ overrides فوق الـ seed، فالبيانات الأصلية تبقى سليمة.
 */
export const useCatalogStore = defineStore('catalog', () => {
  const ingredientOverrides = ref(storage.get('ingredientOverrides', {}))
  const recipeOverrides = ref(storage.get('recipeOverrides', {}))
  const customRecipes = ref(storage.get('customRecipes', []))
  const archivedRecipeIds = ref(storage.get('archivedRecipeIds', []))

  const persist = () => {
    storage.set('ingredientOverrides', ingredientOverrides.value)
    storage.set('recipeOverrides', recipeOverrides.value)
    storage.set('customRecipes', customRecipes.value)
    storage.set('archivedRecipeIds', archivedRecipeIds.value)
  }

  const ingredients = computed(() =>
    INGREDIENTS.map((x) => ({ ...x, ...(ingredientOverrides.value[x.id] || {}) })),
  )

  const recipes = computed(() =>
    [...RECIPES, ...customRecipes.value]
      .map((r) => ({ ...r, ...(recipeOverrides.value[r.id] || {}) }))
      .filter((r) => !archivedRecipeIds.value.includes(r.id)),
  )

  const ingredientMap = computed(() => new Map(ingredients.value.map((x) => [x.id, x])))
  const recipeMap = computed(() => new Map(recipes.value.map((x) => [x.id, x])))

  const menuRecipes = computed(() => recipes.value.filter((r) => r.type === 'menu'))
  const prepRecipes = computed(() => recipes.value.filter((r) => r.type === 'prep'))

  /** المحرك يُعاد بناؤه عند أي تغيير في البيانات — التكلفة دايمًا طازة */
  const engine = computed(() =>
    createCostEngine({ ingredients: ingredients.value, recipes: recipes.value }),
  )

  const categories = computed(() => [...CATEGORIES].sort((a, b) => a.sort - b.sort))
  const stations = computed(() => [...STATIONS].sort((a, b) => a.sort - b.sort))
  const groups = computed(() => ITEM_GROUPS)
  const suppliers = computed(() => SUPPLIERS)
  const storageTypes = computed(() => STORAGE_TYPES)

  const categoryMap = computed(() => new Map(categories.value.map((c) => [c.id, c])))
  const stationMap = computed(() => new Map(stations.value.map((s) => [s.id, s])))
  const groupMap = computed(() => new Map(groups.value.map((g) => [g.id, g])))
  const supplierMap = computed(() => new Map(suppliers.value.map((s) => [s.id, s])))

  /* ----------------- أوامر التعديل ----------------- */

  function updateIngredient(id, patch) {
    ingredientOverrides.value = {
      ...ingredientOverrides.value,
      [id]: { ...(ingredientOverrides.value[id] || {}), ...patch },
    }
    persist()
  }

  function updateRecipe(id, patch) {
    recipeOverrides.value = {
      ...recipeOverrides.value,
      [id]: { ...(recipeOverrides.value[id] || {}), ...patch },
    }
    persist()
  }

  function createRecipe(data) {
    const id = data.id || uid('REC')
    const recipe = {
      id,
      code: data.code || id,
      nameAr: data.nameAr || 'وصفة جديدة',
      nameEn: data.nameEn || 'New recipe',
      type: data.type || 'menu',
      categoryId: data.categoryId || 'CAT-GRILL',
      stationId: data.stationId || 'ST-PREP',
      emoji: data.emoji || '🍽️',
      yieldQty: data.yieldQty ?? 1,
      yieldUnit: data.yieldUnit || (data.type === 'prep' ? 'g' : 'portion'),
      batchLossPct: data.batchLossPct ?? 0,
      price: data.price ?? 0,
      taxGroupId: data.taxGroupId || 'TX-14',
      prepTimeMin: data.prepTimeMin ?? 10,
      lines: data.lines || [],
      steps: data.steps || [],
    }
    customRecipes.value = [...customRecipes.value, recipe]
    persist()
    return recipe
  }

  function duplicateRecipe(id) {
    const src = recipeMap.value.get(id)
    if (!src) return null
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid('REC'),
      code: `${src.code}-C`,
      nameAr: `${src.nameAr} (نسخة)`,
      nameEn: `${src.nameEn} (copy)`,
    }
    customRecipes.value = [...customRecipes.value, copy]
    persist()
    return copy
  }

  function archiveRecipe(id) {
    archivedRecipeIds.value = [...new Set([...archivedRecipeIds.value, id])]
    persist()
  }

  function resetOverrides() {
    ingredientOverrides.value = {}
    recipeOverrides.value = {}
    customRecipes.value = []
    archivedRecipeIds.value = []
    persist()
  }

  /* ----------------- مساعدات العرض ----------------- */

  const nameOf = (entity, locale = 'ar') =>
    !entity ? '—' : locale === 'ar' ? entity.nameAr : entity.nameEn || entity.nameAr

  /** اسم أي مرجع في سطر وصفة */
  function refName(line, locale = 'ar') {
    const src = line.type === 'ingredient' ? ingredientMap.value.get(line.refId) : recipeMap.value.get(line.refId)
    return nameOf(src, locale)
  }

  function refEntity(line) {
    return line.type === 'ingredient' ? ingredientMap.value.get(line.refId) : recipeMap.value.get(line.refId)
  }

  /** أي وصفات تستخدم هذه المادة أو الوصفة؟ — تحليل الأثر قبل أي تعديل سعر */
  function usedIn(refId) {
    return recipes.value.filter((r) => (r.lines || []).some((l) => l.refId === refId))
  }

  /** تكلفة الوصفة جاهزة للعرض */
  function costOf(recipeId) {
    return engine.value.recipeCost(recipeId)
  }

  function economicsOf(recipeId) {
    const r = recipeMap.value.get(recipeId)
    if (!r) return null
    const target = categoryMap.value.get(r.categoryId)?.targetFoodCostPct
    return engine.value.menuEconomics(r, { vatRate: 0, targetFoodCostPct: r.targetFoodCostPct || target })
  }

  /** تكلفة وحدة الشراء للمادة (تكلفة الكيلو/اللتر/القطعة) */
  function ingredientUnitCost(id) {
    const ing = ingredientMap.value.get(id)
    if (!ing) return 0
    return round(engine.value.ingredientCostPerUnit(id, ing.purchaseUnit), 4)
  }

  return {
    ingredients, recipes, menuRecipes, prepRecipes, engine,
    ingredientMap, recipeMap, categories, stations, groups, suppliers, storageTypes,
    categoryMap, stationMap, groupMap, supplierMap,
    ingredientOverrides, recipeOverrides, customRecipes, archivedRecipeIds,
    updateIngredient, updateRecipe, createRecipe, duplicateRecipe, archiveRecipe, resetOverrides,
    nameOf, refName, refEntity, usedIn, costOf, economicsOf, ingredientUnitCost,
  }
})
