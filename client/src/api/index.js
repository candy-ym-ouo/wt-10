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
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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
  toggleFavorite: (id, folder) => api.post(`/patches/${id}/favorite`, { folder })
}

export const moduleApi = {
  getManufacturers: (params) => api.get('/manufacturers', { params }),
  getModules: (params) => api.get('/modules', { params }),
  getModuleDetail: (id) => api.get(`/modules/${id}`),
  getModuleWiki: (id) => api.get(`/modules/${id}/wiki`),
  getModuleParameters: (id) => api.get(`/modules/${id}/parameters`),
  getModuleTips: (id) => api.get(`/modules/${id}/tips`),
  getRecommendedPatches: (id) => api.get(`/modules/${id}/recommended-patches`),
  createManufacturer: (data) => api.post('/manufacturers', data),
  createModule: (data) => api.post('/modules', data),
  updateModule: (id, data) => api.put(`/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/modules/${id}`)
}

export const socialApi = {
  getMyFavorites: (params) => api.get('/me/favorites', { params }),
  getMyPatches: (params) => api.get('/me/patches', { params }),
  getMyDrafts: (params) => api.get('/me/drafts', { params }),
  getCreatorStats: () => api.get('/me/stats'),
  getMyNotifications: (params) => api.get('/me/notifications', { params }),
  markNotificationRead: (id) => api.put(`/me/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/me/notifications/read-all'),
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
  reorderPatches: (id, orders) => api.put(`/admin/collections/${id}/reorder`, { orders })
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
