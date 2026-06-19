<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <el-button @click="goBack" text style="margin-bottom: 8px;">
          <el-icon><ArrowLeft /></el-icon> 返回模块列表
        </el-button>
        <h1 class="page-title">📚 模块百科管理</h1>
        <p class="page-subtitle">{{ moduleName }}</p>
      </div>
      <el-button type="primary" @click="saveWiki" :loading="saving">
        <el-icon><Check /></el-icon>
        保存全部
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="wiki-admin-tabs">
      <el-tab-pane label="词条内容" name="wiki">
        <div class="card">
          <el-form :model="wikiForm" label-width="120px">
            <el-form-item label="状态">
              <el-radio-group v-model="wikiForm.status">
                <el-radio value="draft">草稿</el-radio>
                <el-radio value="published">已发布</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="模块概述">
              <el-input 
                v-model="wikiForm.overview" 
                type="textarea" 
                :rows="4"
                placeholder="请输入模块概述" 
              />
            </el-form-item>
            <el-form-item label="历史背景">
              <el-input 
                v-model="wikiForm.history" 
                type="textarea" 
                :rows="3"
                placeholder="请输入历史背景" 
              />
            </el-form-item>
            <el-form-item label="设计理念">
              <el-input 
                v-model="wikiForm.design_philosophy" 
                type="textarea" 
                :rows="3"
                placeholder="请输入设计理念" 
              />
            </el-form-item>
            <el-form-item label="主要特点">
              <el-input 
                v-model="wikiForm.notable_features" 
                type="textarea" 
                :rows="3"
                placeholder="请输入主要特点" 
              />
            </el-form-item>
            <el-form-item label="典型应用">
              <el-input 
                v-model="wikiForm.use_cases" 
                type="textarea" 
                :rows="3"
                placeholder="请输入典型应用场景" 
              />
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`参数详解 (${parameters.length})`" name="parameters">
        <div class="card">
          <div class="section-header">
            <h3>参数管理</h3>
            <el-button type="primary" size="small" @click="openParamDialog">
              <el-icon><Plus /></el-icon>
              添加参数
            </el-button>
          </div>

          <el-table :data="parameters" v-loading="loading" stripe style="margin-top: 16px;">
            <el-table-column prop="sort_order" label="排序" width="70" />
            <el-table-column prop="name" label="参数名" width="120" />
            <el-table-column prop="label" label="显示名" width="120" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数值范围" width="150">
              <template #default="{ row }">
                {{ row.min_value }} ~ {{ row.max_value }}{{ row.unit || '' }}
              </template>
            </el-table-column>
            <el-table-column prop="default_value" label="默认值" width="100" />
            <el-table-column prop="description" label="说明" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="editParameter(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteParameter(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`使用技巧 (${tips.length})`" name="tips">
        <div class="card">
          <div class="section-header">
            <h3>技巧管理</h3>
            <el-button type="primary" size="small" @click="openTipDialog">
              <el-icon><Plus /></el-icon>
              添加技巧
            </el-button>
          </div>

          <el-table :data="tips" v-loading="loading" stripe style="margin-top: 16px;">
            <el-table-column prop="sort_order" label="排序" width="70" />
            <el-table-column prop="title" label="标题" min-width="150" />
            <el-table-column prop="category" label="分类" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ getCategoryLabel(row.category) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="difficulty" label="难度" width="100">
              <template #default="{ row }">
                <el-tag :type="getDifficultyType(row.difficulty)" size="small">
                  {{ getDifficultyLabel(row.difficulty) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="editTip(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteTip(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`推荐 Patch (${recommendedPatches.length})`" name="patches">
        <div class="card">
          <div class="section-header">
            <h3>推荐 Patch 管理</h3>
            <el-button type="primary" size="small" @click="openRecPatchDialog">
              <el-icon><Plus /></el-icon>
              添加推荐
            </el-button>
          </div>

          <el-table :data="recommendedPatches" v-loading="loading" stripe style="margin-top: 16px;">
            <el-table-column prop="sort_order" label="排序" width="70" />
            <el-table-column prop="patch_id" label="Patch ID" width="100" />
            <el-table-column prop="title" label="标题" min-width="150" />
            <el-table-column prop="reason" label="推荐理由" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="editRecPatch(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="removeRecPatch(row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog 
      v-model="paramDialogVisible" 
      :title="isParamEdit ? '编辑参数' : '添加参数'"
      width="600px"
    >
      <el-form :model="paramForm" :rules="paramRules" ref="paramFormRef" label-width="100px">
        <el-form-item label="参数名" prop="name">
          <el-input v-model="paramForm.name" placeholder="请输入参数名" />
        </el-form-item>
        <el-form-item label="显示名" prop="label">
          <el-input v-model="paramForm.label" placeholder="请输入显示名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="paramForm.type" style="width: 100%">
            <el-option label="旋钮" value="knob" />
            <el-option label="滑块" value="slider" />
            <el-option label="开关" value="switch" />
            <el-option label="按钮" value="button" />
            <el-option label="输入" value="input" />
            <el-option label="输出" value="output" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="最小值">
              <el-input-number v-model="paramForm.min_value" :step="0.1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最大值">
              <el-input-number v-model="paramForm.max_value" :step="0.1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单位">
              <el-input v-model="paramForm.unit" placeholder="如 Hz, V" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="默认值">
          <el-input v-model="paramForm.default_value" placeholder="请输入默认值" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input 
            v-model="paramForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入参数说明" 
          />
        </el-form-item>
        <el-form-item label="使用技巧">
          <el-input 
            v-model="paramForm.tips" 
            type="textarea" 
            :rows="2"
            placeholder="请输入使用技巧提示" 
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="paramForm.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paramDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitParameter">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="tipDialogVisible" 
      :title="isTipEdit ? '编辑技巧' : '添加技巧'"
      width="600px"
    >
      <el-form :model="tipForm" :rules="tipRules" ref="tipFormRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="tipForm.title" placeholder="请输入技巧标题" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="tipForm.category" style="width: 100%">
                <el-option label="通用" value="general" />
                <el-option label="音色设计" value="sound_design" />
                <el-option label="演奏技巧" value="performance" />
                <el-option label="Patch 技巧" value="patch_tip" />
                <el-option label="进阶" value="advanced" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="难度" prop="difficulty">
              <el-select v-model="tipForm.difficulty" style="width: 100%">
                <el-option label="入门" value="beginner" />
                <el-option label="中级" value="intermediate" />
                <el-option label="进阶" value="advanced" />
                <el-option label="专家" value="expert" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="内容" prop="content">
          <el-input 
            v-model="tipForm.content" 
            type="textarea" 
            :rows="6"
            placeholder="请输入技巧详细内容" 
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="tipForm.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTip">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="recPatchDialogVisible" 
      :title="isRecPatchEdit ? '编辑推荐 Patch' : '添加推荐 Patch'"
      width="500px"
    >
      <el-form :model="recPatchForm" ref="recPatchFormRef" label-width="100px">
        <el-form-item label="选择 Patch" v-if="!isRecPatchEdit">
          <el-select 
            v-model="recPatchForm.patch_id" 
            filterable
            remote
            :remote-method="searchPatches"
            :loading="patchSearching"
            placeholder="搜索 Patch"
            style="width: 100%"
          >
            <el-option 
              v-for="p in patchSearchResults" 
              :key="p.id" 
              :label="p.title" 
              :value="p.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐理由">
          <el-input 
            v-model="recPatchForm.reason" 
            type="textarea" 
            :rows="3"
            placeholder="请输入推荐理由" 
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="recPatchForm.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recPatchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRecPatch">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Plus, Check, Search 
} from '@element-plus/icons-vue'
import { adminApi, moduleApi } from '@/api'

const route = useRoute()
const router = useRouter()

const moduleId = route.params.id
const moduleName = ref('')
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('wiki')

const parameters = ref([])
const tips = ref([])
const recommendedPatches = ref([])

const wikiForm = reactive({
  overview: '',
  history: '',
  design_philosophy: '',
  notable_features: '',
  use_cases: '',
  status: 'draft'
})

const paramDialogVisible = ref(false)
const isParamEdit = ref(false)
const paramFormRef = ref(null)
const paramForm = reactive({
  id: null,
  name: '',
  label: '',
  type: 'knob',
  min_value: 0,
  max_value: 10,
  default_value: '',
  unit: '',
  description: '',
  tips: '',
  sort_order: 0
})

const paramRules = {
  name: [{ required: true, message: '请输入参数名', trigger: 'blur' }]
}

const tipDialogVisible = ref(false)
const isTipEdit = ref(false)
const tipFormRef = ref(null)
const tipForm = reactive({
  id: null,
  title: '',
  content: '',
  category: 'general',
  difficulty: 'beginner',
  sort_order: 0
})

const tipRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const recPatchDialogVisible = ref(false)
const isRecPatchEdit = ref(false)
const recPatchFormRef = ref(null)
const recPatchForm = reactive({
  id: null,
  patch_id: null,
  reason: '',
  sort_order: 0
})

const patchSearching = ref(false)
const patchSearchResults = ref([])

const getCategoryLabel = (cat) => {
  const map = {
    general: '通用',
    sound_design: '音色设计',
    performance: '演奏技巧',
    patch_tip: 'Patch 技巧',
    advanced: '进阶'
  }
  return map[cat] || cat
}

const getDifficultyLabel = (diff) => {
  const map = {
    beginner: '入门',
    intermediate: '中级',
    advanced: '进阶',
    expert: '专家'
  }
  return map[diff] || diff
}

const getDifficultyType = (diff) => {
  const map = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger',
    expert: 'info'
  }
  return map[diff] || 'info'
}

const goBack = () => {
  router.push('/admin/modules')
}

const fetchModuleInfo = async () => {
  try {
    const data = await moduleApi.getModuleDetail(moduleId)
    moduleName.value = data.name || `模块 #${moduleId}`
  } catch (err) {
    console.error(err)
  }
}

const fetchWikiData = async () => {
  try {
    loading.value = true
    const data = await adminApi.getModuleWiki(moduleId)
    
    if (data.wiki) {
      Object.assign(wikiForm, {
        overview: data.wiki.overview || '',
        history: data.wiki.history || '',
        design_philosophy: data.wiki.design_philosophy || '',
        notable_features: data.wiki.notable_features || '',
        use_cases: data.wiki.use_cases || '',
        status: data.wiki.status || 'draft'
      })
    }
    
    parameters.value = data.parameters || []
    tips.value = data.tips || []
    recommendedPatches.value = data.recommendedPatches || []
  } catch (err) {
    ElMessage.error('获取百科数据失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const saveWiki = async () => {
  try {
    saving.value = true
    await adminApi.saveModuleWiki(moduleId, wikiForm)
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error('保存失败')
    console.error(err)
  } finally {
    saving.value = false
  }
}

const openParamDialog = () => {
  isParamEdit.value = false
  Object.assign(paramForm, {
    id: null,
    name: '',
    label: '',
    type: 'knob',
    min_value: 0,
    max_value: 10,
    default_value: '',
    unit: '',
    description: '',
    tips: '',
    sort_order: parameters.value.length
  })
  paramDialogVisible.value = true
}

const editParameter = (row) => {
  isParamEdit.value = true
  Object.assign(paramForm, {
    id: row.id,
    name: row.name,
    label: row.label || '',
    type: row.type || 'knob',
    min_value: row.min_value !== null ? row.min_value : 0,
    max_value: row.max_value !== null ? row.max_value : 10,
    default_value: row.default_value || '',
    unit: row.unit || '',
    description: row.description || '',
    tips: row.tips || '',
    sort_order: row.sort_order || 0
  })
  paramDialogVisible.value = true
}

const submitParameter = async () => {
  try {
    if (isParamEdit.value) {
      await adminApi.updateParameter(moduleId, paramForm.id, paramForm)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createParameter(moduleId, paramForm)
      ElMessage.success('创建成功')
    }
    paramDialogVisible.value = false
    fetchWikiData()
  } catch (err) {
    ElMessage.error(isParamEdit.value ? '更新失败' : '创建失败')
    console.error(err)
  }
}

const deleteParameter = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个参数吗？', '提示', {
      type: 'warning'
    })
    await adminApi.deleteParameter(moduleId, row.id)
    ElMessage.success('删除成功')
    fetchWikiData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

const openTipDialog = () => {
  isTipEdit.value = false
  Object.assign(tipForm, {
    id: null,
    title: '',
    content: '',
    category: 'general',
    difficulty: 'beginner',
    sort_order: tips.value.length
  })
  tipDialogVisible.value = true
}

const editTip = (row) => {
  isTipEdit.value = true
  Object.assign(tipForm, {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category || 'general',
    difficulty: row.difficulty || 'beginner',
    sort_order: row.sort_order || 0
  })
  tipDialogVisible.value = true
}

const submitTip = async () => {
  try {
    if (!tipForm.title || !tipForm.content) {
      ElMessage.error('请填写完整信息')
      return
    }
    
    if (isTipEdit.value) {
      await adminApi.updateTip(moduleId, tipForm.id, tipForm)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createTip(moduleId, tipForm)
      ElMessage.success('创建成功')
    }
    tipDialogVisible.value = false
    fetchWikiData()
  } catch (err) {
    ElMessage.error(isTipEdit.value ? '更新失败' : '创建失败')
    console.error(err)
  }
}

const deleteTip = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条技巧吗？', '提示', {
      type: 'warning'
    })
    await adminApi.deleteTip(moduleId, row.id)
    ElMessage.success('删除成功')
    fetchWikiData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

