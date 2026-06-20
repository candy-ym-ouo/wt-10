import { createApp, computed } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './styles/global.css'
import { useI18nStore } from './stores/i18nStore'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)

const i18nStore = useI18nStore()
i18nStore.init()

app.use(ElementPlus)

app.config.globalProperties.$t = (key, params) => i18nStore.t(key, params)
app.config.globalProperties.$tc = (key, count, params) => i18nStore.tc(key, count, params)

Object.defineProperty(app.config.globalProperties, '$locale', {
  get: () => i18nStore.currentLocale,
  enumerable: true
})

app.provide('i18n', i18nStore)
app.provide('$t', (key, params) => i18nStore.t(key, params))

app.use(router)

i18nStore.syncFromServer().catch(() => {})

app.mount('#app')
