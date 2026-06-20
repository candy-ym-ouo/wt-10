<template>
  <div class="container favorites-container">
    <div class="page-header">
      <h1 class="page-title">⭐ 我的收藏</h1>
      <p class="page-subtitle">管理你收藏的 Patch</p>
    </div>

    <div class="favorites-layout">
      <div class="sidebar">
        <div class="sidebar-header">
          <h3 class="sidebar-title">📁 收藏分组</h3>
          <el-button 
            type="primary" 
            size="small" 
            class="btn-primary"
            @click="showCreateFolderDialog"
          >
            <el-icon><Plus /></el-icon> 新建
          </el-button>
        </div>

        <div v-if="foldersLoading" class="sidebar-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>加载中...</span>
        </div>

        <div v-else class="folder-list">
          <div
            class="folder-item"
            :class="{ active: selectedFolderId === null }"
            @click="selectFolder(null)"
          >
            <div class="folder-icon">
              <el-icon color="#ffd700"><Collection /></el-icon>
            </div>
            <div class="folder-info">
              <span class="folder-name">全部收藏</span>
              <span class="folder-count">{{ totalCount }}</span>
            </div>
          </div>

          <draggable
            v-model="draggableFolders"
            item-key="id"
            handle=".drag-handle"
            ghost-class="drag-ghost"
            @end="onFolderDragEnd"
          >
            <template #item="{ element }">
              <div
                class="folder-item"
                :class="{ active: selectedFolderId === element.id }"
                @click="selectFolder(element.id)"
              >
                <div class="drag-handle" title="拖动排序">
                  <el-icon><Rank /></el-icon>
                </div>
                <div class="folder-icon" :style="{ color: element.color }">
                  <el-icon><Folder /></el-icon>
                </div>
                <div class="folder-info">
                  <span class="folder-name">{{ getFolderDisplayName(element) }}</span>
                  <span class="folder-count">{{ element.patch_count || element.count || 0 }}</span>
                </div>
                <div class="folder-actions" @click.stop>
                  <el-dropdown trigger="click" @command="(cmd) => handleFolderAction(cmd, element)">
                    <el-button type="text" size="small">
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="edit">
                          <el-icon><Edit /></el-icon> 重命名
                        </el-dropdown-item>
                        <el-dropdown-item 
                          v-if="!element.is_default" 
                          command="delete"
                        >
                          <el-icon><Delete /></el-icon> 删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <div class="main-content">
        <div class="toolbar">
          <div class="toolbar-left">
            <el-checkbox
              v-model="selectAll"
              :indeterminate="isIndeterminate"
              @change="handleSelectAll"
              :disabled="favorites.length === 0"
            >
              全选
            </el-checkbox>
            <span v-if="selectedIds.length > 0" class="selected-count">
              已选 {{ selectedIds.length }} 项
            </span>
          </div>

          <div class="toolbar-right">
            <template v-if="selectedIds.length > 0">
              <el-button 
                type="primary" 
                size="small"
                class="btn-primary"
                @click="showBatchMoveDialog"
              >
                <el-icon><Promotion /></el-icon> 批量移动
              </el-button>
              <el-button 
                type="danger" 
                size="small"
                @click="handleBatchDelete"
              >
                <el-icon><Delete /></el-icon> 批量删除
              </el-button>
              <el-button 
                size="small"
                @click="clearSelection"
              >
                取消选择
              </el-button>
            </template>
            <template v-else>
              <span class="current-folder-info">
                {{ currentFolderName }} · {{ total }} 个收藏
              </span>
            </template>
          </div>
        </div>

        <div v-if="loading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="favorites.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Star /></el-icon>
          <p>{{ selectedFolderId ? '该分组还没有收藏任何 Patch' : '还没有收藏任何 Patch' }}</p>
          <el-button type="primary" class="btn-primary" @click="$router.push('/patches')">
            去发现 Patch 收藏
          </el-button>
        </div>

        <div v-else class="favorites-grid">
          <div
            v-for="patch in favorites"
            :key="patch.id"
            class="favorite-card-wrapper"
          >
            <div 
              class="select-checkbox"
              @click.stop="toggleSelect(patch.id)"
            >
              <el-checkbox :model-value="selectedIds.includes(patch.id)" />
            </div>
            <PatchCard
              :patch="patch"
              @click="goToDetail(patch)"
              @toggleLike="handleToggleLike"
              @toggleFavorite="handleToggleFavorite"
              @addToCompare="handleAddToCompare"
              @viewUser="goToUser"
            />
            <div class="card-actions" @click.stop>
              <el-dropdown trigger="click" @command="(cmd) => handlePatchAction(cmd, patch)">
                <el-button type="text" size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="move">
                      <el-icon><Promotion /></el-icon> 移动到分组
                    </el-dropdown-item>
                    <el-dropdown-item command="delete">
                      <el-icon><Delete /></el-icon> 取消收藏
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>

        <div v-if="total > limit" class="pagination">
          <el-pagination
            v-model:current-page="page"
            :page-size="limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="fetchFavorites"
            background
          />
        </div>
      </div>
    </div>

    <el-dialog
      v-model="createFolderDialogVisible"
      title="新建分组"
      width="400px"
    >
      <el-form :model="folderForm" :rules="folderRules" ref="folderFormRef" label-width="80px">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="folderForm.name" placeholder="请输入分组名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="folderForm.description" type="textarea" :rows="3" placeholder="可选，描述一下这个分组" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="folderForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createFolderDialogVisible = false">取消</el-button>
        <el-button type="primary" class="btn-primary" @click="handleCreateFolder">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editFolderDialogVisible"
      title="编辑分组"
      width="400px"
    >
      <el-form :model="editFolderForm" :rules="folderRules" ref="editFolderFormRef" label-width="80px">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="editFolderForm.name" placeholder="请输入分组名称" maxlength="50" show-word-limit :disabled="editingFolder?.is_default" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editFolderForm.description" type="textarea" :rows="3" placeholder="可选，描述一下这个分组" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="editFolderForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editFolderDialogVisible = false">取消</el-button>
        <el-button type="primary" class="btn-primary" @click="handleUpdateFolder">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="moveDialogVisible"
      :title="movingPatch ? '移动到分组' : '批量移动到分组'"
      width="400px"
    >
      <p v-if="movingPatch" class="move-hint">
        选择要将 "{{ movingPatch.title }}" 移动到的分组：
      </p>
      <p v-else class="move-hint">
        选择要将选中的 {{ selectedIds.length }} 个收藏移动到的分组：
      </p>
      <div class="folder-select-list">
        <div
          v-for="folder in folders"
          :key="folder.id"
          class="folder-select-item"
          :class="{ selected: targetFolderId === folder.id }"
          @click="targetFolderId = folder.id"
        >
          <el-icon :color="folder.color"><Folder /></el-icon>
          <span>{{ getFolderDisplayName(folder) }}</span>
          <span class="count">({{ folder.patch_count || folder.count || 0 }})</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" class="btn-primary" @click="handleMoveConfirm" :disabled="!targetFolderId">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Loading, Star, Plus, Collection, Folder, MoreFilled, 
  Edit, Delete, Promotion, Rank 
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { usePatchStore } from '@/stores/patchStore'
import { useUserStore } from '@/stores/userStore'
import PatchCard from '@/components/PatchCard.vue'

