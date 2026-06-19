<template>
  <div class="config-panel">
    <div class="jury-toolbar">
      <el-input
        v-model="userSearch"
        placeholder="搜索用户（用户名/邮箱）"
        style="width: 280px;"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button @click="searchUsers" :loading="searching">搜索</el-button>
      <el-select v-model="roleSelect" style="width: 140px; margin-left: 16px;">
        <el-option label="评审员" value="jury" />
        <el-option label="主评审" value="head_jury" />
        <el-option label="管理员" value="admin" />
      </el-select>
      <el-button
        type="primary"
        :disabled="selectedUsers.length === 0"
        @click="addJury"
      >
        添加为评审团 ({{ selectedUsers.length }})
      </el-button>
    </div>

    <div v-if="searchResults.length > 0" class="search-results">
      <div class="section-title">搜索结果</div>
      <div class="user-grid">
        <div
          v-for="u in searchResults"
          :key="u.id"
          :class="['user-card', { selected: selectedUsers.includes(u.id) }]"
          @click="toggleSelect(u.id)"
        >
          <el-avatar :size="40" :src="u.avatar">
            {{ u.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="user-info">
            <div class="user-name">{{ u.username }}</div>
            <div class="user-email">{{ u.email }}</div>
          </div>
          <el-checkbox :model-value="selectedUsers.includes(u.id)" @click.stop />
        </div>
      </div>
    </div>

    <el-divider>当前评审团 ({{ jury.length }}人)</el-divider>

    <div v-if="juryLoading" class="empty-state small">加载中...</div>
    <div v-else-if="jury.length === 0" class="empty-state small">
      <p>暂无评审团成员，请先搜索添加</p>
    </div>

    <el-table v-else :data="jury" border>
      <el-table-column label="成员" min-width="200">
        <template #default="{ row }">
          <div class="jury-member">
            <el-avatar :size="36" :src="row.avatar">
              {{ row.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div>
              <div class="jury-name">{{ row.username }}</div>
              <div class="jury-email">{{ row.email }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.role)">{{ roleText(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="加入时间" width="200">
        <template #default="{ row }">{{ formatTime(row.assigned_at) }}</template>
      </el-table-column>
      <el-table-column label="评审作品数" width="120" align="center">
        <template #default="{ row }">
          <el-tag type="info">{{ row.review_count || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button
            type="danger"
            link
            size="small"
            @click="removeJury([row.user_id])"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="jury.length > 0" class="batch-action">
      <el-button type="danger" :disabled="selectedJury.length === 0" @click="removeJury(selectedJury)">
        批量移除选中 ({{ selectedJury.length }})
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { challengeApi, adminChallengeApi, adminApi } from '@/api'

const props = defineProps({
  seasonId: Number,
  activityId: Number
})

const userSearch = ref('')
const searching = ref(false)
const searchResults = ref([])
const selectedUsers = ref([])
const roleSelect = ref('jury')

const jury = ref([])
const juryLoading = ref(false)
const selectedJury = ref([])

const roleText = (r) => ({ jury: '评审员', head_jury: '主评审', admin: '管理员' }[r] || '评审员')
const roleTagType = (r) => ({ jury: '', head_jury: 'warning', admin: 'danger' }[r] || '')
const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN') : '-'

const searchUsers = async () => {
  if (!userSearch.value.trim()) return
  searching.value = true
  try {
    const res = await adminApi.getUsers({ search: userSearch.value.trim(), limit: 50 })
    searchResults.value = res.list || []
    selectedUsers.value = []
  } catch {
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

const toggleSelect = (id) => {
  const idx = selectedUsers.value.indexOf(id)
  if (idx >= 0) selectedUsers.value.splice(idx, 1)
  else selectedUsers.value.push(id)
}

const loadJury = async () => {
  juryLoading.value = true
  try {
    const res = await challengeApi.getJury({
      activity_id: props.activityId,
      season_id: props.seasonId
    })
    jury.value = res || []
  } finally {
    juryLoading.value = false
  }
}

const addJury = async () => {
  if (selectedUsers.value.length === 0) return
  try {
    await adminChallengeApi.manageJury('add', {
      activity_id: props.activityId,
      season_id: props.seasonId,
      user_ids: selectedUsers.value,
      role: roleSelect.value
    })
    ElMessage.success(`已添加 ${selectedUsers.value.length} 名评审`)
    selectedUsers.value = []
    searchResults.value = []
    userSearch.value = ''
    loadJury()
  } catch (e) {
    ElMessage.error(e?.error || '添加失败')
  }
}

const removeJury = async (ids) => {
  try {
    await ElMessageBox.confirm(`确定移除 ${ids.length} 名评审吗？`, '确认', { type: 'warning' })
    await adminChallengeApi.manageJury('remove', {
      activity_id: props.activityId,
      season_id: props.seasonId,
      user_ids: ids
    })
    ElMessage.success('已移除')
    selectedJury.value = []
    loadJury()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.error || '移除失败')
  }
}

onMounted(loadJury)
watch(() => [props.seasonId, props.activityId], loadJury)
</script>

<style scoped>
.config-panel { padding: 8px 0; }
.jury-toolbar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.search-results {
  margin-top: 16px; padding: 16px;
  background: var(--bg-primary); border-radius: 8px;
  border: 1px solid var(--border-color);
}
.section-title {
  font-size: 0.875rem; color: var(--text-secondary);
  margin-bottom: 12px; font-weight: 500;
}
.user-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.user-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: 8px;
  background: var(--card-bg); border: 1px solid var(--border-color);
  cursor: pointer; transition: all 0.2s;
}
.user-card:hover { border-color: var(--primary-color); }
.user-card.selected {
  border-color: var(--primary-color);
  background: rgba(139, 92, 246, 0.1);
}
.user-info { flex: 1; min-width: 0; }
.user-name {
  font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.user-email {
  font-size: 0.75rem; color: var(--text-secondary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.jury-member {
  display: flex; align-items: center; gap: 12px;
}
.jury-name { font-weight: 500; color: var(--text-primary); }
.jury-email { font-size: 0.75rem; color: var(--text-secondary); }
.batch-action { margin-top: 16px; text-align: right; }
.empty-state.small {
  padding: 24px; text-align: center; color: var(--text-secondary);
}
</style>
