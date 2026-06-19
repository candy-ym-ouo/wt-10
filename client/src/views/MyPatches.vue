<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">📄 我的 Patch</h1>
      <p class="page-subtitle">管理你发布的 Patch</p>
    </div>

    <div class="action-bar">
      <el-button type="primary" class="btn-primary" @click="$router.push('/create')">
        <el-icon><Plus /></el-icon>
        发布新 Patch
      </el-button>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="patches.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>还没有发布任何 Patch</p>
      <el-button type="primary" class="btn-primary" @click="$router.push('/create')">
        发布第一个 Patch
      </el-button>
    </div>

    <div v-else class="grid-patches">
      <div v-for="patch in patches" :key="patch.id" class="card patch-card">
        <div class="patch-image">🎛️</div>
        <div class="patch-title">{{ patch.title }}</div>
        <div class="patch-desc">{{ patch.description }}</div>
        <div class="patch-tags" v-if="getTags(patch.tags).length > 0">
          <span class="tag" v-for="tag in getTags(patch.tags)" :key="tag">#{{ tag }}</span>
        </div>
        <div class="patch-meta">
          <div class="patch-stats">
            <span><el-icon><Star /></el-icon> {{ patch.likes_count || patch.real_likes || 0 }}</span>
            <span><el-icon><View /></el-icon> {{ patch.views_count || 0 }}</span>
            <span :class="patch.is_public ? 'text-success' : 'text-warning'">
              {{ patch.is_public ? '公开' : '私有' }}
            </span>
          </div>
        </div>
        <div class="patch-actions">
          <el-button size="small" @click="$router.push(`/patches/${patch.id}`)">
            <el-icon><View /></el-icon> 查看
          </el-button>
          <el-button size="small" type="primary" @click="$router.push(`/edit/${patch.id}`)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" type="danger" @click="deletePatch(patch)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="total > limit" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchPatches"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Document, Plus, View, Edit, Delete, Star } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const patchStore = usePatchStore()

const loading = ref(false)
const patches = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12

onMounted(() => {
  fetchPatches()
})

const fetchPatches = async () => {
  loading.value = true
  try {
    const res = await patchStore.fetchMyPatches({ page: page.value, limit })
    patches.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const getTags = (tags) => {
  try {
    return JSON.parse(tags) || []
  } catch {
    return []
  }
}

const deletePatch = async (patch) => {
  try {
    await ElMessageBox.confirm(`确定要删除 "${patch.title}" 吗？`, '确认删除', {
      type: 'warning'
    })
    await patchStore.deletePatch(patch.id)
    ElMessage.success('删除成功')
    fetchPatches()
  } catch {}
}
</script>

<style scoped>
.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}
</style>
