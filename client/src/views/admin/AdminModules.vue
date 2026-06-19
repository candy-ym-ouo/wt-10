<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🎛️ 模块管理</h1>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增模块
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索模块名称"
        clearable
        class="search-input"
        @keyup.enter="fetchModules"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="manufacturerFilter" placeholder="厂商筛选" class="filter-select" @change="fetchModules">
        <el-option label="全部" value="" />
        <el-option 
          v-for="m in manufacturers" 
          :key="m.id" 
          :label="m.name" 
          :value="m.id" 
        />
      </el-select>
      <el-button type="primary" @click="fetchModules">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="modules" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="模块名称" min-width="150" />
        <el-table-column prop="manufacturer_name" label="厂商" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hp" label="HP" width="80" />
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              编辑
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
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { adminApi, moduleApi } from '@/api'

const loading = ref(true)
const keyword = ref('')
const manufacturerFilter = ref('')
const modules = ref([])
const manufacturers = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

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

const fetchManufacturers = async () => {
  try {
    const res = await moduleApi.getManufacturers()
    manufacturers.value = res.data.list || res.data || []
  } catch (err) {
    console.error(err)
  }
}

const fetchModules = async () => {
  try {
    loading.value = true
    const res = await adminApi.getModules({ 
      keyword: keyword.value, 
      manufacturer_id: manufacturerFilter.value 
    })
    modules.value = res.data.list || res.data || []
  } catch (err) {
    ElMessage.error('获取模块列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
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

onMounted(async () => {
  await fetchManufacturers()
  fetchModules()
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

.filter-select {
  width: 200px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}
</style>
