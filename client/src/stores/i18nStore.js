import { defineStore } from 'pinia'
import { i18nApi } from '@/api'
import zhCN from '@/i18n/locales/zh-cn'
import enUS from '@/i18n/locales/en-us'

export const LOCALES = {
  ZH_CN: 'zh_cn',
  EN_US: 'en_us'
}

export const LOCALE_LABELS = {
  [LOCALES.ZH_CN]: '中文',
  [LOCALES.EN_US]: 'English'
}

const STORAGE_KEY = 'app_locale'

const defaultMessages = {
  [LOCALES.ZH_CN]: zhCN,
  [LOCALES.EN_US]: enUS
}

const flattenMessages = (obj, prefix = '') => {
  const result = {}
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value, fullKey))
    } else {
      result[fullKey] = value
    }
  })
  return result
}

const getBrowserLocale = () => {
  const lang = navigator.language?.toLowerCase().replace('-', '_')
  if (lang === 'zh_cn' || lang === 'zh') return LOCALES.ZH_CN
  if (lang === 'en_us' || lang === 'en') return LOCALES.EN_US
  return LOCALES.ZH_CN
}

export const useI18nStore = defineStore('i18n', {
  state: () => ({
    locale: localStorage.getItem(STORAGE_KEY) || getBrowserLocale(),
    messages: {
      [LOCALES.ZH_CN]: flattenMessages(defaultMessages[LOCALES.ZH_CN]),
      [LOCALES.EN_US]: flattenMessages(defaultMessages[LOCALES.EN_US])
    },
    serverMessages: {},
    isSyncing: false
  }),

  getters: {
    currentLocale: (state) => state.locale,
    localeLabel: (state) => LOCALE_LABELS[state.locale] || state.locale,
    availableLocales: () => Object.values(LOCALES),
    localeOptions: () => Object.entries(LOCALE_LABELS).map(([value, label]) => ({ value, label }))
  },

  actions: {
    setLocale(locale) {
      if (!Object.values(LOCALES).includes(locale)) {
        console.warn(`Unsupported locale: ${locale}, fallback to zh_cn`)
        locale = LOCALES.ZH_CN
      }
      this.locale = locale
      localStorage.setItem(STORAGE_KEY, locale)
      document.documentElement.setAttribute('lang', locale.replace('_', '-'))
    },

    t(key, params = {}) {
      if (!key) return key
      let value = this.serverMessages[this.locale]?.[key]
        || this.messages[this.locale]?.[key]
        || this.messages[LOCALES.ZH_CN]?.[key]
        || key

      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
        })
      }

      return value
    },

    tc(key, count, params = {}) {
      const pluralKey = count === 1 ? key : `${key}_plural`
      const value = this.t(pluralKey, params)
      return value.replace('{count}', count)
    },

    toggleLocale() {
      const newLocale = this.locale === LOCALES.ZH_CN ? LOCALES.EN_US : LOCALES.ZH_CN
      this.setLocale(newLocale)
      return newLocale
    },

    async syncFromServer() {
      if (this.isSyncing) return
      this.isSyncing = true
      try {
        const [zhRes, enRes] = await Promise.all([
          i18nApi.getTranslations({ locale: LOCALES.ZH_CN }),
          i18nApi.getTranslations({ locale: LOCALES.EN_US })
        ])
        this.serverMessages[LOCALES.ZH_CN] = zhRes?.translations || {}
        this.serverMessages[LOCALES.EN_US] = enRes?.translations || {}
      } catch (e) {
        console.warn('Failed to sync translations from server:', e)
      } finally {
        this.isSyncing = false
      }
    },

    init() {
      this.setLocale(this.locale)
    }
  }
})
