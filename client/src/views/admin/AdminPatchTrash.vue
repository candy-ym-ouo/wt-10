<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🗑️ 回收站</h1>
      <p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">
        已删除的 Patch 可在此恢复或永久删除
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索已删除的 Patch（标题、描述、作者）"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="原状态" clearable class="status-filter" @change="handleSearch">
        <el-option label="草稿" value="draft" />
        <el-option label="定时中" value="scheduled" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
        <el-option label="待修改" value="needs_revision" />
      </el-select>
      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="resetFilter">重置</el-button>
    </div>

    <div class="table-card">
      <el-table :data="patches" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="username" label="作者" width="120" />
        <el-table-column prop="status" label="原状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deleted_at" label="删除时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.deleted_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="likes_count" label="点赞" width="80" />
        <el-table-column prop="views_count" label="浏览" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="restorePatch(row)">
              🔄 恢复
            </el-button>
            <el-button size="small" type="danger" @click="permanentDelete(row)">
              永久删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="total > limit" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchTrash"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const patches = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const statusType = (status) => {
  const map = {
    draft: 'info',
    scheduled: 'warning',
    approved: 'success',
    pending: '',
    rejected: 'danger',
    needs_revision: 'warning'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    draft: '草稿',
    scheduled: '定时中',
    approved: '已通过',
    pending: '待审核',
    rejected: '已驳回',
    needs_revision: '待修改'
  }
  return map[status] || status
}

const fetchTrash = async () => {
  try {
    loading.value = true
    const params = {
      search: keyword.value,
      page: page.value,
      limit
    }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await adminApi.getTrashPatches(params)
    patches.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取回收站列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchTrash()
}

const resetFilter = () => {
  keyword.value = ''
  statusFilter.value = ''
  page.value = 1
  fetchTrash()
}

const restorePatch = async (patch) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复 Patch "${patch.title}" 吗？恢复后将重新出现在 Patch 列表中。`,
      '确认恢复',
      { type: 'success' }
    )
    await adminApi.restorePatch(patch.id)
    patches.value = patches.value.filter(p => p.id !== patch.id)
    total.value -= 1
    ElMessage.success('已恢复')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('恢复失败')
      console.error(err)
    }
  }
}

const permanentDelete = async (patch) => {
  try {
    await ElMessageBox.confirm(
      `确定要永久删除 Patch "${patch.title}" 吗？此操作不可恢复！所有数据将被彻底删除。`,
      '⚠️ 永久删除',
      { type: 'danger', confirmButtonText: '永久删除', cancelButtonText: '取消' }
    )
    await adminApi.permanentDeletePatch(patch.id)
    patches.value = patches.value.filter(p => p.id !== patch.id)
    total.value -= 1
    ElMessage.success('已永久删除')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

onMounted(() => {
  fetchTrash()
})
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.8rem;
  margin: 0;
  color: var(--text-primary);
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  max-width: 400px;
}

.status-filter {
  max-width: 160px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}
</style>
