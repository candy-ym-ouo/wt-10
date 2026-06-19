<template>
  <div class="container workbench-container">
    <div class="workbench-header">
      <div class="welcome-section">
        <div class="welcome-text">
          <h1 class="welcome-title">👋 欢迎回来，{{ userStore.user?.username || '创作者' }}</h1>
          <p class="welcome-subtitle">今天也要继续创作优秀的 Patch 哦！</p>
        </div>
        <div class="quick-actions">
          <el-button type="primary" size="large" class="btn-primary quick-publish-btn" @click="$router.push('/create')">
            <el-icon><Plus /></el-icon>
            快捷发布
          </el-button>
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon patches-icon">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <p class="stat-value">{{ stats.totalPatches }}</p>
          <p class="stat-label">我的 Patch</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon drafts-icon">
          <el-icon><Edit /></el-icon>
        </div>
        <div class="stat-content">
          <p class="stat-value">{{ stats.totalDrafts }}</p>
          <p class="stat-label">草稿</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon favorites-icon">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <p class="stat-value">{{ stats.totalFavorites }}</p>
          <p class="stat-label">收藏</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon views-icon">
          <el-icon><View /></el-icon>
        </div>
        <div class="stat-content">
          <p class="stat-value">{{ stats.totalViews }}</p>
          <p class="stat-label">总浏览量</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon likes-icon">
          <el-icon><StarFilled /></el-icon>
        </div>
        <div class="stat-content">
          <p class="stat-value">{{ stats.totalLikes }}</p>
          <p class="stat-label">获赞数</p>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="content-left">
        <div class="tabs-section card">
          <div class="tabs-header">
            <div
              class="tab-item"
              :class="{ active: activeTab === 'patches' }"
              @click="switchTab('patches')"
            >
              <el-icon><Document /></el-icon>
              我的 Patch
            </div>
            <div
              class="tab-item"
              :class="{ active: activeTab === 'drafts' }"
              @click="switchTab('drafts')"
            >
              <el-icon><Edit /></el-icon>
              草稿
            </div>
            <div
              class="tab-item"
              :class="{ active: activeTab === 'favorites' }"
              @click="switchTab('favorites')"
            >
              <el-icon><Star /></el-icon>
              收藏
            </div>
          </div>

          <div class="tabs-content">
            <div v-if="activeTab === 'patches'" class="tab-panel">
              <div v-if="loadingPatches" class="empty-state">
                <el-icon class="empty-icon"><Loading /></el-icon>
                <p>加载中...</p>
              </div>
              <div v-else-if="myPatches.length === 0" class="empty-state">
                <el-icon class="empty-icon"><Document /></el-icon>
                <p>还没有发布任何 Patch</p>
                <el-button type="primary" class="btn-primary" @click="$router.push('/create')">
                  发布第一个 Patch
                </el-button>
              </div>
              <div v-else class="patch-list">
                <div
                  v-for="patch in myPatches.slice(0, 6)"
                  :key="patch.id"
                  class="patch-item"
                  @click="$router.push(`/patches/${patch.id}`)"
                >
                  <div class="patch-thumb">🎛️</div>
                  <div class="patch-info">
                    <h4 class="patch-name">{{ patch.title }}</h4>
                    <p class="patch-desc">{{ patch.description }}</p>
                    <div class="patch-stats">
                      <span><el-icon><View /></el-icon> {{ patch.views_count || 0 }}</span>
                      <span><el-icon><Star /></el-icon> {{ patch.likes_count || patch.real_likes || 0 }}</span>
                      <span :class="patch.is_public ? 'status-public' : 'status-private'">
                        {{ patch.is_public ? '公开' : '私有' }}
                      </span>
                    </div>
                  </div>
                  <div class="patch-actions">
                    <el-button size="small" type="primary" @click.stop="$router.push(`/edit/${patch.id}`)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div v-if="myPatches.length > 6" class="view-more">
                  <el-button text @click="$router.push('/my-patches')">
                    查看全部 <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'drafts'" class="tab-panel">
              <div v-if="loadingDrafts" class="empty-state">
                <el-icon class="empty-icon"><Loading /></el-icon>
                <p>加载中...</p>
              </div>
              <div v-else-if="drafts.length === 0" class="empty-state">
                <el-icon class="empty-icon"><Edit /></el-icon>
                <p>暂无草稿</p>
                <el-button type="primary" class="btn-primary" @click="$router.push('/create')">
                  创建新草稿
                </el-button>
              </div>
              <div v-else class="patch-list">
                <div
                  v-for="draft in drafts.slice(0, 6)"
                  :key="draft.id"
                  class="patch-item"
                  @click="$router.push(`/edit/${draft.id}`)"
                >
                  <div class="patch-thumb">📝</div>
                  <div class="patch-info">
                    <h4 class="patch-name">{{ draft.title }}</h4>
                    <p class="patch-desc">{{ draft.description }}</p>
                    <div class="patch-stats">
                      <span class="status-draft">草稿</span>
                      <span>更新于 {{ formatDate(draft.updated_at) }}</span>
                    </div>
                  </div>
                  <div class="patch-actions">
                    <el-button size="small" type="primary" @click.stop="$router.push(`/edit/${draft.id}`)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'favorites'" class="tab-panel">
              <div v-if="loadingFavorites" class="empty-state">
                <el-icon class="empty-icon"><Loading /></el-icon>
                <p>加载中...</p>
              </div>
              <div v-else-if="favorites.length === 0" class="empty-state">
                <el-icon class="empty-icon"><Star /></el-icon>
                <p>还没有收藏任何 Patch</p>
                <el-button type="primary" class="btn-primary" @click="$router.push('/patches')">
                  去发现 Patch
                </el-button>
              </div>
              <div v-else class="patch-list">
                <div
                  v-for="patch in favorites.slice(0, 6)"
                  :key="patch.id"
                  class="patch-item"
                  @click="$router.push(`/patches/${patch.id}`)"
                >
                  <div class="patch-thumb">🎛️</div>
                  <div class="patch-info">
                    <h4 class="patch-name">{{ patch.title }}</h4>
                    <p class="patch-desc">{{ patch.description }}</p>
                    <div class="patch-stats">
                      <span><el-icon><User /></el-icon> {{ patch.username }}</span>
                      <span><el-icon><Star /></el-icon> {{ patch.likes_count || patch.real_likes || 0 }}</span>
                    </div>
                  </div>
                  <div class="patch-actions">
                    <el-button size="small" @click.stop="handleToggleFavorite(patch.id)">
                      <el-icon><StarFilled style="color: #67c23a" /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div v-if="favorites.length > 6" class="view-more">
                  <el-button text @click="$router.push('/favorites')">
                    查看全部 <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-right">
        <div class="card messages-card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Bell /></el-icon>
              消息提醒
            </h3>
            <el-button text size="small">全部已读</el-button>
          </div>
          <div class="messages-list">
            <div v-if="messages.length === 0" class="empty-messages">
              <el-icon class="empty-icon"><Bell /></el-icon>
              <p>暂无新消息</p>
            </div>
            <div v-for="msg in messages" :key="msg.id" class="message-item" :class="{ unread: !msg.read }">
              <div class="message-avatar">
                <el-avatar :size="36" :src="msg.avatar">
                  {{ msg.username?.charAt(0).toUpperCase() }}
                </el-avatar>
              </div>
              <div class="message-content">
                <p class="message-text">{{ msg.content }}</p>
                <p class="message-time">{{ msg.time }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card shortcuts-card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><MagicStick /></el-icon>
              快捷操作
            </h3>
          </div>
          <div class="shortcuts-grid">
            <div class="shortcut-item" @click="$router.push('/create')">
              <div class="shortcut-icon publish">
                <el-icon><Plus /></el-icon>
              </div>
              <span>发布 Patch</span>
            </div>
            <div class="shortcut-item" @click="$router.push('/my-patches')">
              <div class="shortcut-icon manage">
                <el-icon><Document /></el-icon>
              </div>
              <span>管理作品</span>
            </div>
            <div class="shortcut-item" @click="$router.push('/favorites')">
              <div class="shortcut-icon favorite">
                <el-icon><Star /></el-icon>
              </div>
              <span>我的收藏</span>
            </div>
            <div class="shortcut-item" @click="$router.push('/profile')">
              <div class="shortcut-icon profile">
                <el-icon><User /></el-icon>
              </div>
              <span>个人设置</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus, Document, Edit, Star, StarFilled, View, User,
  Bell, MagicStick, ArrowRight, Loading
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'

const userStore = useUserStore()
const patchStore = usePatchStore()

const activeTab = ref('patches')
const loadingPatches = ref(false)
const loadingDrafts = ref(false)
const loadingFavorites = ref(false)
const myPatches = ref([])
const drafts = ref([])
const favorites = ref([])

const messages = ref([
  {
    id: 1,
    type: 'like',
    username: 'music_lover',
    avatar: '',
    content: '赞了你的 Patch "Vintage Synth Lead"',
    time: '2 分钟前',
    read: false
  },
  {
    id: 2,
    type: 'comment',
    username: 'synth_pro',
    avatar: '',
    content: '评论了你的 Patch: "这个音色太棒了，请问可以分享参数吗？"',
    time: '1 小时前',
    read: false
  },
  {
    id: 3,
    type: 'favorite',
    username: 'patch_collector',
    avatar: '',
    content: '收藏了你的 Patch "Deep Bass 808"',
    time: '3 小时前',
    read: true
  },
  {
    id: 4,
    type: 'system',
    username: '系统消息',
    avatar: '',
    content: '你的 Patch "Ambient Pad" 已通过审核并发布',
    time: '昨天',
    read: true
  }
])

const stats = computed(() => ({
  totalPatches: myPatches.value.length || 0,
  totalDrafts: drafts.value.length || 0,
  totalFavorites: favorites.value.length || 0,
  totalViews: myPatches.value.reduce((sum, p) => sum + (p.views_count || 0), 0),
  totalLikes: myPatches.value.reduce((sum, p) => sum + (p.likes_count || p.real_likes || 0), 0)
}))

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'patches' && myPatches.value.length === 0) {
    fetchMyPatches()
  } else if (tab === 'drafts' && drafts.value.length === 0) {
    fetchDrafts()
  } else if (tab === 'favorites' && favorites.value.length === 0) {
    fetchFavorites()
  }
}

