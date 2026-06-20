<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📦 订单管理</h1>
    </div>

    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">总订单数</div>
            <div class="stat-value">{{ orderStats?.total_orders || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">总营收</div>
            <div class="stat-value text-success">¥{{ (orderStats?.total_revenue || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">付费用户数</div>
            <div class="stat-value text-primary">{{ orderStats?.total_buyers || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">今日营收</div>
            <div class="stat-value text-warning">¥{{ (orderStats?.today_revenue || 0).toFixed(2) }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索订单号、买家、Patch 标题"
        clearable
        class="search-input"
        @keyup.enter="fetchOrders"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchOrders">
        <el-option label="全部" value="" />
        <el-option label="已支付" value="paid" />
        <el-option label="待支付" value="pending" />
        <el-option label="已退款" value="refunded" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        class="date-picker"
        @change="fetchOrders"
      />
      <el-button type="primary" @click="fetchOrders">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="200" />
        <el-table-column label="商品信息" min-width="200">
          <template #default="{ row }">
            <div class="product-info">
              <img v-if="row.patch_image" :src="row.patch_image" class="product-thumb" />
              <div class="product-meta">
                <div class="product-name">{{ row.patch_title }}</div>
                <div class="product-sku">{{ row.product_name }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="买家" width="120">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.buyer_avatar" :size="32" />
              <span class="username">{{ row.buyer_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创作者" width="120">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.creator_avatar" :size="32" />
              <span class="username">{{ row.creator_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="ordersTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <div v-if="currentOrder" class="order-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">
            {{ currentOrder.order_no }}
          </el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="statusType(currentOrder.status)">
              {{ statusText(currentOrder.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="商品名称">
            {{ currentOrder.patch_title }}
          </el-descriptions-item>
          <el-descriptions-item label="商品规格">
            {{ currentOrder.product_name }}
          </el-descriptions-item>
          <el-descriptions-item label="买家">
            {{ currentOrder.buyer_name }}
          </el-descriptions-item>
          <el-descriptions-item label="创作者">
            {{ currentOrder.creator_name }}
          </el-descriptions-item>
          <el-descriptions-item label="订单金额">
            <span class="amount">¥{{ currentOrder.amount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="支付方式">
            {{ currentOrder.payment_method || '余额支付' }}
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatDate(currentOrder.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付时间">
            {{ currentOrder.paid_at ? formatDate(currentOrder.paid_at) : '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const productStore = useProductStore()

const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const dateRange = ref([])
const page = ref(1)
const pageSize = ref(20)

const orders = computed(() => productStore.adminOrders)
const ordersTotal = computed(() => productStore.adminOrdersTotal)
const orderStats = computed(() => productStore.adminOrderStats)

const detailVisible = ref(false)
const currentOrder = ref(null)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const statusType = (status) => {
  const map = {
    paid: 'success',
    pending: 'warning',
    refunded: 'info'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    paid: '已支付',
    pending: '待支付',
    refunded: '已退款'
  }
  return map[status] || status
}

const fetchOrders = async () => {
  try {
    loading.value = true
    const params = {
      keyword: keyword.value,
      status: statusFilter.value,
      page: page.value,
      pageSize: pageSize.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    await productStore.getAdminOrders(params)
  } catch (err) {
    ElMessage.error('获取订单列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    await productStore.getAdminOrderStats()
  } catch (err) {
    console.error(err)
  }
}

const viewDetail = (row) => {
  currentOrder.value = row
  detailVisible.value = true
}

onMounted(() => {
  fetchOrders()
  fetchStats()
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
  flex-wrap: wrap;
}

.search-input {
  max-width: 400px;
  flex: 1;
}

.filter-select {
  width: 150px;
}

.date-picker {
  width: 300px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: var(--bg-secondary);
}

.product-meta {
  flex: 1;
}

.product-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.product-sku {
  font-size: 0.85rem;
  color: var(--text-secondary);
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

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.order-detail {
  padding: 1rem 0;
}
</style>
