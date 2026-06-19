<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🎖️ 创作者认证审核</h1>
      <p class="page-subtitle">管理创作者认证申请，审核用户资料</p>
    </div>

    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon stat-total">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-label">总申请数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon stat-pending">
              <el-icon><Trophy /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待审核</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon stat-approved">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.approved || 0 }}</div>
              <div class="stat-label">已通过</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon stat-rejected">
              <el-icon><Delete /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.rejected || 0 }}</div>
              <div class="stat-label">已拒绝</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索用户名、真实姓名或邮箱"
        clearable
        class="search-input"
        @keyup.enter="fetchList"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="审核状态" style="width: 160px;" @change="fetchList">
        <el-option label="全部状态" value="all" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-button type="primary" @click="fetchList">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar">
                {{ row.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <div class="user-info">
                <div class="username">{{ row.username }}</div>
                <div class="user-email">{{ row.user_email || row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="real_name" label="真实姓名" width="120" />
        <el-table-column label="专业领域" width="140">
          <template #default="{ row }">
            {{ getFieldLabel(row.professional_field) }}
          </template>
        </el-table-column>
        <el-table-column prop="experience_years" label="从业年限" width="100">
          <template #default="{ row }">
            {{ row.experience_years }} 年
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              size="small"
              @click="quickApprove(row)"
            >
              通过
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
      title="认证申请详情"
      width="700px"
      class="detail-dialog"
    >
      <div v-if="detailData" class="detail-content">
        <div class="detail-section">
          <h4>申请人信息</h4>
          <div class="applicant-info">
            <el-avatar :size="60" :src="detailData.verification.avatar">
              {{ detailData.verification.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="applicant-details">
              <div class="applicant-name">
                {{ detailData.verification.username }}
                <el-tag :type="getStatusTagType(detailData.verification.status)" style="margin-left: 8px;">
                  {{ getStatusText(detailData.verification.status) }}
                </el-tag>
              </div>
              <div class="applicant-email">{{ detailData.verification.user_email }}</div>
              <div class="applicant-register">注册时间：{{ formatDate(detailData.verification.user_registered_at) }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>创作数据统计</h4>
          <el-row :gutter="16">
            <el-col :span="6">
              <div class="mini-stat">
                <div class="mini-value">{{ detailData.patchStats.total_patches || 0 }}</div>
                <div class="mini-label">发布作品</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="mini-stat">
                <div class="mini-value">{{ detailData.patchStats.total_likes || 0 }}</div>
                <div class="mini-label">获得点赞</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="mini-stat">
                <div class="mini-value">{{ detailData.patchStats.total_views || 0 }}</div>
                <div class="mini-label">总浏览量</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="mini-stat">
                <div class="mini-value">{{ detailData.patchStats.total_favorites || 0 }}</div>
                <div class="mini-label">被收藏数</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="detail-section">
          <h4>认证申请资料</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="真实姓名">{{ detailData.verification.real_name }}</el-descriptions-item>
            <el-descriptions-item label="身份证号">{{ detailData.verification.id_card || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detailData.verification.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="认证邮箱">{{ detailData.verification.email }}</el-descriptions-item>
            <el-descriptions-item label="从业年限">{{ detailData.verification.experience_years }} 年</el-descriptions-item>
            <el-descriptions-item label="专业领域">{{ getFieldLabel(detailData.verification.professional_field) }}</el-descriptions-item>
            <el-descriptions-item label="个人简介" :span="2">{{ detailData.verification.bio || '-' }}</el-descriptions-item>
            <el-descriptions-item label="作品集链接" :span="2">
              <a v-if="detailData.verification.portfolio_url" :href="detailData.verification.portfolio_url" target="_blank" class="link">
                {{ detailData.verification.portfolio_url }}
              </a>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="社交链接" :span="2">
              <div v-if="detailData.verification.social_links && detailData.verification.social_links.length > 0">
                <div v-for="(link, idx) in detailData.verification.social_links" :key="idx">
                  <a :href="link" target="_blank" class="link">{{ link }}</a>
                </div>
              </div>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="资质证明" :span="2">{{ detailData.verification.certificate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="申请时间" :span="2">{{ formatDate(detailData.verification.created_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="detailData.verification.status !== 'pending'" class="detail-section">
          <h4>审核记录</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="审核结果">
              <el-tag :type="getStatusTagType(detailData.verification.status)">
                {{ getStatusText(detailData.verification.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审核人">{{ detailData.verification.reviewer_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ formatDate(detailData.verification.reviewed_at) }}</el-descriptions-item>
            <el-descriptions-item label="审核备注" :span="2">{{ detailData.verification.review_note || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="detailData.verification.status === 'pending'" class="review-section">
          <h4>审核操作</h4>
          <el-form :model="reviewForm" label-width="100px">
            <el-form-item label="审核备注">
              <el-input
                v-model="reviewForm.review_note"
                type="textarea"
                :rows="3"
                placeholder="请输入审核备注（拒绝时必填）"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="success"
                :loading="reviewing"
                @click="review('approved')"
              >
                <el-icon><Star /></el-icon>
                通过认证
              </el-button>
              <el-button
                type="danger"
                :loading="reviewing"
                @click="review('rejected')"
              >
                <el-icon><Delete /></el-icon>
                拒绝申请
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
  Document, Trophy, Star, Delete, Search
} from '@element-plus/icons-vue'
import { adminCreatorVerificationAPI } from '@/api'

const loading = ref(false)
const reviewing = ref(false)
const keyword = ref('')
const statusFilter = ref('all')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const list = ref([])
const stats = ref({})
const detailVisible = ref(false)
const detailData = ref(null)
const reviewForm = reactive({
  review_note: ''
})

const fieldLabels = {
  modular_performance: '模块化合成器演奏',
  sound_design: '声音设计',
  music_production: '音乐制作',
  module_development: '模块开发',
  live_performance: '现场演出',
  education: '教学/培训',
  other: '其他'
}

const getFieldLabel = (field) => fieldLabels[field] || field || '-'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getStatusText = (status) => {
  const map = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return map[status] || status
}

const getStatusTagType = (status) => {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const fetchList = async () => {
  try {
    loading.value = true
    const res = await adminCreatorVerificationAPI.getList({
      page: page.value,
      limit: limit.value,
      status: statusFilter.value,
      search: keyword.value
    })
    list.value = res.list || []
    total.value = res.total || 0
    stats.value = res.stats || {}
  } catch (err) {
    ElMessage.error('获取认证申请列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (newPage) => {
  page.value = newPage
  fetchList()
}

const viewDetail = async (row) => {
  try {
    detailData.value = null
    reviewForm.review_note = ''
    const res = await adminCreatorVerificationAPI.getDetail(row.id)
    detailData.value = res
    detailVisible.value = true
  } catch (err) {
    ElMessage.error('获取详情失败')
    console.error(err)
  }
}

const quickApprove = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过用户 "${row.username}" 的创作者认证申请吗？`,
      '确认通过',
      { type: 'success' }
    )
    await adminCreatorVerificationAPI.review(row.id, { status: 'approved', review_note: '' })
    ElMessage.success('已通过认证')
    fetchList()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const review = async (status) => {
  if (status === 'rejected' && !reviewForm.review_note.trim()) {
    ElMessage.warning('拒绝申请时请填写审核备注')
    return
  }

  try {
    const actionText = status === 'approved' ? '通过' : '拒绝'
    await ElMessageBox.confirm(
      `确定要${actionText}该认证申请吗？`,
      '确认操作',
      { type: status === 'approved' ? 'success' : 'warning' }
    )

    reviewing.value = true
    await adminCreatorVerificationAPI.review(detailData.value.verification.id, {
      status,
      review_note: reviewForm.review_note
    })
    ElMessage.success(`已${actionText}认证申请`)
    detailVisible.value = false
    fetchList()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  } finally {
    reviewing.value = false
  }
}

onMounted(() => {
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

.stat-approved {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.stat-rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
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

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 600;
  color: var(--text-primary);
}

.user-email {
  font-size: 12px;
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
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.applicant-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.applicant-details {
  flex: 1;
}

.applicant-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.applicant-email,
.applicant-register {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.mini-stat {
  text-align: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.mini-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.mini-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.link {
  color: var(--primary-color);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.review-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.review-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
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
