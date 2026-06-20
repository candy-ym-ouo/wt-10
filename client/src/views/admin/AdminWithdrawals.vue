<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">💰 提现管理</h1>
    </div>

    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">总申请数</div>
            <div class="stat-value">{{ withdrawalStats?.total_requests || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">待审核金额</div>
            <div class="stat-value text-warning">¥{{ (withdrawalStats?.pending_amount || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已通过金额</div>
            <div class="stat-value text-success">¥{{ (withdrawalStats?.approved_amount || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已打款金额</div>
            <div class="stat-value text-primary">¥{{ (withdrawalStats?.transferred_amount || 0).toFixed(2) }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索创作者用户名"
        clearable
        class="search-input"
        @keyup.enter="fetchWithdrawals"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchWithdrawals">
        <el-option label="全部" value="" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
        <el-option label="已打款" value="transferred" />
      </el-select>
      <el-button type="primary" @click="fetchWithdrawals">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="withdrawals" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="创作者" width="150">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.creator_avatar" :size="32" />
              <span class="username">{{ row.creator_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提现金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="收款方式" width="120">
          <template #default="{ row }">
            <el-tag>{{ paymentMethodText(row.payment_method) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收款账户" width="200">
          <template #default="{ row }">
            <span class="account">{{ maskAccount(row.payment_account, row.payment_method) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="success" 
              @click="openReviewDialog(row, 'approved')"
            >
              通过
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="warning" 
              @click="openReviewDialog(row, 'rejected')"
            >
              拒绝
            </el-button>
            <el-button 
              v-if="row.status === 'approved'"
              size="small" 
              type="primary" 
              @click="openReviewDialog(row, 'transferred')"
            >
              标记打款
            </el-button>
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="withdrawalsTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchWithdrawals"
          @current-change="fetchWithdrawals"
        />
      </div>
    </div>

    <el-dialog v-model="reviewDialogVisible" :title="reviewTitle" width="500px">
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="审核备注">
          <el-input 
            v-model="reviewForm.review_note" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入审核备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReview">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="提现详情" width="600px">
      <div v-if="currentWithdrawal" class="withdrawal-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请ID">
            {{ currentWithdrawal.id }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(currentWithdrawal.status)">
              {{ statusText(currentWithdrawal.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创作者">
            {{ currentWithdrawal.creator_name }}
          </el-descriptions-item>
          <el-descriptions-item label="提现金额">
            <span class="amount">¥{{ currentWithdrawal.amount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="收款方式">
            {{ paymentMethodText(currentWithdrawal.payment_method) }}
          </el-descriptions-item>
          <el-descriptions-item label="收款账户">
            {{ currentWithdrawal.payment_account }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(currentWithdrawal.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="审核时间">
            {{ currentWithdrawal.reviewed_at ? formatDate(currentWithdrawal.reviewed_at) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="打款时间">
            {{ currentWithdrawal.transferred_at ? formatDate(currentWithdrawal.transferred_at) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核备注" :span="2">
            {{ currentWithdrawal.review_note || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const productStore = useProductStore()

const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)

const withdrawals = computed(() => productStore.adminWithdrawals)
const withdrawalsTotal = computed(() => productStore.adminWithdrawalsTotal)
const withdrawalStats = computed(() => productStore.adminWithdrawalStats)

const reviewDialogVisible = ref(false)
const detailVisible = ref(false)
const currentWithdrawal = ref(null)
const reviewStatus = ref('')
const reviewForm = ref({
  review_note: ''
})

const reviewTitle = computed(() => {
  const map = {
    approved: '通过提现申请',
    rejected: '拒绝提现申请',
    transferred: '确认打款'
  }
  return map[reviewStatus.value] || '审核'
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const statusType = (status) => {
  const map = {
    pending: 'warning',
    approved: 'primary',
    rejected: 'danger',
    transferred: 'success'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    transferred: '已打款'
  }
  return map[status] || status
}

const paymentMethodText = (method) => {
  const map = {
    alipay: '支付宝',
    wechat: '微信支付',
    bank: '银行卡'
  }
  return map[method] || method
}

const maskAccount = (account, method) => {
  if (!account) return '-'
  if (account.length <= 4) return account
  return account.substring(0, 4) + '****' + account.substring(account.length - 4)
}

const fetchWithdrawals = async () => {
  try {
    loading.value = true
    await productStore.getAdminWithdrawals({
      keyword: keyword.value,
      status: statusFilter.value,
      page: page.value,
      pageSize: pageSize.value
    })
  } catch (err) {
    ElMessage.error('获取提现列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openReviewDialog = (row, status) => {
  currentWithdrawal.value = row
  reviewStatus.value = status
  reviewForm.value = { review_note: '' }
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要${statusText(reviewStatus.value)}该提现申请吗？`,
      '确认审核',
      { type: 'warning' }
    )

    await productStore.reviewWithdrawal(currentWithdrawal.value.id, {
      status: reviewStatus.value,
      review_note: reviewForm.value.review_note
    })

    ElMessage.success('审核成功')
    reviewDialogVisible.value = false
    fetchWithdrawals()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('审核失败')
      console.error(err)
    }
  }
}

const viewDetail = (row) => {
  currentWithdrawal.value = row
  detailVisible.value = true
}

onMounted(() => {
  fetchWithdrawals()
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

.stats-cards {
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--text-primary);
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-primary {
  color: #409eff;
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

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.username {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.amount {
  font-weight: bold;
  color: #f56c6c;
}

.account {
  font-family: monospace;
  font-size: 0.9rem;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.withdrawal-detail {
  padding: 1rem 0;
}
</style>
