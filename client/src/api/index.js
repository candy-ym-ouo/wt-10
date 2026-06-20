import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const locale = localStorage.getItem('app_locale') || 'zh_cn'
  const headerLocale = locale.replace('_', '-')
  config.headers['Accept-Language'] = headerLocale
  config.headers['X-Locale'] = locale
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else if (error.response?.status === 403 && error.response?.data?.banned) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const data = error.response.data
      let message = data.error || '您的账号已被封禁'
      if (data.role === 'suspended' && data.suspended_until && !data.is_permanent) {
        const endTime = new Date(data.suspended_until).toLocaleString('zh-CN')
        message = `您的账号已被临时封禁，解封时间：${endTime}`
      } else if (data.role === 'banned') {
        message = '您的账号已被永久封禁'
      }
      alert(message)
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
}

export const userApi = {
  getById: (id) => api.get(`/users/${id}`)
}

export const patchApi = {
  getList: (params) => api.get('/patches', { params }),
  getDetail: (id) => api.get(`/patches/${id}`),
  create: (data) => api.post('/patches', data),
  update: (id, data) => api.put(`/patches/${id}`, data),
  delete: (id) => api.delete(`/patches/${id}`),
  addComment: (id, content) => api.post(`/patches/${id}/comments`, { content }),
  deleteComment: (id, commentId) => api.delete(`/patches/${id}/comments/${commentId}`),
  toggleLike: (id) => api.post(`/patches/${id}/like`),
  toggleFavorite: (id, folder) => api.post(`/patches/${id}/favorite`, { folder }),
  getVersions: (id, params) => api.get(`/patches/${id}/versions`, { params }),
  getVersionDetail: (id, versionId) => api.get(`/patches/${id}/versions/${versionId}`),
  getVersionDiff: (id, params) => api.get(`/patches/${id}/versions/diff`, { params }),
  rollbackVersion: (id, versionId) => api.post(`/patches/${id}/versions/${versionId}/rollback`)
}

export const moduleApi = {
  getManufacturers: (params) => api.get('/manufacturers', { params }),
  getModules: (params) => api.get('/modules', { params }),
  getModuleDetail: (id) => api.get(`/modules/${id}`),
  getModuleWiki: (id) => api.get(`/modules/${id}/wiki`),
  getModuleParameters: (id) => api.get(`/modules/${id}/parameters`),
  getModuleTips: (id) => api.get(`/modules/${id}/tips`),
  getRecommendedPatches: (id) => api.get(`/modules/${id}/recommended-patches`),
  getRecommendedCombinations: (id, params) => api.get(`/modules/${id}/recommended-combinations`, { params }),
  getCombinationPatches: (id, pairedId, params) => api.get(`/modules/${id}/combination-patches/${pairedId}`, { params }),
  getModuleCombinationStats: (id) => api.get(`/modules/${id}/combination-stats`),
  getPopularCombinations: (params) => api.get('/modules/combinations/popular', { params }),
  createManufacturer: (data) => api.post('/manufacturers', data),
  createModule: (data) => api.post('/modules', data),
  updateModule: (id, data) => api.put(`/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/modules/${id}`)
}

