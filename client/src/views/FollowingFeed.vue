<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><TrendCharts /></el-icon>
        关注动态
      </h1>
      <p class="page-subtitle">查看你关注的创作者发布的最新 Patch</p>
    </div>

    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <el-icon class="prompt-icon"><User /></el-icon>
      <h3>登录后查看关注动态</h3>
      <p>关注你喜欢的创作者，第一时间获取他们的最新作品</p>
      <div class="prompt-actions">
        <el-button type="primary" @click="$router.push('/login')">立即登录</el-button>
        <el-button @click="$router.push('/register')">注册账号</el-button>
      </div>
    </div>

    <template v-else>
      <div v-if="loading && patches.length === 0" class="loading">
        <el-skeleton v-for="i in 6" :key="i" :rows="4" animated />
      </div>

      <div v-else-if="patches.length === 0" class="empty">
        <el-icon class="empty-icon"><Connection /></el-icon>
        <h3>暂无动态</h3>
        <p>你还没有关注任何创作者</p>
        <el-button type="primary" @click="$router.push('/patches')">
          去发现创作者</el-button>
      </div>

      <template v-else>
        <div class="feed-grid">
          <PatchCard v-for="patch in patches" :key="patch.id" :patch="patch" />
        </div>

        <div v-if="hasMore" class="load-more">
          <el-button 
            type="primary" 
            @click="loadMore" 
            :loading="loadingMore"
          >
            加载更多
          </el-button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { TrendCharts, User, Connection } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { useSocialStore } from '@/stores/socialStore'
import PatchCard from '@/components/PatchCard.vue'

const userStore = useUserStore()
const socialStore = useSocialStore()

const patches = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const limit = 12
const total = ref(0)

const hasMore = computed(() => patches.value.length < total.value)

const fetchFeed = async (reset = false) => {
  if (!userStore.isLoggedIn) return
  
  if (reset) {
    page.value = 1
    patches.value = []
    total.value = 0
  }
  
  const isLoadingMore = page.value > 1
  if (isLoadingMore) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  
  try {
    const res = await socialStore.fetchFollowingFeed({ page: page.value, limit })
    patches.value = [...patches.value, ...res.list]
    total.value = res.total
  } catch (e) {
    ElMessage.error('获取动态失败')
  } finally {
    if (isLoadingMore) {
      loadingMore.value = false
    } else {
      loading.value = false
    }
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return
  page.value++
  await fetchFeed()
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchFeed()
  }
})
</script>

<style scoped>
.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.page-title .el-icon {
  color: #ffd700;
  font-size: 2rem;
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 1rem;
}

.login-prompt {
  max-width: 500px;
  margin: 60px auto;
  text-align: center;
  padding: 48px 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

.prompt-icon {
  font-size: 64px;
  color: rgba(255, 215, 0, 0.5);
  margin-bottom: 20px;
}

.login-prompt h3 {
  font-size: 1.5rem;
  color: #fff;
  margin: 0 0 12px 0;
}

.login-prompt p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 24px 0;
}

.prompt-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.empty {
  max-width: 500px;
  margin: 60px auto;
  text-align: center;
  padding: 48px 32px;
}

.empty-icon {
  font-size: 64px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 20px;
}

.empty h3 {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 8px 0;
}

.empty p {
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 24px 0;
}

.patch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
</style>