const openRecPatchDialog = () => {
  isRecPatchEdit.value = false
  Object.assign(recPatchForm, {
    id: null,
    patch_id: null,
    reason: '',
    sort_order: recommendedPatches.value.length
  })
  patchSearchResults.value = []
  recPatchDialogVisible.value = true
}

const editRecPatch = (row) => {
  isRecPatchEdit.value = true
  Object.assign(recPatchForm, {
    id: row.id,
    patch_id: row.patch_id,
    reason: row.reason || '',
    sort_order: row.sort_order || 0
  })
  recPatchDialogVisible.value = true
}

const searchPatches = async (keyword) => {
  if (!keyword) {
    patchSearchResults.value = []
    return
  }
  
  try {
    patchSearching.value = true
    const data = await adminApi.searchPatches(keyword)
    patchSearchResults.value = data || []
  } catch (err) {
    console.error(err)
  } finally {
    patchSearching.value = false
  }
}

const submitRecPatch = async () => {
  try {
    if (!isRecPatchEdit.value && !recPatchForm.patch_id) {
      ElMessage.error('请选择 Patch')
      return
    }
    
    if (isRecPatchEdit.value) {
      await adminApi.updateRecommendedPatch(moduleId, recPatchForm.id, recPatchForm)
      ElMessage.success('更新成功')
    } else {
      await adminApi.addRecommendedPatch(moduleId, recPatchForm)
      ElMessage.success('添加成功')
    }
    recPatchDialogVisible.value = false
    fetchWikiData()
  } catch (err) {
    ElMessage.error(isRecPatchEdit.value ? '更新失败' : '添加失败')
    console.error(err)
  }
}

const removeRecPatch = async (row) => {
  try {
    await ElMessageBox.confirm('确定要移除这个推荐 Patch 吗？', '提示', {
      type: 'warning'
    })
    await adminApi.removeRecommendedPatch(moduleId, row.id)
    ElMessage.success('移除成功')
    fetchWikiData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('移除失败')
      console.error(err)
    }
  }
}

onMounted(async () => {
  await fetchModuleInfo()
  fetchWikiData()
})
</script>

<style scoped>
.wiki-admin-tabs {
  margin-top: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  color: var(--text-primary);
  font-size: 16px;
  margin: 0;
}

.wiki-admin-tabs :deep(.el-tabs__item) {
  color: var(--text-secondary);
}

.wiki-admin-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
}

.wiki-admin-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
}
</style>
