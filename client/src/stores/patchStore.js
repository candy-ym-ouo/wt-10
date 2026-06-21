import { defineStore } from 'pinia'
import { patchAPI, socialAPI } from '@/api'

export const usePatchStore = defineStore('patch', {
  state: () => ({
    patches: [],
    total: 0,
    loading: false,
    compareList: [],
    compareCount: 0,
    favoriteFolders: [],
    favoriteFoldersLoading: false
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

    async restorePatch(id) {
      return await patchAPI.restore(id)
    },

    async toggleLike(id) {
      return await patchAPI.toggleLike(id)
    },

    async toggleFavorite(id, data = {}) {
      return await patchAPI.toggleFavorite(id, data)
    },

    async addComment(id, content, parentId, replyToUserId) {
      return await patchAPI.addComment(id, content, parentId, replyToUserId)
    },

    async deleteComment(patchId, commentId) {
      return await patchAPI.deleteComment(patchId, commentId)
    },

    async toggleCommentLike(commentId) {
      return await patchAPI.toggleCommentLike(commentId)
    },

    async fetchMyPatches(params = {}) {
      return await socialAPI.getMyPatches(params)
    },

    async fetchMyFavorites(params = {}) {
      return await socialAPI.getMyFavorites(params)
    },

    async fetchFavoriteFolders() {
      this.favoriteFoldersLoading = true
      try {
        const res = await socialAPI.getFavoriteFolders()
        this.favoriteFolders = res.folders || []
        return res
      } finally {
        this.favoriteFoldersLoading = false
      }
    },

    async createFavoriteFolder(data) {
      const res = await socialAPI.createFavoriteFolder(data)
      if (res.folder) {
        this.favoriteFolders.push(res.folder)
      }
      return res
    },

    async updateFavoriteFolder(id, data) {
      const res = await socialAPI.updateFavoriteFolder(id, data)
      const index = this.favoriteFolders.findIndex(f => f.id === id)
      if (index !== -1 && data.name !== undefined) {
        this.favoriteFolders[index].name = data.name
      }
      if (index !== -1 && data.description !== undefined) {
        this.favoriteFolders[index].description = data.description
      }
      if (index !== -1 && data.color !== undefined) {
        this.favoriteFolders[index].color = data.color
      }
      return res
    },

    async deleteFavoriteFolder(id, moveToFolderId = null) {
      const res = await socialAPI.deleteFavoriteFolder(id, { move_to_folder_id: moveToFolderId })
      this.favoriteFolders = this.favoriteFolders.filter(f => f.id !== id)
      return res
    },

    async reorderFavoriteFolders(orders) {
      return await socialAPI.reorderFavoriteFolders(orders)
    },

    async moveFavoriteToFolder(patchId, folderId) {
      return await socialAPI.moveFavoriteToFolder(patchId, { folder_id: folderId })
    },

    async updateFavoriteFolderId(favoriteId, folderId) {
      return await socialAPI.updateFavoriteFolderId(favoriteId, { folder_id: folderId })
    },

    async batchMoveFavorites(patchIds, folderId) {
      return await socialAPI.batchMoveFavorites({ patch_ids: patchIds, folder_id: folderId })
    },

    async batchDeleteFavorites(patchIds) {
      return await socialAPI.batchDeleteFavorites({ patch_ids: patchIds })
    },

    async fetchMyDrafts(params = {}) {
      return await socialAPI.getMyDrafts(params)
    },

    async fetchMyScheduled(params = {}) {
      return await socialAPI.getMyScheduled(params)
    },

    async fetchMyTrash(params = {}) {
      return await socialAPI.getMyTrash(params)
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

    async comparePatchesEnhanced(ids, saveHistory = true) {
      return await socialAPI.comparePatchesEnhanced(ids.join(','), saveHistory)
    },

    async saveCompareScheme(data) {
      return await socialAPI.saveCompareScheme(data)
    },

    async fetchCompareSchemes(params = {}) {
      return await socialAPI.getCompareSchemes(params)
    },

    async fetchCompareSchemeDetail(id) {
      return await socialAPI.getCompareSchemeDetail(id)
    },

    async updateCompareScheme(id, data) {
      return await socialAPI.updateCompareScheme(id, data)
    },

    async deleteCompareScheme(id) {
      return await socialAPI.deleteCompareScheme(id)
    },

    async generateShareLink(id) {
      return await socialAPI.generateShareLink(id)
    },

    async revokeShareLink(id) {
      return await socialAPI.revokeShareLink(id)
    },

    async fetchSharedScheme(token) {
      return await socialAPI.getSharedScheme(token)
    },

    async fetchCompareHistory(params = {}) {
      return await socialAPI.getCompareHistory(params)
    },

    async deleteCompareHistory(id) {
      return await socialAPI.deleteCompareHistory(id)
    },

    async clearCompareHistory() {
      return await socialAPI.clearCompareHistory()
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
    },

    async fetchRankings(params = {}) {
      return await patchAPI.getRankings(params)
    },

    async fetchViewSources(params = {}) {
      return await patchAPI.getViewSources(params)
    },

    async fetchHeatTrend(params = {}) {
      return await patchAPI.getHeatTrend(params)
    }
  }
})
