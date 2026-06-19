<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="!collection" class="empty-state">
      <el-icon class="empty-icon"><FolderOpened /></el-icon>
      <p>专题不存在</p>
      <el-button type="primary" @click="$router.push('/collections')" style="margin-top: 16px">
        返回专题列表
      </el-button>
    </div>

    <template v-else>
      <div class="collection-hero">
        <div class="hero-cover">
          <img v-if="collection.cover_url" :src="collection.cover_url" :alt="collection.title" />
          <div v-else class="cover-placeholder">🎯</div>
        </div>
        <div class="hero-info">
          <h1 class="hero-title">{{ collection.title }}</h1>
          <p class="hero-desc">{{ collection.description || '暂无描述' }}</p>
          <div class="hero-meta">
            <span class="meta-item">
              <el-icon><Document /></el-icon>
              {{ collection.patch_count || patches.length }} 个 Patch
            </span>
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(collection.created_at) }} 创建
            </span>
          </div>
          <el-button @click="$router.push('/collections')">
            <el-icon><ArrowLeft /></el-icon>
            返回专题列表
          </el-button>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-title">专题包含的 Patch</h2>
      </div>

      <div v-if="patches.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <p>该专题暂无 Patch</p>
      </div>

      <div v-else class="grid-patches">
        <PatchCard
          v-for="patch in patches"
          :key="patch.id"
          :patch="patch"
          @click="goToDetail"
          @toggleLike="handleToggleLike"
          @toggleFavorite="handleToggleFavorite"
          @addToCompare="handleAddToCompare"
          @viewUser="goToUser"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, FolderOpened, Document, ArrowLeft } from '@element-plus/icons-vue'
import { collectionApi } from '@/api'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'
import PatchCard from '@/components/PatchCard.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const patchStore = usePatchStore()

const loading = ref(true)
const collection = ref(null)
const patches = ref([])

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await collectionApi.getDetail(route.params.id)
    const data = res.data || res
    collection.value = data
    patches.value = data.patches || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToDetail = (patch) => {
  router.push(`/patches/${patch.id}`)
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
  fetchData()
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

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.collection-hero {
  display: flex;
  gap: 32px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 40px;
}

.hero-cover {
  width: 300px;
  min-width: 300px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 170, 0, 0.05));
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
}

.hero-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0 0 12px;
}

.hero-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 16px;
}

.hero-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .collection-hero {
    flex-direction: column;
    padding: 20px;
  }

  .hero-cover {
    width: 100%;
    min-width: auto;
    height: 180px;
  }
}
</style>
