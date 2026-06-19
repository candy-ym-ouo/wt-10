<template>
  <header class="app-header">
    <div class="header-content">
      <router-link to="/" class="logo">
        <span class="logo-icon">🎛️</span>
        <span class="logo-text">Patch Vault</span>
      </router-link>

      <nav class="nav-links">
        <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
          <el-icon><HomeFilled /></el-icon>
          首页
        </router-link>
        <router-link to="/patches" class="nav-link" :class="{ active: $route.path.startsWith('/patches') && $route.path !== '/patches/new' }">
          <el-icon><Collection /></el-icon>
          Patch 库
        </router-link>
        <router-link to="/modules" class="nav-link" :class="{ active: $route.path.startsWith('/modules') }">
          <el-icon><Cpu /></el-icon>
          设备库
        </router-link>
        <router-link to="/collections" class="nav-link" :class="{ active: $route.path.startsWith('/collections') }">
          <el-icon><CollectionTag /></el-icon>
          专题策展
        </router-link>
        <router-link v-if="userStore.isLoggedIn" to="/compare" class="nav-link" :class="{ active: $route.path === '/compare' }">
          <el-icon><DataAnalysis /></el-icon>
          参数对比
          <span v-if="patchStore.compareCount > 0" class="badge">{{ patchStore.compareCount }}</span>
        </router-link>
        <router-link v-if="userStore.isLoggedIn" to="/workbench" class="nav-link" :class="{ active: $route.path === '/workbench' }">
          <el-icon><Odometer /></el-icon>
          工作台
        </router-link>
      </nav>

      <div class="header-right">
        <el-button 
          v-if="userStore.isLoggedIn" 
          type="primary" 
          @click="$router.push('/create')"
          class="btn-primary"
        >
          <el-icon><Plus /></el-icon>
          发布 Patch
        </el-button>

        <el-dropdown v-if="userStore.isLoggedIn" @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="32" :src="userStore.user?.avatar">
              {{ userStore.user?.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="username">{{ userStore.user?.username }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="workbench">
                <el-icon><Odometer /></el-icon>创作者工作台
              </el-dropdown-item>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>个人中心
              </el-dropdown-item>
              <el-dropdown-item command="my-patches">
                <el-icon><Document /></el-icon>我的 Patch
              </el-dropdown-item>
              <el-dropdown-item command="favorites">
                <el-icon><Star /></el-icon>我的收藏
              </el-dropdown-item>
              <el-dropdown-item v-if="userStore.isAdmin" command="admin">
                <el-icon><Setting /></el-icon>后台管理
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <div v-else class="auth-buttons">
          <el-button @click="$router.push('/login')">登录</el-button>
          <el-button type="primary" @click="$router.push('/register')" class="btn-primary">注册</el-button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  HomeFilled, Collection, Cpu, DataAnalysis, Plus, 
  ArrowDown, User, Document, Star, Setting, SwitchButton,
  Odometer, CollectionTag
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'

const router = useRouter()
const userStore = useUserStore()
const patchStore = usePatchStore()

const handleCommand = (command) => {
  switch (command) {
    case 'workbench':
      router.push('/workbench')
      break
    case 'profile':
      router.push('/profile')
      break
    case 'my-patches':
      router.push('/my-patches')
      break
    case 'favorites':
      router.push('/favorites')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      userStore.logout()
      patchStore.compareCount = 0
      ElMessage.success('已退出登录')
      router.push('/')
      break
  }
}
</script>

<style scoped>
.app-header {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #ffd700;
  font-weight: 700;
  font-size: 18px;
}

.logo-icon {
  font-size: 24px;
}

.nav-links {
  display: flex;
  gap: 8px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.nav-link.active {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
}

.badge {
  background: #ffd700;
  color: #1a1a2e;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.3s ease;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.05);
}

.username {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.auth-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
</style>
