<template>
  <div class="stats-tab">
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索模块名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="manufacturerFilter" placeholder="厂商筛选" class="filter-select" @change="handleSearch">
        <el-option label="全部" value="" />
        <el-option 
          v-for="m in manufacturers" 
          :key="m.id" 
          :label="m.name" 
          :value="m.id" 
        />
      </el-select>
      <el-select v-model="typeFilter" placeholder="类型筛选" class="filter-select" @change="handleSearch">
        <el-option label="全部" value="" />
        <el-option label="VCO" value="VCO" />
        <el-option label="VCF" value="VCF" />
        <el-option label="VCA" value="VCA" />
        <el-option label="LFO" value="LFO" />
        <el-option label="Envelope" value="Envelope" />
        <el-option label="Mixer" value="Mixer" />
        <el-option label="Sequencer" value="Sequencer" />
        <el-option label="Effect" value="Effect" />
        <el-option label="Utility" value="Utility" />
        <el-option label="Other" value="Other" />
      </el-select>
      <el-select v-model="sortBy" placeholder="排序方式" class="filter-select" @change="handleSearch">
        <el-option label="关联Patch数" value="patches_count" />
        <el-option label="HP" value="hp" />
        <el-option label="创建时间" value="created_at" />
      </el-select>
      <el-select v-model="sortOrder" placeholder="排序方向" class="filter-select" @change="handleSearch">
        <el-option label="降序" value="desc" />
        <el-option label="升序" value="asc" />
      </el-select>
      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <div class="table-card">
      <el-table :data="data" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="模块名称" min-width="160" />
        <el-table-column prop="manufacturer_name" label="厂商" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTagType(row.type)">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hp" label="HP" width="80" sortable />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '正常' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="patches_count" label="关联Patch数" width="120" sortable>
          <template #default="{ row }">
            <span class="highlight-number">{{ row.patches_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { moduleApi } from '@/api'

const props = defineProps({
  loading: Boolean,
  data: Array,
  total: Number
})

const emit = defineEmits(['refresh'])

const keyword = ref('')
const manufacturerFilter = ref('')
const typeFilter = ref('')
const sortBy = ref('patches_count')
const sortOrder = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)
const manufacturers = ref([])

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getTypeTagType = (type) => {
  const types = {
    'VCO': 'primary',
    'VCF': 'success',
    'VCA': 'warning',
    'LFO': 'info',
    'Envelope': 'danger',
    'Mixer': '',
    'Sequencer': 'primary',
    'Effect': 'success',
    'Utility': 'info',
    'Other': ''
  }
  return types[type] || ''
}

const fetchManufacturers = async () => {
  try {
    const res = await moduleApi.getManufacturers()
    manufacturers.value = res.list || res || []
  } catch (err) {
    console.error(err)
  }
}

const handleSearch = () => {
  currentPage.value = 1
  emit('refresh', {
    search: keyword.value,
    manufacturer_id: manufacturerFilter.value,
    type: typeFilter.value,
    sort_by: sortBy.value,
    sort_order: sortOrder.value,
    page: currentPage.value,
    limit: pageSize.value
  })
}

const resetFilters = () => {
  keyword.value = ''
  manufacturerFilter.value = ''
  typeFilter.value = ''
  sortBy.value = 'patches_count'
  sortOrder.value = 'desc'
  currentPage.value = 1
  pageSize.value = 20
  handleSearch()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  handleSearch()
}

const handlePageChange = (page) => {
  currentPage.value = page
  handleSearch()
}

onMounted(() => {
  fetchManufacturers()
})
</script>

<style scoped>
.stats-tab {
  padding: 1rem 0;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  max-width: 300px;
}

.filter-select {
  width: 150px;
}

.table-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
}

.highlight-number {
  font-weight: 600;
  color: var(--primary-color);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
