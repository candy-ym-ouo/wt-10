<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🎛️ 模块管理</h1>
      <div class="header-actions">
        <el-button @click="router.push('/admin/modules/combinations')">
          <el-icon><Connection /></el-icon>
          组合推荐管理
        </el-button>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新增模块
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input-wrapper" :class="{ 'search-focused': searchFocused }">
        <el-input
          v-model="keyword"
          placeholder="搜索模块名称、厂商、类型..."
          clearable
          class="search-input"
          @keyup.enter="fetchModules"
          @focus="searchFocused = true"
          @blur="handleSearchBlur"
          @input="handleSearchInput"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div v-if="showSuggestions && suggestions.length > 0" class="search-suggestions">
          <div
            v-for="(s, idx) in suggestions"
            :key="idx"
            class="suggestion-item"
            @mousedown.prevent="selectSuggestion(s)"
          >
            <el-icon class="suggestion-icon"><Search /></el-icon>
            <span v-html="highlightText(s)"></span>
          </div>
        </div>
      </div>
      <el-select v-model="manufacturerFilter" placeholder="厂商筛选" class="filter-select" @change="fetchModules">
        <el-option label="全部" value="" />
        <el-option 
          v-for="m in manufacturers" 
          :key="m.id" 
          :label="m.name" 
          :value="m.id" 
        />
      </el-select>
      <el-select v-model="typeFilter" placeholder="类型筛选" class="filter-select" @change="fetchModules" clearable>
        <el-option v-for="t in moduleTypes" :key="t" :label="t" :value="t" />
      </el-select>
      <el-button @click="showAdvancedFilter = !showAdvancedFilter">
        <el-icon><Filter /></el-icon>
        高级筛选
        <el-icon class="arrow-icon" :class="{ expanded: showAdvancedFilter }"><ArrowDown /></el-icon>
      </el-button>
      <el-button v-if="hasActiveFilters" type="danger" plain @click="resetFilters">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
      <el-button type="primary" @click="fetchModules">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div v-show="showAdvancedFilter" class="advanced-filter-panel">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="filter-group">
            <span class="filter-label">类型多选</span>
            <el-checkbox-group v-model="selectedTypes" @change="fetchModules">
              <el-checkbox v-for="t in moduleTypes" :key="t" :label="t" />
            </el-checkbox-group>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="filter-group">
            <span class="filter-label">宽度 (HP)</span>
            <div class="hp-filter">
              <el-input-number v-model="hpMin" :min="1" :max="100" placeholder="最小" @change="fetchModules" />
              <span class="hp-separator">-</span>
              <el-input-number v-model="hpMax" :min="1" :max="100" placeholder="最大" @change="fetchModules" />
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="filter-group">
            <span class="filter-label">功耗</span>
            <el-select v-model="powerFilter" placeholder="选择功耗" @change="fetchModules" clearable style="width: 100%">
              <el-option v-for="p in powerValues" :key="p" :label="p" :value="p" />
            </el-select>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="filter-group">
            <span class="filter-label">状态</span>
            <el-select v-model="statusFilter" placeholder="选择状态" @change="fetchModules" clearable style="width: 100%">
              <el-option label="正常" value="active" />
              <el-option label="下架" value="inactive" />
            </el-select>
          </div>
        </el-col>
      </el-row>
    </div>

    <div v-if="selectedModules.length > 0" class="batch-action-bar">
      <div class="batch-info">
        已选择 <el-tag type="primary">{{ selectedModules.length }}</el-tag> 个模块
      </div>
      <div class="batch-actions">
        <el-button size="small" type="success" @click="batchToggleStatus('active')">
          <el-icon><Top /></el-icon>
          批量上架
        </el-button>
        <el-button size="small" type="warning" @click="batchToggleStatus('inactive')">
          <el-icon><Bottom /></el-icon>
          批量下架
        </el-button>
        <el-button size="small" @click="clearSelection">
          取消选择
        </el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table 
        :data="modules" 
        v-loading="loading" 
        stripe
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="55" reserve-selection />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="模块名称" min-width="150">
          <template #default="{ row }">
            <span v-html="highlightText(row.name)"></span>
          </template>
        </el-table-column>
        <el-table-column prop="manufacturer_name" label="厂商" width="150">
          <template #default="{ row }">
            <span v-html="highlightText(row.manufacturer_name)"></span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hp" label="HP" width="80" />
        <el-table-column prop="combination_count" label="组合数" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.combination_count > 0" size="small" type="warning">
              {{ row.combination_count }}
            </el-tag>
            <span v-else style="color: rgba(255,255,255,0.3)">0</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="添加时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="goToWiki(row)"
            >
              百科管理
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="goToCombinations(row)"
            >
              搭配推荐
            </el-button>
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '下架' : '上架' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑模块' : '新增模块'"
      width="600px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="模块名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入模块名称" />
        </el-form-item>
        <el-form-item label="厂商" prop="manufacturer_id">
          <el-select v-model="formData.manufacturer_id" placeholder="请选择厂商" style="width: 100%">
            <el-option 
              v-for="m in manufacturers" 
              :key="m.id" 
              :label="m.name" 
              :value="m.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
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
        </el-form-item>
        <el-form-item label="HP" prop="hp">
          <el-input-number v-model="formData.hp" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="4"
            placeholder="请输入模块描述" 
          />
        </el-form-item>
        <el-form-item label="参数说明" prop="specs">
          <el-input 
            v-model="formData.specs" 
            type="textarea" 
            :rows="4"
            placeholder="请输入参数说明（JSON 格式或文本）" 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Connection, Filter, ArrowDown, Refresh, Top, Bottom } from '@element-plus/icons-vue'