export const socialApi = {
  getMyFavorites: (params) => api.get('/me/favorites', { params }),
  getMyPatches: (params) => api.get('/me/patches', { params }),
  getMyDrafts: (params) => api.get('/me/drafts', { params }),
  getMyScheduled: (params) => api.get('/me/scheduled', { params }),
  getCreatorStats: () => api.get('/me/stats'),
  getMyNotifications: (params) => api.get('/me/notifications', { params }),
  markNotificationRead: (id) => api.put(`/me/notifications/${id}/read`),
  markAllNotificationsRead: (data) => api.post('/me/notifications/read-all', data || {}),
  markBatchNotificationsRead: (ids) => api.post('/me/notifications/read-batch', { ids }),
  deleteNotification: (id) => api.delete(`/me/notifications/${id}`),
  deleteBatchNotifications: (ids) => api.post('/me/notifications/delete-batch', { ids }),
  clearReadNotifications: (data) => api.post('/me/notifications/clear-read', data || {}),
  getNotificationSubscriptions: () => api.get('/me/notification-subscriptions'),
  updateNotificationSubscription: (category, enabled) => api.put('/me/notification-subscriptions', { category, enabled }),
  updateNotificationSubscriptionsBatch: (subscriptions) => api.put('/me/notification-subscriptions/batch', { subscriptions }),
  getCompareList: () => api.get('/compare'),
  addToCompare: (id) => api.post(`/compare/${id}`),
  removeFromCompare: (id) => api.delete(`/compare/${id}`),
  clearCompare: () => api.post('/compare/clear'),
  comparePatches: (ids) => api.get('/compare/result', { params: { ids } }),
  
  followUser: (userId) => api.post(`/users/${userId}/follow`),
  checkFollowStatus: (userId) => api.get(`/users/${userId}/follow-status`),
  getUserFollowers: (userId, params) => api.get(`/users/${userId}/followers`, { params }),
  getUserFollowing: (userId, params) => api.get(`/users/${userId}/following`, { params }),
  
  getMyFollowers: (params) => api.get('/me/followers', { params }),
  getMyFollowing: (params) => api.get('/me/following', { params }),
  getFollowingFeed: (params) => api.get('/me/feed', { params })
}

export const collectionApi = {
  getCollections: (params) => api.get('/collections', { params }),
  getDetail: (id) => api.get(`/collections/${id}`)
}

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getRecentUsers: () => api.get('/admin/users/recent'),
  getRecentPatches: () => api.get('/admin/patches/recent'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPatches: (params) => api.get('/admin/patches', { params }),
  updatePatchStatus: (id, status) => api.put(`/admin/patches/${id}/status`, { status }),
  togglePatchPublic: (id, is_public) => api.put(`/admin/patches/${id}/public`, { is_public }),
  deletePatch: (id) => api.delete(`/admin/patches/${id}`),
  getModules: (params) => api.get('/admin/modules', { params }),
  createModule: (data) => api.post('/admin/modules', data),
  updateModule: (id, data) => api.put(`/admin/modules/${id}`, data),
  getModuleWiki: (id) => api.get(`/admin/modules/${id}/wiki`),
  saveModuleWiki: (id, data) => api.post(`/admin/modules/${id}/wiki`, data),
  createParameter: (moduleId, data) => api.post(`/admin/modules/${moduleId}/parameters`, data),
  updateParameter: (moduleId, paramId, data) => api.put(`/admin/modules/${moduleId}/parameters/${paramId}`, data),
  deleteParameter: (moduleId, paramId) => api.delete(`/admin/modules/${moduleId}/parameters/${paramId}`),
  reorderParameters: (moduleId, orders) => api.put(`/admin/modules/${moduleId}/parameters/reorder`, { orders }),
  createTip: (moduleId, data) => api.post(`/admin/modules/${moduleId}/tips`, data),
  updateTip: (moduleId, tipId, data) => api.put(`/admin/modules/${moduleId}/tips/${tipId}`, data),
  deleteTip: (moduleId, tipId) => api.delete(`/admin/modules/${moduleId}/tips/${tipId}`),
  reorderTips: (moduleId, orders) => api.put(`/admin/modules/${moduleId}/tips/reorder`, { orders }),
  addRecommendedPatch: (moduleId, data) => api.post(`/admin/modules/${moduleId}/recommended-patches`, data),
  updateRecommendedPatch: (moduleId, recId, data) => api.put(`/admin/modules/${moduleId}/recommended-patches/${recId}`, data),
  removeRecommendedPatch: (moduleId, recId) => api.delete(`/admin/modules/${moduleId}/recommended-patches/${recId}`),
  reorderRecommendedPatches: (moduleId, orders) => api.put(`/admin/modules/${moduleId}/recommended-patches/reorder`, { orders }),
  searchPatches: (keyword) => api.get('/admin/patches/search', { params: { keyword } }),
  getPatchVersions: (params) => api.get('/admin/patches/versions', { params }),
  getManufacturers: (params) => api.get('/admin/manufacturers', { params }),
  createManufacturer: (data) => api.post('/admin/manufacturers', data),
  updateManufacturer: (id, data) => api.put(`/admin/manufacturers/${id}`, data),
  deleteManufacturer: (id) => api.delete(`/admin/manufacturers/${id}`),
  getCollections: (params) => api.get('/admin/collections', { params }),
  createCollection: (data) => api.post('/admin/collections', data),
  updateCollection: (id, data) => api.put(`/admin/collections/${id}`, data),
  deleteCollection: (id) => api.delete(`/admin/collections/${id}`),
  reorderCollections: (orders) => api.put('/admin/collections/reorder', { orders }),
  addPatchToCollection: (id, data) => api.post(`/admin/collections/${id}/patches`, data),
  updatePatchNote: (id, patchId, note) => api.put(`/admin/collections/${id}/patches/${patchId}`, { note }),
  removePatchFromCollection: (id, patchId) => api.delete(`/admin/collections/${id}/patches/${patchId}`),
  reorderPatches: (id, orders) => api.put(`/admin/collections/${id}/reorder`, { orders }),
  getCombinationStatsList: (params) => api.get('/admin/modules/combinations/stats', { params }),
  getModuleCombinations: (id) => api.get(`/admin/modules/${id}/combinations`),
  addModuleCombination: (id, data) => api.post(`/admin/modules/${id}/combinations`, data),
  updateModuleCombination: (comboId, data) => api.put(`/admin/modules/combinations/${comboId}`, data),
  removeModuleCombination: (comboId) => api.delete(`/admin/modules/combinations/${comboId}`),
  reorderModuleCombinations: (id, orders) => api.put(`/admin/modules/${id}/combinations/reorder`, { orders }),
  recalculateCombinations: () => api.post('/admin/modules/combinations/recalculate'),
  getCombinationConfig: () => api.get('/admin/modules/combinations/config'),
  updateCombinationConfig: (data) => api.put('/admin/modules/combinations/config', data),
  batchUpdateCombinationConfig: (data) => api.post('/admin/modules/combinations/config/batch', data)
}

