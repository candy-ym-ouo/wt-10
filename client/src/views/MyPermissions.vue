<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎫 我的权限</h1>
      <p class="page-subtitle">查看您已购买的内容</p>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="permissions.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Unlock /></el-icon>
      <p>暂无已购买记录</p>
      <el-button type="primary" @click="$router.push('/patches')">
        发现优质内容
      </el-button>
    </div>

    <div v-else class="permissions-grid">
      <div 
        v-for="perm in permissions" 
        :key="perm.id" 
        class="permission-card"
        @click="goToPatch(perm)"
      >
        <div class="card-image">
          <img v-if="perm.patch_image" :src="perm.patch_image" :alt="perm.patch_title" />
          <div v-else class="placeholder">
            <el-icon><Document /></el-icon>
          </div>
          <div class="badge" v-if="perm.is_paid">
            <el-tag type="success" size="small">已解锁</el-tag>
          </div>
        </div>
        <div class="card-content">
          <h3 class="card-title">{{ perm.patch_title }}</h3>
          <div class="card-creator">
            <el-avatar :src="perm.creator_avatar" :size="24" />
            <span>{{ perm.creator_name }}</span>
          </div>
          <div class="card-meta">
            <div class="meta-item">
              <el-icon><Money /></el-icon>
              <span>¥{{ perm.purchase_amount }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>{{ formatDate(perm.created_at) }}</span>
            </div>
          </div>
          <div class="card-order">
            订单号：{{ perm.order_no }}
          </div>
        </div>
        <div class="card-footer">
          <el-button type="primary" size="small" @click.stop="goToPatch(perm)">
            查看内容
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="permissions.length > 0" class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="permissionsTotal"
        :page-sizes="[12, 24, 48]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchPermissions"
        @current-change="fetchPermissions"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Unlock, Document, Money, Clock } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/productStore'

const router = useRouter()
const productStore = useProductStore()

const loading = ref(true)
const page = ref(1)
const pageSize = ref(12)

const permissions = ref([])
const permissionsTotal = ref(0)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const fetchPermissions = async () => {
  try {
    loading.value = true
    const res = await productStore.getMyPermissions({
      page: page.value,
      pageSize: pageSize.value
    })
    permissions.value = res.list || res || []
    permissionsTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取权限列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToPatch = (perm) => {
  router.push(`/patches/${perm.patch_id}`)
}

onMounted(() => {
  fetchPermissions()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.page-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.permission-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.permission-card:hover {
  border-color: #67c23a;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(103, 194, 58, 0.15);
}

.card-image {
  position: relative;
  height: 160px;
  background: var(--bg-secondary);
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 3rem;
}

.badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.card-content {
  padding: 1rem;
  flex: 1;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-creator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.meta-item .el-icon {
  color: #f56c6c;
}

.card-order {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.card-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  text-align: right;
}

.pagination {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}
</style>
