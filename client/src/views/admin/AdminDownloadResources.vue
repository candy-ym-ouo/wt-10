<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📦 下载资源审核</h1>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索资源名称"
        clearable
        class="search-input"
        @keyup.enter="fetchResources"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchResources">
        <el-option label="全部" value="" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-select v-model="typeFilter" placeholder="资源类型" clearable class="filter-select" @change="fetchResources">
        <el-option label="Patch 文件" value="patch_file" />
        <el-option label="预设包" value="preset" />
        <el-option label="采样包" value="sample" />
        <el-option label="教程" value="tutorial" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-button type="primary" @click="fetchResources">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="resources" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="资源信息" min-width="250">
          <template #default="{ row }">
            <div class="resource-info">
              <span class="resource-icon">{{ getResourceIcon(row.resource_type) }}</span>
              <div class="resource-detail">
                <div class="resource-title">{{ row.title }}</div>
                <div class="resource-meta">
                  <span>{{ row.file_size_formatted }}</span>
                  <span>·</span>
                  <span>{{ row.file_name }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="上传者" width="120" />
        <el-table-column label="权限" width="120">
          <template #default="{ row }">
            <el-tag :type="getAccessTagType(row.access_level)" size="small">
              {{ getAccessLabel(row.access_level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.risk_level)" size="small">
              {{ getRiskLabel(row.risk_level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下载数" width="100" align="center">
          <template #default="{ row }">
            {{ row.download_count }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="上传时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <template v-if="row.status === 'pending'">
              <el-button
                size="small"
                type="success"
                @click="reviewResource(row, 'approved')"
              >
                通过
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="reviewResource(row, 'rejected')"
              >
                拒绝
              </el-button>
            </template>
            <el-button
              size="small"
              type="danger"
              @click="deleteResource(row)"
            >
              删除
            </el-button>
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
        @current-change="fetchResources"
      />
    </div>

    <el-dialog
      v-model="detailDialogVisible"
      title="资源详情"
      width="700px"
    >
      <div v-if="currentResource" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentResource.id }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentResource.title }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ currentResource.file_name }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ currentResource.file_size_formatted }}</el-descriptions-item>
          <el-descriptions-item label="资源类型">
            {{ getResourceTypeLabel(currentResource.resource_type) }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">{{ currentResource.version }}</el-descriptions-item>
          <el-descriptions-item label="访问权限">
            <el-tag :type="getAccessTagType(currentResource.access_level)" size="small">
              {{ getAccessLabel(currentResource.access_level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="getRiskTagType(currentResource.risk_level)" size="small">
              {{ getRiskLabel(currentResource.risk_level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="上传者">{{ currentResource.username }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentResource.status)" size="small">
              {{ getStatusLabel(currentResource.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下载次数">{{ currentResource.download_count }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ formatDate(currentResource.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentResource.description || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="风险说明" :span="2" v-if="currentResource.risk_level !== 'low'">
            {{ currentResource.risk_description || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核备注" :span="2" v-if="currentResource.review_note">
            {{ currentResource.review_note }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <el-dialog
      v-model="reviewDialogVisible"
      :title="reviewStatus === 'approved' ? '通过审核' : '拒绝审核'"
      width="500px"
    >
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="审核备注">
          <el-input
            v-model="reviewForm.review_note"
            type="textarea"
            :rows="4"
            :placeholder="reviewStatus === 'approved' ? '请输入审核通过备注（可选）' : '请输入拒绝原因'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button :type="reviewStatus === 'approved' ? 'success' : 'danger'" @click="submitReview">
          确认{{ reviewStatus === 'approved' ? '通过' : '拒绝' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminDownloadApi } from '@/api'

const loading = ref(false)
const resources = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const statusFilter = ref('pending')
const typeFilter = ref('')

const detailDialogVisible = ref(false)
const reviewDialogVisible = ref(false)
const currentResource = ref(null)
const reviewStatus = ref('')
const reviewForm = reactive({
  review_note: ''
})

const getResourceIcon = (type) => {
  const icons = {
    patch_file: '🎛️',
    preset: '📋',
    sample: '🎵',
    tutorial: '📚',
    other: '📦'
  }
  return icons[type] || '📦'
}

const getResourceTypeLabel = (type) => {
  const labels = {
    patch_file: 'Patch 文件',
    preset: '预设包',
    sample: '采样包',
    tutorial: '教程',
    other: '其他'
  }
  return labels[type] || '其他'
}

const getRiskLabel = (level) => {
  const labels = { low: '低风险', medium: '中风险', high: '高风险' }
  return labels[level] || '未知'
}

const getRiskTagType = (level) => {
  const types = { low: 'success', medium: 'warning', high: 'danger' }
  return types[level] || 'info'
}

const getAccessLabel = (level) => {
  const labels = {
    public: '公开',
    registered: '注册用户',
    verified: '认证创作者',
    admin: '仅管理员'
  }
  return labels[level] || '公开'
}

const getAccessTagType = (level) => {
  const types = {
    public: 'success',
    registered: '',
    verified: 'warning',
    admin: 'danger'
  }
  return types[level] || 'info'
}

const getStatusLabel = (status) => {
  const labels = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return labels[status] || status
}

const getStatusTagType = (status) => {
  const types = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return types[status] || 'info'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchResources = async () => {
  try {
    loading.value = true
    const res = await adminDownloadApi.getResources({
      page: currentPage.value,
      limit: pageSize.value,
      search: keyword.value,
      status: statusFilter.value,
      resource_type: typeFilter.value
    })
    resources.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取资源列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const viewDetail = (resource) => {
  currentResource.value = resource
  detailDialogVisible.value = true
}

const reviewResource = (resource, status) => {
  currentResource.value = resource
  reviewStatus.value = status
  reviewForm.review_note = ''
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!currentResource.value) return

  try {
    await adminDownloadApi.reviewResource(currentResource.value.id, {
      status: reviewStatus.value,
      review_note: reviewForm.review_note
    })
    ElMessage.success('审核成功')
    reviewDialogVisible.value = false
    fetchResources()
  } catch (err) {
    ElMessage.error('审核失败')
    console.error(err)
  }
}

const deleteResource = async (resource) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除资源「${resource.title}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    await adminDownloadApi.deleteResource(resource.id)
    ElMessage.success('删除成功')
    fetchResources()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
    }
  }
}

onMounted(fetchResources)
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
  align-items: center;
  gap: 0.75rem;
}

.resource-icon {
  font-size: 1.5rem;
}

.resource-detail {
  flex: 1;
  min-width: 0;
}

.resource-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.detail-content {
  padding: 0.5rem 0;
}
</style>
