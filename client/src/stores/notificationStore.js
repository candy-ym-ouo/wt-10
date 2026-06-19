import { defineStore } from 'pinia'
import { socialAPI } from '@/api'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: {
      list: [],
      total: 0,
      unreadCount: 0,
      countsByCategory: {},
      page: 1,
      limit: 20,
      loading: false
    },
    subscriptions: [],
    subscriptionsLoading: false,
    selectedIds: new Set(),
    currentCategory: 'all',
    unreadOnly: false
  }),

  getters: {
    isAllSelected: (state) => {
      if (state.notifications.list.length === 0) return false
      return state.notifications.list.every(n => state.selectedIds.has(n.id))
    },
    hasSelection: (state) => state.selectedIds.size > 0
  },

  actions: {
    async fetchNotifications(params = {}) {
      this.notifications.loading = true
      try {
        const queryParams = {
          page: params.page || this.notifications.page,
          limit: params.limit || this.notifications.limit,
          category: params.category !== undefined ? params.category : this.currentCategory,
          unread_only: params.unread_only !== undefined ? (params.unread_only ? '1' : undefined) : (this.unreadOnly ? '1' : undefined)
        }
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === undefined) delete queryParams[key]
        })
        const res = await socialAPI.getMyNotifications(queryParams)
        this.notifications = {
          ...this.notifications,
          ...res,
          list: queryParams.page > 1 ? [...this.notifications.list, ...res.list] : res.list,
          loading: false
        }
        return res
      } catch (e) {
        this.notifications.loading = false
        throw e
      }
    },

    async markAsRead(id) {
      try {
        await socialAPI.markNotificationRead(id)
        const item = this.notifications.list.find(n => n.id === id)
        if (item) {
          item.read = 1
          if (this.notifications.unreadCount > 0) {
            this.notifications.unreadCount--
          }
          if (this.notifications.countsByCategory[item.category] > 0) {
            this.notifications.countsByCategory[item.category]--
          }
        }
        this.selectedIds.delete(id)
      } catch (e) {
        throw e
      }
    },

    async markAllAsRead(category) {
      try {
        const cat = category !== undefined ? category : this.currentCategory
        await socialAPI.markAllNotificationsRead({ category: cat })
        this.notifications.list.forEach(n => {
          if (cat === 'all' || n.category === cat) {
            n.read = 1
          }
        })
        if (cat === 'all') {
          this.notifications.unreadCount = 0
          Object.keys(this.notifications.countsByCategory).forEach(k => {
            this.notifications.countsByCategory[k] = 0
          })
        } else {
          const count = this.notifications.countsByCategory[cat] || 0
          this.notifications.unreadCount = Math.max(0, this.notifications.unreadCount - count)
          this.notifications.countsByCategory[cat] = 0
        }
      } catch (e) {
        throw e
      }
    },

    async markBatchAsRead(ids) {
      const targetIds = ids || Array.from(this.selectedIds)
      if (targetIds.length === 0) return
      try {
        await socialAPI.markBatchNotificationsRead(targetIds)
        targetIds.forEach(id => {
          const item = this.notifications.list.find(n => n.id === id)
          if (item) {
            item.read = 1
            if (this.notifications.unreadCount > 0) {
              this.notifications.unreadCount--
            }
            if (this.notifications.countsByCategory[item.category] > 0) {
              this.notifications.countsByCategory[item.category]--
            }
          }
        })
        this.clearSelection()
      } catch (e) {
        throw e
      }
    },

    async deleteNotification(id) {
      try {
        await socialAPI.deleteNotification(id)
        const idx = this.notifications.list.findIndex(n => n.id === id)
        if (idx > -1) {
          const item = this.notifications.list[idx]
          if (!item.read && this.notifications.unreadCount > 0) {
            this.notifications.unreadCount--
          }
          if (!item.read && this.notifications.countsByCategory[item.category] > 0) {
            this.notifications.countsByCategory[item.category]--
          }
          this.notifications.list.splice(idx, 1)
          this.notifications.total = Math.max(0, this.notifications.total - 1)
        }
        this.selectedIds.delete(id)
      } catch (e) {
        throw e
      }
    },

    async deleteBatchNotifications(ids) {
      const targetIds = ids || Array.from(this.selectedIds)
      if (targetIds.length === 0) return
      try {
        await socialAPI.deleteBatchNotifications(targetIds)
        targetIds.forEach(id => {
          const idx = this.notifications.list.findIndex(n => n.id === id)
          if (idx > -1) {
            const item = this.notifications.list[idx]
            if (!item.read && this.notifications.unreadCount > 0) {
              this.notifications.unreadCount--
            }
            if (!item.read && this.notifications.countsByCategory[item.category] > 0) {
              this.notifications.countsByCategory[item.category]--
            }
            this.notifications.list.splice(idx, 1)
            this.notifications.total = Math.max(0, this.notifications.total - 1)
          }
        })
        this.clearSelection()
      } catch (e) {
        throw e
      }
    },

    async clearRead(category) {
      const cat = category !== undefined ? category : this.currentCategory
      try {
        const res = await socialAPI.clearReadNotifications({ category: cat })
        this.notifications.list = this.notifications.list.filter(n => {
          if (cat === 'all') return !n.read
          return !(n.read && n.category === cat)
        })
        this.notifications.total = this.notifications.list.length
        return res
      } catch (e) {
        throw e
      }
    },

    async fetchSubscriptions() {
      this.subscriptionsLoading = true
      try {
        const res = await socialAPI.getNotificationSubscriptions()
        this.subscriptions = res.subscriptions || []
        return res
      } finally {
        this.subscriptionsLoading = false
      }
    },

    async updateSubscription(category, enabled) {
      try {
        const res = await socialAPI.updateNotificationSubscription(category, enabled)
        const sub = this.subscriptions.find(s => s.category === category)
        if (sub) {
          sub.enabled = enabled ? 1 : 0
        }
        return res
      } catch (e) {
        throw e
      }
    },

    async updateSubscriptionsBatch(subscriptions) {
      try {
        const res = await socialAPI.updateNotificationSubscriptionsBatch(subscriptions)
        subscriptions.forEach(({ category, enabled }) => {
          const sub = this.subscriptions.find(s => s.category === category)
          if (sub) {
            sub.enabled = enabled ? 1 : 0
          }
        })
        return res
      } catch (e) {
        throw e
      }
    },

    toggleSelection(id) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id)
      } else {
        this.selectedIds.add(id)
      }
    },

    toggleSelectAll() {
      if (this.isAllSelected) {
        this.clearSelection()
      } else {
        this.notifications.list.forEach(n => {
          this.selectedIds.add(n.id)
        })
      }
    },

    clearSelection() {
      this.selectedIds.clear()
    },

    setCategory(category) {
      this.currentCategory = category
      this.selectedIds.clear()
    },

    setUnreadOnly(value) {
      this.unreadOnly = value
      this.selectedIds.clear()
    },

    resetNotifications() {
      this.notifications = {
        list: [],
        total: 0,
        unreadCount: 0,
        countsByCategory: {},
        page: 1,
        limit: 20,
        loading: false
      }
      this.selectedIds.clear()
    }
  }
})
