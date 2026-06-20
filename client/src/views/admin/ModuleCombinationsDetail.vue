<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <el-button @click="router.back()" text style="margin-bottom: 10px;">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h1 class="page-title">
          搭配推荐管理
          <span v-if="currentModule" class="module-subtitle">
            {{ currentModule.name }} ({{ currentModule.type }})
          </span>
        </h1>
      </div>
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon>
        添加手动推荐
      </el-button>
    </div>

    <el-row :gutter="20" v-if="moduleStats.stats" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">总组合数</div>
          <div class="stat-value">{{ moduleStats.stats.total_combinations }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">强关联组合</div>
          <div class="stat-value">{{ moduleStats.stats.strong_combinations }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">平均置信度</div>
          <div class="stat-value">{{ Math.round(moduleStats.stats.avg_confidence * 100) }}%</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">手动推荐</div>
          <div class="stat-value">{{ moduleStats.stats.manual_recommendations }}</div>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="main-tabs">
      <el-tab-pane :label="`手动推荐 (${manualCombinations.length})`" name="manual">
        <div class="table-card" v-if="manualCombinations.length > 0">
          <el-table :data="manualCombinations" stripe>
            <el-table-column label="搭配模块" min-width="200">
              <template #default="{ row }">
                <div class="module-cell" @click="goToModule(row.paired_module_id)">
                  <el-tag size="small" type="warning">{{ row.paired_type }}</el-tag>
                  <span class="module-name">{{ row.paired_name }}</span>
                  <span class="module-manu">{{ row.paired_manufacturer_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="推荐理由" min-width="250">
              <template #default="{ row }">
                <span v-if="row.reason">{{ row.reason }}</span>
                <span v-else style="color: rgba(255,255,255,0.4);">未填写</span>
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="权重" width="100" align="center" />
            <el-table-column prop="sort_order" label="排序" width="100" align="center" />
            <el-table-column label="操作" width="200" fixed="right" align="center">
              <template #default="{ row }">
                <el-button size="small" @click="openEditDialog(row)">
                  编辑
                </el-button>
                <el-button size="small" type="danger" @click="removeCombination(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else class="empty-card">
          <el-icon><Star /></el-icon>
          <p>暂无手动推荐，可从统计推荐中添加或手动添加</p>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`统计推荐 (${statsCombinations.length})`" name="stats">
        <div class="table-card" v-if="statsCombinations.length > 0">
          <el-table :data="statsCombinations" stripe>
            <el-table-column label="搭配模块" min-width="200">
              <template #default="{ row }">
                <div class="module-cell" @click="goToModule(row.paired_module_id)">
                  <el-tag size="small" type="warning">{{ row.paired_type }}</el-tag>
                  <span class="module-name">{{ row.paired_name }}</span>
                  <span class="module-manu">{{ row.paired_manufacturer_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="co_occurrence_count" label="共现次数" width="100" align="center" />
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
            <el-table-column label="操作" width="150" fixed="right" align="center">
              <template #default="{ row }">
                <el-button 
                  size="small" 
                  type="success" 
                  @click="addToManual(row)"
                  :disabled="isInManual(row.paired_module_id)"
                >
                  {{ isInManual(row.paired_module_id) ? '已添加' : '添加为推荐' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else class="empty-card">
          <el-icon><TrendCharts /></el-icon>
          <p>暂无统计推荐数据，更多 Patch 发布后将自动生成</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="常用搭档 TOP 5" name="top">
        <div v-if="moduleStats.top_partners && moduleStats.top_partners.length > 0" class="top-list">
          <div
            v-for="(partner, index) in moduleStats.top_partners"
            :key="partner.paired_module_id"
            class="top-item"
          >
            <div class="top-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
            <div class="top-info" @click="goToModule(partner.paired_module_id)">
              <div class="top-name">{{ partner.name }}</div>
              <div class="top-meta">
                <el-tag size="small" type="warning">{{ partner.type }}</el-tag>
                <span v-if="partner.manufacturer">{{ partner.manufacturer }}</span>
              </div>
            </div>
            <div class="top-stats">
              <div class="top-stat">
                <span class="stat-num">{{ partner.co_occurrence_count }}</span>
                <span class="stat-label">共现</span>
              </div>
              <div class="top-stat">
                <span class="stat-num">{{ Math.round((partner.confidence_score || 0) * 100) }}%</span>
                <span class="stat-label">置信度</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-card">
          <el-icon><Trophy /></el-icon>
          <p>暂无统计数据</p>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑推荐搭配' : '添加推荐搭配'"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="搭配模块">
          <el-select 
            v-model="formData.paired_module_id" 
            placeholder="请选择搭配模块" 
            style="width: 100%"
            :disabled="isEdit"
            filterable
          >
            <el-option
              v-for="m in availableModules"
              :key="m.id"
              :label="`[${m.type}] ${m.name}`"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐理由">
          <el-input 
            v-model="formData.reason" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入推荐理由"
          />
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number v-model="formData.weight" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort_order" :min="0" :max="100" />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Star, TrendCharts, Trophy } from '@element-plus/icons-vue'
import { adminApi, moduleApi } from '@/api'

const route = useRoute()
const router = useRouter()

const moduleId = computed(() => parseInt(route.params.id))
const activeTab = ref('manual')
const currentModule = ref(null)
const moduleStats = ref({ stats: {}, top_partners: [] })
const manualCombinations = ref([])
const statsCombinations = ref([])
const allModules = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)

const formData = reactive({
  paired_module_id: null,
  reason: '',
  weight: 1,
  sort_order: 0,
  id: null
})

const availableModules = computed(() => {
  return allModules.value.filter(m => m.id !== moduleId.value)
})

onMounted(async () => {
  await Promise.all([
    fetchModuleInfo(),
    fetchCombinations(),
    fetchAllModules(),
    fetchModuleStats()
  ])
})

const fetchModuleInfo = async () => {
  try {
    currentModule.value = await moduleApi.getModuleDetail(moduleId.value)
  } catch (e) {
    console.error(e)
  }
}

const fetchAllModules = async () => {
  try {
    const res = await moduleApi.getModules({ limit: 500 })
    allModules.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

const fetchCombinations = async () => {
  try {
    const res = await adminApi.getModuleCombinations(moduleId.value)
    manualCombinations.value = res.manual || []
    statsCombinations.value = res.stats || []
  } catch (e) {
    ElMessage.error('获取搭配数据失败')
    console.error(e)
  }
}

const fetchModuleStats = async () => {
  try {
    moduleStats.value = await moduleApi.getModuleCombinationStats(moduleId.value)
  } catch (e) {
    console.error(e)
  }
}

const isInManual = (pairedId) => {
  return manualCombinations.value.some(m => m.paired_module_id === pairedId)
}

const openAddDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    paired_module_id: null,
    reason: '',
    weight: 1,
    sort_order: manualCombinations.value.length,
    id: null
  })
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  Object.assign(formData, {
    paired_module_id: row.paired_module_id,
    reason: row.reason || '',
    weight: row.weight || 1,
    sort_order: row.sort_order || 0,
    id: row.id
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formData.paired_module_id) {
    ElMessage.warning('请选择搭配模块')
    return
  }

  try {
    if (isEdit.value) {
      await adminApi.updateModuleCombination(formData.id, {
        reason: formData.reason,
        weight: formData.weight,
        sort_order: formData.sort_order
      })
      ElMessage.success('更新成功')
    } else {
      await adminApi.addModuleCombination(moduleId.value, {
        paired_module_id: formData.paired_module_id,
        reason: formData.reason,
        weight: formData.weight,
        sort_order: formData.sort_order
      })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    await Promise.all([fetchCombinations(), fetchModuleStats()])
  } catch (e) {
    ElMessage.error(e.error || '操作失败')
    console.error(e)
  }
}

const removeCombination = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个推荐搭配吗？', '确认删除', {
      type: 'warning'
    })
    await adminApi.removeModuleCombination(row.id)
    ElMessage.success('删除成功')
    await Promise.all([fetchCombinations(), fetchModuleStats()])
  } catch {}
}

const addToManual = async (row) => {
  try {
    await adminApi.addModuleCombination(moduleId.value, {
      paired_module_id: row.paired_module_id,
      reason: '',
      weight: 1,
      sort_order: manualCombinations.value.length
    })
    ElMessage.success('已添加为手动推荐')
    await Promise.all([fetchCombinations(), fetchModuleStats()])
  } catch (e) {
    ElMessage.error(e.error || '添加失败')
    console.error(e)
  }
}

const goToModule = (id) => {
  router.push(`/modules/${id}`)
}
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
}

.stats-row {
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #ffd700;
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

.empty-card {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.4);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.empty-card .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.top-item:hover {
  border-color: rgba(255, 215, 0, 0.3);
}

.top-rank {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #1a1a2e;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
}

.rank-4, .rank-5 {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.top-info {
  flex: 1;
  cursor: pointer;
}

.top-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}

.top-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.top-stats {
  display: flex;
  gap: 24px;
}

.top-stat {
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