const router = useRouter()
const route = useRoute()
const patchStore = usePatchStore()
const userStore = useUserStore()

const loading = ref(false)
const favorites = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12
const selectedFolderId = ref(null)
const selectedIds = ref([])
const selectAll = ref(false)

const folders = ref([])
const foldersLoading = ref(false)
const totalCount = ref(0)

const createFolderDialogVisible = ref(false)
const editFolderDialogVisible = ref(false)
const moveDialogVisible = ref(false)
const movingPatch = ref(null)
const targetFolderId = ref(null)
const editingFolder = ref(null)

const folderFormRef = ref(null)
const editFolderFormRef = ref(null)

const folderForm = ref({
  name: '',
  description: '',
  color: '#ffd700'
})

const editFolderForm = ref({
  name: '',
  description: '',
  color: '#ffd700'
})

const folderRules = {
  name: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { max: 50, message: '分组名称不能超过50个字符', trigger: 'blur' }
  ]
}

const draggableFolders = computed({
  get: () => folders.value,
  set: (val) => { folders.value = val }
})

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < favorites.value.length
})

const currentFolderName = computed(() => {
  if (selectedFolderId.value === null) return '全部收藏'
  const folder = folders.value.find(f => f.id === selectedFolderId.value)
  return folder ? getFolderDisplayName(folder) : '全部收藏'
})

const getFolderDisplayName = (folder) => {
  if (folder.is_default || folder.name === 'default') return '默认分组'
  return folder.name
}

