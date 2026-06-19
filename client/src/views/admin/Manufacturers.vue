<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🏭 厂商管理</h1>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增厂商
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索厂商名称"
        clearable
        class="search-input"
        @keyup.enter="fetchManufacturers"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="fetchManufacturers">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="manufacturers" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="厂商名称" min-width="150" />
        <el-table-column prop="country" label="国家" width="120" />
        <el-table-column prop="website" label="官网" min-width="200">
          <template #default="{ row }">
            <a v-if="row.website" :href="row.website" target="_blank" class="link">
              {{ row.website }}
            </a>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="modules_count" label="模块数" width="100" />
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
              type="danger" 
              @click="deleteManufacturer(row)"
              :disabled="row.modules_count > 0"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑厂商' : '新增厂商'"
      width="500px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="厂商名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入厂商名称" />
        </el-form-item>
        <el-form-item label="国家" prop="country">
          <el-input v-model="formData.country" placeholder="请输入国家" />
        </el-form-item>
        <el-form-item label="官网" prop="website">
          <el-input v-model="formData.website" placeholder="请输入官网地址" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="4"
            placeholder="请输入厂商描述" 
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
import { adminApi } from '@/api'

const loading = ref(true)
const keyword = ref('')
const manufacturers = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const formData = reactive({
  name: '',
  country: '',
  website: '',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入厂商名称', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchManufacturers = async () => {
  try {
    loading.value = true
    const res = await adminApi.getManufacturers({ keyword: keyword.value })
    manufacturers.value = res.data.list || res.data || []
  } catch (err) {
    ElMessage.error('获取厂商列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    name: '',
    country: '',
    website: '',
    description: ''
  })
  dialogVisible.value = true
}

const openEditDialog = (manufacturer) => {
  isEdit.value = true
  Object.assign(formData, {
    id: manufacturer.id,
    name: manufacturer.name,
    country: manufacturer.country || '',
    website: manufacturer.website || '',
    description: manufacturer.description || ''
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (isEdit.value) {
      await adminApi.updateManufacturer(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createManufacturer(formData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchManufacturers()
  } catch (err) {
    if (err !== false) {
      ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      console.error(err)
    }
  }
}

const deleteManufacturer = async (manufacturer) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除厂商 "${manufacturer.name}" 吗？此操作不可恢复！`,
      '确认删除',
      { type: 'danger' }
    )
    
    await adminApi.deleteManufacturer(manufacturer.id)
    manufacturers.value = manufacturers.value.filter(m => m.id !== manufacturer.id)
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

onMounted(() => {
  fetchManufacturers()
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

.link {
  color: var(--primary-color);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>
