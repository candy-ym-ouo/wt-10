<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎚️ 参数对比</h1>
      <p class="page-subtitle">对比多个 Patch 的参数设置，找出差异和共同点</p>
    </div>

    <div class="tabs-bar">
      <div class="tabs">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'compare' }"
          @click="activeTab = 'compare'"
        >
          <el-icon><DataAnalysis /></el-icon>
          对比
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'schemes' }"
          @click="activeTab = 'schemes'; fetchSchemes()"
        >
          <el-icon><Collection /></el-icon>
          我的方案
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'; fetchHistory()"
        >
          <el-icon><Clock /></el-icon>
          历史记录
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'compare'">
      <div class="action-bar">
        <el-button @click="goToPatches">
          <el-icon><Plus /></el-icon>
          添加 Patch 到对比
        </el-button>
        <el-button v-if="compareList.length > 0" type="danger" @click="clearCompare">
          <el-icon><Delete /></el-icon>
          清空列表
        </el-button>
        <el-button
          v-if="comparison"
          type="success"
          @click="openSaveSchemeDialog"
        >
          <el-icon><Star /></el-icon>
          保存方案
        </el-button>
        <el-button
          v-if="comparison"
          type="warning"
          @click="openShareDialog"
        >
          <el-icon><Share /></el-icon>
          分享对比
        </el-button>
        <el-switch
          v-if="comparison"
          v-model="highlightDiffs"
          active-text="差异高亮"
          inactive-text=""
          style="margin-left: 16px"
        />
        <span class="compare-count">已选择 {{ compareList.length }}/5 个 Patch</span>
      </div>

      <div v-if="compareList.length === 0" class="empty-state">
        <el-icon class="empty-icon"><DataAnalysis /></el-icon>
        <p>还没有添加任何 Patch 到对比列表</p>
        <el-button type="primary" class="btn-primary" @click="goToPatches">去 Patch 库添加</el-button>
      </div>

      <template v-else>
        <div class="compare-patches">
          <div v-for="patch in compareList" :key="patch.id" class="compare-patch-item">
            <div class="patch-info">
              <div class="patch-name">{{ patch.title }}</div>
              <div class="patch-author">by {{ patch.username }}</div>
            </div>
            <el-button type="danger" size="small" @click="removeFromCompare(patch.id)">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>

        <el-button
          v-if="compareList.length >= 2"
          type="primary"
          size="large"
          class="btn-primary compare-btn"
          @click="doCompare"
          :loading="loading"
        >
          开始对比
        </el-button>

        <div v-if="comparison" class="card compare-result">
          <div class="result-header">
            <h3 class="result-title">📊 对比结果</h3>
            <div class="legend-bar" v-if="highlightDiffs">
              <span class="legend-item">
                <span class="legend-dot diff"></span>
                差异值
              </span>
              <span class="legend-item">
                <span class="legend-dot same"></span>
                相同值
              </span>
              <span class="legend-item">
                <span class="legend-dot unique"></span>
                独有值
              </span>
            </div>
          </div>

          <div class="compare-table">
            <table>
              <thead>
                <tr>
                  <th>参数</th>
                  <th v-for="patch in comparison.patches" :key="patch.id">
                    {{ patch.title }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, key) in comparison.comparison"
                  :key="key"
                  :class="{ 'diff-row': highlightDiffs && comparison.diff_info[key]?.has_diff }"
                >
                  <td class="param-name">
                    {{ paramLabels[key] || key }}
                    <el-tag
                      v-if="highlightDiffs && comparison.diff_info[key]?.has_diff"
                      size="small"
                      type="danger"
                      class="diff-tag"
                    >有差异</el-tag>
                  </td>
                  <td
                    v-for="(cell, idx) in getDiffCells(key)"
                    :key="cell.patch_id"
                    :class="getCellClass(key, idx)"
                  >
                    <div v-if="cell.value" class="param-values">
                      <div v-for="(v, k) in cell.value" :key="k" class="value-item">
                        <span class="value-label">{{ k }}:</span>
                        <span class="value-content">{{ formatValue(v) }}</span>
                      </div>
                    </div>
                    <span v-else class="no-value">-</span>
                  </td>
                </tr>
                <tr>
                  <td class="param-name">使用模块</td>
                  <td
                    v-for="usage in comparison.module_usage"
                    :key="usage.patch_id"
                  >
                    <div class="module-tags">
                      <el-tag
                        v-for="mod in usage.modules"
                        :key="mod"
                        size="small"
                        :class="{ 'module-unique': isModuleUnique(mod) }"
                      >
                        {{ mod }}
                      </el-tag>
                      <span v-if="usage.modules.length === 0" class="no-value">-</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="param-name">浏览量</td>
                  <td v-for="patch in comparison.patches" :key="patch.id">
                    {{ patch.views_count }}
                  </td>
                </tr>
                <tr>
                  <td class="param-name">点赞数</td>
                  <td v-for="patch in comparison.patches" :key="patch.id">
                    {{ patch.likes_count }}
                  </td>
                </tr>
                <tr>
                  <td class="param-name">创建时间</td>
                  <td v-for="patch in comparison.patches" :key="patch.id">
                    {{ formatDate(patch.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'schemes'" class="schemes-section">
      <div class="section-header">
        <h3>📁 我的对比方案</h3>
      </div>
      <div v-if="schemes.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Collection /></el-icon>
        <p>还没有保存任何对比方案</p>
        <el-button type="primary" class="btn-primary" @click="activeTab = 'compare'">去创建对比</el-button>
      </div>
      <div v-else class="schemes-list">
        <div v-for="scheme in schemes" :key="scheme.id" class="scheme-card">
          <div class="scheme-header">
            <h4 class="scheme-name">{{ scheme.name }}</h4>
            <div class="scheme-actions">
              <el-tooltip content="加载方案">
                <el-button size="small" @click="loadScheme(scheme)">
                  <el-icon><RefreshRight /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="分享">
                <el-button size="small" type="warning" @click="shareScheme(scheme)">
                  <el-icon><Share /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑">
                <el-button size="small" type="primary" @click="openEditSchemeDialog(scheme)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button size="small" type="danger" @click="deleteScheme(scheme.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <p v-if="scheme.description" class="scheme-desc">{{ scheme.description }}</p>
          <div class="scheme-meta">
            <span class="scheme-count">{{ scheme.patch_ids.length }} 个 Patch</span>
            <span v-if="scheme.is_public" class="scheme-public">
              <el-icon><Link /></el-icon>
              已分享
            </span>
            <span class="scheme-time">更新于 {{ formatDate(scheme.updated_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'history'" class="history-section">
      <div class="section-header">
        <h3>🕐 对比历史记录</h3>
        <el-button
          v-if="historyList.length > 0"
          size="small"
          type="danger"
          @click="confirmClearHistory"
        >
          清空历史
        </el-button>
      </div>
      <div v-if="historyList.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Clock /></el-icon>
        <p>还没有对比历史记录</p>
        <el-button type="primary" class="btn-primary" @click="activeTab = 'compare'">去创建对比</el-button>
      </div>
      <div v-else class="history-list">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <div class="history-content">
            <div class="history-patches">
              <el-tag
                v-for="title in item.patch_titles"
                :key="title"
                size="small"
                type="info"
              >{{ title }}</el-tag>
            </div>
            <div class="history-time">{{ formatDateTime(item.created_at) }}</div>
          </div>
          <div class="history-actions">
            <el-button size="small" type="primary" @click="loadHistory(item)">
              <el-icon><RefreshRight /></el-icon>
              加载
            </el-button>
            <el-button size="small" type="danger" @click="deleteHistoryItem(item.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="saveSchemeDialogVisible" title="保存对比方案" width="480px">
      <el-form :model="saveSchemeForm" label-width="80px">
        <el-form-item label="方案名称" required>
          <el-input v-model="saveSchemeForm.name" placeholder="请输入方案名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="saveSchemeForm.description"
            type="textarea"
            :rows="3"
            placeholder="选填，简要描述这个对比方案"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveSchemeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSaveScheme" :loading="savingScheme">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editSchemeDialogVisible" title="编辑方案" width="480px">
      <el-form :model="editSchemeForm" label-width="80px">
        <el-form-item label="方案名称" required>
          <el-input v-model="editSchemeForm.name" placeholder="请输入方案名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editSchemeForm.description"
            type="textarea"
            :rows="3"
            placeholder="选填，简要描述这个对比方案"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editSchemeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEditScheme" :loading="editingScheme">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareDialogVisible" title="分享对比" width="500px">
      <div v-if="shareMode === 'link'" class="share-section">
        <p class="share-tip">复制下方链接分享给他人：</p>
        <el-input
          v-model="shareLink"
          readonly
          class="share-link-input"
        >
          <template #append>
            <el-button @click="copyShareLink">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </template>
        </el-input>
        <div v-if="currentSchemeId" class="share-actions">
          <el-button type="danger" size="small" @click="revokeShareLink">
            <el-icon><Close /></el-icon>
            撤销分享链接
          </el-button>
        </div>
      </div>
      <div v-else class="share-section">
        <el-form :model="saveSchemeForm" label-width="80px">
          <el-form-item label="方案名称" required>
            <el-input v-model="saveSchemeForm.name" placeholder="请输入方案名称" maxlength="100" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="saveSchemeForm.description"
              type="textarea"
              :rows="2"
              placeholder="选填"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="shareDialogVisible = false">关闭</el-button>
        <el-button v-if="shareMode === 'save'" type="primary" @click="saveAndShare" :loading="savingScheme">
          保存并生成分享链接
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Delete, Close, DataAnalysis, Star, Share, Clock, Collection,
  RefreshRight, Edit, Link, CopyDocument
} from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'

const router = useRouter()
const route = useRoute()
const patchStore = usePatchStore()

const activeTab = ref('compare')
const loading = ref(false)
const compareList = ref([])
const comparison = ref(null)
const highlightDiffs = ref(true)

const schemes = ref([])
const historyList = ref([])

const saveSchemeDialogVisible = ref(false)
const saveSchemeForm = ref({ name: '', description: '' })
const savingScheme = ref(false)

const editSchemeDialogVisible = ref(false)
const editSchemeForm = ref({ id: null, name: '', description: '' })
const editingScheme = ref(false)

const shareDialogVisible = ref(false)
const shareMode = ref('save')
const shareLink = ref('')
const currentSchemeId = ref(null)

const paramLabels = {
  oscillators: '🎹 振荡器',
  filter: '🔍 滤波器',
  envelope: '📈 包络线',
  lfo: '〰️ LFO',
  effects: '✨ 效果器'
}

onMounted(async () => {
  await handleUrlParams()
  if (!comparison.value) {
    await fetchCompareList()
  }
})

const handleUrlParams = async () => {
  const shareToken = route.query.share
  const idsParam = route.query.ids

  if (shareToken) {
    try {
      loading.value = true
      const scheme = await patchStore.fetchSharedScheme(shareToken)
      if (scheme && scheme.patch_ids && scheme.patch_ids.length >= 2) {
        comparison.value = await patchStore.comparePatchesEnhanced(scheme.patch_ids, false)
        ElMessage.success(`已加载分享的对比方案：${scheme.name}`)
      }
    } catch (e) {
      ElMessage.error(e.error || '分享链接无效或已过期')
    } finally {
      loading.value = false
    }
  } else if (idsParam) {
    const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n))
    if (ids.length >= 2) {
      try {
        loading.value = true
        comparison.value = await patchStore.comparePatchesEnhanced(ids, false)
        compareList.value = comparison.value.patches
      } catch (e) {
        ElMessage.error(e.error || '加载对比失败')
      } finally {
        loading.value = false
      }
    }
  }
}

const fetchCompareList = async () => {
  const res = await patchStore.fetchCompareList()
  compareList.value = res.patches || []
}

const goToPatches = () => {
  router.push('/patches')
}

const removeFromCompare = async (id) => {
  await patchStore.removeFromCompare(id)
  await fetchCompareList()
  if (comparison.value) {
    const remainingIds = compareList.value.map(p => p.id)
    if (remainingIds.length >= 2) {
      doCompare()
    } else {
      comparison.value = null
    }
  }
}

const clearCompare = async () => {
  await patchStore.clearCompare()
  compareList.value = []
  comparison.value = null
  ElMessage.success('已清空对比列表')
}

const doCompare = async () => {
  if (compareList.value.length < 2) {
    ElMessage.warning('至少需要 2 个 Patch 进行对比')
    return
  }
  loading.value = true
  try {
    const ids = compareList.value.map(p => p.id)
    comparison.value = await patchStore.comparePatchesEnhanced(ids, true)
  } catch (e) {
    ElMessage.error(e.error || '对比失败')
  } finally {
    loading.value = false
  }
}

const formatValue = (v) => {
  if (typeof v === 'object') return JSON.stringify(v)
  return v ?? '-'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const getDiffCells = (key) => {
  if (!comparison.value?.diff_info) {
    return comparison.value?.comparison[key] || []
  }
  return comparison.value.diff_info[key]?.cells || comparison.value.comparison[key] || []
}

const getCellClass = (key, idx) => {
  if (!highlightDiffs.value || !comparison.value?.diff_info) return ''
  const cell = comparison.value.diff_info[key]?.cells?.[idx]
  if (cell?.is_unique) return 'cell-unique'
  if (comparison.value.diff_info[key]?.has_diff && !cell?.is_most_common) return 'cell-diff'
  return ''
}

const isModuleUnique = (modId) => {
  if (!highlightDiffs.value || !comparison.value?.module_diff_info) return false
  return comparison.value.module_diff_info[modId]?.is_unique || false
}

const openSaveSchemeDialog = () => {
  saveSchemeForm.value = { name: '', description: '' }
  saveSchemeDialogVisible.value = true
}

const confirmSaveScheme = async () => {
  if (!saveSchemeForm.value.name.trim()) {
    ElMessage.warning('请输入方案名称')
    return
  }
  savingScheme.value = true
  try {
    const ids = compareList.value.map(p => p.id)
    await patchStore.saveCompareScheme({
      name: saveSchemeForm.value.name.trim(),
      description: saveSchemeForm.value.description,
      patch_ids: ids
    })
    ElMessage.success('方案保存成功')
    saveSchemeDialogVisible.value = false
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  } finally {
    savingScheme.value = false
  }
}

const fetchSchemes = async () => {
  try {
    const res = await patchStore.fetchCompareSchemes()
    schemes.value = res.list || []
  } catch (e) {
    ElMessage.error(e.error || '加载方案失败')
  }
}

const loadScheme = async (scheme) => {
  try {
    loading.value = true
    comparison.value = await patchStore.comparePatchesEnhanced(scheme.patch_ids, false)
    compareList.value = comparison.value.patches
    activeTab.value = 'compare'
  } catch (e) {
    ElMessage.error(e.error || '加载方案失败')
  } finally {
    loading.value = false
  }
}

const openEditSchemeDialog = (scheme) => {
  editSchemeForm.value = {
    id: scheme.id,
    name: scheme.name,
    description: scheme.description || ''
  }
  editSchemeDialogVisible.value = true
}

const confirmEditScheme = async () => {
  if (!editSchemeForm.value.name.trim()) {
    ElMessage.warning('请输入方案名称')
    return
  }
  editingScheme.value = true
  try {
    await patchStore.updateCompareScheme(editSchemeForm.value.id, {
      name: editSchemeForm.value.name.trim(),
      description: editSchemeForm.value.description
    })
    ElMessage.success('方案更新成功')
    editSchemeDialogVisible.value = false
    fetchSchemes()
  } catch (e) {
    ElMessage.error(e.error || '更新失败')
  } finally {
    editingScheme.value = false
  }
}

const deleteScheme = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该方案？', '确认删除', { type: 'warning' })
    await patchStore.deleteCompareScheme(id)
    ElMessage.success('方案已删除')
    fetchSchemes()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '删除失败')
    }
  }
}

const openShareDialog = () => {
  currentSchemeId.value = null
  shareLink.value = ''
  shareMode.value = 'save'
  saveSchemeForm.value = { name: '', description: '' }
  shareDialogVisible.value = true
}

const saveAndShare = async () => {
  if (!saveSchemeForm.value.name.trim()) {
    ElMessage.warning('请输入方案名称')
    return
  }
  savingScheme.value = true
  try {
    const ids = compareList.value.map(p => p.id)
    const res = await patchStore.saveCompareScheme({
      name: saveSchemeForm.value.name.trim(),
      description: saveSchemeForm.value.description,
      patch_ids: ids
    })
    const schemeId = res.id
    const shareRes = await patchStore.generateShareLink(schemeId)
    currentSchemeId.value = schemeId
    shareLink.value = window.location.origin + shareRes.share_url
    shareMode.value = 'link'
    ElMessage.success('分享链接已生成')
  } catch (e) {
    ElMessage.error(e.error || '生成分享链接失败')
  } finally {
    savingScheme.value = false
  }
}

const shareScheme = async (scheme) => {
  try {
    const res = await patchStore.generateShareLink(scheme.id)
    currentSchemeId.value = scheme.id
    shareLink.value = window.location.origin + res.share_url
    shareMode.value = 'link'
    shareDialogVisible.value = true
    fetchSchemes()
  } catch (e) {
    ElMessage.error(e.error || '生成分享链接失败')
  }
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('链接已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制')
  }
}

