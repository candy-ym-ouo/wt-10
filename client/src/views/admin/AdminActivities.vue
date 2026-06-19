<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🎯 活动管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建活动
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="search"
        placeholder="搜索活动标题"
        clearable
        @keyup.enter="fetchActivities"
        style="width: 300px;"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="fetchActivities">
        <el-option label="草稿" value="draft" />
        <el-option label="进行中" value="published" />
        <el-option label="即将开始" value="upcoming" />
        <el-option label="已结束" value="ended" />
      </el-select>
      <el-select v-model="typeFilter" placeholder="类型筛选" clearable @change="fetchActivities">
        <el-option label="创作大赛" value="contest" />
        <el-option label="专题征集" value="collection" />
        <el-option label="投票评选" value="vote" />
        <el-option label="其他活动" value="other" />
      </el-select>
    </div>

    <div class="table-card">
      <el-table :data="activities" v-loading="loading" class="activities-table" stripe>
      <el-table-column label="ID" width="80">
        <template #default="{ row }">{{ row.id }}</template>
      </el-table-column>
      <el-table-column label="封面" width="120">
        <template #default="{ row }">
          <div v-if="row.cover_url" class="table-cover">
            <img :src="row.cover_url" :alt="row.title" />
          </div>
          <div v-else class="table-cover placeholder">
            <span>{{ getTypeIcon(row.type) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="活动信息" min-width="250">
        <template #default="{ row }">
          <div class="activity-info-cell">
            <div class="activity-title">{{ row.title }}</div>
            <div class="activity-meta-row">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row.status) }}</el-tag>
              <el-tag type="warning" size="small">{{ getTypeText(row.type) }}</el-tag>
            </div>
            <div class="activity-desc">{{ row.description }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="200">
        <template #default="{ row }">
          <div class="time-info">
            <div><el-icon><Calendar /></el-icon> 报名: {{ formatDate(row.registration_start) }}</div>
            <div><el-icon><Calendar /></el-icon> 活动: {{ formatDate(row.start_date) }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="报名数" width="100" align="center">
        <template #default="{ row }">
          <span class="stat-number">{{ row.registration_count }}</span>
        </template>
      </el-table-column>
      <el-table-column label="作品数" width="100" align="center">
        <template #default="{ row }">
          <span class="stat-number">{{ row.submission_count }}</span>
        </template>
      </el-table-column>
      <el-table-column label="排序" width="100" align="center">
        <el-input-number v-model="row.sort_order" size="small" :min="0" @change="updateSortOrder(row)" />
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewActivity(row)">
            <el-icon><View /></el-icon> 查看
          </el-button>
          <el-button size="small" @click="editActivity(row)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" type="primary" @click="manageRegistrations(row)">
            <el-icon><User /></el-icon> 报名
          </el-button>
          <el-button size="small" type="success" @click="manageSubmissions(row)">
            <el-icon><Document /></el-icon> 作品
          </el-button>
          <el-button size="small" type="danger" @click="deleteActivity(row)">
            <el-icon><Delete /></el-icon>
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
        @current-change="fetchActivities"
        background
      />
    </div>

    <el-dialog v-model="showCreateDialog" :title="isEdit ? '编辑活动' : '新建活动'" width="900px" destroy-on-close>
      <el-form :model="activityForm" :rules="formRules" ref="activityFormRef" label-width="120px" class="activity-form">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="活动标题" prop="title">
              <el-input v-model="activityForm.title" placeholder="请输入活动标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活动类型" prop="type">
              <el-select v-model="activityForm.type">
                <el-option label="创作大赛" value="contest" />
                <el-option label="专题征集" value="collection" />
                <el-option label="投票评选" value="vote" />
                <el-option label="其他活动" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="封面图片">
          <el-input v-model="activityForm.cover_url" placeholder="封面图片URL" />
        </el-form-item>

        <el-form-item label="活动描述">
          <el-input v-model="activityForm.description" type="textarea" :rows="2" placeholder="简短描述活动内容" />
        </el-form-item>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="活动状态" prop="status">
              <el-select v-model="activityForm.status">
                <el-option label="草稿" value="draft" />
                <el-option label="进行中" value="published" />
                <el-option label="即将开始" value="upcoming" />
                <el-option label="已结束" value="ended" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="activityForm.sort_order" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">时间设置</el-divider>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="报名开始">
              <el-date-picker
                v-model="activityForm.registration_start"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报名结束">
              <el-date-picker
                v-model="activityForm.registration_end"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="活动开始">
              <el-date-picker
                v-model="activityForm.start_date"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活动结束">
              <el-date-picker
                v-model="activityForm.end_date"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="投稿开始">
              <el-date-picker
                v-model="activityForm.submission_start"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投稿结束">
              <el-date-picker
                v-model="activityForm.submission_end"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他设置</el-divider>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="最大报名人数">
              <el-input-number v-model="activityForm.max_registrations" :min="0" style="width: 100%;" />
              <div class="form-tip">0表示不限制</div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="允许投稿">
              <el-switch v-model="activityForm.allow_submission" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="显示榜单">
              <el-switch v-model="activityForm.show_ranking" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">详细内容（支持Markdown）</el-divider>

        <el-form-item label="活动详情">
          <el-input v-model="activityForm.content" type="textarea" :rows="8" placeholder="活动详情介绍，支持Markdown" />
        </el-form-item>

        <el-form-item label="活动规则">
          <el-input v-model="activityForm.rules" type="textarea" :rows="6" placeholder="活动规则说明，支持Markdown" />
        </el-form-item>

        <el-form-item label="奖项设置">
          <el-input v-model="activityForm.prizes" type="textarea" :rows="4" placeholder="奖项设置说明，支持Markdown" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveActivity" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRegistrationsDialog" :title="`报名管理 - ${currentActivity?.title}`" width="1000px" destroy-on-close>
      <div class="registrations-toolbar">
        <el-select v-model="registrationStatus" placeholder="筛选状态" clearable @change="fetchRegistrations">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
      </div>
      <el-table :data="registrations" v-loading="registrationsLoading" class="registrations-table">
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="32" :src="row.avatar">
                {{ row.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <div>
                <div>{{ row.username }}</div>
                <div class="text-sm text-gray-400">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getRegStatusType(row.status)" size="small">
              {{ getRegStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button
              size="small"
              type="success"
              :disabled="row.status === 'approved'"
              @click="updateRegStatus(row, 'approved')"
            >
              通过
            </el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="row.status === 'rejected'"
              @click="updateRegStatus(row, 'rejected')"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="registrationsTotal > registrationsLimit" class="pagination">
        <el-pagination
          v-model:current-page="registrationsPage"
          :page-size="registrationsLimit"
          :total="registrationsTotal"
          layout="prev, pager, next, total"
          @current-change="fetchRegistrations"
          background
        />
      </div>
    </el-dialog>

    <el-dialog v-model="showSubmissionsDialog" :title="`作品管理 - ${currentActivity?.title}`" width="1200px" destroy-on-close>
      <div class="submissions-toolbar">
        <el-select v-model="submissionStatus" placeholder="筛选状态" clearable @change="fetchSubmissions">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
      </div>
      <el-table :data="submissions" v-loading="submissionsLoading" class="submissions-table">
        <el-table-column label="作品" min-width="250">
          <template #default="{ row }">
            <div class="submission-cell">
              <div class="submission-title">{{ row.title }}</div>
              <div class="submission-author">
                <el-avatar :size="20" :src="row.avatar">{{ row.username?.charAt(0).toUpperCase() }}
                </el-avatar>
                <span>{{ row.username }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="关联Patch" width="150">
          <template #default="{ row }">
            <span v-if="row.patch_title">{{ row.patch_title }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getSubStatusType(row.status)" size="small">
              {{ getSubStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分" width="80" align="center">
          <template #default="{ row }">
            <span class="score">{{ row.score }}</span>
          </template>
        </el-table-column>
        <el-table-column label="票数" width="80" align="center">
          <template #default="{ row }">{{ row.votes_count }}</template>
        </el-table-column>
        <el-table-column label="排名" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.rank" class="rank">#{{ row.rank }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewSubmission(row)">查看</el-button>
            <el-button
              size="small" type="success"
              :disabled="row.status === 'approved'"
              @click="showReviewDialog(row, 'approved')"
            >
              通过
            </el-button>
            <el-button
              size="small" type="danger"
              :disabled="row.status === 'rejected'"
              @click="showReviewDialog(row, 'rejected')"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="submissionsTotal > submissionsLimit" class="pagination">
        <el-pagination
          v-model:current-page="submissionsPage"
          :page-size="submissionsLimit"
          :total="submissionsTotal"
          layout="prev, pager, next, total"
          @current-change="fetchSubmissions"
          background
        />
      </div>
    </el-dialog>

    <el-dialog v-model="showReviewFormDialog" title="评审作品" width="600px" destroy-on-close>
      <div v-if="reviewSubmission" class="review-info">
        <h4>{{ reviewSubmission.title }}</h4>
        <p><strong>作者：</strong>{{ reviewSubmission.username }}</p>
        <p v-if="reviewSubmission.description"><strong>描述：</strong>{{ reviewSubmission.description }}</p>
      </div>
      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="得分">
          <el-input-number v-model="reviewForm.score" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="排名">
          <el-input-number v-model="reviewForm.rank" :min="1" />
        </el-form-item>
        <el-form-item label="评审意见">
          <el-input v-model="reviewForm.review_note" type="textarea" :rows="4" placeholder="请输入评审意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReviewFormDialog = false">取消</el-button>
        <el-button :type="reviewAction === 'approved' ? 'success' : 'danger'" @click="submitReview">
          {{ reviewAction === 'approved' ? '通过' : '拒绝' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSubmissionDetail" title="作品详情" width="700px">
      <div v-if="currentSubmission" class="submission-detail">
        <h3>{{ currentSubmission.title }}</h3>
        <div class="submission-meta">
          <el-avatar :size="32" :src="currentSubmission.avatar">
          {{ currentSubmission.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <span>{{ currentSubmission.username }}</span>
          <el-tag :type="getSubStatusType(currentSubmission.status)">
            {{ getSubStatusText(currentSubmission.status) }}
          </el-tag>
        </div>
        <div v-if="currentSubmission.description" class="detail-section">
          <h4>作品描述</h4>
          <p>{{ currentSubmission.description }}</p>
        </div>
        <div v-if="currentSubmission.content" class="detail-section">
          <h4>作品详情</h4>
          <div class="markdown-body" v-html="parseMarkdown(currentSubmission.content)"></div>
        </div>
        <div v-if="currentSubmission.attachment_url" class="detail-section">
          <h4>附件</h4>
          <el-link :href="currentSubmission.attachment_url" target="_blank" type="primary">
            {{ currentSubmission.attachment_url }}
          </el-link>
        </div>
        <div v-if="currentSubmission.review_note" class="review-note">
          <strong>评审意见：</strong>{{ currentSubmission.review_note }}
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import { Plus, Search, Calendar, Edit, Delete, User, Document, View } from '@element-plus/icons-vue'
import { adminActivityApi } from '@/api'

const loading = ref(false)
const activities = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const search = ref('')
const statusFilter = ref('')
const typeFilter = ref('')

const showCreateDialog = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const saving = ref(false)
const activityFormRef = ref(null)

const activityForm = ref({
  title: '',
  type: 'contest',
  description: '',
  cover_url: '',
  content: '',
  rules: '',
  prizes: '',
  start_date: '',
  end_date: '',
  registration_start: '',
  registration_end: '',
  submission_start: '',
  submission_end: '',
  status: 'draft',
  max_registrations: 0,
  allow_submission: 1,
  show_ranking: 1,
  sort_order: 0
})

const formRules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择活动状态', trigger: 'change' }]
}

const showRegistrationsDialog = ref(false)
const registrations = ref([])
const registrationsLoading = ref(false)
const registrationsPage = ref(1)
const registrationsLimit = 10
const registrationsTotal = ref(0)
const registrationStatus = ref('')
const currentActivity = ref(null)

const showSubmissionsDialog = ref(false)
const submissions = ref([])
const submissionsLoading = ref(false)
const submissionsPage = ref(1)
const submissionsLimit = 10
const submissionsTotal = ref(0)
const submissionStatus = ref('')

const showReviewFormDialog = ref(false)
const showSubmissionDetail = ref(false)
const reviewSubmission = ref(null)
const reviewAction = ref('')
const currentSubmission = ref(null)
const reviewForm = ref({
  score: 0,
  rank: null,
  review_note: ''
})

const getTypeIcon = (type) => {
  const icons = { contest: '🏆', collection: '📝', vote: '🗳️', other: '🎪' }
  return icons[type] || '🎯'
}

const getTypeText = (type) => {
  const texts = { contest: '创作大赛', collection: '专题征集', vote: '投票评选', other: '其他活动' }
  return texts[type] || '活动'
}

const getStatusText = (status) => {
  const texts = { draft: '草稿', published: '进行中', upcoming: '即将开始', ended: '已结束' }
  return texts[status] || status
}

const getStatusTagType = (status) => {
  const types = { draft: 'info', published: 'success', upcoming: 'primary', ended: 'danger' }
  return types[status] || 'info'
}

const getRegStatusText = (status) => {
  const texts = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return texts[status] || status
}

const getRegStatusType = (status) => {
  const types = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return types[status] || 'info'
}

const getSubStatusText = (status) => {
  const texts = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return texts[status] || status
}

const getSubStatusType = (status) => {
  const types = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return types[status] || 'info'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '待定'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const parseMarkdown = (text) => {
  if (!text) return ''
  return marked.parse(text)
}

const fetchActivities = async () => {
  loading.value = true
  try {
    const res = await adminActivityApi.getActivities({
      page: page.value, limit: limit.value, search: search.value, status: statusFilter.value, type: typeFilter.value
    })
    activities.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取活动列表失败')
  } finally {
    loading.value = false
  }
}

const updateSortOrder = async (row) => {
  try {
    await adminActivityApi.updateActivity(row.id, { sort_order: row.sort_order })
    ElMessage.success('排序已更新')
  } catch (err) {
      ElMessage.error('更新失败')
      fetchActivities()
    }
  }

const viewActivity = (row) => {
  window.open(`/activities/${row.id}`, '_blank')
}

const editActivity = (row) => {
  isEdit.value = true
  editingId.value = row.id
  activityForm.value = {
    title: row.title,
    type: row.type,
    description: row.description || '',
    cover_url: row.cover_url || '',
    content: row.content || '',
    rules: row.rules || '',
    prizes: row.prizes || '',
    start_date: row.start_date || '',
    end_date: row.end_date || '',
    registration_start: row.registration_start || '',
    registration_end: row.registration_end || '',
    submission_start: row.submission_start || '',
    submission_end: row.submission_end || '',
    status: row.status,
    max_registrations: row.max_registrations || 0,
    allow_submission: row.allow_submission,
    show_ranking: row.show_ranking,
    sort_order: row.sort_order || 0
  }
  showCreateDialog.value = true
}

const saveActivity = async () => {
  if (!activityFormRef.value) return
  
  try {
    await activityFormRef.value.validate()
  } catch (err) {
    return
  }
  
  saving.value = true
  try {
    if (isEdit.value) {
      await adminActivityApi.updateActivity(editingId.value, activityForm.value)
      ElMessage.success('活动更新成功')
    } else {
      await adminActivityApi.createActivity(activityForm.value)
      ElMessage.success('活动创建成功')
    }
    showCreateDialog.value = false
    resetForm()
    fetchActivities()
  } catch (err) {
    ElMessage.error(err.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  activityForm.value = {
    title: '',
    type: 'contest',
    description: '',
    cover_url: '',
    content: '',
    rules: '',
    prizes: '',
    start_date: '',
    end_date: '',
    registration_start: '',
    registration_end: '',
    submission_start: '',
    submission_end: '',
    status: 'draft',
    max_registrations: 0,
    allow_submission: 1,
    show_ranking: 1,
    sort_order: 0
  }
  isEdit.value = false
  editingId.value = null
}

const deleteActivity = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除活动"${row.title}"吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'danger'
    })
    await adminActivityApi.deleteActivity(row.id)
    ElMessage.success('删除成功')
    fetchActivities()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const manageRegistrations = (row) => {
  currentActivity.value = row
  registrationStatus.value = ''
  registrationsPage.value = 1
  showRegistrationsDialog.value = true
  fetchRegistrations()
}

const fetchRegistrations = async () => {
  if (!currentActivity.value) return
  registrationsLoading.value = true
  try {
    const res = await adminActivityApi.getRegistrations(currentActivity.value.id, {
      page: registrationsPage.value, limit: registrationsLimit.value, status: registrationStatus.value
    })
    registrations.value = res.list || []
    registrationsTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取报名列表失败')
  } finally {
    registrationsLoading.value = false
  }
}

const updateRegStatus = async (row, status) => {
  try {
    await adminActivityApi.updateRegistrationStatus(row.id, status)
    ElMessage.success('状态更新成功')
    fetchRegistrations()
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const manageSubmissions = (row) => {
  currentActivity.value = row
  submissionStatus.value = ''
  submissionsPage.value = 1
  showSubmissionsDialog.value = true
  fetchSubmissions()
}

const fetchSubmissions = async () => {
  if (!currentActivity.value) return
  submissionsLoading.value = true
  try {
    const res = await adminActivityApi.getSubmissions(currentActivity.value.id, {
      page: submissionsPage.value, limit: submissionsLimit.value, status: submissionStatus.value
    })
    submissions.value = res.list || []
    submissionsTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取作品列表失败')
  } finally {
    submissionsLoading.value = false
  }
}

const showReviewDialog = (row, action) => {
  reviewSubmission.value = row
  reviewAction.value = action
  reviewForm.value = {
    score: row.score || 0,
    rank: row.rank || null,
    review_note: ''
  }
  showReviewFormDialog.value = true
}

const submitReview = async () => {
  if (!reviewSubmission.value) return
  
  try {
    await adminActivityApi.reviewSubmission(reviewSubmission.value.id, {
      status: reviewAction.value, ...reviewForm.value
    })
    ElMessage.success('评审完成')
    showReviewFormDialog.value = false
    fetchSubmissions()
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const viewSubmission = (row) => {
  currentSubmission.value = row
  showSubmissionDetail.value = true
}

onMounted(() => {
  fetchActivities()
})
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  flex-wrap: wrap;
}

.activities-table {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
}

.table-cover {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 170, 0, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.table-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-info-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.activity-meta-row {
  display: flex;
  gap: 8px;
}

.activity-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.time-info > div {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 1.1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.activity-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 1rem;
}

.form-tip {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.registrations-toolbar,
.submissions-toolbar {
  margin-bottom: 1rem;
}

.score {
  font-weight: 600;
  color: var(--primary-color);
}

.rank {
  font-weight: 600;
  color: #ffd700;
}

.submission-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submission-title {
  font-weight: 500;
  color: var(--text-primary);
}

.submission-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.review-info {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.review-info h4 {
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.review-info p {
  color: var(--text-secondary);
  margin: 0.25rem 0;
}

.submission-detail h3 {
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.submission-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h4 {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.detail-section p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.review-note {
  background: rgba(67, 233, 123, 0.1);
  border-left: 3px solid #43e97b;
  padding: 12px;
  margin-top: 1rem;
  border-radius: 4px;
  color: var(--text-secondary);
}

.markdown-body {
  color: var(--text-secondary);
  line-height: 1.8;
}

.text-sm {
  font-size: 0.8125rem;
}

.text-gray-400 {
  color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }
  
  .filter-bar > * {
    width: 100%;
  }
}
</style>
