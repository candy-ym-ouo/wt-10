<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🌍 国际化管理</h1>
      <div class="header-actions">
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出翻译
        </el-button>
        <el-button @click="openImportDialog">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新增翻译
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索 Key 或翻译内容"
        clearable
        class="search-input"
        @keyup.enter="fetchTranslations"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="categoryFilter" placeholder="分类筛选" class="filter-select" @change="fetchTranslations" clearable>
        <el-option label="全部" value="" />
        <el-option 
          v-for="cat in categories" 
          :key="cat" 
          :label="cat" 
          :value="cat" 
        />
      </el-select>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchTranslations" clearable>
        <el-option label="全部" value="" />
        <el-option label="启用" value="1" />
        <el-option label="禁用" value="0" />
      </el-select>
      <el-button type="primary" @click="fetchTranslations">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="handleReset">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="translations" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="translation_key" label="翻译 Key" min-width="220">
          <template #default="{ row }">
            <code class="key-code">{{ row.translation_key }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="zh_cn" label="中文" min-width="200">
          <template #default="{ row }">
            <div class="translation-content" :class="{ missing: !row.zh_cn }">
              {{ row.zh_cn || '—' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="en_us" label="English" min-width="200">
          <template #default="{ row }">
            <div class="translation-content" :class="{ missing: !row.en_us }">
              {{ row.en_us || '—' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getCategoryTagType(row.category)">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button 
              size="small" 
              :type="row.is_active ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.is_active ? '禁用' : '启用' }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchTranslations"
          @current-change="fetchTranslations"
        />
      </div>
    </div>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑翻译' : '新增翻译'"
      width="700px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="翻译 Key" prop="translation_key">
          <el-input 
            v-model="formData.translation_key" 
            placeholder="如: common.submit"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="中文" prop="zh_cn">
              <el-input 
                v-model="formData.zh_cn" 
                type="textarea" 
                :rows="3"
                placeholder="请输入中文翻译" 
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="English" prop="en_us">
              <el-input 
                v-model="formData.en_us" 
                type="textarea" 
                :rows="3"
                placeholder="Enter English translation" 
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%" allow-create>
            <el-option label="general" value="general" />
            <el-option label="admin" value="admin" />
            <el-option label="front" value="front" />
            <el-option label="validation" value="validation" />
            <el-option label="i18n" value="i18n" />
            <el-option label="auth" value="auth" />
            <el-option 
              v-for="cat in categories" 
              :key="cat" 
              :label="cat" 
              :value="cat" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="2"
            placeholder="翻译描述说明（可选）" 
          />
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-switch 
            v-model="formData.is_active" 
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="importDialogVisible" 
      title="批量导入翻译"
      width="600px"
    >
      <el-alert 
        type="info" 
        :closable="false"
        class="import-tip"
      >
        <p>支持 JSON 格式导入，格式示例：</p>
        <pre>[
  { "key": "common.submit", "zh_cn": "提交", "en_us": "Submit", "desc": "提交按钮" },
  { "key": "common.cancel", "zh_cn": "取消", "en_us": "Cancel" }
]</pre>
      </el-alert>
      <el-form label-width="100px" style="margin-top: 20px;">
        <el-form-item label="分类">
          <el-select v-model="importCategory" placeholder="导入后分类" style="width: 100%" allow-create>
            <el-option label="general" value="general" />
            <el-option label="admin" value="admin" />
            <el-option label="front" value="front" />
          </el-select>
        </el-form-item>
        <el-form-item label="覆盖已存在">
          <el-switch 
            v-model="importOverwrite" 
            active-text="覆盖"
            inactive-text="跳过"
          />
        </el-form-item>
        <el-form-item label="JSON 数据">
          <el-input
            v-model="importJson"
            type="textarea"
            :rows="10"
            placeholder='请粘贴 JSON 数组'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download, Upload, Refresh } from '@element-plus/icons-vue'
import { i18nApi } from '@/api'
import { useI18nStore } from '@/stores/i18nStore'
import { useUserStore } from '@/stores/userStore'
import { PERMISSIONS } from '@/constants/permissions'

const router = useRouter()
const userStore = useUserStore()
const i18nStore = useI18nStore()

const loading = ref(true)
const keyword = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const translations = ref([])
const categories = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const canManage = computed(() => userStore.hasPermission(PERMISSIONS.I18N_MANAGE))

const importDialogVisible = ref(false)
const importCategory = ref('general')
const importOverwrite = ref(false)
const importJson = ref('')
const importing = ref(false)

const formData = reactive({
  id: null,
  translation_key: '',
  zh_cn: '',
  en_us: '',
  category: 'general',
  description: '',
  is_active: true
})

const rules = {
  translation_key: [{ required: true, message: '请输入翻译 Key', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getCategoryTagType = (category) => {
  const typeMap = {
    general: 'info',
    admin: 'warning',
    front: 'success',
    validation: 'danger',
    i18n: 'primary',
    auth: ''
  }
  return typeMap[category] || ''
}

const fetchCategories = async () => {
  try {
    const res = await i18nApi.getCategories()
    categories.value = res.categories || []
  } catch (err) {
    console.error(err)
  }
}

const fetchTranslations = async () => {
  try {
    loading.value = true
    const res = await i18nApi.adminGetList({
      keyword: keyword.value,
      category: categoryFilter.value,
      is_active: statusFilter.value,
      page: page.value,
      pageSize: pageSize.value
    })
    translations.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取翻译列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  keyword.value = ''
  categoryFilter.value = ''
  statusFilter.value = ''
  page.value = 1
  fetchTranslations()
}

const openCreateDialog = () => {
  if (!canManage.value) {
    ElMessage.warning('没有操作权限')
    return
  }
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    translation_key: '',
    zh_cn: '',
    en_us: '',
    category: 'general',
    description: '',
    is_active: true
  })
  dialogVisible.value = true
}

const openEditDialog = (item) => {
  if (!canManage.value) {
    ElMessage.warning('没有操作权限')
    return
  }
  isEdit.value = true
  Object.assign(formData, {
    id: item.id,
    translation_key: item.translation_key,
    zh_cn: item.zh_cn,
    en_us: item.en_us,
    category: item.category,
    description: item.description || '',
    is_active: item.is_active
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (isEdit.value) {
      await i18nApi.adminUpdate(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await i18nApi.adminCreate(formData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchTranslations()
    i18nStore.syncFromServer()
  } catch (err) {
    if (err !== false) {
      ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      console.error(err)
    }
  }
}

const toggleStatus = async (item) => {
  if (!canManage.value) {
    ElMessage.warning('没有操作权限')
    return
  }
  try {
    await i18nApi.adminToggleActive(item.id, !item.is_active)
    item.is_active = !item.is_active
    ElMessage.success('操作成功')
    i18nStore.syncFromServer()
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  }
}

const handleDelete = async (item) => {
  if (!canManage.value) {
    ElMessage.warning('没有操作权限')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除翻译 Key "${item.translation_key}" 吗？`,
      '删除确认',
      { type: 'warning' }
    )
    await i18nApi.adminDelete(item.id)
    ElMessage.success('删除成功')
    fetchTranslations()
    i18nStore.syncFromServer()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
    }
  }
}

const openImportDialog = () => {
  if (!canManage.value) {
    ElMessage.warning('没有操作权限')
    return
  }
  importJson.value = ''
  importCategory.value = 'general'
  importOverwrite.value = false
  importDialogVisible.value = true
}

const handleImport = async () => {
  if (!importJson.value.trim()) {
    ElMessage.warning('请输入 JSON 数据')
    return
  }
  
  let translations
  try {
    translations = JSON.parse(importJson.value)
    if (!Array.isArray(translations)) {
      throw new Error('数据必须是数组格式')
    }
  } catch (e) {
    ElMessage.error('JSON 格式错误: ' + e.message)
    return
  }

  try {
    importing.value = true
    const res = await i18nApi.adminBatchImport({
      translations,
      category: importCategory.value,
      overwrite: importOverwrite.value
    })
    
    let msg = `导入完成：成功 ${res.successCount} 条`
    if (res.updateCount) msg += `，更新 ${res.updateCount} 条`
    if (res.skipCount) msg += `，跳过 ${res.skipCount} 条`
    if (res.errorCount) msg += `，失败 ${res.errorCount} 条`
    
    ElMessage.success(msg)
    importDialogVisible.value = false
    fetchTranslations()
    fetchCategories()
    i18nStore.syncFromServer()
  } catch (err) {
    ElMessage.error('导入失败')
    console.error(err)
  } finally {
    importing.value = false
  }
}

const handleExport = async () => {
  try {
    const res = await i18nApi.exportTranslations({
      category: categoryFilter.value,
      format: 'json'
    })
    const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translations_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error('导出失败')
    console.error(err)
  }
}

onMounted(async () => {
  await fetchCategories()
  fetchTranslations()
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

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-input {
  max-width: 400px;
}

.filter-select {
  width: 180px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.key-code {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
}

.translation-content {
  line-height: 1.5;
}

.translation-content.missing {
  color: #f56c6c;
  font-style: italic;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.import-tip {
  margin-bottom: 0;
}

.import-tip pre {
  background: rgba(0, 0, 0, 0.1);
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0 0;
  font-size: 0.8rem;
  overflow-x: auto;
}
</style>
