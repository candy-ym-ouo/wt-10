import { defineStore } from 'pinia'
import { patchAPI, socialAPI } from '@/api'

export const usePatchStore = defineStore('patch', {
  state: () => ({
    patches: [],
    total: 0,
    loading: false,
    compareList: [],
    compareCount: 0
  }),

  actions: {
    async fetchPatches(params = {}) {
      this.loading = true
      try {
        const res = await patchAPI.getList(params)
        this.patches = res.list
        this.total = res.total
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchPatchDetail(id) {
      return await patchAPI.getDetail(id)
    },

    async createPatch(data) {
      return await patchAPI.create(data)
    },

    async updatePatch(id, data) {
      return await patchAPI.update(id, data)
    },

    async deletePatch(id) {
      return await patchAPI.delete(id)
    },

    async toggleLike(id) {
      return await patchAPI.toggleLike(id)
    },

    async toggleFavorite(id, folder = 'default') {
      return await patchAPI.toggleFavorite(id, folder)
    },

    async addComment(id, content) {
      return await patchAPI.addComment(id, content)
    },

    async deleteComment(patchId, commentId) {
      return await patchAPI.deleteComment(patchId, commentId)
    },

    async fetchMyPatches(params = {}) {
      return await socialAPI.getMyPatches(params)
    },

    async fetchMyFavorites(params = {}) {
      return await socialAPI.getMyFavorites(params)
    },

    async fetchMyDrafts(params = {}) {
      return await socialAPI.getMyDrafts(params)
    },

    async fetchMyScheduled(params = {}) {
      return await socialAPI.getMyScheduled(params)
    },

    async fetchCreatorStats() {
      return await socialAPI.getCreatorStats()
    },

    async fetchMyNotifications(params = {}) {
      return await socialAPI.getMyNotifications(params)
    },

    async markNotificationRead(id) {
      return await socialAPI.markNotificationRead(id)
    },

    async markAllNotificationsRead() {
      return await socialAPI.markAllNotificationsRead()
    },

    async fetchCompareList() {
      const res = await socialAPI.getCompareList()
      this.compareList = res.patches || []
      this.compareCount = res.patch_ids?.length || 0
      return res
    },

    async addToCompare(id) {
      const res = await socialAPI.addToCompare(id)
      this.compareCount = res.count
      return res
    },

    async removeFromCompare(id) {
      const res = await socialAPI.removeFromCompare(id)
      this.compareCount = res.count
      return res
    },

    async clearCompare() {
      const res = await socialAPI.clearCompare()
      this.compareCount = 0
      return res
    },

    async comparePatches(ids) {
      return await socialAPI.comparePatches(ids.join(','))
    },

    async fetchVersions(id, params = {}) {
      return await patchAPI.getVersions(id, params)
    },

    async fetchVersionDetail(id, versionId) {
      return await patchAPI.getVersionDetail(id, versionId)
    },

    async fetchVersionDiff(id, params = {}) {
      return await patchAPI.getVersionDiff(id, params)
    },

    async rollbackVersion(id, versionId) {
      return await patchAPI.rollbackVersion(id, versionId)
    }
  }
})
