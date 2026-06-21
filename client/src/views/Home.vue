<template>
  <div class="home">
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">🎛️ Patch Vault</h1>
        <p class="hero-subtitle">模块合成器玩家的 Patch 收藏与分享社区</p>
        <p class="hero-desc">发现、收藏、分享令人惊叹的合成器 Patch，与全球合成器爱好者交流学习</p>
        <div class="hero-actions">
          <el-button size="large" type="primary" @click="$router.push('/patches')" class="btn-primary">
            浏览 Patch 库
          </el-button>
          <el-button size="large" @click="$router.push('/modules')">
            探索设备库
          </el-button>
        </div>
      </div>
    </section>

    <div class="container">
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🔥 热门 Patch</h2>
          <el-button type="text" @click="$router.push('/patches?sort=popular')">查看更多 →</el-button>
        </div>
        <div v-if="loading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>
        <div v-else class="grid-patches">
          <PatchCard
            v-for="patch in popularPatches"
            :key="patch.id"
            :patch="patch"
            @click="goToDetail"
            @toggleLike="handleToggleLike"
            @toggleFavorite="handleToggleFavorite"
            @addToCompare="handleAddToCompare"
            @viewUser="goToUser"
          />
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🆕 最新发布</h2>
          <el-button type="text" @click="$router.push('/patches')">查看更多 →</el-button>
        </div>
        <div class="grid-patches">
          <PatchCard
            v-for="patch in newestPatches"
            :key="patch.id"
            :patch="patch"
            @click="goToDetail"
            @toggleLike="handleToggleLike"
            @toggleFavorite="handleToggleFavorite"
            @addToCompare="handleAddToCompare"
            @viewUser="goToUser"
          />
        </div>
      </section>

      <section class="section" v-if="featuredCollections.length > 0">
        <div class="section-header">
          <h2 class="section-title">🎯 精选专题</h2>
          <el-button type="text" @click="$router.push('/collections')">查看更多 →</el-button>
        </div>
        <div class="collections-row">
          <div
            v-for="item in featuredCollections"
            :key="item.id"
            class="home-collection-card"
            @click="$router.push(`/collections/${item.id}`)"
          >
            <div class="home-collection-cover">
              <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" />
              <div v-else class="cover-placeholder-sm">🎯</div>
            </div>
            <div class="home-collection-info">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description || '暂无描述' }}</p>
              <span class="patch-count">{{ item.patch_count }} 个 Patch</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section features">
        <h2 class="section-title text-center">平台特色</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📦</div>
            <h3>设备库</h3>
            <p>收录全球知名厂商的模块合成器设备，帮助你了解和选择适合的设备</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎚️</div>
            <h3>参数对比</h3>
            <p>最多同时对比 5 个 Patch 的参数设置，快速找出差异和共同点</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⭐</div>
            <h3>收藏管理</h3>
            <p>按文件夹分类管理你的收藏，快速找到灵感来源</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">👥</div>
            <h3>社区互动</h3>
            <p>点赞、评论、分享，与全球合成器爱好者交流学习</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePatchStore } from '@/stores/patchStore'
import { useUserStore } from '@/stores/userStore'
import { collectionApi } from '@/api'
import PatchCard from '@/components/PatchCard.vue'

const router = useRouter()
const patchStore = usePatchStore()
const userStore = useUserStore()

const loading = ref(true)
const popularPatches = ref([])
const newestPatches = ref([])
const featuredCollections = ref([])

onMounted(async () => {
  try {
    const [popular, newest, collections] = await Promise.all([
      patchStore.fetchPatches({ sort: 'popular', limit: 4 }),
      patchStore.fetchPatches({ sort: 'newest', limit: 4 }),
      collectionApi.getCollections({ limit: 4 })
    ])
    popularPatches.value = popular.list
    newestPatches.value = newest.list
    featuredCollections.value = collections.list || collections || []
  } finally {
    loading.value = false
  }
})

const goToDetail = (patch) => {
  router.push({ path: `/patches/${patch.id}`, query: { source: 'home' } })
}

const goToUser = (userId) => {
  router.push(`/users/${userId}`)
}

const handleToggleLike = async (patchId) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  await patchStore.toggleLike(patchId)
  ElMessage.success('操作成功')
  patchStore.fetchPatches({ sort: 'popular', limit: 4 })
  patchStore.fetchPatches({ sort: 'newest', limit: 4 })
}

const handleToggleFavorite = async (patchId) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  await patchStore.toggleFavorite(patchId)
  ElMessage.success('操作成功')
}

const handleAddToCompare = async (patchId) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    await patchStore.addToCompare(patchId)
    ElMessage.success('已添加到对比列表')
  } catch (e) {
    ElMessage.error(e.error || '添加失败')
  }
}
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 170, 0, 0.05));
  padding: 80px 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  color: #ffd700;
  margin-bottom: 16px;
  text-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
}

.hero-subtitle {
  font-size: 24px;
  color: #fff;
  margin-bottom: 16px;
  font-weight: 600;
}

.hero-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.section {
  margin-bottom: 60px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.text-center {
  text-align: center;
}

.features {
  margin-top: 80px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.3);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 18px;
  color: #ffd700;
  margin-bottom: 12px;
}

.feature-card p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

.collections-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.home-collection-card {
  display: flex;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.home-collection-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.1);
}

.home-collection-cover {
  width: 100px;
  min-width: 100px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 170, 0, 0.05));
}

.home-collection-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder-sm {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.home-collection-info {
  flex: 1;
  min-width: 0;
}

.home-collection-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-collection-info p {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.patch-count {
  font-size: 0.75rem;
  color: #ffd700;
}
</style>