import { adminApi, moduleApi, searchAPI } from '@/api'

const router = useRouter()

const loading = ref(true)
const keyword = ref('')
const manufacturerFilter = ref('')
const typeFilter = ref('')
const modules = ref([])
const manufacturers = ref([])
const moduleTypes = ref([])
const powerValues = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const selectedModules = ref([])

const showAdvancedFilter = ref(false)
const selectedTypes = ref([])
const hpMin = ref(null)
const hpMax = ref(null)
const powerFilter = ref('')
const statusFilter = ref('')

const searchFocused = ref(false)
const suggestions = ref([])
let suggestTimer = null
let blurTimer = null

const showSuggestions = computed(() => {
  return searchFocused.value && suggestions.value.length > 0 && keyword.value.trim() !== ''
})

const hasActiveFilters = computed(() => {
  return (
    keyword.value ||
    manufacturerFilter.value ||
    typeFilter.value ||
    selectedTypes.value.length > 0 ||
    hpMin.value !== null ||
    hpMax.value !== null ||
    powerFilter.value ||
    statusFilter.value
  )
})

const resetFilters = () => {
  keyword.value = ''
  manufacturerFilter.value = ''
  typeFilter.value = ''
  selectedTypes.value = []
  hpMin.value = null
  hpMax.value = null
  powerFilter.value = ''
  statusFilter.value = ''
  fetchModules()
}

const formData = reactive({
  name: '',
  manufacturer_id: null,
  type: '',
  hp: 10,
  description: '',
  specs: ''
})

const rules = {
  name: [{ required: true, message: '请输入模块名称', trigger: 'blur' }],
  manufacturer_id: [{ required: true, message: '请选择厂商', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  hp: [{ required: true, message: '请输入HP', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const highlightText = (text) => {
  if (!text || !keyword.value.trim()) return text
  const escaped = keyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(text).replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="search-highlight">$1</mark>'
  )
}

const handleSearchInput = (val) => {
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!val.trim()) {
    suggestions.value = []
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await searchAPI.getSuggestions({ keyword: val.trim(), types: 'module,manufacturer', limit: 6 })
      suggestions.value = res.suggestions || []
    } catch (e) {
      suggestions.value = []
    }
  }, 300)
}

const handleSearchBlur = () => {
  blurTimer = setTimeout(() => {
    searchFocused.value = false
  }, 200)
}

const selectSuggestion = (val) => {
  keyword.value = val
  suggestions.value = []
  fetchModules()
}

const fetchManufacturers = async () => {
  try {
    const res = await moduleApi.getManufacturers()
    manufacturers.value = res.list || res || []
  } catch (err) {
    console.error(err)
  }
}

const fetchModules = async () => {
  try {
    loading.value = true
    const params = { 
      keyword: keyword.value
    }
    
    if (selectedTypes.value.length > 0) {
      params.type = selectedTypes.value.join(',')
    } else if (typeFilter.value) {
      params.type = typeFilter.value
    }
    
    if (manufacturerFilter.value) {
      params.manufacturer_id = manufacturerFilter.value
    }
    
    if (hpMin.value !== null && hpMin.value !== '') params.hp_min = hpMin.value
    if (hpMax.value !== null && hpMax.value !== '') params.hp_max = hpMax.value
    if (powerFilter.value) params.power = powerFilter.value
    if (statusFilter.value) params.status = statusFilter.value

    const res = await adminApi.getModules(params)
    modules.value = res.list || res || []
    moduleTypes.value = res.types || []
    powerValues.value = res.power_values || []
  } catch (err) {
    ElMessage.error('获取模块列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedModules.value = selection
}

const clearSelection = () => {
  selectedModules.value = []
}

const openCreateDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    name: '',
    manufacturer_id: manufacturers.value[0]?.id || null,
    type: '',
    hp: 10,
    description: '',
    specs: ''
  })
  dialogVisible.value = true
}

