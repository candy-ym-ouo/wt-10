import { defineStore } from 'pinia'
import { authAPI, userAPI } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || ''
  }),

  getters: {
    isLoggedIn: (state) => {
      if (!state.token) return false
      if (state.user?.role === 'banned' || state.user?.role === 'suspended') return false
      return true
    },
    isAdmin: (state) => state.user?.role === 'admin',
    isBanned: (state) => state.user?.role === 'banned' || state.user?.role === 'suspended'
  },

  actions: {
    async login(data) {
      const res = await authAPI.login(data)
      if (res.user?.role === 'banned' || res.user?.role === 'suspended') {
        throw new Error(res.error || '您的账号已被封禁')
      }
      this.setToken(res.token)
      this.setUser(res.user)
      return res
    },

    async register(data) {
      const res = await authAPI.register(data)
      this.setToken(res.token)
      this.setUser(res.user)
      return res
    },

    async fetchCurrentUser() {
      if (!this.token) return null
      try {
        const res = await authAPI.getMe()
        if (res?.role === 'banned' || res?.role === 'suspended') {
          this.logout()
          return null
        }
        this.setUser(res)
        return res
      } catch (e) {
        this.logout()
        return null
      }
    },

    async updateProfile(data) {
      if (this.isBanned) {
        throw new Error('您的账号已被封禁，无法执行此操作')
      }
      const res = await authAPI.updateProfile(data)
      this.setUser(res)
      return res
    },

    async getUserProfile(id) {
      return await userAPI.getById(id)
    },

    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },

    setUser(user) {
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    initFromStorage() {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          if (parsed?.role === 'banned' || parsed?.role === 'suspended') {
            this.logout()
            return
          }
          this.user = parsed
        } catch (e) {
          localStorage.removeItem('user')
        }
      }
    }
  }
})
