import { defineStore } from 'pinia'
import { authAPI, userAPI } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || ''
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin'
  },

  actions: {
    async login(data) {
      const res = await authAPI.login(data)
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
        const user = await authAPI.getMe()
        this.setUser(user)
        return user
      } catch (e) {
        this.logout()
        return null
      }
    },

    async updateProfile(data) {
      const user = await authAPI.updateProfile(data)
      this.setUser(user)
      return user
    },

    async getUserProfile(id) {
      return await userAPI.getProfile(id)
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
          this.user = JSON.parse(storedUser)
        } catch (e) {
          localStorage.removeItem('user')
        }
      }
    }
  }
})
