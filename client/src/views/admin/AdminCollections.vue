<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🎯 专题策展管理</h1>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建专题
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索专题标题"
        clearable
        class="search-input"
        @keyup.enter="fetchCollections"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="fetchCollections">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="collections" v-loading="loading" stripe row-key="id">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.cover_url"
              :src="row.cover_url"
              :preview-src-list="[row.cover_url]"
              fit="cover"
              style="width: 60px; height: 40px; border-radius: 6px;"
            />
            <span v-else style="color: rgba(255,255,255,0.3)">无封面</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="专题标题" min-width="180" />
        <el-table-column prop="patch_count" label="Patch 数" width="100" />
        <el-table-column prop="sort_order" label="排序" width="80">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sort_order"
              :min="0"
              :max="9999"
              size="small"
              controls-position="right"
              style="width: 80px"
              @change="handleSortChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="is_published" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_published ? 'success' : 'info'">
              {{ row.is_published ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button size="small" type="primary" @click="openPatchManager(row)">
              管理 Patch
            </el-button>
            <el-button
              size="small"
              :type="row.is_published ? 'warning' : 'success'"
              @click="togglePublish(row)"
            >
              {{ row.is_published ? '下线' : '发布' }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteCollection(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑专题' : '新建专题'"
      width="600px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="专题标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入专题标题" />
        </el-form-item>
        <el-form-item label="专题描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入专题描述"
          />
        </el-form-item>
        <el-form-item label="封面图片" prop="cover_url">
          <el-input v-model="formData.cover_url" placeholder="请输入封面图片 URL" />
          <div v-if="formData.cover_url" style="margin-top: 8px;">
            <el-image
              :src="formData.cover_url"
              fit="cover"
              style="width: 200px; height: 120px; border-radius: 8px;"
            />
          </div>
        </el-form-item>
        <el-form-item label="发布状态">
          <el-switch v-model="formData.is_published" active-text="发布" inactive-text="草稿" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="patchManagerVisible"
      :title="`管理专题「${currentCollection?.title}」的 Patch`"
      width="800px"
      top="5vh"
    >
      <div class="patch-manager">
        <div class="add-patch-bar">
          <el-input
            v-model="patchSearch"
            placeholder="搜索 Patch 标题添加到专题"
            @keyup.enter="searchPatches"
            style="flex: 1"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="searchPatches">搜索</el-button>
        </div>

        <div v-if="searchResults.length > 0" class="search-results">
          <div class="section-label">搜索结果（点击添加）</div>
          <div class="search-list">
            <div
              v-for="patch in searchResults"
              :key="patch.id"
              class="search-item"
              @click="addPatch(patch)"
            >
              <span class="patch-name">{{ patch.title }}</span>
              <span class="patch-author">by {{ patch.username }}</span>
              <el-icon><Plus /></el-icon>
            </div>
          </div>
        </div>

        <div class="section-label" style="margin-top: 16px;">
          专题内 Patch（拖拽或修改序号排序）
        </div>

        <div v-if="collectionPatches.length === 0" class="no-patches">
          暂无 Patch，请通过搜索添加
        </div>

        <div v-else class="patch-sort-list">
          <div
            v-for="(patch, index) in collectionPatches"
            :key="patch.id"
            class="patch-sort-item"
          >
            <div class="sort-handle">
              <el-button
                :disabled="index === 0"
                size="small"
                circle
                @click="movePatchUp(index)"
              >
                <el-icon><Top /></el-icon>
              </el-button>
              <el-button
                :disabled="index === collectionPatches.length - 1"
                size="small"
                circle
                @click="movePatchDown(index)"
              >
                <el-icon><Bottom /></el-icon>
              </el-button>
            </div>
            <span class="sort-index">{{ index + 1 }}</span>
            <span class="sort-title">{{ patch.title }}</span>
            <span class="sort-author">by {{ patch.username }}</span>
            <el-input
              v-model="patch.cp_note"
              placeholder="备注"
              size="small"
              style="width: 120px"
              @blur="updatePatchNote(patch)"
            />
            <el-button
              size="small"
              type="danger"
              circle
              @click="removePatch(patch)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Top, Bottom, Delete
} from '@element-plus/icons-vue'
import { adminApi, collectionApi, patchApi } from '@/api'

const loading = ref(true)
const keyword = ref('')
const collections = ref([])
const dialogVisible = ref(false)
const patchManagerVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const currentCollection = ref(null)
const collectionPatches = ref([])
const patchSearch = ref('')
const searchResults = ref([])

const formData = reactive({
  id: null,
  title: '',
  description: '',
  cover_url: '',
  is_published: false
})

const rules = {
  title: [{ required: true, message: '请输入专题标题', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchCollections = async () => {
  try {
    loading.value = true
    const res = await adminApi.getCollections({ search: keyword.value })
    collections.value = res.data.list || res.data || []
  } catch (err) {
    ElMessage.error('获取专题列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    title: '',
    description: '',
    cover_url: '',
    is_published: false
  })
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    title: row.title,
    description: row.description || '',
    cover_url: row.cover_url || '',
    is_published: !!row.is_published
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    if (isEdit.value) {
      await adminApi.updateCollection(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createCollection(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchCollections()
  } catch (err) {
    if (err !== false) {
      ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      console.error(err)
    }
  }
}

const togglePublish = async (row) => {
  try {
    const newPublished = row.is_published ? 0 : 1
    await adminApi.updateCollection(row.id, { is_published: newPublished })
    row.is_published = newPublished
    ElMessage.success('操作成功')
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  }
}

const deleteCollection = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除专题「${row.title}」吗？此操作不可恢复！`,
      '确认删除',
      { type: 'danger' }
    )
    await adminApi.deleteCollection(row.id)
    collections.value = collections.value.filter(c => c.id !== row.id)
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

const handleSortChange = async (row) => {
  try {
    await adminApi.updateCollection(row.id, { sort_order: row.sort_order })
    ElMessage.success('排序已更新')
  } catch (err) {
    ElMessage.error('排序更新失败')
    console.error(err)
  }
}

const openPatchManager = async (row) => {
  currentCollection.value = row
  patchSearch.value = ''
  searchResults.value = []
  patchManagerVisible.value = true
  await fetchCollectionPatches(row.id)
}

const fetchCollectionPatches = async (collectionId) => {
  try {
    const res = await collectionApi.getDetail(collectionId)
    const data = res.data || res
    collectionPatches.value = (data.patches || []).map(p => ({
      ...p,
      cp_note: p.cp_note || ''
    }))
  } catch (err) {
    console.error(err)
  }
}

const searchPatches = async () => {
  if (!patchSearch.value.trim()) return
  try {
    const res = await patchApi.getList({ search: patchSearch.value, limit: 10 })
    const list = res.data?.list || res.data || []
    const existingIds = new Set(collectionPatches.value.map(p => p.id))
    searchResults.value = list.filter(p => !existingIds.has(p.id))
  } catch (err) {
    console.error(err)
  }
}

const addPatch = async (patch) => {
  if (!currentCollection.value) return
  try {
    await adminApi.addPatchToCollection(currentCollection.value.id, {
      patch_id: patch.id,
      note: ''
    })
    searchResults.value = searchResults.value.filter(p => p.id !== patch.id)
    await fetchCollectionPatches(currentCollection.value.id)
    ElMessage.success('添加成功')
  } catch (err) {
    ElMessage.error(err.error || '添加失败')
    console.error(err)
  }
}

const removePatch = async (patch) => {
  if (!currentCollection.value) return
  try {
    await adminApi.removePatchFromCollection(currentCollection.value.id, patch.id)
    collectionPatches.value = collectionPatches.value.filter(p => p.id !== patch.id)
    ElMessage.success('已移除')
  } catch (err) {
    ElMessage.error('移除失败')
    console.error(err)
  }
}

const movePatchUp = async (index) => {
  if (index <= 0) return
  const list = [...collectionPatches.value]
  const temp = list[index]
  list[index] = list[index - 1]
  list[index - 1] = temp
  collectionPatches.value = list
  await savePatchesOrder()
}

const movePatchDown = async (index) => {
  if (index >= collectionPatches.value.length - 1) return
  const list = [...collectionPatches.value]
  const temp = list[index]
  list[index] = list[index + 1]
  list[index + 1] = temp
  collectionPatches.value = list
  await savePatchesOrder()
}

const savePatchesOrder = async () => {
  if (!currentCollection.value) return
  try {
    const orders = collectionPatches.value.map((p, i) => ({
      patch_id: p.id,
      sort_order: i + 1
    }))
    await adminApi.reorderPatches(currentCollection.value.id, orders)
  } catch (err) {
    ElMessage.error('排序保存失败')
    console.error(err)
  }
}

const updatePatchNote = async (patch) => {
  if (!currentCollection.value) return
  try {
    await adminApi.addPatchToCollection(currentCollection.value.id, {
      patch_id: patch.id,
      note: patch.cp_note
    })
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchCollections()
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

.patch-manager {
  max-height: 70vh;
  overflow-y: auto;
}

.add-patch-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.section-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.search-results {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}

.search-list {
  max-height: 200px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-item:hover {
  background: var(--bg-hover);
}

.patch-name {
  flex: 1;
  font-weight: 500;
}

.patch-author {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.no-patches {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

.patch-sort-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.patch-sort-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.sort-handle {
  display: flex;
  gap: 2px;
}

.sort-index {
  width: 24px;
  text-align: center;
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.875rem;
}

.sort-title {
  flex: 1;
  font-weight: 500;
}

.sort-author {
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 80px;
}
</style>
