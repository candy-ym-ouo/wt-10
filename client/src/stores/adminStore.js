import { defineStore } from 'pinia'
import { adminAPI } from '@/api'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    stats: null,
    users: [],
    patches: [],
    modules: [],
    manufacturers: [],
    loading: false
  }),

  actions: {
    async fetchStats() {
      this.stats = await adminAPI.getStats()
      return this.stats
    },

    async fetchUsers(params = {}) {
      this.loading = true
      try {
        const res = await adminAPI.getUsers(params)
        this.users = res.list
        return res
      } finally {
        this.loading = false
      }
    },

    async updateUser(id, data) {
      return await adminAPI.updateUser(id, data)
    },

    async deleteUser(id) {
      return await adminAPI.deleteUser(id)
    },

    async fetchPatches(params = {}) {
      this.loading = true
      try {
        const res = await adminAPI.getPatches(params)
        this.patches = res.list
        return res
      } finally {
        this.loading = false
      }
    },

    async togglePatchPublic(id, is_public) {
      return await adminAPI.togglePatchPublic(id, is_public)
    },

    async adminDeletePatch(id) {
      return await adminAPI.deletePatch(id)
    },

    async fetchModules(params = {}) {
      this.loading = true
      try {
        const res = await adminAPI.getModules(params)
        this.modules = res.list
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchManufacturers() {
      this.manufacturers = await adminAPI.getManufacturers()
      return this.manufacturers
    },

    async updateManufacturer(id, data) {
      return await adminAPI.updateManufacturer(id, data)
    },

    async deleteManufacturer(id) {
      return await adminAPI.deleteManufacturer(id)
    }
  }
})
