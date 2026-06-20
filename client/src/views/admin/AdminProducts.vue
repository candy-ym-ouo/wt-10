<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🛒 商品管理</h1>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增商品
      </el-button>
    </div>

    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">总商品数</div>
            <div class="stat-value">{{ productsTotal }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已上架</div>
            <div class="stat-value text-success">{{ activeCount }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已下架</div>
            <div class="stat-value text-warning">{{ inactiveCount }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">总销量</div>
            <div class="stat-value text-primary">{{ totalSales }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索商品名称或 Patch 标题"
        clearable
        class="search-input"
        @keyup.enter="fetchProducts"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchProducts">
        <el-option label="全部" value="" />
        <el-option label="已上架" value="active" />
        <el-option label="已下架" value="inactive" />
      </el-select>
      <el-button type="primary" @click="fetchProducts">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="商品信息" min-width="200">
          <template #default="{ row }">
            <div class="product-info">
              <img v-if="row.patch_image" :src="row.patch_image" class="product-thumb" />
              <div class="product-meta">
                <div class="product-name">{{ row.name }}</div>
                <div class="product-patch">{{ row.patch_title }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创作者" width="120" />
        <el-table-column label="价格" width="150">
          <template #default="{ row }">
            <div class="price-info">
              <span class="current-price">¥{{ row.price }}</span>
              <span v-if="row.original_price" class="original-price">¥{{ row.original_price }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="sales_count" label="销量" width="80" />
        <el-table-column prop="is_active" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'">
              {{ row.is_active ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.is_active ? 'warning' : 'success'"
              @click="toggleActive(row)"
            >
              {{ row.is_active ? '下架' : '上架' }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteProduct(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="productsTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchProducts"
          @current-change="fetchProducts"
        />
      </div>
    </div>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑商品' : '新增商品'" 
      width="600px"
    >
      <el-form :model="form" label-width="100px" ref="formRef">
        <el-form-item label="关联 Patch" prop="patch_id" required>
          <el-select 
            v-model="form.patch_id" 
            placeholder="请选择要关联的 Patch"
            filterable
            remote
            :remote-method="searchPatches"
            :loading="patchSearchLoading"
            style="width: 100%"
            :disabled="isEdit"
          >
            <el-option 
              v-for="patch in patchOptions" 
              :key="patch.id" 
              :label="patch.title" 
              :value="patch.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品名称" prop="name" required>
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入商品描述"
          />
        </el-form-item>
        <el-form-item label="售价" prop="price" required>
          <el-input-number 
            v-model="form.price" 
            :min="0" 
            :precision="2"
            placeholder="请输入售价"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="原价">
          <el-input-number 
            v-model="form.original_price" 
            :min="0" 
            :precision="2"
            placeholder="请输入原价（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="货币单位">
          <el-select v-model="form.currency" style="width: 100%">
            <el-option label="人民币 (CNY)" value="CNY" />
            <el-option label="美元 (USD)" value="USD" />
          </el-select>
        </el-form-item>
        <el-form-item label="促销活动">
          <el-switch v-model="form.is_discount" />
        </el-form-item>
        <el-form-item v-if="form.is_discount" label="促销时间">
          <el-date-picker
            v-model="discountDateRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="立即上架">
          <el-switch v-model="form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { adminApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

const productStore = useProductStore()

const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)

const products = computed(() => productStore.products)
const productsTotal = computed(() => productStore.productsTotal)

const activeCount = computed(() => 
  products.value.filter(p => p.is_active).length
)
const inactiveCount = computed(() => 
  products.value.filter(p => !p.is_active).length
)
const totalSales = computed(() => 
  products.value.reduce((sum, p) => sum + (p.sales_count || 0), 0)
)

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const form = ref({
  patch_id: null,
  name: '',
  description: '',
  price: 0,
  original_price: null,
  currency: 'CNY',
  is_active: 1,
  is_discount: 0,
  discount_start_date: null,
  discount_end_date: null
})
const discountDateRange = ref([])

const patchOptions = ref([])
const patchSearchLoading = ref(false)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchProducts = async () => {
  try {
    loading.value = true
    await productStore.getProducts({
      keyword: keyword.value,
      status: statusFilter.value,
      page: page.value,
      pageSize: pageSize.value
    })
  } catch (err) {
    ElMessage.error('获取商品列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const searchPatches = async (query) => {
  if (!query) {
    patchOptions.value = []
    return
  }
  try {
    patchSearchLoading.value = true
    const res = await adminApi.searchPatches(query)
    patchOptions.value = res || []
  } catch (err) {
    console.error(err)
  } finally {
    patchSearchLoading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  form.value = {
    patch_id: null,
    name: '',
    description: '',
    price: 0,
    original_price: null,
    currency: 'CNY',
    is_active: 1,
    is_discount: 0,
    discount_start_date: null,
    discount_end_date: null
  }
  discountDateRange.value = []
  patchOptions.value = []
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  form.value = { ...row }
  if (row.discount_start_date && row.discount_end_date) {
    discountDateRange.value = [row.discount_start_date, row.discount_end_date]
  } else {
    discountDateRange.value = []
  }
  dialogVisible.value = true
}

const saveProduct = async () => {
  try {
    if (discountDateRange.value && discountDateRange.value.length === 2) {
      form.value.discount_start_date = discountDateRange.value[0]
      form.value.discount_end_date = discountDateRange.value[1]
    }

    if (isEdit.value) {
      await productStore.updateProduct(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await productStore.createProduct(form.value)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchProducts()
  } catch (err) {
    ElMessage.error(err.error || '保存失败')
    console.error(err)
  }
}

const toggleActive = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.is_active ? '下架' : '上架'}商品 "${row.name}" 吗？`,
      '确认操作',
      { type: 'warning' }
    )
    
    await productStore.toggleProductActive(row.id, !row.is_active)
    row.is_active = !row.is_active
    ElMessage.success('操作成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const deleteProduct = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品 "${row.name}" 吗？此操作不可恢复！`,
      '确认删除',
      { type: 'danger' }
    )
    
    await productStore.deleteProduct(row.id)
    fetchProducts()
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

onMounted(() => {
  fetchProducts()
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

.product-patch {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.current-price {
  font-size: 1.1rem;
  font-weight: bold;
  color: #f56c6c;
}

.original-price {
  font-size: 0.9rem;
  text-decoration: line-through;
  color: var(--text-secondary);
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}
</style>