export const authAPI = authApi
export const userAPI = userApi
export const patchAPI = patchApi
export const moduleAPI = moduleApi
export const socialAPI = socialApi
export const activityApi = {
  getActivities: (params) => api.get('/activities', { params }),
  getDetail: (id) => api.get(`/activities/${id}`),
  getSubmissions: (id, params) => api.get(`/activities/${id}/submissions`, { params }),
  getRankings: (id, params) => api.get(`/activities/${id}/rankings`, { params }),
  register: (id, data) => api.post(`/activities/${id}/register`, data),
  cancelRegistration: (id) => api.delete(`/activities/${id}/register`),
  submitWork: (id, data) => api.post(`/activities/${id}/submit`, data),
  getSubmissionDetail: (id) => api.get(`/activities/submissions/${id}`),
  voteSubmission: (id) => api.post(`/activities/submissions/${id}/vote`),
  getMyRegistrations: (params) => api.get('/me/activities/registrations', { params }),
  getMySubmissions: (params) => api.get('/me/activities/submissions', { params })
}

export const adminActivityApi = {
  getActivities: (params) => api.get('/admin/activities', { params }),
  createActivity: (data) => api.post('/admin/activities', data),
  updateActivity: (id, data) => api.put(`/admin/activities/${id}`, data),
  deleteActivity: (id) => api.delete(`/admin/activities/${id}`),
  getRegistrations: (id, params) => api.get(`/admin/activities/${id}/registrations`, { params }),
  updateRegistrationStatus: (id, status) => api.put(`/admin/activities/registrations/${id}/status`, { status }),
  getSubmissions: (id, params) => api.get(`/admin/activities/${id}/submissions`, { params }),
  reviewSubmission: (id, data) => api.put(`/admin/activities/submissions/${id}/review`, data),
  deleteSubmission: (id) => api.delete(`/admin/activities/submissions/${id}`)
}

export const adminAPI = adminApi
export const collectionAPI = collectionApi
export const activityAPI = activityApi
export const adminActivityAPI = adminActivityApi