onMounted(async () => {
  await fetchFolders()
  
  const folderQuery = route.query.folder
  if (folderQuery && folders.value.length > 0) {
    const folderId = parseInt(folderQuery, 10)
    const folderExists = folders.value.some(f => f.id === folderId)
    if (folderExists) {
      selectedFolderId.value = folderId
    }
  }
  
  fetchFavorites()
})

watch(selectedFolderId, () => {
  page.value = 1
  clearSelection()
  fetchFavorites()
})

const fetchFolders = async () => {
  foldersLoading.value = true
  try {
    const res = await patchStore.fetchFavoriteFolders()
    folders.value = res.folders || []
    totalCount.value = res.total_count || 0
  } finally {
    foldersLoading.value = false
  }
}

const fetchFavorites = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit }
    if (selectedFolderId.value) params.folder_id = selectedFolderId.value
    const res = await patchStore.fetchMyFavorites(params)
    favorites.value = res.list
    total.value = res.total
    if (res.folders && res.folders.length > 0) {
      folders.value = res.folders
    }
  } finally {
    loading.value = false
  }
}

const selectFolder = (folderId) => {
  selectedFolderId.value = folderId
}

const toggleSelect = (patchId) => {
  const index = selectedIds.value.indexOf(patchId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(patchId)
  }
  updateSelectAll()
}

const handleSelectAll = (val) => {
  if (val) {
    selectedIds.value = favorites.value.map(p => p.id)
  } else {
    selectedIds.value = []
  }
}

const updateSelectAll = () => {
  if (favorites.value.length > 0 && selectedIds.value.length === favorites.value.length) {
    selectAll.value = true
  } else {
    selectAll.value = false
  }
}

const clearSelection = () => {
  selectedIds.value = []
  selectAll.value = false
}

const showCreateFolderDialog = () => {
  folderForm.value = {
    name: '',
    description: '',
    color: '#ffd700'
  }
  createFolderDialogVisible.value = true
}

const handleCreateFolder = async () => {
  if (!folderFormRef.value) return
  await folderFormRef.value.validate()
  try {
    await patchStore.createFavoriteFolder(folderForm.value)
    ElMessage.success('分组创建成功')
    createFolderDialogVisible.value = false
    fetchFolders()
  } catch (e) {
    ElMessage.error(e.error || '创建失败')
  }
}

const handleFolderAction = (action, folder) => {
  if (action === 'edit') {
    editingFolder.value = folder
    editFolderForm.value = {
      name: folder.name,
      description: folder.description || '',
      color: folder.color || '#ffd700'
    }
    editFolderDialogVisible.value = true
  } else if (action === 'delete') {
    handleDeleteFolder(folder)
  }
}

const handleUpdateFolder = async () => {
  if (!editFolderFormRef.value || !editingFolder.value) return
  await editFolderFormRef.value.validate()
  try {
    await patchStore.updateFavoriteFolder(editingFolder.value.id, editFolderForm.value)
    ElMessage.success('分组更新成功')
    editFolderDialogVisible.value = false
    fetchFolders()
    fetchFavorites()
  } catch (e) {
    ElMessage.error(e.error || '更新失败')
  }
}

const handleDeleteFolder = async (folder) => {
  if (folder.is_default) {
    ElMessage.warning('默认分组不能删除')
    return
  }
  
  const otherFolders = folders.value.filter(f => f.id !== folder.id)
  
  try {
    const { value: targetFolderId } = await ElMessageBox({
      title: '删除分组',
      message: `确定要删除分组"${getFolderDisplayName(folder)}"吗？该分组下的收藏将会被移动到其他分组。`,
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      inputPlaceholder: '选择目标分组',
      inputType: 'select',
      inputOptions: otherFolders.map(f => ({
        value: f.id,
        label: getFolderDisplayName(f)
      })),
      inputValidator: (value) => {
        if (!value) return '请选择目标分组'
        return true
      }
    })
    
    await patchStore.deleteFavoriteFolder(folder.id, targetFolderId)
    ElMessage.success('分组删除成功')
    if (selectedFolderId.value === folder.id) {
      selectedFolderId.value = null
    }
    fetchFolders()
    fetchFavorites()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '删除失败')
    }
  }
}

