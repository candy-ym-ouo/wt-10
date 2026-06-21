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

    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="patch-tabs">
      <el-tab-pane label="🚀 已发布" name="published" />
      <el-tab-pane label="📋 待修改" name="needs_revision" />
      <el-tab-pane label="⏰ 定时发布" name="scheduled" />
      <el-tab-pane label="📝 草稿箱" name="draft" />
      <el-tab-pane label="💾 全部" name="all" />
    </el-tabs>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="patches.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>{{ emptyText }}</p>
      <el-button type="primary" class="btn-primary" @click="$router.push('/create')">
        创建 Patch
      </el-button>
    </div>

    <div v-else class="grid-patches">
      <div v-for="patch in patches" :key="patch.id" class="card patch-card">
        <div class="patch-status-badge" :class="`status-${patch.status}`">
          {{ getStatusLabel(patch.status) }}
        </div>
        <div class="patch-image">🎛️</div>
        <div class="patch-title">{{ patch.title }}</div>
        <div class="patch-desc">{{ patch.description }}</div>
        <div class="patch-tags" v-if="getTags(patch.tags).length > 0">
          <span class="tag" v-for="tag in getTags(patch.tags)" :key="tag">#{{ tag }}</span>
        </div>
        <div v-if="patch.status === 'scheduled' && patch.scheduled_at" class="patch-scheduled">
          ⏰ 定时发布：{{ patch.scheduled_at }}
        </div>
        <div v-if="patch.review_note" class="patch-review-note">
          <el-icon><Document /></el-icon>
          <span>{{ patch.review_note }}</span>
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
          <el-button 
            v-if="patch.status === 'draft'" 
            size="small" 
            type="success" 
            @click="publishNow(patch)"
          >
            🚀 立即发布
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Document, Plus, View, Edit, Delete, Star } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const patchStore = usePatchStore()

const loading = ref(false)
const patches = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12
const activeTab = ref('published')

const emptyText = computed(() => {
  switch (activeTab.value) {
    case 'draft':
      return '还没有草稿，点击创建开始吧'
    case 'scheduled':
      return '没有定时发布的 Patch'
    case 'needs_revision':
      return '没有需要修改的 Patch'
    case 'published':
      return '还没有发布任何 Patch'
    default:
      return '还没有创建任何 Patch'
  }
})

onMounted(() => {
  const tab = route.query.tab || 'published'
  activeTab.value = tab
  fetchPatches()
})

const handleTabChange = (tab) => {
  page.value = 1
  router.replace({ query: { tab } })
  fetchPatches()
}

const fetchPatches = async () => {
  loading.value = true
  try {
    let res
    const params = { page: page.value, limit }
    switch (activeTab.value) {
      case 'draft':
        res = await patchStore.fetchMyDrafts(params)
        break
      case 'scheduled':
        res = await patchStore.fetchMyScheduled(params)
        break
      case 'needs_revision':
        res = await patchStore.fetchMyPatches({ ...params, status: 'needs_revision' })
        break
      case 'published':
        res = await patchStore.fetchMyPatches({ ...params, status: 'approved' })
        break
      default:
        res = await patchStore.fetchMyPatches({ ...params, status: 'all' })
    }
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

const getStatusLabel = (status) => {
  const map = {
    draft: '📝 草稿',
    scheduled: '⏰ 定时中',
    pending: '🕓 审核中',
    approved: '🚀 已发布',
    rejected: '❌ 已驳回',
    needs_revision: '📋 待修改'
  }
  return map[status] || status
}

const publishNow = async (patch) => {
  try {
    await ElMessageBox.confirm(`确定立即发布 "${patch.title}" 吗？`, '确认发布', {
      type: 'info'
    })
    await patchStore.updatePatch(patch.id, { status: 'approved' })
    ElMessage.success('发布成功')
    fetchPatches()
  } catch {}
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

.patch-tabs {
  margin-bottom: 24px;
}

.patch-card {
  position: relative;
}

.patch-status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  z-index: 1;
}

.status-draft {
  background: rgba(144, 147, 153, 0.2);
  color: #909399;
}

.status-scheduled {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

.status-pending {
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.status-approved {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

.status-rejected {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.status-needs_revision {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

.patch-scheduled {
  font-size: 13px;
  color: #e6a23c;
  margin: 8px 0;
}

.patch-review-note {
  background: rgba(230, 162, 60, 0.1);
  border: 1px solid rgba(230, 162, 60, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 8px 0;
  font-size: 12px;
  color: #e6a23c;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}

.patch-review-note .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.patch-review-note span {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