export const challengeApi = {
  getSeasons: (params) => api.get('/challenge/seasons', { params }),
  getSeasonDetail: (id) => api.get(`/challenge/seasons/${id}`),
  getSeasonOverview: (id) => api.get(`/challenge/seasons/${id}/overview`),
  getVotingRule: (params) => api.get('/challenge/voting-rule', { params }),
  getAwards: (params) => api.get('/challenge/awards', { params }),
  getJury: (params) => api.get('/challenge/jury', { params }),
  getWinners: (params) => api.get('/challenge/winners', { params }),
  getRankings: (params) => api.get('/challenge/rankings', { params }),
  getSnapshots: (params) => api.get('/challenge/snapshots', { params }),
  enhancedVote: (id, data) => api.post(`/challenge/submissions/${id}/vote`, data),
  submitJuryScore: (id, data) => api.post(`/challenge/submissions/${id}/jury-score`, data),
  getPendingJuryReviews: (params) => api.get('/challenge/jury/pending', { params })
}

export const adminChallengeApi = {
  getSeasons: (params) => api.get('/admin/challenge/seasons', { params }),
  createSeason: (data) => api.post('/admin/challenge/seasons', data),
  updateSeason: (id, data) => api.put(`/admin/challenge/seasons/${id}`, data),
  deleteSeason: (id) => api.delete(`/admin/challenge/seasons/${id}`),
  saveVotingRule: (data) => api.post('/admin/challenge/voting-rule', data),
  saveAwards: (data) => api.post('/admin/challenge/awards', data),
  manageJury: (action, data) => api.post(`/admin/challenge/jury/${action}`, data),
  calculateRankings: (id, data) => api.post(`/admin/challenge/activities/${id}/calculate-rankings`, data),
  publishResults: (id, data) => api.post(`/admin/challenge/activities/${id}/publish-results`, data),
  assignWinner: (data) => api.post('/admin/challenge/winners/assign', data)
}

export const challengeAPI = challengeApi
export const adminChallengeAPI = adminChallengeApi

export const creatorVerificationApi = {
  submit: (data) => api.post('/creator/verification', data),
  getStatus: () => api.get('/creator/verification/status'),
  getHistory: () => api.get('/creator/verification/history'),
  getUserBadge: (userId) => api.get(`/users/${userId}/verification-badge`)
}

export const adminCreatorVerificationApi = {
  getList: (params) => api.get('/admin/creator-verifications', { params }),
  getDetail: (id) => api.get(`/admin/creator-verifications/${id}`),
  review: (id, data) => api.put(`/admin/creator-verifications/${id}/review`, data)
}

export const creatorVerificationAPI = creatorVerificationApi
export const adminCreatorVerificationAPI = adminCreatorVerificationApi

export const downloadApi = {
  getStats: () => api.get('/downloads/stats'),
  getList: (params) => api.get('/downloads', { params }),
  getDetail: (id) => api.get(`/downloads/${id}`),
  upload: (formData) => api.post('/downloads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDownloadUrl: (id) => `/api/downloads/${id}/download`,
  getMyResources: (params) => api.get('/me/downloads', { params }),
  deleteMyResource: (id) => api.delete(`/me/downloads/${id}`),
  getMyDownloadRecords: (params) => api.get('/me/download-records', { params })
}

export const adminDownloadApi = {
  getResources: (params) => api.get('/admin/downloads', { params }),
  reviewResource: (id, data) => api.put(`/admin/downloads/${id}/review`, data),
  deleteResource: (id) => api.delete(`/admin/downloads/${id}`),
  getDownloadRecords: (params) => api.get('/admin/download-records', { params })
}

export const adminReportApi = {
  getOverview: (params) => api.get('/admin/reports/overview', { params }),
  getUserStats: (params) => api.get('/admin/reports/users', { params }),
  getPatchStats: (params) => api.get('/admin/reports/patches', { params }),
  getModuleStats: (params) => api.get('/admin/reports/modules', { params }),
  getManufacturerStats: (params) => api.get('/admin/reports/manufacturers', { params }),
  getExportUrl: (type, format = 'csv', params = {}) => {
    const token = localStorage.getItem('token')
    const searchParams = new URLSearchParams()
    searchParams.append('type', type)
    searchParams.append('format', format)
    if (token) searchParams.append('token', token)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value)
      }
    })
    return `/api/admin/reports/export?${searchParams.toString()}`
  }
}

export const contentReportApi = {
  getCategories: () => api.get('/report/categories'),
  createReport: (data) => api.post('/reports', data),
  getMyReports: (params) => api.get('/me/reports', { params })
}

