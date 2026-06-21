<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🏷️ 标签管理中心</h1>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="📊 标签列表" name="list">
        <div class="action-bar">
          <el-input
            v-model="keyword"
            placeholder="搜索标签..."
            clearable
            style="width: 240px"
            @clear="fetchTags"
            @keyup.enter="fetchTags"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="sortField" placeholder="排序方式" style="width: 150px" @change="fetchTags">
            <el-option label="使用次数" value="usage_count" />
            <el-option label="标签名称" value="name" />
            <el-option label="排序权重" value="sort_order" />
            <el-option label="创建时间" value="created_at" />
          </el-select>
          <el-select v-model="sortOrder" style="width: 120px" @change="fetchTags">
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
          <el-select v-model="hotFilter" placeholder="热门筛选" clearable style="width: 120px" @change="fetchTags">
            <el-option label="热门" value="1" />
            <el-option label="非热门" value="0" />
          </el-select>
          <el-button @click="fetchTags">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button type="warning" @click="handleRecalculate" :loading="recalculating">
            <el-icon><RefreshRight /></el-icon>
            重新计算
          </el-button>
        </div>

        <el-table :data="tags" v-loading="loading" stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="标签名" min-width="180">
            <template #default="{ row }">
              <el-tag :type="row.is_hot ? 'danger' : ''" size="small" class="tag-name">
                {{ row.name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="usage_count" label="使用次数" width="110" align="center" sortable>
            <template #default="{ row }">
              <span class="usage-count">{{ row.usage_count }}</span>
            </template>
          </el-table-column>
          <el-table-column label="热门" width="90" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="!!row.is_hot"
                @change="toggleHot(row)"
                active-color="#ef4444"
              />
            </template>
          </el-table-column>
          <el-table-column prop="sort_order" label="排序权重" width="110" align="center">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.sort_order"
                @change="(val) => updateSortOrder(row, val)"
                :min="0"
                :max="9999"
                size="small"
                controls-position="right"
                style="width: 90px"
              />
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="total > pageSize" class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="fetchTags"
            background
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="🔀 合并标签" name="merge">
        <div class="merge-section">
          <el-alert
            title="合并标签会将所有使用源标签的 Patch 和文章中的标签替换为目标标签，操作不可撤销，请谨慎操作。"
            type="warning"
            show-icon
            :closable="false"
            style="margin-bottom: 20px"
          />

          <el-form label-width="120px">
            <el-form-item label="源标签">
              <el-select
                v-model="mergeForm.source_tags"
                multiple
                filterable
                allow-create
                placeholder="选择或输入要合并的标签"
                style="width: 100%; max-width: 600px"
              >
                <el-option
                  v-for="tag in allTagOptions"
                  :key="tag.name"
                  :label="`${tag.name} (${tag.usage_count})`"
                  :value="tag.name"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="目标标签">
              <el-select
                v-model="mergeForm.target_tag"
                filterable
                allow-create
                placeholder="选择或输入合并后的标签名"
                style="width: 100%; max-width: 600px"
              >
                <el-option
                  v-for="tag in allTagOptions"
                  :key="tag.name"
                  :label="`${tag.name} (${tag.usage_count})`"
                  :value="tag.name"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="danger" @click="handleMerge" :loading="merging">
                <el-icon><Connection /></el-icon>
                执行合并
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="📋 合并记录" name="logs">
        <div class="action-bar">
          <el-button @click="fetchMergeLogs">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="mergeLogs" v-loading="logsLoading" stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="source_tag" label="源标签" min-width="150">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ row.source_tag }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="" width="60" align="center">
            <template #default>
              <el-icon><Right /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="target_tag" label="目标标签" min-width="150">
            <template #default="{ row }">
              <el-tag type="success" size="small">{{ row.target_tag }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="affected_count" label="影响数量" width="110" align="center" />
          <el-table-column prop="operator_name" label="操作人" width="120" />
          <el-table-column prop="created_at" label="操作时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>

        <div v-if="logsTotal > logsPageSize" class="pagination-wrap">
          <el-pagination
            v-model:current-page="logsPage"
            :page-size="logsPageSize"
            :total="logsTotal"
            layout="prev, pager, next, total"
            @current-change="fetchMergeLogs"
            background
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editDialogVisible" title="编辑标签" width="450px">
      <el-form label-width="80px">
        <el-form-item label="标签名">
          <el-input v-model="editForm.name" placeholder="标签名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="updating">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight, Connection, Right } from '@element-plus/icons-vue'
import { adminTagAPI } from '@/api'

const activeTab = ref('list')

const tags = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const sortField = ref('usage_count')
const sortOrder = ref('desc')
const hotFilter = ref('')

const allTagOptions = ref([])

const fetchTags = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      sort: sortField.value,
      order: sortOrder.value
    }
    if (keyword.value) params.keyword = keyword.value
    if (hotFilter.value) params.is_hot = hotFilter.value

    const res = await adminTagAPI.getTags(params)
    tags.value = res.tags
    total.value = res.total
  } catch (e) {
    ElMessage.error('获取标签列表失败')
  } finally {
    loading.value = false
  }
}