const revokeShareLink = async () => {
  if (!currentSchemeId.value) return
  try {
    await ElMessageBox.confirm('确定撤销该分享链接？撤销后链接将无法访问。', '确认撤销', { type: 'warning' })
    await patchStore.revokeShareLink(currentSchemeId.value)
    shareLink.value = ''
    shareMode.value = 'save'
    currentSchemeId.value = null
    ElMessage.success('分享链接已撤销')
    fetchSchemes()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '撤销失败')
    }
  }
}

const fetchHistory = async () => {
  try {
    const res = await patchStore.fetchCompareHistory()
    historyList.value = res.list || []
  } catch (e) {
    ElMessage.error(e.error || '加载历史记录失败')
  }
}

const loadHistory = async (item) => {
  try {
    loading.value = true
    comparison.value = await patchStore.comparePatchesEnhanced(item.patch_ids, false)
    compareList.value = comparison.value.patches
    activeTab.value = 'compare'
  } catch (e) {
    ElMessage.error(e.error || '加载失败')
  } finally {
    loading.value = false
  }
}

const deleteHistoryItem = async (id) => {
  try {
    await patchStore.deleteCompareHistory(id)
    historyList.value = historyList.value.filter(h => h.id !== id)
    ElMessage.success('记录已删除')
  } catch (e) {
    ElMessage.error(e.error || '删除失败')
  }
}

const confirmClearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定清空所有对比历史记录？此操作不可恢复。', '确认清空', { type: 'warning' })
    await patchStore.clearCompareHistory()
    historyList.value = []
    ElMessage.success('历史记录已清空')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '清空失败')
    }
  }
}
</script>

<style scoped>
.tabs-bar {
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-item:hover {
  color: rgba(255, 255, 255, 0.8);
}

.tab-item.active {
  color: #ffd700;
  border-bottom-color: #ffd700;
}

.compare-count {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.compare-patches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.compare-patch-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.patch-name {
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 2px;
}

.patch-author {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.compare-btn {
  display: block;
  margin: 0 auto 32px;
  min-width: 200px;
}

.compare-result {
  margin-top: 24px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.result-title {
  font-size: 20px;
  color: #ffd700;
  margin: 0;
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.legend-dot.diff {
  background: rgba(255, 193, 7, 0.3);
  border: 1px solid #ffc107;
}

.legend-dot.same {
  background: rgba(103, 194, 58, 0.2);
  border: 1px solid #67c23a;
}

.legend-dot.unique {
  background: rgba(245, 108, 108, 0.3);
  border: 1px solid #f56c6c;
}

.compare-table {
  overflow-x: auto;
}

.compare-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.compare-table th,
.compare-table td {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: left;
  vertical-align: top;
}

.compare-table th {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  font-weight: 600;
  font-size: 14px;
}

.diff-row {
  background: rgba(255, 193, 7, 0.03);
}

.cell-diff {
  background: rgba(255, 193, 7, 0.15) !important;
}

.cell-unique {
  background: rgba(245, 108, 108, 0.15) !important;
}

.param-name {
  font-weight: 600;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.05) !important;
  width: 180px;
  white-space: nowrap;
}

.diff-tag {
  margin-left: 8px;
}

.param-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value-item {
  font-size: 13px;
}

.value-label {
  color: rgba(255, 255, 255, 0.5);
  margin-right: 6px;
}

.value-content {
  color: #fff;
}

.no-value {
  color: rgba(255, 255, 255, 0.3);
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.module-unique {
  background: rgba(245, 108, 108, 0.2) !important;
  border-color: #f56c6c !important;
  color: #f56c6c !important;
}

.schemes-section,
.history-section {
  padding-top: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 18px;
  color: #ffd700;
  margin: 0;
}

.schemes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.scheme-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.scheme-card:hover {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.03);
}

.scheme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.scheme-name {
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scheme-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.scheme-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
  line-height: 1.5;
}

.scheme-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.scheme-count {
  color: #67c23a;
  font-weight: 500;
}

.scheme-public {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
}

.scheme-time {
  margin-left: auto;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px 16px;
  gap: 16px;
  transition: all 0.2s;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 215, 0, 0.2);
}

.history-content {
  flex: 1;
  min-width: 0;
}

.history-patches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.history-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.history-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.share-section {
  padding: 8px 0;
}

.share-tip {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}

.share-link-input {
  margin-bottom: 16px;
}

.share-actions {
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  color: rgba(255, 215, 0, 0.3);
  margin-bottom: 16px;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 20px;
}
</style>
