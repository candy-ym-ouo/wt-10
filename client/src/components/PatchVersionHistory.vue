<template>
  <div class="version-history">
    <div class="section-header">
      <h3 class="section-title">
        <el-icon><Clock /></el-icon>
        版本历史
        <el-tag size="small" type="info" v-if="versions.length > 0">
          共 {{ totalVersions }} 个版本
        </el-tag>
      </h3>
    </div>

    <div v-if="loading" class="loading-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载版本历史...</p>
    </div>

    <template v-else>
      <div class="diff-toolbar" v-if="versions.length > 1">
        <div class="compare-selectors">
          <el-select
            v-model="compareFromVersion"
            placeholder="选择旧版本"
            size="small"
            style="width: 180px;"
            @change="loadDiff"
          >
            <el-option
              v-for="v in availableFromVersions"
              :key="v.version"
              :label="`v${v.version} - ${formatDate(v.created_at)}`"
              :value="v.version"
            />
          </el-select>
          <span class="compare-arrow">→</span>
          <el-select
            v-model="compareToVersion"
            placeholder="选择新版本"
            size="small"
            style="width: 180px;"
            @change="loadDiff"
          >
            <el-option
              v-for="v in availableToVersions"
              :key="v.version"
              :label="`v${v.version} - ${formatDate(v.created_at)}`"
              :value="v.version"
            />
          </el-select>
          <el-button size="small" type="primary" @click="loadDiff" :loading="loadingDiff">
            <el-icon><Search /></el-icon> 对比差异
          </el-button>
          <el-button
            size="small"
            @click="clearDiff"
            v-if="diffData"
          >
            清除对比
          </el-button>
        </div>
      </div>

      <div v-if="diffData" class="diff-panel">
        <div class="diff-header">
          <div class="diff-version-info">
            <el-tag type="info">v{{ diffData.fromVersion?.version || '创建前' }}</el-tag>
            <span v-if="diffData.fromVersion">{{ formatDate(diffData.fromVersion.created_at) }}</span>
            <span v-else class="text-muted">初始状态</span>
          </div>
          <el-icon class="diff-arrow"><Right /></el-icon>
          <div class="diff-version-info">
            <el-tag type="success">v{{ diffData.toVersion.version }}</el-tag>
            <span>{{ formatDate(diffData.toVersion.created_at) }}</span>
          </div>
        </div>
        <div class="diff-summary" v-if="diffData.toVersion.change_summary">
          <el-icon><InfoFilled /></el-icon>
          {{ diffData.toVersion.change_summary }}
        </div>

        <div v-if="diffData.diffs.length === 0" class="no-diff">
          <el-icon><CircleCheck /></el-icon>
          两个版本内容完全相同
        </div>

        <div v-else class="diff-list">
          <div
            v-for="(diff, index) in diffData.diffs"
            :key="index"
            class="diff-item"
          >
            <div class="diff-field-header">
              <el-icon class="field-icon"><Edit /></el-icon>
              <span class="field-name">{{ diff.fieldLabel }}</span>
            </div>
            <div class="diff-values">
              <div class="diff-old">
                <div class="diff-label">
                  <el-icon><Remove /></el-icon> 旧值
                </div>
                <div class="diff-content old-value">
                  <pre>{{ formatDiffValue(diff.oldValue) }}</pre>
                </div>
              </div>
              <div class="diff-new">
                <div class="diff-label">
                  <el-icon><Plus /></el-icon> 新值
                </div>
                <div class="diff-content new-value">
                  <pre>{{ formatDiffValue(diff.newValue) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="versions.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Warning /></el-icon>
        <p>暂无版本记录</p>
      </div>

      <el-timeline v-else class="version-timeline">
        <el-timeline-item
          v-for="version in versions"
          :key="version.id"
          :timestamp="formatDate(version.created_at)"
          placement="top"
          :type="getVersionType(version)"
        >
          <el-card class="version-card" shadow="hover">
            <div class="version-header">
              <div class="version-title">
                <el-tag
                  :type="version.version === 1 ? 'success' : 'primary'"
                  size="large"
                  effect="dark"
                >
                  v{{ version.version }}
                </el-tag>
                <span class="version-name">{{ version.title }}</span>
                <el-tag
                  v-if="version.change_summary?.includes('回滚')"
                  type="warning"
                  size="small"
                  effect="light"
                >
                  <el-icon><RefreshRight /></el-icon> 回滚
                </el-tag>
              </div>
              <div class="version-meta">
                <el-avatar :size="24" :src="version.avatar" v-if="showCreator">
                  {{ version.username?.charAt(0).toUpperCase() }}
                </el-avatar>
                <span class="creator-name" v-if="showCreator">{{ version.username }}</span>
                <span class="patch-title" v-if="showPatchTitle && version.patch_title">
                  Patch: {{ version.patch_title }}
                </span>
              </div>
            </div>

            <div class="version-summary" v-if="version.change_summary">
              <el-icon><Document /></el-icon>
              {{ version.change_summary }}
            </div>

            <div class="version-actions">
              <el-button
                size="small"
                type="primary"
                link
                @click="viewDiff(version)"
              >
                <el-icon><View /></el-icon> 查看变更
              </el-button>
              <el-button
                v-if="canRollback && version.version !== 1"
                size="small"
                type="warning"
                link
                @click="confirmRollback(version)"
              >
                <el-icon><RefreshRight /></el-icon> 回滚到此版本
              </el-button>
              <el-button
                v-if="showViewPatch"
                size="small"
                link
                @click="goToPatch(version.patch_id)"
              >
                <el-icon><Link /></el-icon> 查看 Patch
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <div class="pagination" v-if="totalPages > 1">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalVersions"
          layout="prev, pager, next"
          @current-change="fetchVersions"
        />
      </div>
    </template>

    <el-dialog
      v-model="rollbackDialogVisible"
      title="确认回滚"
      width="500px"
    >
      <div class="rollback-confirm">
        <el-alert
          title="此操作将创建一个新版本，并将 Patch 内容恢复到所选版本"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #title>
            <div>
              <p>确定要回滚到 <strong>v{{ rollbackVersion?.version }}</strong> 吗？</p>
              <p class="rollback-info">
                原版本：{{ rollbackVersion?.change_summary || '初始版本' }}
              </p>
            </div>
          </template>
        </el-alert>
      </div>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doRollback" :loading="rollingBack">
          确认回滚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Clock, Loading, Search, InfoFilled, CircleCheck,
  Edit, Remove, Plus, View, RefreshRight, Link,
  Warning, Document, Right
} from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useRouter } from 'vue-router'

