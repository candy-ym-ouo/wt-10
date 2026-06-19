<template>
  <div class="stats-tab">
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索用户名/邮箱"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="sortBy" placeholder="排序方式" class="filter-select" @change="handleSearch">
        <el-option label="Patch数量" value="patches_count" />
        <el-option label="粉丝数" value="followers_count" />
        <el-option label="总点赞" value="likes_count" />
        <el-option label="总收藏" value="favorites_count" />
        <el-option label="注册时间" value="created_at" />
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
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar">
                {{ row.username?.charAt(0) }}
              </el-avatar>
              <div class="user-info">
                <span class="username">{{ row.username }}</span>
                <span class="email">{{ row.email }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="patches_count" label="Patch数" width="100" sortable />
        <el-table-column prop="total_likes" label="总点赞" width="100" sortable>
          <template #default="{ row }">
            <span class="highlight-number">{{ row.total_likes || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total_favorites" label="总收藏" width="100" sortable />
        <el-table-column prop="total_views" label="总浏览" width="100" sortable>
          <template #default="{ row }">
            {{ formatNumber(row.total_views || 0) }}
          </template>
        </el-table-column>
        <el-table-column prop="followers_count" label="粉丝数" width="100" sortable />
        <el-table-column prop="following_count" label="关注数" width="100" sortable />
        <el-table-column label="创作者认证" width="110">
          <template #default="{ row }">
            <el-tag :type="row.is_creator_verified ? 'success' : 'info'" size="small">
              {{ row.is_creator_verified ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180">
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
import { ref, defineEmits } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  loading: Boolean,
  data: Array,
  total: Number
})

const emit = defineEmits(['refresh'])

const keyword = ref('')
const sortBy = ref('patches_count')
const sortOrder = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const handleSearch = () => {
  currentPage.value = 1
  emit('refresh', {
    search: keyword.value,
    sort_by: sortBy.value,
    sort_order: sortOrder.value,
    page: currentPage.value,
    limit: pageSize.value
  })
}

const resetFilters = () => {
  keyword.value = ''
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 500;
  color: var(--text-primary);
}

.email {
  font-size: 0.8rem;
  color: var(--text-secondary);
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