const fetchAllTagOptions = async () => {
  try {
    const res = await adminTagAPI.getTags({ page: 1, pageSize: 1000, sort: 'usage_count', order: 'desc' })
    allTagOptions.value = res.tags
  } catch {}
}

const toggleHot = async (row) => {
  try {
    await adminTagAPI.toggleHot(row.id, !row.is_hot)
    ElMessage.success(row.is_hot ? '已取消热门' : '已设为热门')
    fetchTags()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const updateSortOrder = async (row, val) => {
  try {
    await adminTagAPI.updateTag(row.id, { sort_order: val })
    ElMessage.success('排序权重已更新')
    fetchTags()
  } catch (e) {
    ElMessage.error('更新失败')
  }
}

const editDialogVisible = ref(false)
const editForm = reactive({ id: null, name: '' })
const updating = ref(false)

const openEditDialog = (row) => {
  editForm.id = row.id
  editForm.name = row.name
  editDialogVisible.value = true
}

const handleUpdate = async () => {
  if (!editForm.name.trim()) {
    ElMessage.error('标签名不能为空')
    return
  }
  updating.value = true
  try {
    await adminTagAPI.updateTag(editForm.id, { name: editForm.name })
    ElMessage.success('标签已更新')
    editDialogVisible.value = false
    fetchTags()
    fetchAllTagOptions()
  } catch (e) {
    ElMessage.error(e.error || '更新失败')
  } finally {
    updating.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签 "${row.name}" 吗？删除后不会自动移除已有 Patch/文章中的标签引用。`,
      '确认删除',
      { type: 'warning' }
    )
    await adminTagAPI.deleteTag(row.id)
    ElMessage.success('标签已删除')
    fetchTags()
    fetchAllTagOptions()
  } catch {}
}

const recalculating = ref(false)
const handleRecalculate = async () => {
  try {
    await ElMessageBox.confirm('确定要重新计算所有标签的使用次数吗？', '确认', { type: 'warning' })
    recalculating.value = true
    const res = await adminTagAPI.recalculate()
    ElMessage.success(res.message || '重新计算完成')
    fetchTags()
    fetchAllTagOptions()
  } catch {} finally {
    recalculating.value = false
  }
}

const mergeForm = reactive({
  source_tags: [],
  target_tag: ''
})
const merging = ref(false)

const handleMerge = async () => {
  if (mergeForm.source_tags.length === 0) {
    ElMessage.error('请选择要合并的源标签')
    return
  }
  if (!mergeForm.target_tag.trim()) {
    ElMessage.error('请输入目标标签')
    return
  }

  try {
    await ElMessageBox.confirm(
      `将标签 [${mergeForm.source_tags.join(', ')}] 合并为 "${mergeForm.target_tag}"？此操作不可撤销。`,
      '确认合并',
      { type: 'warning' }
    )
    merging.value = true
    const res = await adminTagAPI.mergeTags({
      source_tags: mergeForm.source_tags,
      target_tag: mergeForm.target_tag
    })
    ElMessage.success(`合并完成，影响了 ${res.affected_count} 条记录`)
    mergeForm.source_tags = []
    mergeForm.target_tag = ''
    fetchTags()
    fetchAllTagOptions()
    fetchMergeLogs()
  } catch {} finally {
    merging.value = false
  }
}

const mergeLogs = ref([])
const logsLoading = ref(false)
const logsPage = ref(1)
const logsPageSize = ref(20)
const logsTotal = ref(0)

const fetchMergeLogs = async () => {
  logsLoading.value = true
  try {
    const res = await adminTagAPI.getMergeLogs({
      page: logsPage.value,
      pageSize: logsPageSize.value
    })
    mergeLogs.value = res.logs
    logsTotal.value = res.total
  } catch {
    ElMessage.error('获取合并记录失败')
  } finally {
    logsLoading.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  fetchTags()
  fetchAllTagOptions()
  fetchMergeLogs()
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
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.action-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.tag-name {
  font-weight: 500;
}

.usage-count {
  font-weight: 600;
  color: var(--primary-color);
}

.merge-section {
  max-width: 800px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
</style>
