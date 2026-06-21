import { defineStore } from 'pinia'
import { messageAPI } from '@/api'

export const useMessageStore = defineStore('message', {
  state: () => ({
    messages: {
      list: [],
      total: 0,
      unreadCount: 0,
      countsByCategory: {},
      page: 1,
      limit: 20,
      loading: false
    },
    currentCategory: 'all',
    unreadOnly: false,
    selectedIds: new Set()
  }),

  getters: {
    isAllSelected: (state) => {
      if (state.messages.list.length === 0) return false
      return state.messages.list.every(m => state.selectedIds.has(m.id))
    },
    hasSelection: (state) => state.selectedIds.size > 0
  },

  actions: {
    async fetchMessages(params = {}) {
      this.messages.loading = true
      try {
        const queryParams = {
          page: params.page || this.messages.page,
          limit: params.limit || this.messages.limit,
          category: params.category !== undefined ? params.category : this.currentCategory,
          unread_only: params.unread_only !== undefined ? (params.unread_only ? '1' : undefined) : (this.unreadOnly ? '1' : undefined)
        }
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === undefined) delete queryParams[key]
        })
        const res = await messageAPI.getMyMessages(queryParams)
        this.messages = {
          ...this.messages,
          ...res,
          list: queryParams.page > 1 ? [...this.messages.list, ...res.list] : res.list,
          loading: false
        }
        return res
      } catch (e) {
        this.messages.loading = false
        throw e
      }
    },

    async fetchUnreadCount() {
      try {
        const res = await messageAPI.getUnreadCount()
        this.messages.unreadCount = res.unreadCount || 0
        this.messages.countsByCategory = res.countsByCategory || {}
        return res
      } catch (e) {
        throw e
      }
    },

    async markAsRead(id) {
      try {
        await messageAPI.markRead(id)
        const item = this.messages.list.find(m => m.id === id)
        if (item) {
          item.is_read = 1
          if (this.messages.unreadCount > 0) {
            this.messages.unreadCount--
          }
          if (this.messages.countsByCategory[item.category] > 0) {
            this.messages.countsByCategory[item.category]--
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
        await messageAPI.markAllRead({ category: cat })
        this.messages.list.forEach(m => {
          if (cat === 'all' || m.category === cat) {
            m.is_read = 1
          }
        })
        if (cat === 'all') {
          this.messages.unreadCount = 0
          Object.keys(this.messages.countsByCategory).forEach(k => {
            this.messages.countsByCategory[k] = 0
          })
        } else {
          const count = this.messages.countsByCategory[cat] || 0
          this.messages.unreadCount = Math.max(0, this.messages.unreadCount - count)
          this.messages.countsByCategory[cat] = 0
        }
      } catch (e) {
        throw e
      }
    },

    async markBatchAsRead(ids) {
      const targetIds = ids || Array.from(this.selectedIds)
      if (targetIds.length === 0) return
      try {
        await messageAPI.markBatchRead(targetIds)
        targetIds.forEach(id => {
          const item = this.messages.list.find(m => m.id === id)
          if (item) {
            item.is_read = 1
            if (this.messages.unreadCount > 0) {
              this.messages.unreadCount--
            }
            if (this.messages.countsByCategory[item.category] > 0) {
              this.messages.countsByCategory[item.category]--
            }
          }
        })
        this.clearSelection()
      } catch (e) {
        throw e
      }
    },

    async deleteMessage(id) {
      try {
        await messageAPI.deleteMessage(id)
        const idx = this.messages.list.findIndex(m => m.id === id)
        if (idx > -1) {
          const item = this.messages.list[idx]
          if (!item.is_read && this.messages.unreadCount > 0) {
            this.messages.unreadCount--
          }
          if (!item.is_read && this.messages.countsByCategory[item.category] > 0) {
            this.messages.countsByCategory[item.category]--
          }
          this.messages.list.splice(idx, 1)
          this.messages.total = Math.max(0, this.messages.total - 1)
        }
        this.selectedIds.delete(id)
      } catch (e) {
        throw e
      }
    },

    async deleteBatchMessages(ids) {
      const targetIds = ids || Array.from(this.selectedIds)
      if (targetIds.length === 0) return
      try {
        await messageAPI.deleteBatch(targetIds)
        targetIds.forEach(id => {
          const idx = this.messages.list.findIndex(m => m.id === id)
          if (idx > -1) {
            const item = this.messages.list[idx]
            if (!item.is_read && this.messages.unreadCount > 0) {
              this.messages.unreadCount--
            }
            if (!item.is_read && this.messages.countsByCategory[item.category] > 0) {
              this.messages.countsByCategory[item.category]--
            }
            this.messages.list.splice(idx, 1)
            this.messages.total = Math.max(0, this.messages.total - 1)
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
        await messageAPI.clearRead({ category: cat })
        this.messages.list = this.messages.list.filter(m => {
          if (cat === 'all') return !m.is_read
          return !(m.is_read && m.category === cat)
        })
        this.messages.total = this.messages.list.length
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
        this.messages.list.forEach(m => {
          this.selectedIds.add(m.id)
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

    resetMessages() {
      this.messages = {
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
