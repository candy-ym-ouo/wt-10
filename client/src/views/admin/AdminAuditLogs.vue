<template>
  <div class="audit-logs-page">
    <div class="page-header">
      <h1 class="page-title">📋 操作审计日志</h1>
      <p class="page-desc">记录所有管理员的操作行为，用于追溯和审计</p>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="操作类型">
          <el-select v-model="filters.action" placeholder="全部" clearable style="width: 150px">
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="审核" value="review" />
            <el-option label="通过" value="approve" />
            <el-option label="拒绝" value="reject" />
            <el-option label="封禁" value="ban" />
            <el-option label="解封" value="unban" />
            <el-option label="导出" value="export" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标类型">
          <el-select v-model="filters.targetType" placeholder="全部" clearable style="width: 150px">
            <el-option label="用户" value="user" />
            <el-option label="Patch" value="patch" />
            <el-option label="模块" value="module" />
            <el-option label="文章" value="article" />
            <el-option label="厂商" value="manufacturer" />
            <el-option label="专题" value="collection" />
            <el-option label="活动" value="activity" />
            <el-option label="挑战赛" value="challenge" />
            <el-option label="下载资源" value="download" />
            <el-option label="商品" value="product" />
            <el-option label="订单" value="order" />
            <el-option label="提现" value="withdrawal" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="用户名/操作/目标" clearable style="width: 200px" />
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
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="logs-card">
      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="操作用户" width="180">
          <template #default="{ row }">
            <div class="user-info">
              <span class="username">{{ row.username || '-' }}</span>
              <el-tag v-if="row.role" :type="getRoleTagType(row.role)" size="small" class="role-tag">
                {{ getRoleLabel(row.role) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_type" label="目标类型" width="100">
          <template #default="{ row }">
            {{ row.target_type || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="target_id" label="目标ID" width="100">
          <template #default="{ row }">
            {{ row.target_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="target_name" label="目标名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.target_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status_code && row.status_code >= 400" type="danger" size="small">失败</el-tag>
            <el-tag v-else type="success" size="small">成功</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP 地址" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="180" sortable />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchLogs"
        @current-change="fetchLogs"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="操作详情" width="700px">
      <el-descriptions v-if="currentLog" :column="2" border>
        <el-descriptions-item label="日志ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="操作时间">{{ currentLog.created_at }}</el-descriptions-item>
        <el-descriptions-item label="操作用户">
          <div class="user-info">
            <span>{{ currentLog.username }}</span>
            <el-tag v-if="currentLog.role" :type="getRoleTagType(currentLog.role)" size="small">
              {{ getRoleLabel(currentLog.role) }}
            </el-tag>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ currentLog.user_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">
          <el-tag :type="getActionTagType(currentLog.action)" size="small">
            {{ getActionLabel(currentLog.action) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="目标类型">{{ currentLog.target_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标ID">{{ currentLog.target_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标名称">{{ currentLog.target_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="currentLog.status_code && currentLog.status_code >= 400" type="danger" size="small">失败</el-tag>
          <el-tag v-else type="success" size="small">成功</el-tag>
          <span v-if="currentLog.status_code">({{ currentLog.status_code }})</span>
        </el-descriptions-item>
        <el-descriptions-item label="IP 地址">{{ currentLog.ip_address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="User Agent" :span="2">
          <span class="user-agent">{{ currentLog.user_agent || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.error_message" label="错误信息" :span="2">
          <span class="error-message">{{ currentLog.error_message }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.old_value" label="变更前" :span="2">
          <pre class="json-pre">{{ formatJson(currentLog.old_value) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.new_value" label="变更后" :span="2">
          <pre class="json-pre">{{ formatJson(currentLog.new_value) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { adminAuditLogAPI } from '@/api'
import { ROLE_LABELS, AUDIT_ACTION_LABELS } from '@/constants/permissions'

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const dateRange = ref([])
const detailVisible = ref(false)
const currentLog = ref(null)

const filters = reactive({
  action: '',
  targetType: '',
  keyword: ''
})

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      action: filters.action || undefined,
      targetType: filters.targetType || undefined,
      keyword: filters.keyword || undefined
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]?.toISOString()
      params.endDate = dateRange.value[1]?.toISOString()
    }
    const res = await adminAuditLogAPI.getList(params)
    logs.value = res.list
    total.value = res.total
  } catch (e) {
    ElMessage.error('获取审计日志失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.action = ''
  filters.targetType = ''
  filters.keyword = ''
  dateRange.value = []
  page.value = 1
  fetchLogs()
}

const viewDetail = (row) => {
  currentLog.value = row
  detailVisible.value = true
}

const getActionLabel = (action) => {
  return AUDIT_ACTION_LABELS[action] || action
}

const getActionTagType = (action) => {
  const typeMap = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    review: 'info',
    approve: 'success',
    reject: 'danger',
    ban: 'danger',
    unban: 'success',
    login: '',
    logout: '',
    export: 'info'
  }
  return typeMap[action] || ''
}

const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role
}

const getRoleTagType = (role) => {
  const typeMap = {
    admin: 'danger',
    operator: 'warning',
    auditor: 'success'
  }
  return typeMap[role] || 'info'
}

const formatJson = (str) => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.audit-logs-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  margin-bottom: 0.5rem;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.page-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.filter-card {
  margin-bottom: 1rem;
}

.filter-form {
  margin: 0;
}

.logs-card {
  border-radius: 8px;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.username {
  font-weight: 500;
  color: var(--text-primary);
}

.role-tag {
  margin-left: 0.25rem;
}

.user-agent {
  font-size: 0.85rem;
  color: var(--text-secondary);
  word-break: break-all;
}

.error-message {
  color: #ef4444;
  font-size: 0.9rem;
}

.json-pre {
  margin: 0;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.85rem;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
