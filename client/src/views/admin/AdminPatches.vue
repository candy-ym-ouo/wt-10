<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📝 Patch 管理</h1>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索 Patch 标题"
        clearable
        class="search-input"
        @keyup.enter="fetchPatches"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchPatches">
        <el-option label="全部" value="" />
        <el-option label="草稿" value="draft" />
        <el-option label="定时发布" value="scheduled" />
        <el-option label="待审核" value="pending" />
        <el-option label="已审核" value="approved" />
        <el-option label="已拒绝" value="rejected" />
        <el-option label="待修改" value="needs_revision" />
      </el-select>
      <el-button type="primary" @click="fetchPatches">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div v-if="selectedPatches.length > 0" class="batch-action-bar">
      <div class="batch-info">
        已选择 <el-tag type="primary">{{ selectedPatches.length }}</el-tag> 个 Patch
      </div>
      <div class="batch-actions">
        <el-button size="small" type="success" @click="openBatchReviewDialog('approved')">
          <el-icon><Check /></el-icon>
          批量通过
        </el-button>
        <el-button size="small" type="warning" @click="openBatchReviewDialog('needs_revision')">
          <el-icon><Edit /></el-icon>
          批量待修改
        </el-button>
        <el-button size="small" type="danger" @click="openBatchReviewDialog('rejected')">
          <el-icon><Close /></el-icon>
          批量驳回
        </el-button>
        <el-button size="small" @click="clearSelection">
          取消选择
        </el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table 
        :data="patches" 
        v-loading="loading" 
        stripe
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="55" reserve-selection />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="author_name" label="作者" width="120" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核备注" min-width="150">
          <template #default="{ row }">
            <span v-if="row.review_note" class="review-note">
              {{ row.review_note }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column label="定时发布" width="170">
          <template #default="{ row }">
            <span v-if="row.status === 'scheduled' && row.scheduled_at">
              {{ formatDate(row.scheduled_at) }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="likes_count" label="点赞" width="80" />
        <el-table-column prop="favorites_count" label="收藏" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="420" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewPatch(row)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'pending' || row.status === 'draft' || row.status === 'scheduled' || row.status === 'needs_revision'"
              size="small" 
              type="success" 
              @click="openReviewDialog(row, 'approved')"
            >
              通过
            </el-button>
            <el-button 
              v-if="row.status === 'pending' || row.status === 'needs_revision'"
              size="small" 
              type="warning" 
              @click="openReviewDialog(row, 'needs_revision')"
            >
              待修改
            </el-button>
            <el-button 
              v-if="row.status === 'pending' || row.status === 'needs_revision'"
              size="small" 
              type="danger" 
              @click="openReviewDialog(row, 'rejected')"
            >
              驳回
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deletePatch(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="reviewDialogVisible" :title="reviewDialogTitle" width="500px">
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="审核结果">
          <el-tag :type="statusType(reviewForm.status)" size="large">
            {{ statusText(reviewForm.status) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input
            v-model="reviewForm.review_note"
            type="textarea"
            :rows="4"
            :placeholder="reviewNotePlaceholder"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewing" @click="submitReview">
          确认
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchReviewDialogVisible" :title="batchReviewDialogTitle" width="500px">
      <el-form :model="batchReviewForm" label-width="80px">
        <el-form-item label="操作数量">
          <el-tag type="primary" size="large">{{ selectedPatches.length }} 个 Patch</el-tag>
        </el-form-item>
        <el-form-item label="审核结果">
          <el-tag :type="statusType(batchReviewForm.status)" size="large">
            {{ statusText(batchReviewForm.status) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input
            v-model="batchReviewForm.review_note"
            type="textarea"
            :rows="4"
            :placeholder="batchReviewNotePlaceholder"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchReviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchReviewing" @click="submitBatchReview">
          确认批量操作
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Check, Edit, Close } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const patches = ref([])
const selectedPatches = ref([])

const reviewDialogVisible = ref(false)
const reviewing = ref(false)
const currentPatch = ref(null)
const reviewForm = ref({
  status: '',
  review_note: ''
})

const batchReviewDialogVisible = ref(false)
const batchReviewing = ref(false)
const batchReviewForm = ref({
  status: '',
  review_note: ''
})

const reviewDialogTitle = computed(() => {
  if (currentPatch.value) {
    const statusMap = {
      approved: '审核通过',
      rejected: '审核驳回',
      needs_revision: '要求修改'
    }
    return `${statusMap[reviewForm.value.status] || '审核'} - ${currentPatch.value.title}`
  }
  return '审核'
})

const batchReviewDialogTitle = computed(() => {
  const statusMap = {
    approved: '批量审核通过',
    rejected: '批量审核驳回',
    needs_revision: '批量要求修改'
  }
  return `${statusMap[batchReviewForm.value.status] || '批量审核'} (${selectedPatches.length}个)`
})

const reviewNotePlaceholder = computed(() => {
  const placeholders = {
    approved: '请输入审核通过的备注（可选），例如：内容质量优秀，符合平台规范...',
    rejected: '请输入驳回原因，例如：内容不符合规范，需要修改...',
    needs_revision: '请输入需要修改的具体内容，例如：标题需要补充说明，描述不够清晰...'
  }
  return placeholders[reviewForm.value.status] || '请输入审核备注'
})

const batchReviewNotePlaceholder = computed(() => {
  const placeholders = {
    approved: '请输入批量审核通过的备注（可选）...',
    rejected: '请输入批量驳回原因...',
    needs_revision: '请输入批量要求修改的内容...'
  }
  return placeholders[batchReviewForm.value.status] || '请输入审核备注'
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const statusType = (status) => {
  const map = {
    draft: 'info',
    scheduled: 'warning',
    approved: 'success',
    pending: '',
    rejected: 'danger',
    needs_revision: 'warning'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    draft: '草稿',
    scheduled: '定时中',
    approved: '已通过',
    pending: '待审核',
    rejected: '已驳回',
    needs_revision: '待修改'
  }
  return map[status] || status
}

const fetchPatches = async () => {
  try {
    loading.value = true
    const res = await adminApi.getPatches({ 
      keyword: keyword.value, 
      status: statusFilter.value 
    })
    patches.value = res.list || res || []
  } catch (err) {
    ElMessage.error('获取 Patch 列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedPatches.value = selection
}

const clearSelection = () => {
  selectedPatches.value = []
  const tableEl = document.querySelector('.el-table__body-wrapper .el-checkbox')
  if (tableEl) {
    const checkboxes = document.querySelectorAll('.el-table .el-checkbox')
    checkboxes.forEach(cb => {
      const input = cb.querySelector('input')
      if (input && input.checked) {
        input.checked = false
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  }
}

const viewPatch = (patch) => {
  router.push(`/patches/${patch.id}`)
}

const openReviewDialog = (patch, status) => {
  currentPatch.value = patch
  reviewForm.value = {
    status,
    review_note: ''
  }
  reviewDialogVisible.value = true
}

const openBatchReviewDialog = (status) => {
  if (selectedPatches.value.length === 0) {
    ElMessage.warning('请先选择要操作的 Patch')
    return
  }
  batchReviewForm.value = {
    status,
    review_note: ''
  }
  batchReviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!currentPatch.value) return
  
  try {
    reviewing.value = true
    const status = reviewForm.value.status
    const reviewNote = reviewForm.value.review_note
    
    let confirmMsg = ''
    if (status === 'approved') {
      confirmMsg = `确定要通过 Patch "${currentPatch.value.title}" 的审核吗？`
      if (currentPatch.value.status === 'draft') {
        confirmMsg = `确定要直接发布草稿 Patch "${currentPatch.value.title}" 吗？`
      } else if (currentPatch.value.status === 'scheduled') {
        confirmMsg = `确定要立即发布定时 Patch "${currentPatch.value.title}" 吗？\n（原计划发布时间：${currentPatch.value.scheduled_at || '未设置'}）`
      }
    } else if (status === 'rejected') {
      confirmMsg = `确定要驳回 Patch "${currentPatch.value.title}" 的审核吗？`
    } else if (status === 'needs_revision') {
      confirmMsg = `确定要求 Patch "${currentPatch.value.title}" 的作者进行修改吗？`
    }
    
    await ElMessageBox.confirm(confirmMsg, '确认操作', { 
      type: status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
    })
    
    await adminApi.updatePatchStatus(currentPatch.value.id, status, reviewNote)
    currentPatch.value.status = status
    currentPatch.value.review_note = reviewNote
    reviewDialogVisible.value = false
    ElMessage.success('操作成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  } finally {
    reviewing.value = false
  }
}

const submitBatchReview = async () => {
  if (selectedPatches.value.length === 0) return
  
  try {
    batchReviewing.value = true
    const status = batchReviewForm.value.status
    const reviewNote = batchReviewForm.value.review_note
    
    const statusLabels = {
      approved: '通过',
      rejected: '驳回',
      needs_revision: '要求修改'
    }
    
    await ElMessageBox.confirm(
      `确定要批量${statusLabels[status]} ${selectedPatches.value.length} 个 Patch 吗？`,
      '确认批量操作',
      { 
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
      }
    )
    
    const ids = selectedPatches.value.map(p => p.id)
    const res = await adminApi.batchUpdatePatchesStatus({
      ids,
      status,
      review_note: reviewNote
    })
    
    patches.value = patches.value.map(p => {
      if (ids.includes(p.id)) {
        return { ...p, status, review_note: reviewNote }
      }
      return p
    })
    
    batchReviewDialogVisible.value = false
    clearSelection()
    ElMessage.success(`批量${statusLabels[status]}成功，共处理 ${res.count} 个 Patch`)
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批量操作失败')
      console.error(err)
    }
  } finally {
    batchReviewing.value = false
  }
}

const deletePatch = async (patch) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 Patch "${patch.title}" 吗？将移入回收站，可在回收站中恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    
    await adminApi.deletePatch(patch.id)
    patches.value = patches.value.filter(p => p.id !== patch.id)
    ElMessage.success('已移入回收站')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

onMounted(() => {
  fetchPatches()
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
  width: 150px;
}

.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(103, 194, 58, 0.1));
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.batch-info {
  font-size: 14px;
  color: var(--text-primary);
}

.batch-actions {
  display: flex;
  gap: 0.5rem;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.review-note {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
