import { defineStore } from 'pinia'
import { moduleAPI } from '@/api'

export const useModuleStore = defineStore('module', {
  state: () => ({
    modules: [],
    manufacturers: [],
    moduleTypes: [],
    total: 0,
    loading: false
  }),

  actions: {
    async fetchManufacturers(params = {}) {
      const res = await moduleAPI.getManufacturers(params)
      this.manufacturers = res.list || res || []
      return res
    },

    async fetchModules(params = {}) {
      this.loading = true
      try {
        const res = await moduleAPI.getModules(params)
        this.modules = res.list || res || []
        this.total = res.total || 0
        this.moduleTypes = res.types || []
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchModuleDetail(id) {
      return await moduleAPI.getModuleDetail(id)
    },

    async createManufacturer(data) {
      return await moduleAPI.createManufacturer(data)
    },

    async createModule(data) {
      return await moduleAPI.createModule(data)
    },

    async updateModule(id, data) {
      return await moduleAPI.updateModule(id, data)
    },

    async deleteModule(id) {
      return await moduleAPI.deleteModule(id)
    }
  }
})
