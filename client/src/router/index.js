import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { PERMISSIONS } from '@/constants/permissions'

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
    path: '/collections',
    name: 'Collections',
    component: () => import('@/views/Collections.vue')
  },
  {
    path: '/collections/:id',
    name: 'CollectionDetail',
    component: () => import('@/views/CollectionDetail.vue')
  },
  {
    path: '/activities',
    name: 'Activities',
    component: () => import('@/views/Activities.vue')
  },
  {
    path: '/activities/:id',
    name: 'ActivityDetail',
    component: () => import('@/views/ActivityDetail.vue')
  },
  {
    path: '/challenge',
    name: 'ChallengeHome',
    component: () => import('@/views/ChallengeHome.vue')
  },
  {
    path: '/challenge/seasons/:id',
    name: 'ChallengeSeasonDetail',
    component: () => import('@/views/ChallengeSeasonDetail.vue')
  },
  {
    path: '/challenge/hall-of-fame',
    name: 'ChallengeHallOfFame',
    component: () => import('@/views/ChallengeHallOfFame.vue')
  },
  {
    path: '/compare',
    name: 'Compare',
    component: () => import('@/views/Compare.vue')
  },
  {
    path: '/patch-lab',
    name: 'PatchLab',
    component: () => import('@/views/PatchLab.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/workbench',
    name: 'CreatorWorkbench',
    component: () => import('@/views/CreatorWorkbench.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/creator-verification',
    name: 'CreatorVerification',
    component: () => import('@/views/CreatorVerification.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-patches',
    name: 'MyPatches',
    component: () => import('@/views/MyPatches.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-articles',
    name: 'MyArticles',
    component: () => import('@/views/MyArticles.vue'),
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
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/messages',
    name: 'MessageCenter',
    component: () => import('@/views/MessageCenter.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/feed',
    name: 'FollowingFeed',
    component: () => import('@/views/FollowingFeed.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users/:id',
    name: 'UserProfile',
    component: () => import('@/views/UserProfile.vue')
  },
  {
    path: '/downloads',
    name: 'DownloadCenter',
    component: () => import('@/views/DownloadCenter.vue')
  },
  {
    path: '/downloads/:id',
    name: 'DownloadDetail',
    component: () => import('@/views/DownloadDetail.vue')
  },
  {
    path: '/articles',
    name: 'Articles',
    component: () => import('@/views/Articles.vue')
  },
  {
    path: '/articles/create',
    name: 'CreateArticle',
    component: () => import('@/views/CreateArticle.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/articles/edit/:id',
    name: 'EditArticle',
    component: () => import('@/views/CreateArticle.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/articles/:id',
    name: 'ArticleDetail',
    component: () => import('@/views/ArticleDetail.vue')
  },
  {
    path: '/my-orders',
    name: 'MyOrders',
    component: () => import('@/views/MyOrders.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-permissions',
    name: 'MyPermissions',
    component: () => import('@/views/MyPermissions.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/creator-earnings',
    name: 'CreatorEarnings',
    component: () => import('@/views/CreatorEarnings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/search',
    name: 'SearchCenter',
    component: () => import('@/views/SearchCenter.vue')
  },
  {
    path: '/open-platform',
    name: 'OpenPlatform',
    component: () => import('@/views/OpenPlatform.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresStaff: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { permission: PERMISSIONS.DASHBOARD_VIEW }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/Users.vue'),
        meta: { permission: PERMISSIONS.USER_VIEW }
      },
      {
        path: 'patches',
        name: 'AdminPatches',
        component: () => import('@/views/admin/AdminPatches.vue'),
        meta: { permission: PERMISSIONS.PATCH_VIEW }
      },
      {
        path: 'patch-trash',
        name: 'AdminPatchTrash',
        component: () => import('@/views/admin/AdminPatchTrash.vue'),
        meta: { permission: PERMISSIONS.PATCH_VIEW }
      },
      {
        path: 'patch-versions',
        name: 'AdminPatchVersions',
        component: () => import('@/views/admin/AdminPatchVersions.vue'),
        meta: { permission: PERMISSIONS.PATCH_VIEW }
      },
      {
        path: 'modules',
        name: 'AdminModules',
        component: () => import('@/views/admin/AdminModules.vue'),
        meta: { permission: PERMISSIONS.MODULE_VIEW }
      },
      {
        path: 'articles',
        name: 'AdminArticles',
        component: () => import('@/views/admin/AdminArticles.vue'),
        meta: { permission: PERMISSIONS.ARTICLE_VIEW }
      },
      {
        path: 'modules/combinations',
        name: 'AdminModuleCombinations',
        component: () => import('@/views/admin/ModuleCombinations.vue'),
        meta: { permission: PERMISSIONS.MODULE_VIEW }
      },
      {
        path: 'modules/:id/combinations',
        name: 'AdminModuleCombinationsDetail',
        component: () => import('@/views/admin/ModuleCombinationsDetail.vue'),
        meta: { permission: PERMISSIONS.MODULE_VIEW }
      },
      {
        path: 'modules/:id/wiki',
        name: 'AdminModuleWiki',
        component: () => import('@/views/admin/ModuleWiki.vue'),
        meta: { permission: PERMISSIONS.MODULE_VIEW }
      },
      {
        path: 'manufacturers',
        name: 'AdminManufacturers',
        component: () => import('@/views/admin/Manufacturers.vue'),
        meta: { permission: PERMISSIONS.MANUFACTURER_VIEW }
      },
      {
        path: 'collections',
        name: 'AdminCollections',
        component: () => import('@/views/admin/AdminCollections.vue'),
        meta: { permission: PERMISSIONS.COLLECTION_VIEW }
      },
      {
        path: 'activities',
        name: 'AdminActivities',
        component: () => import('@/views/admin/AdminActivities.vue'),
        meta: { permission: PERMISSIONS.ACTIVITY_VIEW }
      },
      {
        path: 'challenge/seasons',
        name: 'AdminChallengeSeasons',
        component: () => import('@/views/admin/ChallengeSeasons.vue'),
        meta: { permission: PERMISSIONS.CHALLENGE_VIEW }
      },
      {
        path: 'creator-verifications',
        name: 'AdminCreatorVerifications',
        component: () => import('@/views/admin/CreatorVerifications.vue'),
        meta: { permission: PERMISSIONS.CREATOR_VERIFICATION_VIEW }
      },
      {
        path: 'downloads',
        name: 'AdminDownloadResources',
        component: () => import('@/views/admin/AdminDownloadResources.vue'),
        meta: { permission: PERMISSIONS.DOWNLOAD_VIEW }
      },
      {
        path: 'download-records',
        name: 'AdminDownloadRecords',
        component: () => import('@/views/admin/AdminDownloadRecords.vue'),
        meta: { permission: PERMISSIONS.DOWNLOAD_RECORD_VIEW }
      },
      {
        path: 'reports',
        name: 'AdminReports',
        component: () => import('@/views/admin/DataReport.vue'),
        meta: { permission: PERMISSIONS.REPORT_VIEW }
      },
      {
        path: 'reports/content',
        name: 'AdminContentReports',
        component: () => import('@/views/admin/ContentReports.vue'),
        meta: { permission: PERMISSIONS.CONTENT_REPORT_VIEW }
      },
      {
        path: 'products',
        name: 'AdminProducts',
        component: () => import('@/views/admin/AdminProducts.vue'),
        meta: { permission: PERMISSIONS.PRODUCT_VIEW }
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: () => import('@/views/admin/AdminOrders.vue'),
        meta: { permission: PERMISSIONS.ORDER_VIEW }
      },
      {
        path: 'withdrawals',
        name: 'AdminWithdrawals',
        component: () => import('@/views/admin/AdminWithdrawals.vue'),
        meta: { permission: PERMISSIONS.WITHDRAWAL_VIEW }
      },
      {
        path: 'open-platform',
        name: 'AdminOpenPlatform',
        component: () => import('@/views/admin/AdminOpenPlatform.vue'),
        meta: { permission: PERMISSIONS.OPEN_PLATFORM_VIEW }
      },
      {
        path: 'api-call-logs',
        name: 'AdminApiCallLogs',
        component: () => import('@/views/admin/AdminApiCallLogs.vue'),
        meta: { permission: PERMISSIONS.API_CALL_LOG_VIEW }
      },
      {
        path: 'audit-logs',
        name: 'AdminAuditLogs',
        component: () => import('@/views/admin/AdminAuditLogs.vue'),
        meta: { permission: PERMISSIONS.AUDIT_LOG_VIEW }
      },
      {
        path: 'social-actions',
        name: 'AdminSocialActions',
        component: () => import('@/views/admin/AdminSocialActions.vue'),
        meta: { permission: PERMISSIONS.SOCIAL_ACTION_VIEW }
      },
      {
        path: 'search',
        name: 'AdminSearch',
        component: () => import('@/views/admin/AdminSearch.vue'),
        meta: { permission: PERMISSIONS.SEARCH_VIEW }
      },
      {
        path: 'i18n',
        name: 'AdminI18n',
        component: () => import('@/views/admin/AdminTranslations.vue'),
        meta: { permission: PERMISSIONS.I18N_VIEW }
      },
      {
        path: 'achievements',
        name: 'AdminAchievements',
        component: () => import('@/views/admin/AdminAchievements.vue'),
        meta: { permission: PERMISSIONS.ACHIEVEMENT_VIEW }
      },
      {
        path: 'tags',
        name: 'AdminTags',
        component: () => import('@/views/admin/AdminTags.vue'),
        meta: { permission: PERMISSIONS.TAG_VIEW }
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
  } else if (to.meta.requiresStaff && !userStore.isStaff) {
    next('/')
  } else if (to.meta.permission && !userStore.hasPermission(to.meta.permission)) {
    next('/admin')
  } else if (to.meta.guest && userStore.isLoggedIn) {
    next('/')
  } else if (userStore.isBanned) {
    userStore.logout()
    alert('您的账号已被封禁，已退出登录')
    next('/login')
  } else {
    next()
  }
})

export default router
