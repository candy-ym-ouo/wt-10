<template>
  <div class="download-center">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">📦 Patch 下载资源中心</h1>
        <p class="page-desc">发现、下载和分享高质量的 Patch 资源</p>
      </div>
      <el-button type="primary" size="large" @click="openUploadDialog" v-if="userStore.isLoggedIn">
        <el-icon><Upload /></el-icon>
        上传资源
      </el-button>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">{{ stats.total_resources || 0 }}</span>
        <span class="stat-label">资源总数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ stats.total_downloads || 0 }}</span>
        <span class="stat-label">累计下载</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ stats.pending_count || 0 }}</span>
        <span class="stat-label">待审核</span>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索资源名称或描述"
        clearable
        class="search-input"
        @keyup.enter="fetchResources"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="resourceType" placeholder="资源类型" clearable class="filter-select" @change="fetchResources">
        <el-option label="Patch 文件" value="patch_file" />
        <el-option label="预设包" value="preset" />
        <el-option label="采样包" value="sample" />
        <el-option label="教程" value="tutorial" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-select v-model="riskLevel" placeholder="风险等级" clearable class="filter-select" @change="fetchResources">
        <el-option label="低风险" value="low" />
        <el-option label="中风险" value="medium" />
        <el-option label="高风险" value="high" />
      </el-select>
      <el-select v-model="sortBy" placeholder="排序方式" class="filter-select" @change="fetchResources">
        <el-option label="最新上传" value="newest" />
        <el-option label="最热门" value="popular" />
        <el-option label="最早上传" value="oldest" />
      </el-select>
      <el-button type="primary" @click="fetchResources">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="resource-grid" v-loading="loading">
      <div
        v-for="resource in resources"
        :key="resource.id"
        class="resource-card"
        @click="goToDetail(resource.id)"
      >
        <div class="card-header">
          <div class="resource-icon">
            {{ getResourceIcon(resource.resource_type) }}
          </div>
          <el-tag :type="getRiskTagType(resource.risk_level)" size="small" effect="light">
            {{ getRiskLabel(resource.risk_level) }}
          </el-tag>
        </div>
        <h3 class="resource-title">{{ resource.title }}</h3>
        <p class="resource-desc">{{ resource.description || '暂无描述' }}</p>
        <div class="card-meta">
          <div class="meta-left">
            <span class="meta-item">
              <el-icon><Document /></el-icon>
              {{ resource.file_size_formatted }}
            </span>
            <span class="meta-item">
              <el-icon><Download /></el-icon>
              {{ resource.download_count }}
            </span>
          </div>
          <div class="meta-right">
            <el-tag :type="getAccessTagType(resource.access_level)" size="small">
              {{ getAccessLabel(resource.access_level) }}
            </el-tag>
          </div>
        </div>
        <div class="card-footer">
          <div class="uploader-info">
            <el-avatar :size="24" :src="resource.avatar">
              {{ resource.username?.charAt(0)?.toUpperCase() }}
            </el-avatar>
            <span class="uploader-name">{{ resource.username }}</span>
          </div>
          <el-button
            size="small"
            type="primary"
            :disabled="!resource.can_download"
            @click.stop="handleDownload(resource)"
          >
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </div>
      </div>

      <el-empty v-if="!loading && resources.length === 0" description="暂无资源" />
    </div>

    <div class="pagination-wrap" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="prev, pager, next, jumper, total"
        @current-change="fetchResources"
      />
    </div>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传资源"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="uploadForm" :rules="uploadRules" ref="uploadFormRef" label-width="100px">
        <el-form-item label="资源标题" prop="title">
          <el-input v-model="uploadForm.title" placeholder="请输入资源标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="资源描述" prop="description">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入资源描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="资源类型" prop="resource_type">
          <el-select v-model="uploadForm.resource_type" placeholder="请选择资源类型" style="width: 100%">
            <el-option label="Patch 文件" value="patch_file" />
            <el-option label="预设包" value="preset" />
            <el-option label="采样包" value="sample" />
            <el-option label="教程" value="tutorial" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联 Patch">
          <el-input
            v-model="uploadForm.patch_id"
            placeholder="关联的 Patch ID（可选）"
            type="number"
          />
        </el-form-item>
        <el-form-item label="版本号" prop="version">
          <el-input v-model="uploadForm.version" placeholder="例如：1.0.0" />
        </el-form-item>
        <el-form-item label="访问权限" prop="access_level">
          <el-select v-model="uploadForm.access_level" placeholder="请选择访问权限" style="width: 100%">
            <el-option label="公开（所有人可下载）" value="public" />
            <el-option label="注册用户" value="registered" />
            <el-option label="认证创作者" value="verified" />
            <el-option label="仅管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级" prop="risk_level">
          <el-select v-model="uploadForm.risk_level" placeholder="请选择风险等级" style="width: 100%">
            <el-option label="低风险 - 已验证安全" value="low" />
            <el-option label="中风险 - 建议谨慎使用" value="medium" />
            <el-option label="高风险 - 需自行承担风险" value="high" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险说明" v-if="uploadForm.risk_level !== 'low'">
          <el-input
            v-model="uploadForm.risk_description"
            type="textarea"
            :rows="2"
            placeholder="请描述潜在风险"
          />
        </el-form-item>
        <el-form-item label="选择文件" prop="file">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            drag
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持任意格式文件，单个文件建议不超过 100MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="submitUpload">
          提交审核
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Upload, Document, Download, UploadFilled
} from '@element-plus/icons-vue'
import { downloadApi } from '@/api'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const resources = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(12)
const keyword = ref('')
const resourceType = ref('')
const riskLevel = ref('')
const sortBy = ref('newest')
const stats = ref({})