const fetchMyPatches = async () => {
  loadingPatches.value = true
  try {
    const res = await patchStore.fetchMyPatches({ page: 1, limit: 100 })
    myPatches.value = res.list || []
  } finally {
    loadingPatches.value = false
  }
}

const fetchDrafts = async () => {
  loadingDrafts.value = true
  try {
    const res = await patchStore.fetchMyPatches({ page: 1, limit: 100, is_public: false })
    drafts.value = res.list?.filter(p => !p.is_public) || []
  } finally {
    loadingDrafts.value = false
  }
}

const fetchFavorites = async () => {
  loadingFavorites.value = true
  try {
    const res = await patchStore.fetchMyFavorites({ page: 1, limit: 100 })
    favorites.value = res.list || []
  } finally {
    loadingFavorites.value = false
  }
}

const handleToggleFavorite = async (patchId) => {
  try {
    await patchStore.toggleFavorite(patchId)
    ElMessage.success('已取消收藏')
    fetchFavorites()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchMyPatches()
  fetchFavorites()
})
</script>

<style scoped>
.workbench-container {
  padding-top: 24px;
  padding-bottom: 40px;
}

.workbench-header {
  margin-bottom: 24px;
}

.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 170, 0, 0.08));
  border-radius: 16px;
  padding: 32px;
  border: 1px solid rgba(255, 215, 0, 0.25);
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.quick-publish-btn {
  padding: 12px 28px;
  font-size: 15px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
}

