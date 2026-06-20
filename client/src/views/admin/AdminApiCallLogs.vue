<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📊 API 调用记录</h1>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索用户名、密钥名、端点路径"
        clearable
        class="search-input"
        @keyup.enter="fetchLogs"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-input
        v-model="filters.endpoint"
        placeholder="端点路径"
        clearable
        class="filter-input"
        @keyup.enter="fetchLogs"
      />
      <el-select v-model="filters.status_code" placeholder="状态码" class="filter-select" @change="fetchLogs" clearable>
        <el-option label="成功 (2xx)" value="200" />
        <el-option label="客户端错误 (4xx)" value="400" />
        <el-option label="服务器错误 (5xx)" value="500" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        class="date-picker"
        @change="onDateChange"
      />
      <el-button type="primary" @click="fetchLogs">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="store.adminCallLogs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" width="160">
          <template #default="{ row }">
            <div v-if="row.username" class="user-cell">
              <el-tag size="small">{{ row.username }}</el-tag>
            </div>
            <span v-else class="text-secondary">未登录</span>
          </template>
        </el-table-column>
        <el-table-column label="密钥" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.api_key_name" size="small" type="info">
              {{ row.api_key_name }}
            </el-tag>
            <span v-else class="text-secondary">-</span>
          </template>
        </el-table-column>
        <el-table-column label="请求" min-width="320">
          <template #default="{ row }">
            <div class="request-info">
              <el-tag :type="getMethodTagType(row.method)" size="small" class="method-tag">
                {{ row.method }}
              </el-tag>
              <code class="endpoint">{{ row.endpoint }}</code>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status_code" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusCodeTag(row.status_code)" size="small">
              {{ row.status_code || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="response_time_ms" label="耗时" width="100">
          <template #default="{ row }">
            <span :class="getResponseTimeClass(row.response_time_ms)">
              {{ row.response_time_ms }}ms
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP 地址" width="140" />
        <el-table-column prop="error_message" label="错误信息" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.error_message" class="error-text">{{ row.error_message }}</span>
            <span v-else class="text-secondary">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <div v-if="store.adminCallLogsPagination" class="pagination-wrap">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.page_size"
          :total="store.adminCallLogsPagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useOpenPlatformStore } from '@/stores/openPlatformStore'

const store = useOpenPlatformStore()

const loading = ref(false)
const dateRange = ref(null)

const filters = reactive({
  page: 1,
  page_size: 20,
  keyword: '',
  endpoint: '',
  status_code: '',
  start_date: '',
  end_date: ''
})

const getMethodTagType = (method) => {
  return { GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger' }[method] || 'info'
}

const getStatusCodeTag = (code) => {
  if (!code) return 'info'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warning'
  return 'danger'
}

const getResponseTimeClass = (ms) => {
  if (!ms) return 'text-secondary'
  if (ms < 100) return 'success-text'
  if (ms < 500) return 'warning-text'
  return 'danger-text'
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const onDateChange = (range) => {
  if (range && range.length === 2) {
    filters.start_date = range[0]
    filters.end_date = range[1]
  } else {
    filters.start_date = ''
    filters.end_date = ''
  }
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = { ...filters }
    if (!params.keyword) delete params.keyword
    if (!params.endpoint) delete params.endpoint
    if (!params.status_code) delete params.status_code
    if (!params.start_date) delete params.start_date
    if (!params.end_date) delete params.end_date
    await store.adminFetchCallLogs(params)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 240px;
}

.filter-input {
  min-width: 200px;
}

.filter-select {
  min-width: 160px;
}

.date-picker {
  min-width: 280px;
}

.user-cell {
  display: flex;
  align-items: center;
}

.request-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.method-tag {
  flex-shrink: 0;
}

.endpoint {
  font-size: 0.85rem;
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.text-secondary {
  color: var(--text-secondary);
}

.error-text {
  color: #f56c6c;
  font-size: 0.85rem;
}

.success-text {
  color: #67c23a;
  font-weight: 500;
}

.warning-text {
  color: #e6a23c;
  font-weight: 500;
}

.danger-text {
  color: #f56c6c;
  font-weight: 500;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}
</style>
