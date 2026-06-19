<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎚️ 参数对比</h1>
      <p class="page-subtitle">对比多个 Patch 的参数设置，找出差异和共同点</p>
    </div>

    <div class="action-bar">
      <el-button @click="goToPatches">
        <el-icon><Plus /></el-icon>
        添加 Patch 到对比
      </el-button>
      <el-button v-if="compareList.length > 0" type="danger" @click="clearCompare">
        <el-icon><Delete /></el-icon>
        清空列表
      </el-button>
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
        <h3 class="result-title">📊 对比结果</h3>

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
              <tr v-for="(item, key) in comparison.comparison" :key="key">
                <td class="param-name">{{ paramLabels[key] || key }}</td>
                <td v-for="cell in item" :key="cell.patch_id">
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
                <td v-for="usage in comparison.module_usage" :key="usage.patch_id">
                  <span class="module-count">{{ usage.modules.length }} 个模块</span>
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Close, DataAnalysis } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'

const router = useRouter()
const patchStore = usePatchStore()

const loading = ref(false)
const compareList = ref([])
const comparison = ref(null)

const paramLabels = {
  oscillators: '🎹 振荡器',
  filter: '🔍 滤波器',
  envelope: '📈 包络线',
  lfo: '〰️ LFO',
  effects: '✨ 效果器'
}

onMounted(async () => {
  await fetchCompareList()
})

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
    comparison.value = await patchStore.comparePatches(ids)
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
</script>

<style scoped>
.compare-count {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
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

.result-title {
  font-size: 20px;
  color: #ffd700;
  margin-bottom: 24px;
}

.param-name {
  font-weight: 600;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
  width: 150px;
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

.module-count {
  color: #67c23a;
  font-weight: 500;
}
</style>
