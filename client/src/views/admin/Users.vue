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
      <el-select v-model="filterRole" placeholder="角色筛选" clearable style="width: 150px">
        <el-option label="普通用户" value="user" />
        <el-option label="审核员" value="auditor" />
        <el-option label="运营" value="operator" />
        <el-option label="管理员" value="admin" />
        <el-option label="已封禁" value="banned" />
      </el-select>
      <el-button type="primary" @click="fetchUsers">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div v-if="selectedUsers.length > 0" class="batch-action-bar">
      <div class="batch-info">
        已选择 <el-tag type="primary">{{ selectedUsers.length }}</el-tag> 个用户
      </div>
      <div class="batch-actions">
        <el-dropdown @command="(cmd) => batchChangeRole(cmd)" trigger="click">
          <el-button size="small" type="primary">
            批量设置角色
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="user">
                <el-tag type="info" size="small">普通用户</el-tag>
              </el-dropdown-item>
              <el-dropdown-item command="auditor">
                <el-tag type="success" size="small">审核员</el-tag>
              </el-dropdown-item>
              <el-dropdown-item command="operator">
                <el-tag type="warning" size="small">运营</el-tag>
              </el-dropdown-item>
              <el-dropdown-item command="admin">
                <el-tag type="danger" size="small">管理员</el-tag>
              </el-dropdown-item>
              <el-dropdown-item command="banned">
                <el-tag type="danger" size="small">已封禁</el-tag>
              </el-dropdown-item>
              <el-dropdown-item command="suspended">
                <el-tag type="warning" size="small">临时封禁</el-tag>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="clearSelection">
          取消选择
        </el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table 
        :data="users" 
        v-loading="loading" 
        stripe
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="55" reserve-selection />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right" v-if="userStore.hasPermission(PERMISSIONS.USER_MANAGE)">
          <template #default="{ row }">
            <el-dropdown @command="(cmd) => changeRole(row, cmd)" trigger="click">
              <el-button size="small" type="primary">
                设置角色
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="user" :disabled="row.role === 'user'">
                    <el-tag type="info" size="small">普通用户</el-tag>
                  </el-dropdown-item>
                  <el-dropdown-item command="auditor" :disabled="row.role === 'auditor'">
                    <el-tag type="success" size="small">审核员</el-tag>
                  </el-dropdown-item>
                  <el-dropdown-item command="operator" :disabled="row.role === 'operator'">
                    <el-tag type="warning" size="small">运营</el-tag>
                  </el-dropdown-item>
                  <el-dropdown-item command="admin" :disabled="row.role === 'admin'">
                    <el-tag type="danger" size="small">管理员</el-tag>
                  </el-dropdown-item>
                  <el-dropdown-item command="banned" :disabled="row.role === 'banned'">
                    <el-tag type="danger" size="small">已封禁</el-tag>
                  </el-dropdown-item>
                  <el-dropdown-item command="suspended" :disabled="row.role === 'suspended'">
                    <el-tag type="warning" size="small">临时封禁</el-tag>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
import { Search, ArrowDown } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import { useUserStore } from '@/stores/userStore'
import { PERMISSIONS, ROLE_LABELS } from '@/constants/permissions'

const userStore = useUserStore()
const loading = ref(true)
const keyword = ref('')
const filterRole = ref('')
const users = ref([])
const selectedUsers = ref([])

const currentUserId = computed(() => userStore.user?.id)

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role || '普通用户'
}

const getRoleTagType = (role) => {
  const typeMap = {
    admin: 'danger',
    operator: 'warning',
    auditor: 'success',
    user: 'info',
    banned: 'danger',
    suspended: 'warning'
  }
  return typeMap[role] || 'info'
}

const fetchUsers = async () => {
  try {
    loading.value = true
    const params = { keyword: keyword.value }
    if (filterRole.value) {
      params.role = filterRole.value
    }
    const res = await adminApi.getUsers(params)
    users.value = res.list || res || []
  } catch (err) {
    ElMessage.error('获取用户列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

const clearSelection = () => {
  selectedUsers.value = []
}

const changeRole = async (user, newRole) => {
  try {
    await ElMessageBox.confirm(
      `确定要将用户 "${user.username}" 的角色修改为"${getRoleLabel(newRole)}"吗？`,
      '确认修改角色',
      { type: 'warning' }
    )
    
    await adminApi.updateUser(user.id, { role: newRole })
    user.role = newRole
    ElMessage.success('角色修改成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(err)
    }
  }
}

const batchChangeRole = async (newRole) => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要操作的用户')
    return
  }

  const targetUsers = selectedUsers.value.filter(u => u.id !== currentUserId.value)
  if (targetUsers.length === 0) {
    ElMessage.warning('所选用户中没有可修改的用户（不能修改自己的角色）')
    return
  }

  const usersToUpdate = targetUsers.filter(u => u.role !== newRole)
  if (usersToUpdate.length === 0) {
    ElMessage.info(`所选用户已全部是"${getRoleLabel(newRole)}"角色`)
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将 ${usersToUpdate.length} 个用户的角色批量修改为"${getRoleLabel(newRole)}"吗？`,
      '确认批量修改角色',
      { type: 'warning' }
    )

    const ids = usersToUpdate.map(u => u.id)
    const res = await adminApi.batchUpdateUsersRole({
      ids,
      role: newRole
    })

    users.value = users.value.map(u => {
      if (ids.includes(u.id)) {
        return { ...u, role: newRole }
      }
      return u
    })

    clearSelection()
    
    let successMsg = `批量修改角色成功，共处理 ${res.count} 个用户`
    if (res.skipped_count && res.skipped_count > 0) {
      successMsg += `（已跳过 ${res.skipped_count} 个不允许修改的用户）`
    }
    ElMessage.success(successMsg)
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批量操作失败')
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
  align-items: center;
}

.search-input {
  max-width: 400px;
}

.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(245, 108, 108, 0.1));
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.batch-info {
  font-size: 14px;
  color: var(--text-primary);
}

.batch-actions {
  display: flex;
  gap: 0.5rem;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}
</style>
