<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'

const drawer = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (drawer.value = false))
</script>

<template>
  <div class="flex min-h-screen bg-paper">
    <!-- القائمة الثابتة على الشاشات الكبيرة -->
    <div class="sticky top-0 hidden h-screen shrink-0 lg:block">
      <AppSidebar />
    </div>

    <!-- دروار الموبايل -->
    <Teleport to="body">
      <div v-if="drawer" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-ink/50" @click="drawer = false" />
        <div class="absolute inset-y-0 start-0 w-[248px] animate-pop">
          <AppSidebar @navigate="drawer = false" />
        </div>
      </div>
    </Teleport>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar @toggle-drawer="drawer = !drawer" />
      <main class="min-w-0 flex-1 p-3 sm:p-5">
        <div class="mx-auto flex max-w-[1500px] flex-col gap-5">
          <RouterView v-slot="{ Component }">
            <Transition
              mode="out-in"
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="translate-y-1 opacity-0"
              leave-active-class="transition duration-100 ease-in"
              leave-to-class="opacity-0"
            >
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>
  </div>
</template>
