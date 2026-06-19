<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📊 下载记录统计</h1>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">⬇️</div>
        <div class="stat-info">
          <div class="stat-number">{{ stats.total_downloads || 0 }}</div>
          <div class="stat-label">总下载次数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-number">{{ stats.unique_users || 0 }}</div>
          <div class="stat-label">独立用户数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <div class="stat-number">{{ stats.total_resources || 0 }}</div>
          <div class="stat-label">被下载资源数</div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="resourceId"
        placeholder="资源 ID"
        clearable
        class="filter-input"
        type="number"
        @keyup.enter="fetchRecords"
      />
      <el-input
        v-model="userId"
        placeholder="用户 ID"
        clearable
        class="filter-input"
        type="number"
        @keyup.enter="fetchRecords"
      />
      <el-date-picker
        v-model="startDate"
        type="date"
        placeholder="开始日期"
        value-format="YYYY-MM-DD"
        class="filter-input"
        @change="fetchRecords"
      />
      <el-date-picker
        v-model="endDate"
        type="date"
        placeholder="结束日期"
        value-format="YYYY-MM-DD"
        class="filter-input"
        @change="fetchRecords"
      />
      <el-button type="primary" @click="fetchRecords">
        <el-icon><Search /></el-icon>
        查询
      </el-button>
      <el-button @click="resetFilters">
        重置
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="资源信息" min-width="200">
          <template #default="{ row }">
            <div class="resource-info">
              <span class="resource-name">{{ row.resource_title }}</span>
              <span class="resource-file">{{ row.file_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="resource_id" label="资源ID" width="100" />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            <span v-if="row.username">{{ row.username }}</span>
            <span v-else class="guest-user">访客</span>
          </template>
        </el-table-column>
        <el-table-column prop="user_id" label="用户ID" width="100">
          <template #default="{ row }">
            <span v-if="row.user_id">{{ row.user_id }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP 地址" width="150">
          <template #default="{ row }">
            <span v-if="row.ip_address">{{ row.ip_address }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="downloaded_at" label="下载时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.downloaded_at) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-wrap" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="prev, pager, next, jumper, total"
        @current-change="fetchRecords"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminDownloadApi } from '@/api'

const loading = ref(false)
const records = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const resourceId = ref('')
const userId = ref('')
const startDate = ref('')
const endDate = ref('')
const stats = reactive({
  total_downloads: 0,
  unique_users: 0,
  total_resources: 0
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchRecords = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (resourceId.value) params.resource_id = resourceId.value
    if (userId.value) params.user_id = userId.value
    if (startDate.value) params.start_date = startDate.value
    if (endDate.value) params.end_date = endDate.value

    const res = await adminDownloadApi.getDownloadRecords(params)
    records.value = res.list || []
    total.value = res.total || 0
    if (res.stats) {
      stats.total_downloads = res.stats.total_downloads
      stats.unique_users = res.stats.unique_users
      stats.total_resources = res.stats.total_resources
    }
  } catch (err) {
    ElMessage.error('获取下载记录失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  resourceId.value = ''
  userId.value = ''
  startDate.value = ''
  endDate.value = ''
  currentPage.value = 1
  fetchRecords()
}

onMounted(fetchRecords)
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

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
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
  font-size: 2.5rem;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-input {
  width: 180px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.resource-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.resource-name {
  font-weight: 600;
  color: var(--text-primary);
}

.resource-file {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.guest-user {
  color: var(--text-secondary);
  font-style: italic;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
</style>
