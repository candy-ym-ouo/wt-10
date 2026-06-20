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
        <router-link to="/activities" class="nav-link" :class="{ active: $route.path.startsWith('/activities') && !$route.path.startsWith('/challenge') }">
          <el-icon><Present /></el-icon>
          活动中心
        </router-link>
        <router-link to="/challenge" class="nav-link" :class="{ active: $route.path.startsWith('/challenge') }">
          <el-icon><Trophy /></el-icon>
          挑战赛
        </router-link>
        <router-link to="/downloads" class="nav-link" :class="{ active: $route.path.startsWith('/downloads') }">
          <el-icon><Folder /></el-icon>
          资源中心
        </router-link>
        <router-link to="/articles" class="nav-link" :class="{ active: $route.path.startsWith('/articles') && !$route.path.startsWith('/articles/create') && !$route.path.startsWith('/articles/edit') }">
          <el-icon><Reading /></el-icon>
          知识专栏
        </router-link>
        <router-link v-if="userStore.isLoggedIn" to="/feed" class="nav-link" :class="{ active: $route.path === '/feed' }">
          <el-icon><TrendCharts /></el-icon>
          关注动态
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
        <div 
          v-if="userStore.isLoggedIn" 
          class="notification-btn"
          @click="$router.push('/notifications')"
          :class="{ active: $route.path === '/notifications' }"
        >
          <el-icon><Bell /></el-icon>
          <span v-if="unreadCount > 0" class="notification-badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </div>

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
              <el-dropdown-item command="notifications">
                <el-icon><Bell /></el-icon>通知中心
                <span v-if="unreadCount > 0" class="dropdown-badge">{{ unreadCount }}</span>
              </el-dropdown-item>
              <el-dropdown-item command="workbench">
                <el-icon><Odometer /></el-icon>创作者工作台
              </el-dropdown-item>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>个人中心
              </el-dropdown-item>
              <el-dropdown-item command="my-patches">
                <el-icon><Document /></el-icon>我的 Patch
              </el-dropdown-item>
              <el-dropdown-item command="my-articles">
                <el-icon><Reading /></el-icon>我的文章
              </el-dropdown-item>
              <el-dropdown-item command="favorites">
                <el-icon><Star /></el-icon>我的收藏
              </el-dropdown-item>
              <el-dropdown-item command="my-orders">
                <el-icon><ShoppingCart /></el-icon>我的订单
              </el-dropdown-item>
              <el-dropdown-item command="my-permissions">
                <el-icon><Key /></el-icon>已购内容
              </el-dropdown-item>
              <el-dropdown-item command="creator-earnings">
                <el-icon><Money /></el-icon>创作者收益
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
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  HomeFilled, Collection, Cpu, DataAnalysis, Plus, 
  ArrowDown, User, Document, Star, Setting, SwitchButton,
  Odometer, CollectionTag, TrendCharts, Present, Trophy, Bell,
  Folder, ShoppingCart, Key, Money, Reading
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { socialAPI } from '@/api'

const router = useRouter()
const userStore = useUserStore()
const patchStore = usePatchStore()
const notificationStore = useNotificationStore()

const unreadCount = ref(0)

const fetchUnreadCount = async () => {
  if (!userStore.isLoggedIn) {
    unreadCount.value = 0
    return
  }
  try {
    const res = await socialAPI.getMyNotifications({ page: 1, limit: 1 })
    unreadCount.value = res.unreadCount || 0
    notificationStore.notifications.unreadCount = res.unreadCount || 0
    if (res.countsByCategory) {
      notificationStore.notifications.countsByCategory = res.countsByCategory
    }
  } catch (e) {
    console.error('获取未读通知数失败:', e)
  }
}

watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    fetchUnreadCount()
  } else {
    unreadCount.value = 0
  }
}, { immediate: true })

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchUnreadCount()
  }
})

const handleCommand = (command) => {
  switch (command) {
    case 'notifications':
      router.push('/notifications')
      break
    case 'workbench':
      router.push('/workbench')
      break
    case 'profile':
      router.push('/profile')
      break
    case 'my-patches':
      router.push('/my-patches')
      break
    case 'my-articles':
      router.push('/my-articles')
      break
    case 'favorites':
      router.push('/favorites')
      break
    case 'my-orders':
      router.push('/my-orders')
      break
    case 'my-permissions':
      router.push('/my-permissions')
      break
    case 'creator-earnings':
      router.push('/creator-earnings')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      userStore.logout()
      patchStore.compareCount = 0
      notificationStore.resetNotifications()
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

.notification-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20px;
  transition: all 0.3s ease;
}

.notification-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.notification-btn.active {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.dropdown-badge {
  margin-left: auto;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 10px;
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