export const adminContentReportApi = {
  getList: (params) => api.get('/admin/reports/content', { params }),
  getDetail: (id) => api.get(`/admin/reports/content/${id}`),
  handleReport: (id, data) => api.put(`/admin/reports/content/${id}`, data),
  batchHandle: (data) => api.post('/admin/reports/content/batch', data)
}

export const downloadAPI = downloadApi
export const adminDownloadAPI = adminDownloadApi
export const adminReportAPI = adminReportApi
export const contentReportAPI = contentReportApi
export const adminContentReportAPI = adminContentReportApi

export const productApi = {
  getList: (params) => api.get('/products', { params }),
  getDetail: (id) => api.get(`/products/${id}`),
  getByPatchId: (patchId) => api.get(`/products/patch/${patchId}`)
}

export const adminProductApi = {
  getList: (params) => api.get('/admin/products', { params }),
  getDetail: (id) => api.get(`/admin/products/${id}`),
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  delete: (id) => api.delete(`/admin/products/${id}`),
  toggleActive: (id, is_active) => api.put(`/admin/products/${id}/active`, { is_active })
}

export const orderApi = {
  getMyOrders: (params) => api.get('/me/orders', { params }),
  getMyOrderDetail: (id) => api.get(`/me/orders/${id}`),
  create: (data) => api.post('/orders', data),
  checkPermission: (patchId) => api.get(`/patches/${patchId}/permission`),
  getMyPermissions: (params) => api.get('/me/permissions', { params })
}

export const adminOrderApi = {
  getList: (params) => api.get('/admin/orders', { params }),
  getStats: () => api.get('/admin/orders/stats')
}

export const earningsApi = {
  getMyEarnings: (params) => api.get('/me/earnings', { params }),
  getEarningsOverview: () => api.get('/me/earnings/overview'),
  createWithdrawal: (data) => api.post('/me/withdrawals', data),
  getMyWithdrawals: (params) => api.get('/me/withdrawals', { params })
}

export const adminEarningsApi = {
  getStats: () => api.get('/admin/earnings/stats'),
  getWithdrawals: (params) => api.get('/admin/withdrawals', { params }),
  reviewWithdrawal: (id, data) => api.put(`/admin/withdrawals/${id}/review`, data)
}

export const productAPI = productApi
export const adminProductAPI = adminProductApi
export const orderAPI = orderApi
export const adminOrderAPI = adminOrderApi
export const earningsAPI = earningsApi
export const adminEarningsAPI = adminEarningsApi

export const articleApi = {
  getList: (params) => api.get('/articles', { params }),
  getDetail: (id) => api.get(`/articles/${id}`),
  getModuleRefs: (id) => api.get(`/articles/${id}/module-refs`),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  toggleLike: (id) => api.post(`/articles/${id}/like`),
  toggleFavorite: (id, folder) => api.post(`/articles/${id}/favorite`, { folder }),
  addComment: (id, content, parentId) => api.post(`/articles/${id}/comments`, { content, parent_id: parentId }),
  deleteComment: (id, commentId) => api.delete(`/articles/${id}/comments/${commentId}`),
  getMyArticles: (params) => api.get('/me/articles', { params })
}

export const adminArticleApi = {
  getList: (params) => api.get('/admin/articles', { params }),
  getDetail: (id) => api.get(`/admin/articles/${id}`),
  review: (id, data) => api.put(`/admin/articles/${id}/review`, data),
  togglePublic: (id, is_public) => api.put(`/admin/articles/${id}/public`, { is_public }),
  delete: (id) => api.delete(`/admin/articles/${id}`)
}

export const articleAPI = articleApi
export const adminArticleAPI = adminArticleApi

export const openPlatformApi = {
  getScopes: () => api.get('/open-platform/scopes'),
  getMyKeys: (params) => api.get('/me/api-keys', { params }),
  createKey: (data) => api.post('/me/api-keys', data),
  updateKey: (id, data) => api.put(`/me/api-keys/${id}`, data),
  deleteKey: (id) => api.delete(`/me/api-keys/${id}`),
  generateToken: (data) => api.post('/open-platform/token', data),
  getMyCallLogs: (params) => api.get('/me/api-call-logs', { params }),
  getCallStats: (params) => api.get('/me/api-call-stats', { params })
}

