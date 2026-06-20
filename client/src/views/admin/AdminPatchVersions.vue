<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📜 Patch 版本审计</h1>
      <p class="page-subtitle">查看所有 Patch 的版本变更历史</p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索标题、变更摘要或用户名"
        clearable
        class="search-input"
        @keyup.enter="fetchVersions"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-input
        v-model="patchIdFilter"
        placeholder="Patch ID"
        clearable
        style="width: 120px;"
        @keyup.enter="fetchVersions"
      />
      <el-input
        v-model="userIdFilter"
        placeholder="用户 ID"
        clearable
        style="width: 120px;"
        @keyup.enter="fetchVersions"
      />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 280px;"
      />
      <el-button type="primary" @click="fetchVersions" :loading="loading">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetFilters">
        重置
      </el-button>
    </div>

    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon total">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalVersions }}</div>
              <div class="stat-label">总版本数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon edits">
              <el-icon><Edit /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ editCount }}</div>
              <div class="stat-label">编辑次数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon rollback">
              <el-icon><RefreshRight /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ rollbackCount }}</div>
              <div class="stat-label">回滚次数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon patches">
              <el-icon><Box /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ uniquePatchCount }}</div>
              <div class="stat-label">涉及 Patch 数</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="table-card">
      <el-table :data="versions" v-loading="loading" stripe>
        <el-table-column prop="id" label="版本 ID" width="100" />
        <el-table-column prop="patch_id" label="Patch ID" width="100" />
        <el-table-column prop="patch_title" label="Patch 标题" min-width="180">
          <template #default="{ row }">
            <span class="patch-title-cell">{{ row.patch_title || row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本号" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.version === 1 ? 'success' : 'primary'"
              size="small"
              effect="dark"
            >
              v{{ row.version }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="24" :src="row.avatar">
                {{ row.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="change_summary" label="变更摘要" min-width="200">
          <template #default="{ row }">
            <div class="change-summary">
              <el-tag
                v-if="row.change_summary?.includes('回滚')"
                type="warning"
                size="small"
                effect="light"
                style="margin-right: 8px;"
              >
                <el-icon><RefreshRight /></el-icon> 回滚
              </el-tag>
              <el-tag
                v-else-if="row.version === 1"
                type="success"
                size="small"
                effect="light"
                style="margin-right: 8px;"
              >
                <el-icon><Plus /></el-icon> 创建
              </el-tag>
              <el-tag
                v-else
                type="primary"
                size="small"
                effect="light"
                style="margin-right: 8px;"
              >
                <el-icon><Edit /></el-icon> 编辑
              </el-tag>
              <span>{{ row.change_summary || '初始版本' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewPatch(row)">
              <el-icon><View /></el-icon> 查看
            </el-button>
            <el-button size="small" type="primary" @click="viewHistory(row)">
              <el-icon><Clock /></el-icon> 历史
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalVersions"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="fetchVersions"
        />
      </div>
    </div>

    <el-dialog
      v-model="historyDialogVisible"
      title="版本历史详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedPatch" class="dialog-patch-info">
        <h3>
          <el-icon><Box /></el-icon>
          {{ selectedPatch.title }}
          <el-tag size="small" type="info" style="margin-left: 8px;">
            ID: {{ selectedPatch.id }}
          </el-tag>
        </h3>
      </div>
      <div v-if="selectedPatch">
        <PatchVersionHistory
          :patch-id="selectedPatch.id"
          :can-rollback="true"
          :show-view-patch="false"
          @rollback="onRollbackFromDialog"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search, Document, Edit, RefreshRight, Box,
  View, Clock, Plus
} from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import PatchVersionHistory from '@/components/PatchVersionHistory.vue'

const router = useRouter()

const loading = ref(true)
const keyword = ref('')
const patchIdFilter = ref('')
const userIdFilter = ref('')
const dateRange = ref([])
const versions = ref([])
const totalVersions = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const historyDialogVisible = ref(false)
const selectedPatch = ref(null)

const editCount = computed(() => {
  return versions.value.filter(v =>
    v.version > 1 && !v.change_summary?.includes('回滚')
  ).length
})

const rollbackCount = computed(() => {
  return versions.value.filter(v =>
    v.change_summary?.includes('回滚')
  ).length
})

const uniquePatchCount = computed(() => {
  const patchIds = new Set(versions.value.map(v => v.patch_id))
  return patchIds.size
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchVersions = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    if (keyword.value) params.keyword = keyword.value
    if (patchIdFilter.value) params.patchId = patchIdFilter.value
    if (userIdFilter.value) params.userId = userIdFilter.value
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await adminApi.getPatchVersions(params)
    versions.value = res.list || []
    totalVersions.value = res.total || 0
  } catch (err) {
    ElMessage.error('加载版本历史失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchVersions()
}

const resetFilters = () => {
  keyword.value = ''
  patchIdFilter.value = ''
  userIdFilter.value = ''
  dateRange.value = []
  currentPage.value = 1
  fetchVersions()
}

const viewPatch = (row) => {
  router.push(`/patches/${row.patch_id}`)
}

const viewHistory = (row) => {
  selectedPatch.value = {
    id: row.patch_id,
    title: row.patch_title || row.title
  }
  historyDialogVisible.value = true
}

const onRollbackFromDialog = () => {
  fetchVersions()
}

onMounted(() => {
  fetchVersions()
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
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  max-width: 300px;
  flex: 1;
  min-width: 200px;
}

.stats-cards {
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.total {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.stat-icon.edits {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.stat-icon.rollback {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.stat-icon.patches {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.patch-title-cell {
  color: var(--text-primary);
  font-weight: 500;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.change-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.dialog-patch-info {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.dialog-patch-info h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

:deep(.el-dialog__body) {
  padding: 20px 24px;
}

@media (max-width: 768px) {
  .stats-cards .el-col {
    margin-bottom: 1rem;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar .el-input,
  .filter-bar .el-date-picker {
    width: 100% !important;
  }
}
</style>
