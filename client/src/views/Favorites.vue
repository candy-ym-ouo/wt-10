<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">⭐ 我的收藏</h1>
      <p class="page-subtitle">管理你收藏的 Patch</p>
    </div>

    <div class="folder-tabs">
      <div
        class="folder-tab"
        :class="{ active: selectedFolder === null }"
        @click="selectedFolder = null; fetchFavorites()"
      >
        全部 ({{ total }})
      </div>
      <div
        v-for="f in folders"
        :key="f.folder"
        class="folder-tab"
        :class="{ active: selectedFolder === f.folder }"
        @click="selectedFolder = f.folder; fetchFavorites()"
      >
        {{ f.folder }} ({{ f.count }})
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="favorites.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Star /></el-icon>
      <p>还没有收藏任何 Patch</p>
      <el-button type="primary" class="btn-primary" @click="$router.push('/patches')">
        去发现 Patch 收藏
      </el-button>
    </div>

    <div v-else class="grid-patches">
      <PatchCard
        v-for="patch in favorites"
        :key="patch.id"
        :patch="patch"
        @click="goToDetail"
        @toggleLike="handleToggleLike"
        @toggleFavorite="handleToggleFavorite"
        @addToCompare="handleAddToCompare"
        @viewUser="goToUser"
      />
    </div>

    <div v-if="total > limit" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchFavorites"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Star } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useUserStore } from '@/stores/userStore'
import PatchCard from '@/components/PatchCard.vue'

const router = useRouter()
const patchStore = usePatchStore()
const userStore = useUserStore()

const loading = ref(false)
const favorites = ref([])
const folders = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12
const selectedFolder = ref(null)

onMounted(() => {
  fetchFavorites()
})

const fetchFavorites = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit }
    if (selectedFolder.value) params.folder = selectedFolder.value
    const res = await patchStore.fetchMyFavorites(params)
    favorites.value = res.list
    total.value = res.total
    folders.value = res.folders || []
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
  await patchStore.toggleLike(patchId)
  fetchFavorites()
}

const handleToggleFavorite = async (patchId) => {
  await patchStore.toggleFavorite(patchId)
  ElMessage.success('已取消收藏')
  fetchFavorites()
}

const handleAddToCompare = async (patchId) => {
  try {
    await patchStore.addToCompare(patchId)
    ElMessage.success('已添加到对比列表')
  } catch (e) {
    ElMessage.error(e.error || '添加失败')
  }
}
</script>

<style scoped>
.folder-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.folder-tab {
  padding: 8px 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  font-size: 14px;
}

.folder-tab:hover {
  background: rgba(255,255,255,0.1);
}

.folder-tab.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: #ffd700;
  color: #ffd700;
}
</style>
