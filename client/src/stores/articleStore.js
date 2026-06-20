import { defineStore } from 'pinia'
import { articleAPI, adminArticleAPI } from '@/api'

export const useArticleStore = defineStore('article', {
  state: () => ({
    articles: [],
    total: 0,
    loading: false,
    currentArticle: null,
    myArticles: [],
    myArticlesTotal: 0
  }),

  actions: {
    async fetchArticles(params = {}) {
      this.loading = true
      try {
        const res = await articleAPI.getList(params)
        this.articles = res.list || []
        this.total = res.total || 0
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchArticleDetail(id) {
      const res = await articleAPI.getDetail(id)
      this.currentArticle = res
      return res
    },

    async createArticle(data) {
      return await articleAPI.create(data)
    },

    async updateArticle(id, data) {
      return await articleAPI.update(id, data)
    },

    async deleteArticle(id) {
      return await articleAPI.delete(id)
    },

    async toggleLike(id) {
      return await articleAPI.toggleLike(id)
    },

    async toggleFavorite(id, folder = 'default') {
      return await articleAPI.toggleFavorite(id, folder)
    },

    async addComment(id, content, parentId = 0) {
      return await articleAPI.addComment(id, content, parentId)
    },

    async deleteComment(articleId, commentId) {
      return await articleAPI.deleteComment(articleId, commentId)
    },

    async fetchMyArticles(params = {}) {
      this.loading = true
      try {
        const res = await articleAPI.getMyArticles(params)
        this.myArticles = res.list || []
        this.myArticlesTotal = res.total || 0
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchModuleRefs(id) {
      return await articleAPI.getModuleRefs(id)
    },

    async adminFetchArticles(params = {}) {
      this.loading = true
      try {
        const res = await adminArticleAPI.getList(params)
        this.articles = res.list || []
        this.total = res.total || 0
        return res
      } finally {
        this.loading = false
      }
    },

    async adminFetchArticleDetail(id) {
      return await adminArticleAPI.getDetail(id)
    },

    async adminReviewArticle(id, data) {
      return await adminArticleAPI.review(id, data)
    },

    async adminTogglePublic(id, isPublic) {
      return await adminArticleAPI.togglePublic(id, isPublic)
    },

    async adminDeleteArticle(id) {
      return await adminArticleAPI.delete(id)
    }
  }
})
