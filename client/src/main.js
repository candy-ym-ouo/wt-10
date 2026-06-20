import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './styles/global.css'
import { useI18nStore, LOCALES } from './stores/i18nStore'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)

const i18nStore = useI18nStore()
i18nStore.init()

const elementPlusLocale = i18nStore.currentLocale === LOCALES.EN_US ? en : zhCn
app.use(ElementPlus, { locale: elementPlusLocale })

app.config.globalProperties.$t = (key, params) => i18nStore.t(key, params)
app.config.globalProperties.$tc = (key, count, params) => i18nStore.tc(key, count, params)
app.config.globalProperties.$locale = i18nStore.currentLocale

app.provide('i18n', i18nStore)
app.provide('$t', (key, params) => i18nStore.t(key, params))

app.use(router)

i18nStore.syncFromServer().catch(() => {})

app.mount('#app')
