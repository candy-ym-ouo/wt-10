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
      const res = await adminAPI.getStats()
      this.stats = res
      return res
    },

    async fetchUsers(params = {}) {
      this.loading = true
      try {
        const res = await adminAPI.getUsers(params)
        this.users = res.list || res || []
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
        this.patches = res.list || res || []
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
        this.modules = res.list || res || []
        return res
      } finally {
        this.loading = false
      }
    },

    async createModule(data) {
      return await adminAPI.createModule(data)
    },

    async updateModule(id, data) {
      return await adminAPI.updateModule(id, data)
    },

    async fetchManufacturers(params = {}) {
      const res = await adminAPI.getManufacturers(params)
      this.manufacturers = res.list || res || []
      return res
    },

    async createManufacturer(data) {
      return await adminAPI.createManufacturer(data)
    },

    async updateManufacturer(id, data) {
      return await adminAPI.updateManufacturer(id, data)
    },

    async deleteManufacturer(id) {
      return await adminAPI.deleteManufacturer(id)
    }
  }
})
