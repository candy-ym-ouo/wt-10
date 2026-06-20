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

export const FALLBACK_LOCALE = LOCALES.ZH_CN

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
  try {
    const lang = navigator.language?.toLowerCase().replace('-', '_')
    if (lang === 'zh_cn' || lang === 'zh') return LOCALES.ZH_CN
    if (lang === 'en_us' || lang === 'en') return LOCALES.EN_US
  } catch (e) {}
  return FALLBACK_LOCALE
}

export const useI18nStore = defineStore('i18n', {
  state: () => ({
    locale: FALLBACK_LOCALE,
    messages: {
      [LOCALES.ZH_CN]: {},
      [LOCALES.EN_US]: {}
    },
    serverMessages: {
      [LOCALES.ZH_CN]: {},
      [LOCALES.EN_US]: {}
    },
    isSyncing: false,
    isInitialized: false,
    missingKeys: new Set()
  }),

  getters: {
    currentLocale: (state) => state.locale,
    localeLabel: (state) => LOCALE_LABELS[state.locale] || state.locale,
    availableLocales: () => Object.values(LOCALES),
    localeOptions: () => Object.entries(LOCALE_LABELS).map(([value, label]) => ({ value, label })),
    fallbackLocale: () => FALLBACK_LOCALE,
    elementPlusLocaleKey: (state) => (state.locale === LOCALES.EN_US ? 'en' : 'zh-cn'),
    isZh: (state) => state.locale === LOCALES.ZH_CN,
    isEn: (state) => state.locale === LOCALES.EN_US
  },

  actions: {
    init() {
      Object.values(LOCALES).forEach((locale) => {
        this.messages[locale] = flattenMessages(defaultMessages[locale] || {})
        if (!this.serverMessages[locale]) {
          this.serverMessages[locale] = {}
        }
      })

      const savedLocale = localStorage.getItem(STORAGE_KEY)
      const initialLocale = savedLocale && Object.values(LOCALES).includes(savedLocale)
        ? savedLocale
        : getBrowserLocale()

      this.setLocale(initialLocale, false)
      this.isInitialized = true
    },

    setLocale(locale, persist = true) {
      if (!Object.values(LOCALES).includes(locale)) {
        console.warn(`Unsupported locale: ${locale}, fallback to ${FALLBACK_LOCALE}`)
        locale = FALLBACK_LOCALE
      }
      this.locale = locale
      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, locale)
        } catch (e) {}
      }
      try {
        document.documentElement.setAttribute('lang', locale.replace('_', '-'))
        document.documentElement.setAttribute('dir', 'ltr')
      } catch (e) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('locale-change', { detail: { locale } }))
      }
    },

    t(key, params = {}) {
      if (!key) return key
      const locales = [this.locale, FALLBACK_LOCALE]
      let value = key
      let found = false

      for (const locale of locales) {
        if (this.serverMessages[locale]?.[key]) {
          value = this.serverMessages[locale][key]
          found = true
          break
        }
        if (this.messages[locale]?.[key]) {
          value = this.messages[locale][key]
          found = true
          break
        }
      }

      if (!found && typeof value === 'string') {
        if (!this.missingKeys.has(key)) {
          this.missingKeys.add(key)
          if (this.isInitialized) {
            console.warn(`[i18n] Missing translation key: "${key}"`)
          }
        }
      }

      if (params && typeof params === 'object' && typeof value === 'string') {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
        })
      }

      return value
    },

    tc(key, count, params = {}) {
      const pluralKey = count === 1 ? key : `${key}_plural`
      const value = this.t(pluralKey, params)
      if (typeof value === 'string') {
        return value.replace('{count}', count)
      }
      return value
    },

    hasKey(key) {
      if (!key) return false
      const locales = [this.locale, FALLBACK_LOCALE]
      for (const locale of locales) {
        if (this.serverMessages[locale]?.[key]) return true
        if (this.messages[locale]?.[key]) return true
      }
      return false
    },

    toggleLocale() {
      const newLocale = this.locale === LOCALES.ZH_CN ? LOCALES.EN_US : LOCALES.ZH_CN
      this.setLocale(newLocale)
      return newLocale
    },

    async syncFromServer(force = false) {
      if (this.isSyncing && !force) return
      this.isSyncing = true
      try {
        const [zhRes, enRes] = await Promise.all([
          i18nApi.getTranslations({ locale: LOCALES.ZH_CN }),
          i18nApi.getTranslations({ locale: LOCALES.EN_US })
        ])
        this.serverMessages[LOCALES.ZH_CN] = zhRes?.translations || {}
        this.serverMessages[LOCALES.EN_US] = enRes?.translations || {}
        this.missingKeys.clear()
        return true
      } catch (e) {
        console.warn('Failed to sync translations from server:', e)
        return false
      } finally {
        this.isSyncing = false
      }
    },

    setServerMessages(locale, translations) {
      if (Object.values(LOCALES).includes(locale) && translations) {
        this.serverMessages[locale] = translations
        this.missingKeys.clear()
      }
    }
  }
})
