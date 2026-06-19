<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎛️ Patch 库</h1>
      <p class="page-subtitle">探索社区分享的精彩合成器 Patch</p>
    </div>

    <div class="search-bar">
      <el-input
        v-model="search"
        placeholder="搜索 Patch 标题或描述..."
        size="large"
        :prefix-icon="Search"
        @keyup.enter="fetchData"
      >
        <template #append>
          <el-button @click="fetchData" type="primary" class="btn-primary">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </template>
      </el-input>
    </div>

    <div class="filter-bar">
      <el-select v-model="sort" placeholder="排序方式" @change="fetchData">
        <el-option label="最新发布" value="newest" />
        <el-option label="最受欢迎" value="popular" />
        <el-option label="最多浏览" value="views" />
      </el-select>
      <el-input
        v-model="tagFilter"
        placeholder="按标签筛选，如: bass, pad, lead"
        style="width: 250px"
        @keyup.enter="fetchData"
      />
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="patches.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>暂无 Patch 数据</p>
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Loading, Document } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useUserStore } from '@/stores/userStore'
import PatchCard from '@/components/PatchCard.vue'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()
const userStore = useUserStore()

const loading = ref(false)
const patches = ref([])
const total = ref(0)
const page = ref(parseInt(route.query.page) || 1)
const limit = 12
const search = ref(route.query.search || '')
const sort = ref(route.query.sort || 'newest')
const tagFilter = ref(route.query.tag || '')

onMounted(() => {
  fetchData()
})

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit,
      sort: sort.value
    }
    if (search.value) params.search = search.value
    if (tagFilter.value) params.tag = tagFilter.value

    const res = await patchStore.fetchPatches(params)
    patches.value = res.list
    total.value = res.total
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
</script>
