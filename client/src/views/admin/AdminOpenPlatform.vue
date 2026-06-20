<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🔐 开放平台管理</h1>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
          <el-icon><Key /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.overview?.total_keys || 0 }}</div>
          <div class="stat-label">总密钥数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.overview?.active_keys || 0 }}</div>
          <div class="stat-label">活跃密钥</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
          <el-icon><Lock /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.overview?.banned_keys || 0 }}</div>
          <div class="stat-label">已封禁</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
          <el-icon><Connection /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.overview?.count || 0 }}</div>
          <div class="stat-label">近30日调用</div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索密钥名、用户名、邮箱、API Key"
        clearable
        class="search-input"
        @keyup.enter="fetchKeys"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="filters.status" placeholder="状态筛选" class="filter-select" @change="fetchKeys" clearable>
        <el-option label="全部" value="" />
        <el-option label="正常" value="active" />
        <el-option label="停用" value="inactive" />
        <el-option label="已封禁" value="banned" />
      </el-select>
      <el-button type="primary" @click="fetchKeys">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="store.adminKeys" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" width="180">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="32" :src="row.avatar">
                {{ row.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <div class="user-meta">
                <div class="username">{{ row.username }}</div>
                <div class="user-email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="密钥名称" min-width="150" />
        <el-table-column label="API Key" width="200">
          <template #default="{ row }">
            <code class="key-code">{{ row.api_key?.slice(0, 12) }}...</code>
          </template>
        </el-table-column>
        <el-table-column label="限流配置" width="200">
          <template #default="{ row }">
            <div class="rate-info">
              <span>{{ row.rate_limit_per_min }}/分</span>
              <span>{{ row.rate_limit_per_hour }}/时</span>
              <span>{{ row.rate_limit_per_day }}/日</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_calls" label="总调用" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openRateLimitDialog(row)">
              限流
            </el-button>
            <el-button 
              v-if="row.status !== 'banned'" 
              size="small" 
              type="danger" 
              @click="openBanDialog(row)"
            >
              封禁
            </el-button>
            <el-button 
              v-else
              size="small" 
              type="success" 
              @click="unbanKey(row)"
            >
              解封
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="store.adminKeysPagination" class="pagination-wrap">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.page_size"
          :total="store.adminKeysPagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchKeys"
          @current-change="fetchKeys"
        />
      </div>
    </div>

    <el-dialog v-model="banDialogVisible" title="封禁 API 密钥" width="500px">
      <el-form :model="banForm" label-width="100px">
        <el-form-item label="密钥名称">
          <el-tag>{{ banningKey?.name }}</el-tag>
        </el-form-item>
        <el-form-item label="所属用户">
          <span>{{ banningKey?.username }} ({{ banningKey?.email }})</span>
        </el-form-item>
        <el-form-item label="封禁原因" prop="reason">
          <el-input
            v-model="banForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入封禁原因（将显示给用户）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="banDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmBan">确认封禁</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rateLimitDialogVisible" title="调整限流配置" width="500px">
      <el-form :model="rateLimitForm" label-width="100px">
        <el-form-item label="密钥名称">
          <el-tag>{{ rateLimitKey?.name }}</el-tag>
        </el-form-item>
        <el-form-item label="每分钟">
          <el-input-number v-model="rateLimitForm.rate_limit_per_min" :min="1" :max="100000" />
        </el-form-item>
        <el-form-item label="每小时">
          <el-input-number v-model="rateLimitForm.rate_limit_per_hour" :min="1" :max="1000000" />
        </el-form-item>
        <el-form-item label="每天">
          <el-input-number v-model="rateLimitForm.rate_limit_per_day" :min="1" :max="10000000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rateLimitDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRateLimit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Key, CircleCheck, Lock, Connection, Search
} from '@element-plus/icons-vue'
import { useOpenPlatformStore } from '@/stores/openPlatformStore'

const store = useOpenPlatformStore()

const loading = ref(false)
const stats = ref(null)

const filters = reactive({
  page: 1,
  page_size: 20,
  keyword: '',
  status: ''
})

const banDialogVisible = ref(false)
const banningKey = ref(null)
const banForm = reactive({ reason: '' })

const rateLimitDialogVisible = ref(false)
const rateLimitKey = ref(null)
const rateLimitForm = reactive({
  rate_limit_per_min: 60,
  rate_limit_per_hour: 1000,
  rate_limit_per_day: 10000
})

const getStatusTagType = (status) => {
  return { active: 'success', inactive: 'info', banned: 'danger' }[status] || 'info'
}

const getStatusText = (status) => {
  return { active: '正常', inactive: '停用', banned: '已封禁' }[status] || status
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const fetchStats = async () => {
  try {
    const res = await store.adminFetchPlatformStats({ days: 30 })
    stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const fetchKeys = async () => {
  loading.value = true
  try {
    await store.adminFetchAllKeys(filters)
  } finally {
    loading.value = false
  }
}

const openBanDialog = (key) => {
  banningKey.value = key
  banForm.reason = ''
  banDialogVisible.value = true
}

const confirmBan = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要封禁密钥 "${banningKey.value.name}" 吗？封禁后该密钥及其所有令牌将立即失效。`,
      '封禁确认',
      { type: 'warning', confirmButtonText: '确认封禁', cancelButtonText: '取消' }
    )
    await store.adminBanKey(banningKey.value.id, { reason: banForm.reason })
    ElMessage.success('已封禁')
    banDialogVisible.value = false
    fetchStats()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.error || '操作失败')
  }
}

const unbanKey = async (key) => {
  try {
    await ElMessageBox.confirm(
      `确定要解封密钥 "${key.name}" 吗？解封后该密钥将恢复使用。`,
      '解封确认',
      { type: 'info', confirmButtonText: '确认解封', cancelButtonText: '取消' }
    )
    await store.adminUnbanKey(key.id)
    ElMessage.success('已解封')
    fetchStats()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.error || '操作失败')
  }
}

const openRateLimitDialog = (key) => {
  rateLimitKey.value = key
  rateLimitForm.rate_limit_per_min = key.rate_limit_per_min
  rateLimitForm.rate_limit_per_hour = key.rate_limit_per_hour
  rateLimitForm.rate_limit_per_day = key.rate_limit_per_day
  rateLimitDialogVisible.value = true
}

const confirmRateLimit = async () => {
  try {
    await store.adminUpdateRateLimit(rateLimitKey.value.id, { ...rateLimitForm })
    ElMessage.success('限流配置已更新')
    rateLimitDialogVisible.value = false
  } catch (e) {
    ElMessage.error(e?.error || '操作失败')
  }
}

onMounted(() => {
  fetchStats()
  fetchKeys()
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.filter-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 280px;
}

.filter-select {
  min-width: 160px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 500;
  color: var(--text-primary);
}

.user-email {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.key-code {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.rate-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}
</style>
