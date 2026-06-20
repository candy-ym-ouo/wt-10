import { defineStore } from 'pinia'
import { openPlatformAPI, adminOpenPlatformAPI } from '@/api'

export const useOpenPlatformStore = defineStore('openPlatform', {
  state: () => ({
    myKeys: [],
    scopes: [],
    scopeCategories: {},
    callLogs: [],
    callLogsPagination: null,
    callStats: null,
    currentToken: null,
    lastCreatedKey: null,

    adminKeys: [],
    adminKeysPagination: null,
    adminCallLogs: [],
    adminCallLogsPagination: null,
    adminPlatformStats: null,
    adminKeyDetail: null
  }),

  actions: {
    async fetchScopes() {
      const res = await openPlatformAPI.getScopes()
      this.scopes = res.scopes || []
      this.scopeCategories = res.categories || {}
      return res
    },

    async fetchMyKeys(params) {
      const res = await openPlatformAPI.getMyKeys(params)
      this.myKeys = res || []
      return res
    },

    async createKey(data) {
      const res = await openPlatformAPI.createKey(data)
      this.lastCreatedKey = res
      await this.fetchMyKeys()
      return res
    },

    async updateKey(id, data) {
      const res = await openPlatformAPI.updateKey(id, data)
      const idx = this.myKeys.findIndex(k => k.id === id)
      if (idx !== -1) {
        this.myKeys[idx] = res
      }
      return res
    },

    async deleteKey(id) {
      await openPlatformAPI.deleteKey(id)
      this.myKeys = this.myKeys.filter(k => k.id !== id)
    },

    async generateToken(data) {
      const res = await openPlatformAPI.generateToken(data)
      this.currentToken = res
      return res
    },

    async fetchMyCallLogs(params) {
      const res = await openPlatformAPI.getMyCallLogs(params)
      this.callLogs = res.logs || []
      this.callLogsPagination = res.pagination || null
      return res
    },

    async fetchCallStats(params) {
      const res = await openPlatformAPI.getCallStats(params)
      this.callStats = res
      return res
    },

    clearLastCreatedKey() {
      this.lastCreatedKey = null
    },

    clearCurrentToken() {
      this.currentToken = null
    },

    async adminFetchAllKeys(params) {
      const res = await adminOpenPlatformAPI.getAllKeys(params)
      this.adminKeys = res.keys || []
      this.adminKeysPagination = res.pagination || null
      return res
    },

    async adminGetKeyDetail(id) {
      const res = await adminOpenPlatformAPI.getKeyDetail(id)
      this.adminKeyDetail = res
      return res
    },

    async adminBanKey(id, data) {
      const res = await adminOpenPlatformAPI.banKey(id, data)
      const idx = this.adminKeys.findIndex(k => k.id === id)
      if (idx !== -1) {
        this.adminKeys[idx] = res
      }
      return res
    },

    async adminUnbanKey(id) {
      const res = await adminOpenPlatformAPI.unbanKey(id)
      const idx = this.adminKeys.findIndex(k => k.id === id)
      if (idx !== -1) {
        this.adminKeys[idx] = res
      }
      return res
    },

    async adminUpdateRateLimit(id, data) {
      const res = await adminOpenPlatformAPI.updateRateLimit(id, data)
      const idx = this.adminKeys.findIndex(k => k.id === id)
      if (idx !== -1) {
        this.adminKeys[idx] = res
      }
      return res
    },

    async adminFetchCallLogs(params) {
      const res = await adminOpenPlatformAPI.getCallLogs(params)
      this.adminCallLogs = res.logs || []
      this.adminCallLogsPagination = res.pagination || null
      return res
    },

    async adminFetchPlatformStats(params) {
      const res = await adminOpenPlatformAPI.getPlatformStats(params)
      this.adminPlatformStats = res
      return res
    }
  }
})
