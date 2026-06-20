<template>
  <div class="stats-tab">
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索厂商名称/国家"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="sortBy" placeholder="排序方式" class="filter-select" @change="handleSearch">
        <el-option label="模块数量" value="modules_count" />
        <el-option label="关联Patch数" value="patches_count" />
        <el-option label="名称" value="name" />
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
      <el-table :data="data" v-loading="loading" stripe @sort-change="handleTableSort">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="厂商名称" min-width="180" sortable="custom" />
        <el-table-column prop="country" label="国家" width="120" />
        <el-table-column prop="website" label="官网" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <a v-if="row.website" :href="row.website" target="_blank" class="link">
              {{ row.website }}
            </a>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="modules_count" label="模块数量" width="120" sortable="custom">
          <template #default="{ row }">
            <span class="highlight-number">{{ row.modules_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="patches_count" label="关联Patch数" width="120" sortable="custom">
          <template #default="{ row }">
            {{ row.patches_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" sortable="custom">
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
import { ref, defineEmits, defineExpose } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  loading: Boolean,
  data: Array,
  total: Number
})

const emit = defineEmits(['refresh'])

const keyword = ref('')
const sortBy = ref('modules_count')
const sortOrder = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const handleSearch = () => {
  currentPage.value = 1
  emit('refresh', getFilters())
}

const handleTableSort = ({ prop, order }) => {
  if (!prop) return
  sortBy.value = prop
  sortOrder.value = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : 'desc'
  if (!order) {
    sortBy.value = 'modules_count'
    sortOrder.value = 'desc'
  }
  emit('refresh', getFilters())
}

const resetFilters = () => {
  keyword.value = ''
  sortBy.value = 'modules_count'
  sortOrder.value = 'desc'
  currentPage.value = 1
  pageSize.value = 20
  handleSearch()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  emit('refresh', getFilters())
}

const handlePageChange = (page) => {
  currentPage.value = page
  emit('refresh', getFilters())
}

const getFilters = () => ({
  search: keyword.value,
  sort_by: sortBy.value,
  sort_order: sortOrder.value,
  page: currentPage.value,
  limit: pageSize.value
})

const getExportFilters = () => ({
  search: keyword.value,
  sort_by: sortBy.value,
  sort_order: sortOrder.value
})

defineExpose({ getExportFilters })
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

.link {
  color: var(--primary-color);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
