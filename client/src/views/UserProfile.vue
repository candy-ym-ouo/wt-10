<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>
    <template v-else-if="user">
      <div class="profile-header">
        <div class="avatar-large">{{ user.username.charAt(0).toUpperCase() }}</div>
        <div class="profile-info">
          <h1 class="username">{{ user.username }}</h1>
          <p class="bio">{{ user.bio || '这个人很懒，什么都没写~' }}</p>
          <div class="stats">
            <span><el-icon><Document /></el-icon> {{ patchCount }} 个 Patch</span>
            <span><el-icon><Star /></el-icon> {{ favoriteCount }} 个收藏</span>
            <span>加入于 {{ formatDate(user.created_at) }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">发布的 Patch</h2>
        <div v-if="userPatches.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Document /></el-icon>
          <p>暂无发布的 Patch</p>
        </div>
        <div v-else class="patch-grid">
          <PatchCard v-for="patch in userPatches" :key="patch.id" :patch="patch" />
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
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Document, Star, User } from '@element-plus/icons-vue'
import { userApi, patchApi } from '@/api'
import PatchCard from '@/components/PatchCard.vue'

const route = useRoute()
const loading = ref(true)
const user = ref(null)
const userPatches = ref([])

const patchCount = computed(() => userPatches.value.length)
const favoriteCount = computed(() => user.value?.favorites_count || 0)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const fetchUser = async () => {
  try {
    loading.value = true
    const res = await userApi.getById(route.params.id)
    user.value = res.data
    
    const patchesRes = await patchApi.getList({ user_id: route.params.id })
    userPatches.value = patchesRes.data.list || patchesRes.data || []
  } catch (err) {
    ElMessage.error('获取用户信息失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUser()
})
</script>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.avatar-large {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
  font-weight: bold;
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.bio {
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.stats {
  display: flex;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.stats span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.patch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
</style>
