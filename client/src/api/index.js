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
  createManufacturer: (data) => api.post('/manufacturers', data),
  createModule: (data) => api.post('/modules', data),
  updateModule: (id, data) => api.put(`/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/modules/${id}`)
}

export const socialApi = {
  getMyFavorites: (params) => api.get('/me/favorites', { params }),
  getMyPatches: (params) => api.get('/me/patches', { params }),
  getCompareList: () => api.get('/compare'),
  addToCompare: (id) => api.post(`/compare/${id}`),
  removeFromCompare: (id) => api.delete(`/compare/${id}`),
  clearCompare: () => api.post('/compare/clear'),
  comparePatches: (ids) => api.get('/compare/result', { params: { ids } })
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
  getManufacturers: (params) => api.get('/admin/manufacturers', { params }),
  createManufacturer: (data) => api.post('/admin/manufacturers', data),
  updateManufacturer: (id, data) => api.put(`/admin/manufacturers/${id}`, data),
  deleteManufacturer: (id) => api.delete(`/admin/manufacturers/${id}`)
}

export const authAPI = authApi
export const userAPI = userApi
export const patchAPI = patchApi
export const moduleAPI = moduleApi
export const socialAPI = socialApi
export const adminAPI = adminApi
