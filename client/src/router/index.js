import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/patches',
    name: 'Patches',
    component: () => import('@/views/Patches.vue')
  },
  {
    path: '/patches/:id',
    name: 'PatchDetail',
    component: () => import('@/views/PatchDetail.vue')
  },
  {
    path: '/create',
    name: 'CreatePatch',
    component: () => import('@/views/CreatePatch.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/edit/:id',
    name: 'EditPatch',
    component: () => import('@/views/EditPatch.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/modules',
    name: 'Modules',
    component: () => import('@/views/Modules.vue')
  },
  {
    path: '/modules/:id',
    name: 'ModuleDetail',
    component: () => import('@/views/ModuleDetail.vue')
  },
  {
    path: '/compare',
    name: 'Compare',
    component: () => import('@/views/Compare.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/workbench',
    name: 'CreatorWorkbench',
    component: () => import('@/views/CreatorWorkbench.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-patches',
    name: 'MyPatches',
    component: () => import('@/views/MyPatches.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/Favorites.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users/:id',
    name: 'UserProfile',
    component: () => import('@/views/UserProfile.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/Users.vue')
      },
      {
        path: 'patches',
        name: 'AdminPatches',
        component: () => import('@/views/admin/AdminPatches.vue')
      },
      {
        path: 'modules',
        name: 'AdminModules',
        component: () => import('@/views/admin/AdminModules.vue')
      },
      {
        path: 'manufacturers',
        name: 'AdminManufacturers',
        component: () => import('@/views/admin/Manufacturers.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  userStore.initFromStorage()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/')
  } else if (to.meta.guest && userStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
