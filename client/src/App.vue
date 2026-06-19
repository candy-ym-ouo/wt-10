<template>
  <div id="app">
    <AppHeader v-if="!isAuthRoute" />
    <router-view />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'
import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
const userStore = useUserStore()
const patchStore = usePatchStore()

const isAuthRoute = computed(() => 
  route.path === '/login' || route.path === '/register'
)

onMounted(async () => {
  if (userStore.token) {
    await userStore.fetchCurrentUser()
    patchStore.fetchCompareList()
  }
})
</script>
