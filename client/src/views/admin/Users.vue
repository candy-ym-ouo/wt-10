<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">👥 用户管理</h1>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索用户名或邮箱"
        clearable
        class="search-input"
        @keyup.enter="fetchUsers"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="fetchUsers">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              :type="row.role === 'admin' ? 'info' : 'warning'"
              @click="toggleRole(row)"
            >
              {{ row.role === 'admin' ? '取消管理员' : '设为管理员' }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteUser(row)"
              :disabled="row.id === currentUserId"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const loading = ref(true)
const keyword = ref('')
const users = ref([])

const currentUserId = computed(() => userStore.user?.id)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchUsers = async () => {
  try {
    loading.value = true
    const res = await adminApi.getUsers({ keyword: keyword.value })
    users.value = res.data.list || res.data || []
  } catch (err) {
    ElMessage.error('获取用户列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const toggleRole = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要${user.role === 'admin' ? '取消' : '设置'}用户 "${user.username}" 的管理员权限吗？`,
      '确认操作',
      { type: 'warning' }
    )
    
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    await adminApi.updateUser(user.id, { role: newRole })
    user.role = newRole
    ElMessage.success('操作成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
      '确认删除',
      { type: 'danger' }
    )
    
    await adminApi.deleteUser(user.id)
    users.value = users.value.filter(u => u.id !== user.id)
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

onMounted(() => {
  fetchUsers()
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

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}
</style>
