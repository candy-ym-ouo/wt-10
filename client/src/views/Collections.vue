<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎯 专题策展</h1>
      <p class="page-subtitle">精心策划的 Patch 专题合集，发现更多灵感</p>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="collections.length === 0" class="empty-state">
      <el-icon class="empty-icon"><FolderOpened /></el-icon>
      <p>暂无专题</p>
    </div>

    <div v-else class="collections-grid">
      <div
        v-for="item in collections"
        :key="item.id"
        class="collection-card"
        @click="goToDetail(item)"
      >
        <div class="collection-cover">
          <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" />
          <div v-else class="cover-placeholder">🎯</div>
          <div class="collection-badge">{{ item.patch_count }} 个 Patch</div>
        </div>
        <div class="collection-info">
          <h3 class="collection-title">{{ item.title }}</h3>
          <p class="collection-desc">{{ item.description || '暂无描述' }}</p>
          <div class="collection-meta">
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > limit" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchData"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, FolderOpened } from '@element-plus/icons-vue'
import { collectionApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const collections = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await collectionApi.getCollections({ page: page.value, limit })
    collections.value = res.list || res || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const goToDetail = (item) => {
  router.push(`/collections/${item.id}`)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.page-header {
  text-align: center;
  padding: 40px 0 30px;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 8px;
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.collection-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.collection-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
}

.collection-cover {
  position: relative;
  height: 180px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 170, 0, 0.05));
}

.collection-cover img {
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
  font-size: 64px;
}

.collection-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.collection-info {
  padding: 20px;
}

.collection-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.collection-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collection-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.pagination {
  display: flex;
  justify-content: center;
  margin: 40px 0;
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
</style>