const onFolderDragEnd = async () => {
  const orders = folders.value.map((folder, index) => ({
    id: folder.id,
    sort_order: index
  }))
  
  try {
    await patchStore.reorderFavoriteFolders(orders)
    ElMessage.success('排序已保存')
  } catch (e) {
    ElMessage.error('排序失败')
    fetchFolders()
  }
}

const handlePatchAction = (action, patch) => {
  if (action === 'move') {
    movingPatch.value = patch
    targetFolderId.value = null
    moveDialogVisible.value = true
  } else if (action === 'delete') {
    handleToggleFavorite(patch.id)
  }
}

const showBatchMoveDialog = () => {
  movingPatch.value = null
  targetFolderId.value = null
  moveDialogVisible.value = true
}

const handleMoveConfirm = async () => {
  if (!targetFolderId.value) return
  
  try {
    if (movingPatch.value) {
      await patchStore.moveFavoriteToFolder(movingPatch.value.id, targetFolderId.value)
      ElMessage.success('移动成功')
    } else {
      await patchStore.batchMoveFavorites(selectedIds.value, targetFolderId.value)
      ElMessage.success(`成功移动 ${selectedIds.value.length} 个收藏`)
      clearSelection()
    }
    moveDialogVisible.value = false
    movingPatch.value = null
    fetchFavorites()
    fetchFolders()
  } catch (e) {
    ElMessage.error(e.error || '移动失败')
  }
}

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要取消选中的 ${selectedIds.value.length} 个收藏吗？`,
      '确认删除',
      { type: 'warning' }
    )
    
    await patchStore.batchDeleteFavorites(selectedIds.value)
    ElMessage.success(`成功删除 ${selectedIds.value.length} 个收藏`)
    clearSelection()
    fetchFavorites()
    fetchFolders()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '删除失败')
    }
  }
}

const goToDetail = (patch) => {
  if (selectedIds.value.length > 0) {
    toggleSelect(patch.id)
    return
  }
  router.push(`/patches/${patch.id}`)
}

const goToUser = (userId) => {
  router.push(`/users/${userId}`)
}

const handleToggleLike = async (patchId) => {
  await patchStore.toggleLike(patchId)
  fetchFavorites()
}

const handleToggleFavorite = async (patchId) => {
  try {
    await ElMessageBox.confirm('确定要取消收藏这个 Patch 吗？', '确认', { type: 'warning' })
    await patchStore.toggleFavorite(patchId)
    ElMessage.success('已取消收藏')
    fetchFavorites()
    fetchFolders()
  } catch (e) {}
}

const handleAddToCompare = async (patchId) => {
  try {
    await patchStore.addToCompare(patchId)
    ElMessage.success('已添加到对比列表')
  } catch (e) {
    ElMessage.error(e.error || '添加失败')
  }
}
</script>

<style scoped>
.favorites-container {
  max-width: 1400px;
}

.favorites-layout {
  display: flex;
  gap: 24px;
  margin-top: 24px;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: fit-content;
  position: sticky;
  top: 24px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.sidebar-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.folder-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.folder-item.active {
  background: rgba(255, 215, 0, 0.15);
}

.folder-item.active .folder-name {
  color: #ffd700;
}

.drag-handle {
  color: rgba(255, 255, 255, 0.3);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 2px;
}

.folder-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-ghost {
  opacity: 0.5;
  background: rgba(255, 215, 0, 0.2);
}

.folder-icon {
  display: flex;
  align-items: center;
  font-size: 18px;
}

.folder-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.folder-name {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.folder-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.folder-item:hover .folder-actions {
  opacity: 1;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selected-count {
  color: #ffd700;
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-folder-info {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.favorite-card-wrapper {
  position: relative;
}

.select-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 6px 8px;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.favorite-card-wrapper:hover .select-checkbox,
.favorite-card-wrapper:has(.el-checkbox.is-checked) .select-checkbox {
  opacity: 1;
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.favorite-card-wrapper:hover .card-actions {
  opacity: 1;
}

.folder-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.folder-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.03);
}

.folder-select-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.folder-select-item.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.folder-select-item .count {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.move-hint {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

:deep(.el-checkbox__label) {
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-dialog) {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.el-dialog__title) {
  color: #fff;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  border-color: #ffd700;
}

:deep(.el-input__count) {
  color: rgba(255, 255, 255, 0.4);
}

:deep(.el-dropdown-menu) {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.el-dropdown-menu__item) {
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-dropdown-menu__item:hover) {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

@media (max-width: 768px) {
  .favorites-layout {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    position: static;
  }
  
  .toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}
</style>
