<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🚨 内容举报中心</h1>
      <p class="page-subtitle">管理用户举报的内容，处理违规行为并执行处罚</p>
    </div>

    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="5">
          <div class="stat-card">
            <div class="stat-icon stat-total">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-label">总举报数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-card">
            <div class="stat-icon stat-pending">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-card">
            <div class="stat-icon stat-processing">
              <el-icon><Loading /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.processing || 0 }}</div>
              <div class="stat-label">处理中</div>
            </div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-card">
            <div class="stat-icon stat-resolved">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.resolved || 0 }}</div>
              <div class="stat-label">已处理</div>
            </div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-icon stat-rejected">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.rejected || 0 }}</div>
              <div class="stat-label">已驳回</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索举报人、被举报人或举报理由"
        clearable
        class="search-input"
        @keyup.enter="fetchList"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="处理状态" style="width: 140px;" @change="fetchList">
        <el-option label="全部状态" value="all" />
        <el-option label="待处理" value="pending" />
        <el-option label="处理中" value="processing" />
        <el-option label="已处理" value="resolved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-select v-model="targetTypeFilter" placeholder="举报类型" style="width: 140px;" @change="fetchList">
        <el-option label="全部类型" value="all" />
        <el-option label="Patch 作品" value="patch" />
        <el-option label="评论" value="comment" />
        <el-option label="用户资料" value="user_profile" />
      </el-select>
      <el-select v-model="categoryFilter" placeholder="违规分类" style="width: 160px;" @change="fetchList">
        <el-option label="全部分类" value="all" />
        <el-option v-for="cat in categoryList" :key="cat.value" :label="cat.label" :value="cat.value" />
      </el-select>
      <el-button type="primary" @click="fetchList">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="resetFilters">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
    </div>

    <div class="table-card">
      <div class="table-header">
        <div class="batch-actions" v-if="selectedIds.length > 0">
          <span>已选择 {{ selectedIds.length }} 项</span>
          <el-button size="small" type="success" @click="batchHandle('resolved')">
            <el-icon><CircleCheck /></el-icon>
            批量通过处理
          </el-button>
          <el-button size="small" type="warning" @click="batchHandle('rejected')">
            <el-icon><CircleClose /></el-icon>
            批量驳回
          </el-button>
          <el-button size="small" @click="selectedIds = []">取消选择</el-button>
        </div>
      </div>

      <el-table
        :data="list"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="isSelectable" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="举报类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTargetTypeTagType(row.target_type)">
              {{ getTargetTypeLabel(row.target_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="违规分类" width="120">
          <template #default="{ row }">
            {{ getCategoryLabel(row.category) }}
          </template>
        </el-table-column>
        <el-table-column label="举报人" width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :src="row.reporter_avatar">
                {{ row.reporter_name?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ row.reporter_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="被举报人" width="160">
          <template #default="{ row }">
            <div class="user-cell" v-if="row.target_user_name">
              <el-avatar :size="32" :src="row.target_user_avatar">
                {{ row.target_user_name?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ row.target_user_name }}</span>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="举报理由" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="举报时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              size="small"
              @click="quickHandle(row, 'processing')"
            >
              受理
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="limit"
          :current-page="page"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="detailVisible"
      title="举报详情"
      width="900px"
      class="detail-dialog"
      destroy-on-close
    >
      <div v-if="detailData" class="detail-content">
        <el-row :gutter="24">
          <el-col :span="14">
            <div class="detail-section">
              <h4>举报信息</h4>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="举报ID">{{ detailData.report.id }}</el-descriptions-item>
                <el-descriptions-item label="举报类型">
                  <el-tag :type="getTargetTypeTagType(detailData.report.target_type)">
                    {{ getTargetTypeLabel(detailData.report.target_type) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="违规分类">
                  {{ getCategoryLabel(detailData.report.category) }}
                </el-descriptions-item>
                <el-descriptions-item label="优先级">
                  <el-tag :type="detailData.report.priority === 'high' ? 'danger' : 'info'">
                    {{ detailData.report.priority === 'high' ? '高' : '普通' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="当前状态">
                  <el-tag :type="getStatusTagType(detailData.report.status)">
                    {{ getStatusText(detailData.report.status) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="举报理由">{{ detailData.report.reason }}</el-descriptions-item>
                <el-descriptions-item label="补充说明" v-if="detailData.report.description">
                  {{ detailData.report.description }}
                </el-descriptions-item>
                <el-descriptions-item label="举报时间">{{ formatDate(detailData.report.created_at) }}</el-descriptions-item>
                <el-descriptions-item label="处理人" v-if="detailData.report.handler_name">
                  {{ detailData.report.handler_name }}
                </el-descriptions-item>
                <el-descriptions-item label="处理时间" v-if="detailData.report.handled_at">
                  {{ formatDate(detailData.report.handled_at) }}
                </el-descriptions-item>
                <el-descriptions-item label="处理结果" v-if="detailData.report.handle_result">
                  {{ detailData.report.handle_result }}
                </el-descriptions-item>
                <el-descriptions-item label="处理备注" v-if="detailData.report.handle_note">
                  {{ detailData.report.handle_note }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="detail-section">
              <h4>举报人信息</h4>
              <div class="user-info-block">
                <el-avatar :size="48" :src="detailData.report.reporter_avatar">
                  {{ detailData.report.reporter_name?.charAt(0).toUpperCase() }}
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ detailData.report.reporter_name }}</div>
                  <div class="user-email">{{ detailData.report.reporter_email }}</div>
                </div>
              </div>
            </div>

            <div v-if="detailData.report.target_user_name" class="detail-section">
              <h4>被举报人信息</h4>
              <div class="user-info-block">
                <el-avatar :size="48" :src="detailData.report.target_user_avatar">
                  {{ detailData.report.target_user_name?.charAt(0).toUpperCase() }}
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ detailData.report.target_user_name }}</div>
                  <div class="user-email">{{ detailData.report.target_user_email }}</div>
                </div>
              </div>
            </div>

            <div v-if="detailData.report.target_info" class="detail-section">
              <h4>被举报内容</h4>
              <div class="target-content-card">
                <template v-if="detailData.report.target_type === 'patch'">
                  <div class="target-content-title">
                    <router-link :to="`/patches/${detailData.report.target_id}`" class="link">
                      {{ detailData.report.target_info.title }}
                    </router-link>
                  </div>
                  <div class="target-content-meta">
                    作者：{{ detailData.report.target_info.author_name }}
                  </div>
                  <div class="target-content-desc">
                    {{ detailData.report.target_info.description }}
                  </div>
                  <div class="target-content-status">
                    状态：<el-tag size="small">{{ detailData.report.target_info.status }}</el-tag>
                  </div>
                </template>
                <template v-else-if="detailData.report.target_type === 'comment'">
                  <div class="target-content-meta">
                    来自：{{ detailData.report.target_info.author_name }}
                    · 在 Patch
                    <router-link :to="`/patches/${detailData.report.target_info.patch_id}`" class="link">
                      {{ detailData.report.target_info.patch_title }}
                    </router-link>
                  </div>
                  <div class="target-content-text">
                    {{ detailData.report.target_info.content }}
                  </div>
                </template>
                <template v-else-if="detailData.report.target_type === 'user_profile'">
                  <div class="target-content-title">
                    <router-link :to="`/users/${detailData.report.target_id}`" class="link">
                      {{ detailData.report.target_info.username }}
                    </router-link>
                  </div>
                  <div class="target-content-desc">
                    {{ detailData.report.target_info.bio || '暂无个人简介' }}
                  </div>
                </template>
              </div>
            </div>
          </el-col>

          <el-col :span="10">
            <div v-if="detailData.related_reports && detailData.related_reports.length > 0" class="detail-section">
              <h4>相关举报（同一对象）</h4>
              <div class="related-list">
                <div v-for="r in detailData.related_reports" :key="r.id" class="related-item">
                  <div class="related-header">
                    <span class="related-user">{{ r.reporter_name }}</span>
                    <el-tag size="small" :type="getStatusTagType(r.status)">
                      {{ getStatusText(r.status) }}
                    </el-tag>
                  </div>
                  <div class="related-reason">{{ r.reason }}</div>
                  <div class="related-time">{{ formatDate(r.created_at) }}</div>
                </div>
              </div>
            </div>

            <div v-if="detailData.punishments && detailData.punishments.length > 0" class="detail-section">
              <h4>处罚记录</h4>
              <div class="punishment-list">
                <div v-for="p in detailData.punishments" :key="p.id" class="punishment-item">
                  <div class="punishment-header">
                    <el-tag type="danger" size="small">{{ getPunishmentLabel(p.punishment_type) }}</el-tag>
                    <span class="punishment-handler">执行人：{{ p.handler_name || '系统' }}</span>
                  </div>
                  <div v-if="p.punishment_reason" class="punishment-reason">
                    {{ p.punishment_reason }}
                  </div>
                  <div class="punishment-time">
                    {{ formatDate(p.created_at) }}
                    <template v-if="p.ends_at && !p.is_permanent">
                      · 有效期至 {{ formatDate(p.ends_at) }}
                    </template>
                    <template v-if="p.is_permanent">
                      · 永久
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="detailData.target_user_history && detailData.target_user_history.length > 0" class="detail-section">
              <h4>被举报人历史记录</h4>
              <div class="history-list">
                <div v-for="h in detailData.target_user_history.slice(0, 5)" :key="h.id" class="history-item">
                  <span class="history-type">
                    {{ h.punishment_type ? getPunishmentLabel(h.punishment_type) : '举报记录' }}
                  </span>
                  <span class="history-status">{{ h.status ? getStatusText(h.status) : '' }}</span>
                  <span class="history-time">{{ formatDate(h.created_at) }}</span>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>

        <div
          v-if="detailData.report.status === 'pending' || detailData.report.status === 'processing'"
          class="handle-section"
        >
          <h4>处理操作</h4>
          <el-form :model="handleForm" label-width="100px">
            <el-form-item label="处理状态">
              <el-radio-group v-model="handleForm.status">
                <el-radio value="processing">受理中</el-radio>
                <el-radio value="resolved">已处理（执行处罚）</el-radio>
                <el-radio value="rejected">驳回举报</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="处理结果" v-if="handleForm.status === 'resolved' || handleForm.status === 'rejected'">
              <el-input
                v-model="handleForm.handle_result"
                placeholder="简要描述处理结果"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="处理备注">
              <el-input
                v-model="handleForm.handle_note"
                type="textarea"
                :rows="2"
                placeholder="处理备注（将通知举报人）"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <div v-if="handleForm.status === 'resolved'" class="punishment-form">
              <h5>处罚措施</h5>
              <el-form-item label="处罚类型">
                <el-radio-group v-model="handleForm.punishment.punishment_type">
                  <el-radio
                    v-for="pt in punishmentTypes"
                    :key="pt.value"
                    :value="pt.value"
                  >
                    {{ pt.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item
                label="封禁时长"
                v-if="handleForm.punishment.punishment_type === 'suspend_user'"
              >
                <el-input-number
                  v-model="handleForm.punishment.punishment_duration"
                  :min="1"
                  :max="365"
                />
                <span style="margin-left: 8px;">天</span>
                <el-checkbox
                  v-model="handleForm.punishment.is_permanent"
                  style="margin-left: 16px;"
                >
                  永久封禁
                </el-checkbox>
              </el-form-item>

              <el-form-item label="处罚理由">
                <el-input
                  v-model="handleForm.punishment.punishment_reason"
                  type="textarea"
                  :rows="2"
                  placeholder="处罚理由（将通知被举报人）"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </div>

            <el-form-item>
              <el-button
                type="primary"
                :loading="handling"
                @click="submitHandle"
              >
                <el-icon><Check /></el-icon>
                提交处理
              </el-button>
              <el-button @click="detailVisible = false">
                取消
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, Clock, Loading, CircleCheck, CircleClose,
  Search, Refresh, Check
} from '@element-plus/icons-vue'
import { adminContentReportAPI, contentReportAPI } from '@/api'

const loading = ref(false)
const handling = ref(false)
const keyword = ref('')
const statusFilter = ref('all')
const targetTypeFilter = ref('all')
const categoryFilter = ref('all')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const list = ref([])
const stats = ref({})
const categoryList = ref([])
const punishmentTypes = ref([])
const selectedIds = ref([])

const detailVisible = ref(false)
const detailData = ref(null)

const handleForm = reactive({
  status: 'processing',
  handle_result: '',
  handle_note: '',
  punishment: {
    punishment_type: 'warn_user',
    punishment_duration: 7,
    punishment_reason: '',
    is_permanent: false
  }
})

const targetTypeLabels = {
  patch: 'Patch 作品',
  comment: '评论',
  user_profile: '用户资料'
}

const targetTypeTagTypes = {
  patch: '',
  comment: 'success',
  user_profile: 'warning'
}

const statusTexts = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  rejected: '已驳回'
}

const statusTagTypes = {
  pending: 'warning',
  processing: 'primary',
  resolved: 'success',
  rejected: 'info'
}

const categoryLabels = {}
const punishmentLabels = {}

const getTargetTypeLabel = (type) => targetTypeLabels[type] || type
const getTargetTypeTagType = (type) => targetTypeTagTypes[type] || 'info'
const getStatusText = (status) => statusTexts[status] || status
const getStatusTagType = (status) => statusTagTypes[status] || 'info'
const getCategoryLabel = (cat) => categoryLabels[cat] || cat
const getPunishmentLabel = (type) => punishmentLabels[type] || type

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadCategories = async () => {
  try {
    const res = await contentReportAPI.getCategories()
    categoryList.value = res.categories || []
    punishmentTypes.value = res.punishment_types || []
    res.categories.forEach(c => { categoryLabels[c.value] = c.label })
    res.punishment_types.forEach(p => { punishmentLabels[p.value] = p.label })
  } catch (err) {
    console.error('加载分类失败', err)
  }
}

const fetchList = async () => {
  try {
    loading.value = true
    const res = await adminContentReportAPI.getList({
      page: page.value,
      limit: limit.value,
      status: statusFilter.value,
      target_type: targetTypeFilter.value,
      category: categoryFilter.value,
      search: keyword.value
    })
    list.value = res.list || []
    total.value = res.total || 0
    stats.value = res.stats || {}
  } catch (err) {
    ElMessage.error('获取举报列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  keyword.value = ''
  statusFilter.value = 'all'
  targetTypeFilter.value = 'all'
  categoryFilter.value = 'all'
  page.value = 1
  fetchList()
}

const handlePageChange = (newPage) => {
  page.value = newPage
  fetchList()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.filter(r => r.status === 'pending' || r.status === 'processing').map(r => r.id)
}

const isSelectable = (row) => {
  return row.status === 'pending' || row.status === 'processing'
}

const viewDetail = async (row) => {
  try {
    detailData.value = null
    handleForm.status = 'processing'
    handleForm.handle_result = ''
    handleForm.handle_note = ''
    handleForm.punishment = {
      punishment_type: 'warn_user',
      punishment_duration: 7,
      punishment_reason: '',
      is_permanent: false
    }
    const res = await adminContentReportAPI.getDetail(row.id)
    detailData.value = res
    detailVisible.value = true
  } catch (err) {
    ElMessage.error('获取详情失败')
    console.error(err)
  }
}

const quickHandle = async (row, status) => {
  try {
    await ElMessageBox.confirm(
      `确定要将举报 #${row.id} 标记为"${getStatusText(status)}"吗？`,
      '确认操作',
      { type: 'warning' }
    )
    await adminContentReportAPI.handleReport(row.id, {
      status,
      handle_note: ''
    })
    ElMessage.success('操作成功')
    fetchList()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const submitHandle = async () => {
  if (handleForm.status === 'resolved' && !handleForm.punishment.punishment_type) {
    ElMessage.warning('请选择处罚类型')
    return
  }

  try {
    handling.value = true
    const data = {
      status: handleForm.status,
      handle_result: handleForm.handle_result,
      handle_note: handleForm.handle_note
    }

    if (handleForm.status === 'resolved') {
      data.punishment = {
        punishment_type: handleForm.punishment.punishment_type,
        punishment_duration: handleForm.punishment.is_permanent ? null : handleForm.punishment.punishment_duration,
        punishment_reason: handleForm.punishment.punishment_reason,
        is_permanent: handleForm.punishment.is_permanent
      }
    }

    await adminContentReportAPI.handleReport(detailData.value.report.id, data)
    ElMessage.success('处理成功')
    detailVisible.value = false
    fetchList()
  } catch (err) {
    ElMessage.error(err.error || '处理失败')
    console.error(err)
  } finally {
    handling.value = false
  }
}

const batchHandle = async (status) => {
  try {
    const actionText = status === 'resolved' ? '通过处理' : '驳回'
    await ElMessageBox.confirm(
      `确定要${actionText}选中的 ${selectedIds.value.length} 条举报吗？`,
      '确认批量操作',
      { type: 'warning' }
    )
    await adminContentReportAPI.batchHandle({
      ids: selectedIds.value,
      status,
      handle_note: `批量${actionText}`
    })
    ElMessage.success(`已${actionText} ${selectedIds.value.length} 条举报`)
    selectedIds.value = []
    fetchList()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批量操作失败')
      console.error(err)
    }
  }
}

onMounted(async () => {
  await loadCategories()
  fetchList()
})
</script>

<style scoped>
.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 24px;
}

.stat-total {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.stat-pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.stat-processing {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.stat-resolved {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.stat-rejected {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-input {
  max-width: 320px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.table-header {
  margin-bottom: 16px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.batch-actions span {
  color: var(--text-secondary);
  font-size: 14px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-weight: 500;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-secondary);
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.user-info-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.user-email {
  font-size: 13px;
  color: var(--text-secondary);
}

.target-content-card {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.target-content-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.target-content-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.target-content-desc,
.target-content-text {
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.target-content-status {
  font-size: 13px;
  color: var(--text-secondary);
}

.link {
  color: var(--primary-color);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.related-list,
.punishment-list,
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.related-item,
.punishment-item,
.history-item {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.related-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.related-user {
  font-weight: 500;
  color: var(--text-primary);
}

.related-reason,
.punishment-reason {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.related-time,
.punishment-time,
.history-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.punishment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.punishment-handler {
  font-size: 12px;
  color: var(--text-secondary);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.history-type {
  font-weight: 500;
  color: var(--text-primary);
}

.history-status {
  color: var(--text-secondary);
}

.handle-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.handle-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.punishment-form {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-top: 16px;
}

.punishment-form h5 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

:deep(.detail-dialog .el-dialog__body) {
  padding: 24px;
}

:deep(.detail-dialog .el-descriptions__label) {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-color: var(--border-color);
  width: 100px;
}

:deep(.detail-dialog .el-descriptions__content) {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border-color);
}
</style>