.patches-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.drafts-icon {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.favorites-icon {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.views-icon {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.likes-icon {
  background: linear-gradient(135deg, #fa709a, #fee140);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #ffd700;
  margin: 0;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0 0;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

.tabs-section {
  padding: 0;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 20px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 20px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.3s ease;
}

.tab-item:hover {
  color: #fff;
}

.tab-item.active {
  color: #ffd700;
  border-bottom-color: #ffd700;
}

.tabs-content {
  padding: 20px;
}

.tab-panel {
  min-height: 300px;
}

.patch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.patch-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.patch-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 215, 0, 0.2);
}

.patch-thumb {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #2d2d44, #1e1e33);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.patch-info {
  flex: 1;
  min-width: 0;
}

.patch-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patch-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patch-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.patch-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-public {
  color: #67c23a !important;
}

.status-private {
  color: #e6a23c !important;
}

.status-draft {
  color: #e6a23c !important;
}

.patch-actions {
  flex-shrink: 0;
}

.view-more {
  text-align: center;
  padding-top: 12px;
}

.view-more .el-button {
  color: #ffd700;
}

.messages-card,
.shortcuts-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title .el-icon {
  color: #ffd700;
}

.messages-list {
  max-height: 320px;
  overflow-y: auto;
}

.empty-messages {
  text-align: center;
  padding: 30px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-messages .empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.message-item:last-child {
  border-bottom: none;
}

.message-item.unread::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 16px;
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 4px 0;
  line-height: 1.4;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.shortcut-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 215, 0, 0.2);
  transform: translateY(-2px);
}

.shortcut-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}

.shortcut-icon.publish {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
}

.shortcut-icon.manage {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.shortcut-icon.favorite {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.shortcut-icon.profile {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.shortcut-item span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

@media (max-width: 1200px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .content-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  .messages-card,
  .shortcuts-card {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content-right {
    grid-template-columns: 1fr;
  }
  
  .tabs-header {
    overflow-x: auto;
  }
  
  .tab-item {
    flex-shrink: 0;
  }
}
</style>
