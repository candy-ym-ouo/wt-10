<template>
  <el-config-provider :locale="elementPlusLocale">
    <div id="app">
      <AppHeader v-if="!isAuthRoute" />
      <router-view />
    </div>
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'
import { useI18nStore, LOCALES } from '@/stores/i18nStore'
import AppHeader from '@/components/AppHeader.vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'

const route = useRoute()
const userStore = useUserStore()
const patchStore = usePatchStore()
const i18nStore = useI18nStore()

const elementPlusLocale = computed(() => {
  return i18nStore.currentLocale === LOCALES.EN_US ? en : zhCn
})

const isAuthRoute = computed(() => 
  route.path === '/login' || route.path === '/register' || route.path.startsWith('/admin')
)

onMounted(async () => {
  if (userStore.token) {
    await userStore.fetchCurrentUser()
    patchStore.fetchCompareList()
  }
})

watch(
  () => i18nStore.currentLocale,
  () => {
    document.title = i18nStore.currentLocale === LOCALES.EN_US ? 'Patch Vault' : 'Patch Vault - 模块补丁分享社区'
  },
  { immediate: true }
)
</script>
