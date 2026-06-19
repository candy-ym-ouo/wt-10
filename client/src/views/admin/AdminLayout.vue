<template>
  <el-container class="admin-layout">
    <el-aside width="250px" class="admin-aside">
      <div class="admin-logo">
        <el-icon><Setting /></el-icon>
        <span>Patch Vault 后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="admin-menu"
        router
        background-color="transparent"
        text-color="#a8b3cf"
        active-text-color="#8b5cf6"
      >
        <el-menu-item index="/admin">
          <el-icon><DataAnalysis /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/patches">
          <el-icon><Document /></el-icon>
          <span>Patch 管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/modules">
          <el-icon><Box /></el-icon>
          <span>模块管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/manufacturers">
          <el-icon><OfficeBuilding /></el-icon>
          <span>厂商管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/collections">
          <el-icon><CollectionTag /></el-icon>
          <span>专题策展</span>
        </el-menu-item>
        <el-menu-item index="/admin/activities">
          <el-icon><Present /></el-icon>
          <span>活动管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/challenge/seasons">
          <el-icon><Trophy /></el-icon>
          <span>挑战赛管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/creator-verifications">
          <el-icon><Medal /></el-icon>
          <span>创作者认证</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <div class="header-left">
          <span class="welcome">欢迎回来，{{ userStore.user?.username }}</span>
        </div>
        <div class="header-right">
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
  OfficeBuilding, HomeFilled, SwitchButton, CollectionTag, Present, Trophy, Medal
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

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

.admin-menu {
  border-right: none;
  flex: 1;
  padding: 1rem 0;
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

.admin-header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 60px;
}

.welcome {
  color: var(--text-primary);
  font-weight: 500;
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
