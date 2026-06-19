<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📝 Patch 管理</h1>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索 Patch 标题"
        clearable
        class="search-input"
        @keyup.enter="fetchPatches"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchPatches">
        <el-option label="全部" value="" />
        <el-option label="已审核" value="approved" />
        <el-option label="待审核" value="pending" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-button type="primary" @click="fetchPatches">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="patches" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="author_name" label="作者" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="likes_count" label="点赞" width="80" />
        <el-table-column prop="favorites_count" label="收藏" width="80" />
        <el-table-column prop="created_at" label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewPatch(row)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="success" 
              @click="approvePatch(row)"
            >
              通过
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="warning" 
              @click="rejectPatch(row)"
            >
              拒绝
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deletePatch(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const patches = ref([])

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const statusType = (status) => {
  const map = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    approved: '已审核',
    pending: '待审核',
    rejected: '已拒绝'
  }
  return map[status] || status
}

const fetchPatches = async () => {
  try {
    loading.value = true
    const res = await adminApi.getPatches({ 
      keyword: keyword.value, 
      status: statusFilter.value 
    })
    patches.value = res.data.list || res.data || []
  } catch (err) {
    ElMessage.error('获取 Patch 列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const viewPatch = (patch) => {
  router.push(`/patches/${patch.id}`)
}

const approvePatch = async (patch) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过 Patch "${patch.title}" 的审核吗？`,
      '确认审核',
      { type: 'success' }
    )
    
    await adminApi.updatePatchStatus(patch.id, 'approved')
    patch.status = 'approved'
    ElMessage.success('审核通过')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const rejectPatch = async (patch) => {
  try {
    await ElMessageBox.confirm(
      `确定要拒绝 Patch "${patch.title}" 的审核吗？`,
      '确认拒绝',
      { type: 'warning' }
    )
    
    await adminApi.updatePatchStatus(patch.id, 'rejected')
    patch.status = 'rejected'
    ElMessage.success('已拒绝')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const deletePatch = async (patch) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 Patch "${patch.title}" 吗？此操作不可恢复！`,
      '确认删除',
      { type: 'danger' }
    )
    
    await adminApi.deletePatch(patch.id)
    patches.value = patches.value.filter(p => p.id !== patch.id)
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

onMounted(() => {
  fetchPatches()
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

.filter-select {
  width: 150px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}
</style>
