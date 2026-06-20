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

    async toggleLike(id) {
      return await patchAPI.toggleLike(id)
    },

    async toggleFavorite(id, data = {}) {
      return await patchAPI.toggleFavorite(id, data)
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
