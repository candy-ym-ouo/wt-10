<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">🔗 模块组合推荐管理</h1>
        <p class="page-desc">基于已发布 Patch 统计模块搭配，配置推荐规则</p>
      </div>
      <div class="header-actions">
        <el-button @click="fetchStats">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button type="primary" @click="recalculateStats" :loading="recalculating">
          <el-icon><TrendCharts /></el-icon>
          重新统计
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(103, 194, 58, 0.15); color: #67c23a;">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalCombinations }}</div>
            <div class="stat-label">总组合数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(255, 215, 0, 0.15); color: #ffd700;">
            <el-icon><Star /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ strongCombinations }}</div>
            <div class="stat-label">强关联组合</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(64, 158, 255, 0.15); color: #409eff;">
            <el-icon><Box /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ manualCount }}</div>
            <div class="stat-label">手动推荐</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(245, 108, 108, 0.15); color: #f56c6c;">
            <el-icon><Histogram /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ avgConfidence }}%</div>
            <div class="stat-label">平均置信度</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="main-tabs">
      <el-tab-pane label="组合统计" name="stats">
        <div class="filter-bar">
          <el-select v-model="filterModule" placeholder="筛选模块" clearable style="width: 220px" @change="fetchStats">
            <el-option
              v-for="m in allModules"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            />
          </el-select>
          <el-input-number v-model="minCount" :min="0" :max="100" placeholder="最小共现次数" @change="fetchStats" />
          <el-button type="primary" @click="fetchStats">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>

        <div class="table-card">
          <el-table :data="combinationStats" v-loading="loading" stripe>
            <el-table-column label="模块 1" min-width="180">
              <template #default="{ row }">
                <div class="module-cell" @click="goToModule(row.module_id)">
                  <el-tag size="small" type="warning">{{ row.module_type }}</el-tag>
                  <span class="module-name">{{ row.module_name }}</span>
                  <span class="module-manu">{{ row.module_manufacturer }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="模块 2" min-width="180">
              <template #default="{ row }">
                <div class="module-cell" @click="goToModule(row.paired_module_id)">
                  <el-tag size="small" type="warning">{{ row.paired_type }}</el-tag>
                  <span class="module-name">{{ row.paired_name }}</span>
                  <span class="module-manu">{{ row.paired_manufacturer }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="co_occurrence_count" label="共现次数" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.co_occurrence_count >= 3 ? 'success' : 'info'" size="small">
                  {{ row.co_occurrence_count }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="置信度" width="160">
              <template #default="{ row }">
                <div class="confidence-cell">
                  <el-progress
                    :percentage="Math.round((row.confidence_score || 0) * 100)"
                    :stroke-width="10"
                    :show-text="false"
                    color="#ffd700"
                  />
                  <span>{{ Math.round((row.confidence_score || 0) * 100) }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="avg_patch_likes" label="平均点赞" width="100" align="center" />
            <el-table-column label="操作" width="180" fixed="right" align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="manageModule(row.module_id)">
                  管理
                </el-button>
                <el-button size="small" @click="viewPatches(row.module_id, row.paired_module_id)">
                  Patch
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="total > limit" class="pagination">
            <el-pagination
              v-model:current-page="page"
              :page-size="limit"
              :total="total"
              layout="prev, pager, next, total"
              @current-change="fetchStats"
              background
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="推荐配置" name="config">
        <div class="config-card">
          <h3 class="config-title">推荐系统参数配置</h3>
          <el-form :model="configForm" label-width="200px" class="config-form">
            <el-form-item label="最小共现次数">
              <el-input-number v-model="configForm.min_co_occurrence" :min="1" :max="50" />
              <span class="form-tip">低于此次数的组合将不会被统计推荐</span>
            </el-form-item>
            <el-form-item label="每个模块最大推荐数">
              <el-input-number v-model="configForm.max_recommendations_per_module" :min="1" :max="20" />
              <span class="form-tip">每个模块详情页最多显示的搭配推荐数量</span>
            </el-form-item>
            <el-form-item label="置信度阈值">
              <el-slider v-model="confidenceValue" :min="0" :max="100" :step="5" />
              <span class="form-tip">低于此阈值的组合不会显示为推荐（{{ confidenceValue }}%）</span>
            </el-form-item>
            <el-form-item label="自动计算">
              <el-switch v-model="autoCalculate" active-text="开启" inactive-text="关闭" />
              <span class="form-tip">每次发布新 Patch 时自动更新统计数据</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveConfig" :loading="savingConfig">
                保存配置
              </el-button>
              <el-button @click="loadConfig">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, Refresh, TrendCharts, Star, Box, Histogram, Search } from '@element-plus/icons-vue'
import { adminApi, moduleApi } from '@/api'

const router = useRouter()

const loading = ref(false)
const recalculating = ref(false)
const savingConfig = ref(false)
const activeTab = ref('stats')
const combinationStats = ref([])
const allModules = ref([])
const filterModule = ref('')
const minCount = ref(0)
const page = ref(1)
const limit = ref(50)
const total = ref(0)

const totalCombinations = ref(0)
const strongCombinations = ref(0)
const manualCount = ref(0)
const avgConfidence = ref(0)

const configForm = reactive({
  min_co_occurrence: 2,
  max_recommendations_per_module: 8
})
const confidenceValue = ref(10)
const autoCalculate = ref(true)

onMounted(async () => {
  await Promise.all([fetchStats(), loadConfig(), fetchAllModules()])
})

const fetchAllModules = async () => {
  try {
    const res = await moduleApi.getModules({ limit: 500 })
    allModules.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

const fetchStats = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit: limit.value
    }
    if (filterModule.value) params.module_id = filterModule.value
    if (minCount.value > 0) params.min_count = minCount.value

    const res = await adminApi.getCombinationStatsList(params)
    combinationStats.value = res.list || []
    total.value = res.total || 0

    totalCombinations.value = res.total || 0
    strongCombinations.value = combinationStats.value.filter(c => c.co_occurrence_count >= 3).length
    avgConfidence.value = combinationStats.value.length > 0
      ? Math.round(combinationStats.value.reduce((s, c) => s + (c.confidence_score || 0), 0) / combinationStats.value.length * 100)
      : 0
  } catch (e) {
    ElMessage.error('获取统计数据失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadConfig = async () => {
  try {
    const res = await adminApi.getCombinationConfig()
    configForm.min_co_occurrence = parseInt(res.min_co_occurrence) || 2
    configForm.max_recommendations_per_module = parseInt(res.max_recommendations_per_module) || 8
    confidenceValue.value = parseFloat(res.confidence_threshold || 0.1) * 100
    autoCalculate.value = res.auto_calculate_enabled === '1'
    manualCount.value = 0
  } catch (e) {
    console.error(e)
  }
}

const saveConfig = async () => {
  savingConfig.value = true
  try {
    const data = {
      min_co_occurrence: String(configForm.min_co_occurrence),
      max_recommendations_per_module: String(configForm.max_recommendations_per_module),
      confidence_threshold: String(confidenceValue.value / 100),
      auto_calculate_enabled: autoCalculate.value ? '1' : '0'
    }
    await adminApi.batchUpdateCombinationConfig(data)
    ElMessage.success('配置保存成功')
  } catch (e) {
    ElMessage.error('配置保存失败')
    console.error(e)
  } finally {
    savingConfig.value = false
  }
}

const recalculateStats = async () => {
  recalculating.value = true
  try {
    const res = await adminApi.recalculateCombinations()
    ElMessage.success(`重新统计完成，共计算 ${res.combinations_calculated} 个组合`)
    await fetchStats()
  } catch (e) {
    ElMessage.error('重新统计失败')
    console.error(e)
  } finally {
    recalculating.value = false
  }
}

const goToModule = (moduleId) => {
  router.push(`/modules/${moduleId}`)
}

const manageModule = (moduleId) => {
  router.push(`/admin/modules/${moduleId}/combinations`)
}

const viewPatches = (moduleId, pairedId) => {
  router.push({
    path: '/patches',
    query: { modules: `${moduleId},${pairedId}` }
  })
}
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
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.page-desc {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.stats-row {
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.main-tabs {
  margin-top: 0;
}

.main-tabs :deep(.el-tabs__item) {
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
}

.main-tabs :deep(.el-tabs__item.is-active) {
  color: #ffd700;
}

.main-tabs :deep(.el-tabs__active-bar) {
  background-color: #ffd700;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.module-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.module-cell .module-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.module-cell .module-manu {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.confidence-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.confidence-cell span {
  font-size: 13px;
  color: #ffd700;
  font-weight: 500;
  min-width: 42px;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.config-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem 2rem;
}

.config-title {
  font-size: 17px;
  font-weight: 600;
  color: #ffd700;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.config-form {
  max-width: 700px;
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
