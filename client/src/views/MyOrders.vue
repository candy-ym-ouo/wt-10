<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">📦 我的订单</h1>
    </div>

    <div class="filter-bar">
      <el-select v-model="statusFilter" placeholder="订单状态" class="filter-select" @change="fetchOrders">
        <el-option label="全部" value="" />
        <el-option label="已支付" value="paid" />
        <el-option label="待支付" value="pending" />
        <el-option label="已退款" value="refunded" />
      </el-select>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="orders.length === 0" class="empty-state">
      <el-icon class="empty-icon"><ShoppingCart /></el-icon>
      <p>暂无订单记录</p>
      <el-button type="primary" @click="$router.push('/patches')">
        去逛逛
      </el-button>
    </div>

    <div v-else class="orders-list">
      <div 
        v-for="order in orders" 
        :key="order.id" 
        class="order-card"
        @click="viewOrderDetail(order)"
      >
        <div class="order-header">
          <div class="order-no">订单号：{{ order.order_no }}</div>
          <el-tag :type="statusType(order.status)" size="small">
            {{ statusText(order.status) }}
          </el-tag>
        </div>
        <div class="order-content">
          <img v-if="order.patch_image" :src="order.patch_image" class="order-image" />
          <div class="order-info">
            <div class="order-title">{{ order.patch_title }}</div>
            <div class="order-sku">{{ order.product_name }}</div>
            <div class="order-creator">
              <el-avatar :src="order.creator_avatar" :size="20" />
              <span>{{ order.creator_name }}</span>
            </div>
          </div>
          <div class="order-price">
            <div class="amount">¥{{ order.amount }}</div>
            <div class="order-time">{{ formatDate(order.created_at) }}</div>
          </div>
        </div>
        <div class="order-actions">
          <el-button 
            type="primary" 
            size="small"
            @click.stop="goToPatch(order)"
          >
            查看内容
          </el-button>
        </div>
      </div>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="ordersTotal"
          :page-sizes="[10, 20, 50]"
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

        <div v-if="currentOrder.status === 'paid'" class="detail-actions">
          <el-button type="primary" @click="goToPatch(currentOrder)">
            查看完整内容
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, ShoppingCart } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/productStore'

const router = useRouter()
const productStore = useProductStore()

const loading = ref(true)
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const orders = ref([])
const ordersTotal = ref(0)
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
    const res = await productStore.getMyOrders({
      status: statusFilter.value,
      page: page.value,
      pageSize: pageSize.value
    })
    orders.value = res.list || res || []
    ordersTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取订单列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const viewOrderDetail = (order) => {
  currentOrder.value = order
  detailVisible.value = true
}

const goToPatch = (order) => {
  router.push(`/patches/${order.patch_id}`)
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2rem;
  margin: 0;
  color: var(--text-primary);
}

.filter-bar {
  margin-bottom: 1.5rem;
}

.filter-select {
  width: 150px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.order-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.order-no {
  font-family: monospace;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.order-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.order-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.order-info {
  flex: 1;
}

.order-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.order-sku {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.order-creator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.order-price {
  text-align: right;
}

.amount {
  font-size: 1.25rem;
  font-weight: bold;
  color: #f56c6c;
}

.order-time {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 4px;
}

.order-actions {
  text-align: right;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.detail-actions {
  margin-top: 1.5rem;
  text-align: center;
}
</style>
