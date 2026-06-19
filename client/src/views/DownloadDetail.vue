<template>
  <div class="download-detail" v-loading="loading">
    <div class="back-btn" @click="router.back()">
      <el-icon><ArrowLeft /></el-icon>
      返回列表
    </div>

    <div class="detail-container" v-if="resource">
      <div class="detail-header">
        <div class="header-left">
          <div class="resource-icon">{{ getResourceIcon(resource.resource_type) }}</div>
          <div class="header-info">
            <h1 class="resource-title">{{ resource.title }}</h1>
            <div class="meta-row">
              <el-tag :type="getRiskTagType(resource.risk_level)" effect="light">
                {{ getRiskLabel(resource.risk_level) }}
              </el-tag>
              <el-tag :type="getAccessTagType(resource.access_level)">
                {{ getAccessLabel(resource.access_level) }}
              </el-tag>
              <el-tag type="info">
                {{ getResourceTypeLabel(resource.resource_type) }}
              </el-tag>
              <span class="version-tag">v{{ resource.version }}</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <el-button
            type="primary"
            size="large"
            :disabled="!resource.can_download"
            @click="handleDownload"
          >
            <el-icon><Download /></el-icon>
            下载资源
          </el-button>
        </div>
      </div>

      <el-alert
        v-if="resource.risk_level !== 'low'"
        :title="resource.risk_description || '使用该资源存在一定风险，请谨慎操作。'"
        :type="resource.risk_level === 'high' ? 'error' : 'warning'"
        :closable="false"
        show-icon
        class="risk-alert"
      />

      <div class="detail-grid">
        <div class="main-content">
          <div class="info-card">
            <h3 class="card-title">资源描述</h3>
            <p class="description">{{ resource.description || '暂无描述' }}</p>
          </div>

          <div class="info-card">
            <h3 class="card-title">文件信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">文件名</span>
                <span class="info-value">{{ resource.file_name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">文件大小</span>
                <span class="info-value">{{ resource.file_size_formatted }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">文件类型</span>
                <span class="info-value">{{ resource.file_type || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">下载次数</span>
                <span class="info-value">{{ resource.download_count }} 次</span>
              </div>
              <div class="info-item" v-if="resource.patch_title">
                <span class="info-label">关联 Patch</span>
                <span class="info-value link" @click="goToPatch">{{ resource.patch_title }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="side-content">
          <div class="info-card">
            <h3 class="card-title">上传者</h3>
            <div class="uploader-section">
              <el-avatar :size="64" :src="resource.avatar">
                {{ resource.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <div class="uploader-info">
                <div class="uploader-name">{{ resource.username }}</div>
                <el-tag v-if="resource.is_creator_verified" type="warning" size="small">
                  认证创作者
                </el-tag>
              </div>
            </div>
          </div>

          <div class="info-card">
            <h3 class="card-title">上传时间</h3>
            <p class="date-text">{{ formatDate(resource.created_at) }}</p>
          </div>

          <div class="info-card" v-if="resource.risk_level !== 'low'">
            <h3 class="card-title">风险说明</h3>
            <p class="risk-text">{{ resource.risk_description || '使用该资源存在一定风险，请确保您了解相关内容后再下载使用。' }}</p>
          </div>

          <div class="info-card">
            <h3 class="card-title">权限说明</h3>
            <p class="access-text">{{ getAccessDescription(resource.access_level) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Download } from '@element-plus/icons-vue'
import { downloadApi } from '@/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const resource = ref(null)

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

const getResourceTypeLabel = (type) => {
  const labels = {
    patch_file: 'Patch 文件',
    preset: '预设包',
    sample: '采样包',
    tutorial: '教程',
    other: '其他'
  }
  return labels[type] || '其他'
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

const getAccessDescription = (level) => {
  const descriptions = {
    public: '所有访客均可下载此资源。',
    registered: '需要注册并登录后才能下载此资源。',
    verified: '需要完成创作者认证后才能下载此资源。',
    admin: '仅限管理员下载此资源。'
  }
  return descriptions[level] || '所有访客均可下载此资源。'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchDetail = async () => {
  try {
    loading.value = true
    const res = await downloadApi.getDetail(route.params.id)
    resource.value = res
  } catch (err) {
    if (err.error) {
      ElMessage.error(err.error)
      if (err.error === '资源不存在') {
        router.push('/downloads')
      }
    } else {
      ElMessage.error('获取资源详情失败')
    }
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToPatch = () => {
  if (resource.value?.patch_id) {
    router.push(`/patches/${resource.value.patch_id}`)
  }
}

const handleDownload = async () => {
  if (!resource.value) return

  if (!resource.value.can_download) {
    ElMessage.warning('您没有权限下载该资源')
    return
  }

  if (resource.value.risk_level === 'medium' || resource.value.risk_level === 'high') {
    try {
      await ElMessageBox.confirm(
        resource.value.risk_description || '该资源存在一定风险，请确认您了解相关风险后再下载。',
        '风险提示',
        {
          confirmButtonText: '我已知晓风险，继续下载',
          cancelButtonText: '取消',
          type: resource.value.risk_level === 'high' ? 'error' : 'warning'
        }
      )
    } catch {
      return
    }
  }

  const token = localStorage.getItem('token')
  const url = downloadApi.getDownloadUrl(resource.value.id)
  const link = document.createElement('a')
  link.href = url + (token ? `?token=${token}` : '')
  link.target = '_blank'
  link.download = resource.value.file_name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(fetchDetail)
</script>

<style scoped>
.download-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--primary-color);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 2rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.header-left {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.resource-icon {
  font-size: 3rem;
}

.resource-title {
  font-size: 1.8rem;
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
}

.meta-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.version-tag {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 0.15rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.risk-alert {
  margin-bottom: 1.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.description {
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.info-value {
  font-size: 0.95rem;
  color: var(--text-primary);
  word-break: break-all;
}

.info-value.link {
  color: var(--primary-color);
  cursor: pointer;
}

.info-value.link:hover {
  text-decoration: underline;
}

.uploader-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.uploader-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.uploader-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.date-text {
  color: var(--text-secondary);
  margin: 0;
}

.risk-text {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.access-text {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}
</style>
