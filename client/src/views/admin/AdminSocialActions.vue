<template>
  <div class="social-actions-page">
    <div class="page-header">
      <h1 class="page-title">❤️ 社交行为监控</h1>
      <p class="page-desc">监控点赞、收藏等社交行为，防止恶意刷量</p>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon like-icon">
              <el-icon><Goods /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.todayLikes || 0 }}</div>
              <div class="stat-label">今日点赞数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon favorite-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.todayFavorites || 0 }}</div>
              <div class="stat-label">今日收藏数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blocked-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.todayBlocked || 0 }}</div>
              <div class="stat-label">今日拦截数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon user-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.highFrequencyUsers || 0 }}</div>
              <div class="stat-label">高频用户数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="操作类型">
          <el-select v-model="filters.action_type" placeholder="全部" clearable style="width: 150px">
            <el-option label="点赞" value="patch_like" />
            <el-option label="收藏" value="patch_favorite" />
            <el-option label="评论点赞" value="comment_like" />
            <el-option label="文章点赞" value="article_like" />
            <el-option label="文章收藏" value="article_favorite" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 150px">
            <el-option label="成功" value="success" />
            <el-option label="被拦截" value="blocked" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input v-model="filters.user_id" placeholder="用户ID" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="IP地址">
          <el-input v-model="filters.ip_address" placeholder="IP地址" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchLogs">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilters">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="fetchOverview">
            <el-icon><Refresh /></el-icon>
            刷新统计
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="logs-card">
      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="user_id" label="用户ID" width="100" />
        <el-table-column label="操作类型" width="130">
          <template #default="{ row }">
            <el-tag :type="getActionTypeTag(row.action_type)" size="small">
              {{ getActionTypeLabel(row.action_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_type" label="目标类型" width="100">
          <template #default="{ row }">
            {{ row.target_type || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="target_id" label="目标ID" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP地址" width="130" />
        <el-table-column prop="user_agent" label="设备信息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="block_reason" label="拦截原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.block_reason || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.page_size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Goods, Star, Warning, User, Search, Refresh } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const loading = ref(false)
const overview = ref({})
const logs = ref([])
const total = ref(0)
const dateRange = ref([])

const filters = reactive({
  action_type: '',
  status: '',
  user_id: '',
  ip_address: '',
  page: 1,
  page_size: 20
})

const getActionTypeLabel = (type) => {
  const labels = {
    patch_like: '点赞',
    patch_favorite: '收藏',
    comment_like: '评论点赞',
    article_like: '文章点赞',
    article_favorite: '文章收藏'
  }
  return labels[type] || type
}

const getActionTypeTag = (type) => {
  if (type.includes('like')) return 'primary'
  if (type.includes('favorite')) return 'warning'
  return 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    success: '成功',
    blocked: '被拦截',
    failed: '失败'
  }
  return labels[status] || status
}

const getStatusTag = (status) => {
  const types = {
    success: 'success',
    blocked: 'danger',
    failed: 'warning'
  }
  return types[status] || 'info'
}

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const fetchOverview = async () => {
  try {
    const res = await adminApi.getSocialActionOverview()
    overview.value = res || {}
  } catch (err) {
    ElMessage.error('获取统计数据失败')
  }
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = { ...filters }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_time = dateRange.value[0].toISOString()
      params.end_time = dateRange.value[1].toISOString()
    }
    const res = await adminApi.getSocialActionLogs(params)
    logs.value = res?.items || []
    total.value = res?.total || 0
  } catch (err) {
    ElMessage.error('获取日志列表失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.action_type = ''
  filters.status = ''
  filters.user_id = ''
  filters.ip_address = ''
  filters.page = 1
  dateRange.value = []
  fetchLogs()
}

onMounted(() => {
  fetchOverview()
  fetchLogs()
})
</script>

<style scoped>
.social-actions-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.page-desc {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}

.like-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.favorite-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.blocked-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.user-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.filter-card {
  margin-bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.logs-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