export const adminOpenPlatformApi = {
  getAllKeys: (params) => api.get('/admin/api-keys', { params }),
  getKeyDetail: (id) => api.get(`/admin/api-keys/${id}`),
  banKey: (id, data) => api.post(`/admin/api-keys/${id}/ban`, data),
  unbanKey: (id) => api.post(`/admin/api-keys/${id}/unban`),
  updateRateLimit: (id, data) => api.put(`/admin/api-keys/${id}/rate-limit`, data),
  getCallLogs: (params) => api.get('/admin/api-call-logs', { params }),
  getPlatformStats: (params) => api.get('/admin/open-platform/stats', { params })
}

export const openPlatformAPI = openPlatformApi
export const adminOpenPlatformAPI = adminOpenPlatformApi

export const adminRolesApi = {
  getRoles: () => api.get('/admin/roles')
}

export const adminAuditLogApi = {
  getList: (params) => api.get('/admin/audit-logs', { params }),
  getDetail: (id) => api.get(`/admin/audit-logs/${id}`)
}

export const adminRolesAPI = adminRolesApi
export const adminAuditLogAPI = adminAuditLogApi

export const patchLabApi = {
  getMyExperiments: (params) => api.get('/me/lab/experiments', { params }),
  getStats: () => api.get('/me/lab/experiments/stats'),
  getDetail: (id) => api.get(`/me/lab/experiments/${id}`),
  create: (data) => api.post('/me/lab/experiments', data),
  update: (id, data) => api.put(`/me/lab/experiments/${id}`, data),
  delete: (id) => api.delete(`/me/lab/experiments/${id}`),
  createSnapshot: (id, data) => api.post(`/me/lab/experiments/${id}/snapshots`, data),
  updateSnapshot: (id, snapshotId, data) => api.put(`/me/lab/experiments/${id}/snapshots/${snapshotId}`, data),
  deleteSnapshot: (id, snapshotId) => api.delete(`/me/lab/experiments/${id}/snapshots/${snapshotId}`),
  saveResult: (id, data) => api.post(`/me/lab/experiments/${id}/result`, data)
}

export const patchLabAPI = patchLabApi

export const searchApi = {
  globalSearch: (params) => api.get('/search', { params }),
  getHotQueries: (params) => api.get('/search/hot', { params }),
  getSearchAds: (params) => api.get('/search/ads', { params }),
  getSuggestions: (params) => api.get('/search/suggest', { params }),
  getMyHistory: (params) => api.get('/me/search-history', { params }),
  clearMyHistory: () => api.delete('/me/search-history')
}

export const adminSearchApi = {
  getHotQueries: (params) => api.get('/admin/search/hot-queries', { params }),
  createHotQuery: (data) => api.post('/admin/search/hot-queries', data),
  updateHotQuery: (id, data) => api.put(`/admin/search/hot-queries/${id}`, data),
  deleteHotQuery: (id) => api.delete(`/admin/search/hot-queries/${id}`),
  getAdPlacements: (params) => api.get('/admin/search/ad-placements', { params }),
  createAdPlacement: (data) => api.post('/admin/search/ad-placements', data),
  updateAdPlacement: (id, data) => api.put(`/admin/search/ad-placements/${id}`, data),
  deleteAdPlacement: (id) => api.delete(`/admin/search/ad-placements/${id}`)
}

export const searchAPI = searchApi
export const adminSearchAPI = adminSearchApi

export const i18nApi = {
  getTranslations: (params) => api.get('/i18n/translations', { params }),
  getCategories: () => api.get('/i18n/categories'),
  syncTranslations: (data) => api.post('/i18n/sync', data || {}),
  exportTranslations: (params) => api.get('/i18n/export', { params }),
  adminGetList: (params) => api.get('/admin/i18n', { params }),
  adminGetById: (id) => api.get(`/admin/i18n/${id}`),
  adminCreate: (data) => api.post('/admin/i18n', data),
  adminUpdate: (id, data) => api.put(`/admin/i18n/${id}`, data),
  adminDelete: (id) => api.delete(`/admin/i18n/${id}`),
  adminToggleActive: (id, is_active) => api.put(`/admin/i18n/${id}/active`, { is_active }),
  adminBatchImport: (data) => api.post('/admin/i18n/batch-import', data)
}

export const i18nAPI = i18nApi