const props = defineProps({
  patchId: {
    type: [Number, String],
    required: true
  },
  canRollback: {
    type: Boolean,
    default: false
  },
  showCreator: {
    type: Boolean,
    default: true
  },
  showPatchTitle: {
    type: Boolean,
    default: false
  },
  showViewPatch: {
    type: Boolean,
    default: false
  },
  pageSize: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['rollback', 'versionSelected'])

const router = useRouter()
const patchStore = usePatchStore()

const loading = ref(true)
const loadingDiff = ref(false)
const rollingBack = ref(false)
const versions = ref([])
const totalVersions = ref(0)
const totalPages = ref(0)
const currentPage = ref(1)
const compareFromVersion = ref(null)
const compareToVersion = ref(null)
const diffData = ref(null)
const rollbackDialogVisible = ref(false)
const rollbackVersion = ref(null)

const availableFromVersions = computed(() => {
  if (!compareToVersion.value) return versions.value
  return versions.value.filter(v => v.version < compareToVersion.value)
})

const availableToVersions = computed(() => {
  if (!compareFromVersion.value) return versions.value
  return versions.value.filter(v => v.version > compareFromVersion.value)
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getVersionType = (version) => {
  if (version.change_summary?.includes('回滚')) return 'warning'
  if (version.version === 1) return 'success'
  return 'primary'
}

const formatDiffValue = (value) => {
  if (value === null || value === undefined) return '(空)'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

const fetchVersions = async () => {
  try {
    loading.value = true
    const res = await patchStore.fetchVersions(props.patchId, {
      page: currentPage.value,
      pageSize: props.pageSize
    })
    versions.value = res.list || []
    totalVersions.value = res.total || 0
    totalPages.value = res.totalPages || 0

    if (versions.value.length >= 2 && !compareToVersion.value) {
      compareToVersion.value = versions.value[0].version
      if (versions.value[1]) {
        compareFromVersion.value = versions.value[1].version
      }
    }
  } catch (err) {
    ElMessage.error('加载版本历史失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const loadDiff = async () => {
  if (!compareToVersion.value) return

  try {
    loadingDiff.value = true
    const params = { toVersion: compareToVersion.value }
    if (compareFromVersion.value) {
      params.fromVersion = compareFromVersion.value
    }

    const res = await patchStore.fetchVersionDiff(props.patchId, params)
    diffData.value = res
    emit('versionSelected', {
      from: compareFromVersion.value,
      to: compareToVersion.value,
      diff: res
    })
  } catch (err) {
    ElMessage.error('加载版本差异失败')
    console.error(err)
  } finally {
    loadingDiff.value = false
  }
}

const clearDiff = () => {
  diffData.value = null
  compareFromVersion.value = null
  compareToVersion.value = null
}

const viewDiff = (version) => {
  compareToVersion.value = version.version
  if (version.version > 1) {
    compareFromVersion.value = version.version - 1
  } else {
    compareFromVersion.value = null
  }
  loadDiff()
}

const confirmRollback = (version) => {
  rollbackVersion.value = version
  rollbackDialogVisible.value = true
}

const doRollback = async () => {
  if (!rollbackVersion.value) return

  try {
    rollingBack.value = true
    const res = await patchStore.rollbackVersion(props.patchId, rollbackVersion.value.id)
    ElMessage.success(res.message || '回滚成功')
    rollbackDialogVisible.value = false
    emit('rollback', { version: rollbackVersion.value, result: res })
    await fetchVersions()
    if (compareToVersion.value) {
      loadDiff()
    }
  } catch (err) {
    ElMessage.error(err.error || '回滚失败')
    console.error(err)
  } finally {
    rollingBack.value = false
  }
}

const goToPatch = (patchId) => {
  router.push(`/patches/${patchId}`)
}

watch(() => props.patchId, () => {
  currentPage.value = 1
  clearDiff()
  fetchVersions()
})

onMounted(() => {
  fetchVersions()
})

defineExpose({
  refresh: fetchVersions
})
</script>

<style scoped>
.version-history {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.diff-toolbar {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.compare-selectors {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.compare-arrow {
  color: var(--text-secondary);
  font-weight: bold;
}

.diff-panel {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.diff-version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.diff-arrow {
  color: var(--text-secondary);
  font-size: 20px;
}

.diff-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: #ffd700;
  font-size: 14px;
  padding: 12px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 6px;
  margin-bottom: 16px;
}

.no-diff {
  text-align: center;
  padding: 30px;
  color: #67c23a;
}

.no-diff .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.diff-item {
  background: var(--bg-dark);
  border-radius: 8px;
  overflow: hidden;
}

.diff-field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 215, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
}

.field-icon {
  color: #ffd700;
}

.field-name {
  font-weight: 600;
  color: #ffd700;
}

.diff-values {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.diff-old,
.diff-new {
  padding: 16px;
}

.diff-old {
  border-right: 1px solid var(--border-color);
}

.diff-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.diff-old .diff-label {
  color: #f56c6c;
}

.diff-new .diff-label {
  color: #67c23a;
}

.diff-content {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px;
  border-radius: 6px;
  max-height: 300px;
  overflow: auto;
}

.diff-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.old-value {
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.2);
}

.new-value {
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.2);
}

.version-timeline {
  margin: 0;
  padding: 0;
}

.version-card {
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.version-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.version-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 15px;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  flex-wrap: wrap;
}

.creator-name {
  color: var(--text-secondary);
}

.patch-title {
  color: #ffd700;
  font-size: 12px;
}

.version-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.version-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.rollback-confirm {
  margin-bottom: 20px;
}

.rollback-info {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 8px;
}

.text-muted {
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .diff-values {
    grid-template-columns: 1fr;
  }

  .diff-old {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