const openEditDialog = (module) => {
  isEdit.value = true
  Object.assign(formData, {
    id: module.id,
    name: module.name,
    manufacturer_id: module.manufacturer_id,
    type: module.type,
    hp: module.hp,
    description: module.description || '',
    specs: module.specs || ''
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (isEdit.value) {
      await adminApi.updateModule(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createModule(formData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchModules()
  } catch (err) {
    if (err !== false) {
      ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      console.error(err)
    }
  }
}

const toggleStatus = async (module) => {
  try {
    const newStatus = module.status === 'active' ? 'inactive' : 'active'
    await adminApi.updateModule(module.id, { status: newStatus })
    module.status = newStatus
    ElMessage.success('操作成功')
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  }
}

const batchToggleStatus = async (status) => {
  if (selectedModules.value.length === 0) {
    ElMessage.warning('请先选择要操作的模块')
    return
  }

  const actionLabel = status === 'active' ? '上架' : '下架'
  const statusIds = selectedModules.value.filter(m => m.status !== status).map(m => m.id)
  
  if (statusIds.length === 0) {
    ElMessage.info(`所选模块已全部是${actionLabel}状态`)
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要批量${actionLabel} ${statusIds.length} 个模块吗？`,
      `确认批量${actionLabel}`,
      { type: status === 'active' ? 'success' : 'warning' }
    )

    const res = await adminApi.batchUpdateModulesStatus({
      ids: statusIds,
      status
    })

    modules.value = modules.value.map(m => {
      if (statusIds.includes(m.id)) {
        return { ...m, status }
      }
      return m
    })

    clearSelection()
    ElMessage.success(`批量${actionLabel}成功，共处理 ${res.count} 个模块`)
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批量操作失败')
      console.error(err)
    }
  }
}

const goToWiki = (module) => {
  router.push(`/admin/modules/${module.id}/wiki`)
}

const goToCombinations = (module) => {
  router.push(`/admin/modules/${module.id}/combinations`)
}

watch(keyword, (val) => {
  if (!val.trim()) {
    suggestions.value = []
  }
})

onMounted(async () => {
  await fetchManufacturers()
  fetchModules()
})
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-input-wrapper :deep(.el-input__wrapper) {
  transition: all 0.3s ease;
}

.search-input-wrapper.search-focused :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
}

.search-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.suggestion-item:hover {
  background: rgba(139, 92, 246, 0.1);
}

.suggestion-icon {
  color: var(--text-muted);
  font-size: 14px;
}

.suggestion-item :deep(.search-highlight) {
  background: rgba(255, 215, 0, 0.25);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

:deep(.search-highlight) {
  background: rgba(255, 215, 0, 0.25);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
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
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  max-width: 400px;
}

.filter-select {
  width: 180px;
}

.arrow-icon {
  transition: transform 0.3s ease;
  margin-left: 4px;
}

.arrow-icon.expanded {
  transform: rotate(180deg);
}

.advanced-filter-panel {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.hp-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-separator {
  color: var(--text-secondary);
}

.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(230, 162, 60, 0.1));
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
