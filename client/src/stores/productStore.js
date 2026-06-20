import { defineStore } from 'pinia'
import { productAPI, adminProductAPI, orderAPI, earningsAPI, adminOrderAPI, adminEarningsAPI } from '@/api'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    productsTotal: 0,
    currentProduct: null,
    patchProduct: null,
    myOrders: [],
    myOrdersTotal: 0,
    myOrderDetail: null,
    myPermissions: [],
    myPermissionsTotal: 0,
    permission: null,
    myEarnings: [],
    myEarningsTotal: 0,
    myEarningsStats: null,
    earningsOverview: null,
    myWithdrawals: [],
    myWithdrawalsTotal: 0,
    availableBalance: 0,
    adminOrders: [],
    adminOrdersTotal: 0,
    adminOrderStats: null,
    adminEarningsStats: null,
    adminWithdrawals: [],
    adminWithdrawalsTotal: 0,
    adminWithdrawalStats: null
  }),

  actions: {
    async getProducts(params) {
      const res = await productAPI.getList(params)
      this.products = res.list || res || []
      this.productsTotal = res.total || 0
      return res
    },

    async getProductDetail(id) {
      const res = await productAPI.getDetail(id)
      this.currentProduct = res
      return res
    },

    async getProductByPatchId(patchId) {
      const res = await productAPI.getByPatchId(patchId)
      this.patchProduct = res
      return res
    },

    async createProduct(data) {
      const res = await adminProductAPI.create(data)
      return res
    },

    async updateProduct(id, data) {
      const res = await adminProductAPI.update(id, data)
      return res
    },

    async deleteProduct(id) {
      const res = await adminProductAPI.delete(id)
      return res
    },

    async toggleProductActive(id, is_active) {
      const res = await adminProductAPI.toggleActive(id, is_active)
      return res
    },

    async getMyOrders(params) {
      const res = await orderAPI.getMyOrders(params)
      this.myOrders = res.list || res || []
      this.myOrdersTotal = res.total || 0
      return res
    },

    async getMyOrderDetail(id) {
      const res = await orderAPI.getMyOrderDetail(id)
      this.myOrderDetail = res
      return res
    },

    async createOrder(data) {
      const res = await orderAPI.create(data)
      return res
    },

    async checkPermission(patchId) {
      const res = await orderAPI.checkPermission(patchId)
      this.permission = res
      return res
    },

    async getMyPermissions(params) {
      const res = await orderAPI.getMyPermissions(params)
      this.myPermissions = res.list || res || []
      this.myPermissionsTotal = res.total || 0
      return res
    },

    async getMyEarnings(params) {
      const res = await earningsAPI.getMyEarnings(params)
      this.myEarnings = res.list || res || []
      this.myEarningsTotal = res.total || 0
      this.myEarningsStats = res.stats
      return res
    },

    async getEarningsOverview() {
      const res = await earningsAPI.getEarningsOverview()
      this.earningsOverview = res
      return res
    },

    async createWithdrawal(data) {
      const res = await earningsAPI.createWithdrawal(data)
      return res
    },

    async getMyWithdrawals(params) {
      const res = await earningsAPI.getMyWithdrawals(params)
      this.myWithdrawals = res.list || res || []
      this.myWithdrawalsTotal = res.total || 0
      this.availableBalance = res.available_balance || 0
      return res
    },

    async getAdminOrders(params) {
      const res = await adminOrderAPI.getList(params)
      this.adminOrders = res.list || res || []
      this.adminOrdersTotal = res.total || 0
      this.adminOrderStats = res.stats
      return res
    },

    async getAdminOrderStats() {
      const res = await adminOrderAPI.getStats()
      this.adminOrderStats = res
      return res
    },

    async getAdminEarningsStats() {
      const res = await adminEarningsAPI.getStats()
      this.adminEarningsStats = res
      return res
    },

    async getAdminWithdrawals(params) {
      const res = await adminEarningsAPI.getWithdrawals(params)
      this.adminWithdrawals = res.list || res || []
      this.adminWithdrawalsTotal = res.total || 0
      this.adminWithdrawalStats = res.stats
      return res
    },

    async reviewWithdrawal(id, data) {
      const res = await adminEarningsAPI.reviewWithdrawal(id, data)
      return res
    }
  }
})
