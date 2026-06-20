<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">💰 创作者收益</h1>
      <el-button type="primary" @click="openWithdrawDialog" :disabled="availableBalance <= 0">
        <el-icon><Money /></el-icon>
        申请提现
      </el-button>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else>
      <div class="stats-cards">
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">总收益</div>
              <div class="stat-value text-primary">
                ¥{{ (overview?.total_net_earnings || 0).toFixed(2) }}
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">可提现余额</div>
              <div class="stat-value text-success">
                ¥{{ availableBalance.toFixed(2) }}
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">已结算</div>
              <div class="stat-value text-info">
                ¥{{ (overview?.settled_earnings || 0).toFixed(2) }}
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">总销量</div>
              <div class="stat-value text-warning">
                {{ overview?.total_sales || 0 }} 笔
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-row :gutter="24">
        <el-col :span="16">
          <div class="card">
            <div class="card-header">
              <h3>📊 收益明细</h3>
              <el-select v-model="statusFilter" placeholder="状态筛选" size="small" @change="fetchEarnings">
                <el-option label="全部" value="" />
                <el-option label="待结算" value="pending" />
                <el-option label="已结算" value="settled" />
              </el-select>
            </div>

            <div v-if="earnings.length === 0" class="empty-state" style="padding: 40px;">
              <el-icon class="empty-icon"><Money /></el-icon>
              <p>暂无收益记录</p>
            </div>

            <el-table v-else :data="earnings" stripe>
              <el-table-column prop="order_no" label="订单号" width="180" />
              <el-table-column label="商品" min-width="200">
                <template #default="{ row }">
                  <div class="product-info">
                    <img v-if="row.patch_image" :src="row.patch_image" class="product-thumb" />
                    <span>{{ row.patch_title }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="买家" width="120">
                <template #default="{ row }">
                  <div class="buyer-info">
                    <el-avatar :src="row.buyer_avatar" :size="24" />
                    <span>{{ row.buyer_name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="订单金额" width="100">
                <template #default="{ row }">
                  ¥{{ row.order_amount.toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column label="平台服务费" width="110">
                <template #default="{ row }">
                  ¥{{ row.platform_fee.toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column label="实际收益" width="100">
                <template #default="{ row }">
                  <span class="net-amount">¥{{ row.net_amount.toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="statusType(row.status)" size="small">
                    {{ statusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>

            <div v-if="earnings.length > 0" class="pagination">
              <el-pagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                :total="earningsTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="fetchEarnings"
                @current-change="fetchEarnings"
              />
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="card">
            <div class="card-header">
              <h3>🏆 销量排行</h3>
            </div>

            <div v-if="!topPatches?.length" class="empty-state" style="padding: 40px;">
              <p>暂无销售数据</p>
            </div>

            <div v-else class="top-patches">
              <div 
                v-for="(patch, index) in topPatches" 
                :key="patch.patch_id" 
                class="top-item"
                @click="goToPatch(patch.patch_id)"
              >
                <div class="rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                <img v-if="patch.patch_image" :src="patch.patch_image" class="patch-thumb" />
                <div class="patch-info">
                  <div class="patch-name">{{ patch.patch_title }}</div>
                  <div class="patch-stats">
                    <span>{{ patch.sales_count }} 笔销售</span>
                    <span class="earnings">¥{{ patch.net_earnings.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>📋 提现记录</h3>
            </div>

            <div v-if="withdrawals.length === 0" class="empty-state" style="padding: 40px;">
              <p>暂无提现记录</p>
            </div>

            <div v-else class="withdrawals-list">
              <div v-for="w in withdrawals" :key="w.id" class="withdrawal-item">
                <div class="withdrawal-info">
                  <div class="withdrawal-amount">¥{{ w.amount.toFixed(2) }}</div>
                  <div class="withdrawal-method">
                    {{ paymentMethodText(w.payment_method) }}
                  </div>
                </div>
                <div class="withdrawal-status">
                  <el-tag :type="withdrawalStatusType(w.status)" size="small">
                    {{ withdrawalStatusText(w.status) }}
                  </el-tag>
                  <div class="withdrawal-time">{{ formatDate(w.created_at) }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </template>

    <el-dialog v-model="withdrawDialogVisible" title="申请提现" width="500px">
      <el-form :model="withdrawForm" label-width="100px">
        <el-form-item label="可提现余额">
          <span class="available-balance">¥{{ availableBalance.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="提现金额" required>
          <el-input-number 
            v-model="withdrawForm.amount" 
            :min="1" 
            :max="availableBalance"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="收款方式" required>
          <el-select v-model="withdrawForm.payment_method" style="width: 100%">
            <el-option label="支付宝" value="alipay" />
            <el-option label="微信支付" value="wechat" />
            <el-option label="银行卡" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款账号" required>
          <el-input 
            v-model="withdrawForm.payment_account" 
            placeholder="请输入收款账号"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitWithdrawal" :loading="submitting">
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Money } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/productStore'

const router = useRouter()
const productStore = useProductStore()

const loading = ref(true)
const submitting = ref(false)
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const overview = ref(null)
const topPatches = ref([])
const earnings = ref([])
const earningsTotal = ref(0)
const withdrawals = ref([])

const withdrawDialogVisible = ref(false)
const withdrawForm = ref({
  amount: 0,
  payment_method: 'alipay',
  payment_account: ''
})

const availableBalance = computed(() => {
  return overview.value?.pending_earnings || 0
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const statusType = (status) => {
  const map = {
    pending: 'warning',
    settled: 'success'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    pending: '待结算',
    settled: '已结算'
  }
  return map[status] || status
}

const withdrawalStatusType = (status) => {
  const map = {
    pending: 'warning',
    approved: 'primary',
    rejected: 'danger',
    transferred: 'success'
  }
  return map[status] || 'info'
}

const withdrawalStatusText = (status) => {
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

const fetchOverview = async () => {
  try {
    const res = await productStore.getEarningsOverview()
    overview.value = res.overview
    topPatches.value = res.topPatches || []
  } catch (err) {
    console.error(err)
  }
}

const fetchEarnings = async () => {
  try {
    const res = await productStore.getMyEarnings({
      status: statusFilter.value,
      page: page.value,
      pageSize: pageSize.value
    })
    earnings.value = res.list || res || []
    earningsTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取收益明细失败')
    console.error(err)
  }
}

const fetchWithdrawals = async () => {
  try {
    const res = await productStore.getMyWithdrawals({
      page: 1,
      pageSize: 10
    })
    withdrawals.value = res.list || res || []
  } catch (err) {
    console.error(err)
  }
}

const openWithdrawDialog = () => {
  if (availableBalance.value <= 0) {
    ElMessage.warning('暂无可提现金额')
    return
  }
  withdrawForm.value = {
    amount: availableBalance.value,
    payment_method: 'alipay',
    payment_account: ''
  }
  withdrawDialogVisible.value = true
}

const submitWithdrawal = async () => {
  try {
    if (!withdrawForm.value.amount || withdrawForm.value.amount <= 0) {
      ElMessage.warning('请输入提现金额')
      return
    }
    if (!withdrawForm.value.payment_method) {
      ElMessage.warning('请选择收款方式')
      return
    }
    if (!withdrawForm.value.payment_account) {
      ElMessage.warning('请输入收款账号')
      return
    }

    await ElMessageBox.confirm(
      `确定要提现 ¥${withdrawForm.value.amount.toFixed(2)} 吗？`,
      '确认提现',
      { type: 'warning' }
    )

    submitting.value = true
    await productStore.createWithdrawal(withdrawForm.value)
    
    ElMessage.success('提现申请已提交')
    withdrawDialogVisible.value = false
    
    await Promise.all([fetchOverview(), fetchWithdrawals()])
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.error || '提交失败')
      console.error(err)
    }
  } finally {
    submitting.value = false
  }
}

const goToPatch = (patchId) => {
  router.push(`/patches/${patchId}`)
}

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([
      fetchOverview(),
      fetchEarnings(),
      fetchWithdrawals()
    ])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2rem;
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
  font-size: 1.75rem;
  font-weight: bold;
  color: var(--text-primary);
}

.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-info {
  color: #909399;
}

.text-warning {
  color: #e6a23c;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.product-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.buyer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.net-amount {
  font-weight: bold;
  color: #67c23a;
}

.top-patches {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.top-item:hover {
  background: var(--bg-hover);
}

.rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 0.85rem;
  background: #909399;
  color: white;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
}

.patch-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: var(--bg-primary);
}

.patch-info {
  flex: 1;
  min-width: 0;
}

.patch-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patch-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.earnings {
  font-weight: bold;
  color: #67c23a;
}

.withdrawals-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.withdrawal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.withdrawal-amount {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.withdrawal-method {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.withdrawal-status {
  text-align: right;
}

.withdrawal-time {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.available-balance {
  font-size: 1.5rem;
  font-weight: bold;
  color: #67c23a;
}

.pagination {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}
</style>
