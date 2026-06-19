import { defineStore } from 'pinia'
import { socialAPI } from '@/api'

export const useSocialStore = defineStore('social', {
  state: () => ({
    followingFeed: {
      list: [],
      total: 0,
      page: 1,
      limit: 12,
      loading: false
    },
    myFollowers: {
      list: [],
      total: 0,
      page: 1,
      limit: 20,
      loading: false
    },
    myFollowing: {
      list: [],
      total: 0,
      page: 1,
      limit: 20,
      loading: false
    },
    userFollowStatus: new Map()
  }),

  actions: {
    async followUser(userId) {
      try {
        const res = await socialAPI.followUser(userId)
        this.userFollowStatus.set(userId, res.following)
        return res
      } catch (e) {
        throw e
      }
    },

    async checkFollowStatus(userId) {
      if (this.userFollowStatus.has(userId)) {
        return { following: this.userFollowStatus.get(userId) }
      }
      try {
        const res = await socialAPI.checkFollowStatus(userId)
        this.userFollowStatus.set(userId, res.following)
        return res
      } catch (e) {
        return { following: false }
      }
    },

    async fetchFollowingFeed(params = {}) {
      this.followingFeed.loading = true
      try {
        const res = await socialAPI.getFollowingFeed(params)
        this.followingFeed = {
          ...this.followingFeed,
          ...res,
          list: params.page > 1 ? [...this.followingFeed.list, ...res.list] : res.list
        }
        return res
      } finally {
        this.followingFeed.loading = false
      }
    },

    async fetchMyFollowers(params = {}) {
      this.myFollowers.loading = true
      try {
        const res = await socialAPI.getMyFollowers(params)
        this.myFollowers = {
          ...this.myFollowers,
          ...res,
          list: params.page > 1 ? [...this.myFollowers.list, ...res.list] : res.list
        }
        return res
      } finally {
        this.myFollowers.loading = false
      }
    },

    async fetchMyFollowing(params = {}) {
      this.myFollowing.loading = true
      try {
        const res = await socialAPI.getMyFollowing(params)
        this.myFollowing = {
          ...this.myFollowing,
          ...res,
          list: params.page > 1 ? [...this.myFollowing.list, ...res.list] : res.list
        }
        return res
      } finally {
        this.myFollowing.loading = false
      }
    },

    async fetchUserFollowers(userId, params = {}) {
      return await socialAPI.getUserFollowers(userId, params)
    },

    async fetchUserFollowing(userId, params = {}) {
      return await socialAPI.getUserFollowing(userId, params)
    },

    clearFollowStatus(userId) {
      if (userId) {
        this.userFollowStatus.delete(userId)
      } else {
        this.userFollowStatus.clear()
      }
    },

    resetFeed() {
      this.followingFeed = {
        list: [],
        total: 0,
        page: 1,
        limit: 12,
        loading: false
      }
    }
  }
})