const uploadDialogVisible = ref(false)
const uploading = ref(false)
const uploadFormRef = ref(null)
const uploadRef = ref(null)
const selectedFile = ref(null)

const uploadForm = reactive({
  title: '',
  description: '',
  resource_type: 'patch_file',
  patch_id: '',
  version: '1.0.0',
  access_level: 'public',
  risk_level: 'low',
  risk_description: '',
  file: null
})

const uploadRules = {
  title: [{ required: true, message: '请输入资源标题', trigger: 'blur' }],
  resource_type: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  access_level: [{ required: true, message: '请选择访问权限', trigger: 'change' }],
  risk_level: [{ required: true, message: '请选择风险等级', trigger: 'change' }]
}

const getResourceIcon = (type) => {
  const icons = {
    patch_file: '🎛️',
    preset: '📋',
    sample: '🎵',
    tutorial: '📚',
    other: '📦'
  }
  return icons[type] || '📦'
}

const getRiskLabel = (level) => {
  const labels = { low: '低风险', medium: '中风险', high: '高风险' }
  return labels[level] || '未知'
}

const getRiskTagType = (level) => {
  const types = { low: 'success', medium: 'warning', high: 'danger' }
  return types[level] || 'info'
}

const getAccessLabel = (level) => {
  const labels = {
    public: '公开',
    registered: '注册用户',
    verified: '认证创作者',
    admin: '仅管理员'
  }
  return labels[level] || '公开'
}

const getAccessTagType = (level) => {
  const types = {
    public: 'success',
    registered: '',
    verified: 'warning',
    admin: 'danger'
  }
  return types[level] || 'info'
}

const fetchStats = async () => {
  try {
    const res = await downloadApi.getStats()
    stats.value = res
  } catch (err) {
    console.error(err)
  }
}

const fetchResources = async () => {
  try {
    loading.value = true
    const res = await downloadApi.getList({
      page: currentPage.value,
      limit: pageSize.value,
      search: keyword.value,
      resource_type: resourceType.value,
      risk_level: riskLevel.value,
      sort: sortBy.value
    })
    resources.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取资源列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id) => {
  router.push(`/downloads/${id}`)
}

const handleDownload = async (resource) => {
  if (!resource.can_download) {
    ElMessage.warning('您没有权限下载该资源')
    return
  }

  if (resource.risk_level === 'medium' || resource.risk_level === 'high') {
    try {
      await ElMessageBox.confirm(
        resource.risk_description || '该资源存在一定风险，请确认您了解相关风险后再下载。',
        '风险提示',
        {
          confirmButtonText: '我已知晓风险，继续下载',
          cancelButtonText: '取消',
          type: resource.risk_level === 'high' ? 'error' : 'warning'
        }
      )
    } catch {
      return
    }
  }

  const token = localStorage.getItem('token')
  const url = downloadApi.getDownloadUrl(resource.id)
  const link = document.createElement('a')
  link.href = url + (token ? `?token=${token}` : '')
  link.target = '_blank'
  link.download = resource.file_name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const openUploadDialog = () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  Object.assign(uploadForm, {
    title: '',
    description: '',
    resource_type: 'patch_file',
    patch_id: '',
    version: '1.0.0',
    access_level: 'public',
    risk_level: 'low',
    risk_description: ''
  })
  selectedFile.value = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  uploadDialogVisible.value = true
}

const handleFileChange = (file) => {
  selectedFile.value = file.raw
  uploadForm.file = file.raw
}

const handleFileRemove = () => {
  selectedFile.value = null
  uploadForm.file = null
}

const submitUpload = async () => {
  if (!uploadFormRef.value) return

  try {
    await uploadFormRef.value.validate()

    if (!selectedFile.value) {
      ElMessage.warning('请选择要上传的文件')
      return
    }

    uploading.value = true
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('title', uploadForm.title)
    formData.append('description', uploadForm.description)
    formData.append('resource_type', uploadForm.resource_type)
    formData.append('version', uploadForm.version)
    formData.append('access_level', uploadForm.access_level)
    formData.append('risk_level', uploadForm.risk_level)
    if (uploadForm.patch_id) {
      formData.append('patch_id', uploadForm.patch_id)
    }
    if (uploadForm.risk_description) {
      formData.append('risk_description', uploadForm.risk_description)
    }

    await downloadApi.upload(formData)
    ElMessage.success('上传成功，资源已提交审核')
    uploadDialogVisible.value = false
    fetchResources()
  } catch (err) {
    if (err !== false) {
      ElMessage.error('上传失败')
      console.error(err)
    }
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchResources()
})
</script>

<style scoped>
.download-center {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.page-desc {
  color: var(--text-secondary);
  margin: 0;
}

.stats-bar {
  display: flex;
  gap: 2rem;
  padding: 1.5rem 2rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-input {
  max-width: 300px;
}

.filter-select {
  width: 160px;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.resource-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.resource-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.resource-icon {
  font-size: 2rem;
}

.resource-title {
  font-size: 1.1rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.meta-left {
  display: flex;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.uploader-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.uploader-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.pagination-wrap {
  display: flex;
  justify-content: center;
}
</style>
