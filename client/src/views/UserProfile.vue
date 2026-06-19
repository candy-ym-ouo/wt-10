<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>
    <template v-else-if="user">
      <div class="profile-header">
        <div class="avatar-section">
          <el-avatar :size="120" :src="user.avatar" class="avatar-large">
            {{ user.username.charAt(0).toUpperCase() }}
          </el-avatar>
        </div>
        <div class="profile-info">
          <div class="header-row">
            <h1 class="username">{{ user.username }}</h1>
            <FollowButton :user-id="user.id" size="large" />
          </div>
          <p class="bio">{{ user.bio || '这个人很懒，什么都没写~' }}</p>
          <div class="stats">
            <span class="stat-item" @click="activeTab = 'patches'">
              <strong>{{ patchCount }}</strong>
              <span>Patch</span>
            </span>
            <span class="stat-item" @click="activeTab = 'followers'">
              <strong>{{ user.followers_count || 0 }}</strong>
              <span>粉丝</span>
            </span>
            <span class="stat-item" @click="activeTab = 'following'">
              <strong>{{ user.following_count || 0 }}</strong>
              <span>关注</span>
            </span>
            <span class="stat-item">
              <el-icon><Star /></el-icon>
              <span>{{ favoriteCount }} 收藏</span>
            </span>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'patches' }"
          @click="activeTab = 'patches'"
        >
          发布的 Patch
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'followers' }"
          @click="activeTab = 'followers'"
        >
          粉丝 ({{ user.followers_count || 0 }})
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'following' }"
          @click="activeTab = 'following'"
        >
          关注 ({{ user.following_count || 0 }})
        </div>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'patches'" class="tab-pane">
          <div v-if="userPatches.length === 0" class="empty-state">
            <el-icon class="empty-icon"><Document /></el-icon>
            <p>暂无发布的 Patch</p>
          </div>
          <div v-else class="patch-grid">
            <PatchCard v-for="patch in userPatches" :key="patch.id" :patch="patch" />
          </div>
        </div>
        
        <div v-else-if="activeTab === 'followers'" class="tab-pane">
          <FollowList 
            :user-id="user.id" 
            type="followers" 
            :is-me="isMe"
          />
        </div>
        
        <div v-else-if="activeTab === 'following'" class="tab-pane">
          <FollowList 
            :user-id="user.id" 
            type="following" 
            :is-me="isMe"
          />
        </div>
      </div>
    </template>
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><User /></el-icon>
      <p>用户不存在</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Document, Star, User } from '@element-plus/icons-vue'
import { userApi, patchApi } from '@/api'
import { useUserStore } from '@/stores/userStore'
import PatchCard from '@/components/PatchCard.vue'
import FollowButton from '@/components/FollowButton.vue'
import FollowList from '@/components/FollowList.vue'

const route = useRoute()
const userStore = useUserStore()

const loading = ref(true)
const user = ref(null)
const userPatches = ref([])
const activeTab = ref('patches')

const isMe = computed(() => userStore.user?.id === parseInt(route.params.id))
const patchCount = computed(() => userPatches.value.length)
const favoriteCount = computed(() => user.value?.favorites_count || 0)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const fetchUser = async () => {
  try {
    loading.value = true
    const res = await userApi.getById(route.params.id)
    user.value = res
    
    const patchesRes = await patchApi.getList({ user_id: route.params.id })
    userPatches.value = patchesRes.list || patchesRes.data || []
  } catch (err) {
    ElMessage.error('获取用户信息失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, () => {
  activeTab.value = 'patches'
  fetchUser()
})

onMounted(() => {
  fetchUser()
})
</script>

<style scoped>
.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-large {
  border: 3px solid rgba(255, 215, 0, 0.3);
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.username {
  font-size: 2rem;
  margin: 0;
  color: #fff;
  font-weight: 700;
}

.bio {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 1rem 0;
  font-size: 1rem;
  line-height: 1.6;
}

.stats {
  display: flex;
  gap: 2rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.stat-item:hover {
  color: #ffd700;
}

.stat-item strong {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1px;
}

.tab {
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.3s ease;
}

.tab:hover {
  color: rgba(255, 255, 255, 0.9);
}

.tab.active {
  color: #ffd700;
  border-bottom-color: #ffd700;
}

.tab-content {
  min-height: 400px;
}

.tab-pane {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.patch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>
