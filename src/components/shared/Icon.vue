<script setup>
import { computed } from 'vue'
import {
  LayoutDashboard, ScanLine, ChefHat, BookOpen, Boxes, Scale, SlidersHorizontal,
  Flame, Pizza, Salad, Soup, CakeSlice, CupSoda, Utensils, ShoppingBag, Bike,
  Banknote, CreditCard, Smartphone, Circle,
  LifeBuoy, Printer, ShieldCheck, Sparkles, MessageCircle, PhoneCall, Mail,
} from 'lucide-vue-next'

/** أيقونة بالاسم — الخرائط صريحة عشان الـ bundle يفضل صغير */
const MAP = {
  LayoutDashboard, ScanLine, ChefHat, BookOpen, Boxes, Scale, SlidersHorizontal,
  Flame, Pizza, Salad, Soup, CakeSlice, CupSoda, Utensils, ShoppingBag, Bike,
  Banknote, CreditCard, Smartphone,
  LifeBuoy, Printer, ShieldCheck, Sparkles, MessageCircle, PhoneCall, Mail,
}

const props = defineProps({
  name: { type: String, required: true },
  strokeWidth: { type: Number, default: 2.6 },
})
const comp = computed(() => MAP[props.name] || Circle)
</script>

<template>
  <component :is="comp" :stroke-width="strokeWidth" />
</template>
