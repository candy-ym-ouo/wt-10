<template>
  <el-container class="admin-layout">
    <el-aside width="250px" class="admin-aside">
      <div class="admin-logo">
        <el-icon><Setting /></el-icon>
        <span>Patch Vault 后台</span>
      </div>
      <div class="role-badge" :class="roleClass">
        <span class="role-icon-emoji" v-if="userStore.isAdmin">👑</span>
        <span class="role-icon-emoji" v-else-if="userStore.isOperator">⚙️</span>
        <span class="role-icon-emoji" v-else-if="userStore.isAuditor">✅</span>
        <span>{{ userStore.roleLabel }}</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="admin-menu"
        router
        background-color="transparent"
        text-color="#a8b3cf"
        active-text-color="#8b5cf6"
      >
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.DASHBOARD_VIEW)" index="/admin">
          <el-icon><DataAnalysis /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.USER_VIEW)" index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.PATCH_VIEW)" index="/admin/patches">
          <el-icon><Document /></el-icon>
          <span>Patch 管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.PATCH_VIEW)" index="/admin/patch-versions">
          <el-icon><Clock /></el-icon>
          <span>版本审计</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.MODULE_VIEW)" index="/admin/modules">
          <el-icon><Box /></el-icon>
          <span>模块管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.ARTICLE_VIEW)" index="/admin/articles">
          <el-icon><Document /></el-icon>
          <span>专栏管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.MANUFACTURER_VIEW)" index="/admin/manufacturers">
          <el-icon><OfficeBuilding /></el-icon>
          <span>厂商管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.COLLECTION_VIEW)" index="/admin/collections">
          <el-icon><CollectionTag /></el-icon>
          <span>专题策展</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.ACTIVITY_VIEW)" index="/admin/activities">
          <el-icon><Present /></el-icon>
          <span>活动管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.CHALLENGE_VIEW)" index="/admin/challenge/seasons">
          <el-icon><Trophy /></el-icon>
          <span>挑战赛管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.CREATOR_VERIFICATION_VIEW)" index="/admin/creator-verifications">
          <el-icon><Medal /></el-icon>
          <span>创作者认证</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.DOWNLOAD_VIEW)" index="/admin/downloads">
          <el-icon><Folder /></el-icon>
          <span>资源审核</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.DOWNLOAD_RECORD_VIEW)" index="/admin/download-records">
          <el-icon><Histogram /></el-icon>
          <span>下载记录</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.REPORT_VIEW)" index="/admin/reports">
          <el-icon><PieChart /></el-icon>
          <span>数据报表</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.CONTENT_REPORT_VIEW)" index="/admin/reports/content">
          <el-icon><Warning /></el-icon>
          <span>内容举报</span>
        </el-menu-item>
        <el-sub-menu v-if="hasAnyEarningsPermission" index="earnings">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>收益管理</span>
          </template>
          <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.PRODUCT_VIEW)" index="/admin/products">
            <el-icon><Goods /></el-icon>
            <span>商品管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.ORDER_VIEW)" index="/admin/orders">
            <el-icon><ShoppingCart /></el-icon>
            <span>订单管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.WITHDRAWAL_VIEW)" index="/admin/withdrawals">
            <el-icon><Money /></el-icon>
            <span>提现管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu v-if="hasAnyOpenPlatformPermission" index="openPlatform">
          <template #title>
            <el-icon><Key /></el-icon>
            <span>开放平台</span>
          </template>
          <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.OPEN_PLATFORM_VIEW)" index="/admin/open-platform">
            <el-icon><Lock /></el-icon>
            <span>密钥管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.API_CALL_LOG_VIEW)" index="/admin/api-call-logs">
            <el-icon><Histogram /></el-icon>
            <span>调用记录</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.AUDIT_LOG_VIEW)" index="/admin/audit-logs">
          <el-icon><List /></el-icon>
          <span>操作审计</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.SEARCH_VIEW)" index="/admin/search">
          <el-icon><Search /></el-icon>
          <span>搜索运营</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.I18N_VIEW)" index="/admin/i18n">
          <span class="menu-icon-emoji">🌍</span>
          <span>国际化管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.hasPermission(PERMISSIONS.ACHIEVEMENT_VIEW)" index="/admin/achievements">
          <el-icon><Trophy /></el-icon>
          <span>成就体系</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <div class="header-left">
          <span class="welcome">欢迎回来，{{ userStore.user?.username }}</span>
          <el-tag :type="roleTagType" size="small" class="role-tag">
            {{ userStore.roleLabel }}
          </el-tag>
        </div>
        <div class="header-right">
          <LanguageSwitcher />
          <el-button @click="goFront">
            <el-icon><HomeFilled /></el-icon>
            前台首页
          </el-button>
          <el-button type="danger" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </el-header>
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Setting, DataAnalysis, User, Document, Box, 
  OfficeBuilding, HomeFilled, SwitchButton, CollectionTag, Present, Trophy, Medal,
  Folder, Histogram, PieChart, Warning, Goods, ShoppingCart, Money, Key, Lock,
  List, Search, Clock
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { PERMISSIONS, ROLES } from '@/constants/permissions'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const hasAnyEarningsPermission = computed(() => {
  return userStore.hasAnyPermission([
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.WITHDRAWAL_VIEW
  ])
})

const hasAnyOpenPlatformPermission = computed(() => {
  return userStore.hasAnyPermission([
    PERMISSIONS.OPEN_PLATFORM_VIEW,
    PERMISSIONS.API_CALL_LOG_VIEW
  ])
})

const roleClass = computed(() => {
  if (userStore.isAdmin) return 'role-admin'
  if (userStore.isOperator) return 'role-operator'
  if (userStore.isAuditor) return 'role-auditor'
  return ''
})

const roleTagType = computed(() => {
  if (userStore.isAdmin) return 'danger'
  if (userStore.isOperator) return 'warning'
  if (userStore.isAuditor) return 'success'
  return 'info'
})

const goFront = () => {
  router.push('/')
}

const logout = () => {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.admin-aside {
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.admin-logo {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.admin-logo .el-icon {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.role-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.role-icon-emoji {
  font-size: 1rem;
  line-height: 1;
}

.role-badge.role-admin {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.role-badge.role-operator {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.role-badge.role-auditor {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.admin-menu {
  border-right: none;
  flex: 1;
  padding: 0.5rem 0;
}

.admin-menu .el-menu-item {
  margin: 0.25rem 0.75rem;
  border-radius: 8px;
}

.admin-menu .el-menu-item:hover {
  background: var(--bg-hover);
}

.admin-menu .el-menu-item.is-active {
  background: var(--bg-hover);
}

.admin-menu .el-sub-menu :deep(.el-sub-menu__title) {
  margin: 0.25rem 0.75rem;
  border-radius: 8px;
}

.admin-menu .el-sub-menu :deep(.el-sub-menu__title:hover) {
  background: var(--bg-hover);
}

.admin-menu .el-sub-menu :deep(.el-menu-item) {
  margin: 0.125rem 0.75rem 0.125rem 1.5rem;
  padding-left: 1rem !important;
}

.menu-icon-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 16px;
  line-height: 1;
}

.admin-header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.welcome {
  color: var(--text-primary);
  font-weight: 500;
}

.role-tag {
  margin-left: 0.5rem;
}

.header-right {
  display: flex;
  gap: 0.75rem;
}

.admin-main {
  background: var(--bg-secondary);
  padding: 1.5rem;
  overflow-y: auto;
}
</style>
