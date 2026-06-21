<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🏆 成就体系</h1>
      <div class="header-actions">
        <el-button type="warning" @click="handleRecalculateAll" :loading="recalculating">
          <el-icon><Refresh /></el-icon>
          重新计算所有成就
        </el-button>
        <el-button type="primary" @click="openCreateDialog" v-if="canManage">
          <el-icon><Plus /></el-icon>
          新增成就
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-select v-model="categoryFilter" placeholder="分类筛选" class="filter-select" @change="fetchRules">
        <el-option label="全部分类" value="" />
        <el-option label="发布数" value="patch" />
        <el-option label="点赞数" value="like" />
        <el-option label="收藏数" value="favorite" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchRules">
        <el-option label="全部状态" value="" />
        <el-option label="启用" value="1" />
        <el-option label="禁用" value="0" />
      </el-select>
    </div>

    <div class="achievement-list">
      <div v-for="category in categories" :key="category.key" class="category-section">
        <h3 class="category-title">
          <span class="category-icon">{{ category.icon }}</span>
          {{ category.label }}
        </h3>
        <div class="achievement-cards">
          <div 
            v-for="rule in filteredByCategory(category.key)" 
            :key="rule.id" 
            class="achievement-card"
            :class="{ disabled: !rule.is_active }"
          >
            <div class="card-header">
              <span class="achievement-icon">{{ rule.icon }}</span>
              <div class="achievement-info">
                <h4 class="achievement-name">{{ rule.name }}</h4>
                <span class="achievement-level">Lv.{{ rule.level }}</span>
              </div>
              <el-tag :type="rule.is_active ? 'success' : 'info'" size="small">
                {{ rule.is_active ? '启用' : '禁用' }}
              </el-tag>
            </div>
            <p class="achievement-desc">{{ rule.description }}</p>
            <div class="achievement-meta">
              <span class="meta-item">
                <el-icon><TrendCharts /></el-icon>
                阈值: {{ rule.threshold }}
              </span>
              <span class="meta-item">
                排序: {{ rule.sort_order }}
              </span>
            </div>
            <div class="card-actions" v-if="canManage">
              <el-button size="small" @click="openEditDialog(rule)">编辑</el-button>
              <el-button 
                size="small" 
                :type="rule.is_active ? 'warning' : 'success'"
                @click="toggleStatus(rule)"
              >
                {{ rule.is_active ? '禁用' : '启用' }}
              </el-button>
              <el-button size="small" type="danger" @click="deleteRule(rule)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑成就' : '新增成就'"
      width="600px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="成就名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入成就名称" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="formData.icon" placeholder="请输入 emoji 图标" maxlength="4" style="width: 120px" />
          <span class="form-tip">输入一个 emoji，如 🏆 ⭐ 💖</span>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="发布数" value="patch" />
            <el-option label="点赞数" value="like" />
            <el-option label="收藏数" value="favorite" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计指标" prop="metric_type">
          <el-select v-model="formData.metric_type" placeholder="请选择统计指标" style="width: 100%">
            <el-option label="发布 Patch 数" value="patches_count" />
            <el-option label="获得点赞数" value="likes_count" />
            <el-option label="获得收藏数" value="favorites_count" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值" prop="threshold">
          <el-input-number v-model="formData.threshold" :min="1" :max="100000" />
          <span class="form-tip">达到该数值即解锁成就</span>
        </el-form-item>
        <el-form-item label="等级" prop="level">
          <el-input-number v-model="formData.level" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="formData.sort_order" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入成就描述" 
          />
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-switch v-model="formData.is_active" active-text="启用" inactive-text="禁用" />
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
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, TrendCharts } from '@element-plus/icons-vue'
import { adminAchievementApi } from '@/api'
import { useUserStore } from '@/stores/userStore'
import { PERMISSIONS } from '@/constants/permissions'

const userStore = useUserStore()
const canManage = computed(() => userStore.hasPermission(PERMISSIONS.ACHIEVEMENT_MANAGE))

const loading = ref(true)
const recalculating = ref(false)
const categoryFilter = ref('')
const statusFilter = ref('')
const achievementRules = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const categories = [
  { key: 'patch', label: '发布成就', icon: '📝' },
  { key: 'like', label: '人气成就', icon: '❤️' },
  { key: 'favorite', label: '收藏成就', icon: '⭐' }
]

const formData = reactive({
  name: '',
  description: '',
  icon: '🏆',
  category: 'patch',
  metric_type: 'patches_count',
  threshold: 1,
  level: 1,
  sort_order: 0,
  is_active: true
})

const rules = {
  name: [{ required: true, message: '请输入成就名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  metric_type: [{ required: true, message: '请选择统计指标', trigger: 'change' }],
  threshold: [{ required: true, message: '请输入阈值', trigger: 'blur' }]
}

const filteredByCategory = (category) => {
  return achievementRules.value.filter(r => r.category === category)
}

const fetchRules = async () => {
  try {
    loading.value = true
    const params = {}
    if (categoryFilter.value) params.category = categoryFilter.value
    if (statusFilter.value !== '') params.is_active = statusFilter.value
    
    const res = await adminAchievementApi.getRules(params)
    achievementRules.value = res.list || res || []
  } catch (err) {
    ElMessage.error('获取成就规则失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  Object.assign(formData, {
    name: '',
    description: '',
    icon: '🏆',
    category: 'patch',
    metric_type: 'patches_count',
    threshold: 1,
    level: 1,
    sort_order: 0,
    is_active: true
  })
  dialogVisible.value = true
}

const openEditDialog = (rule) => {
  isEdit.value = true
  Object.assign(formData, {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    icon: rule.icon,
    category: rule.category,
    metric_type: rule.metric_type,
    threshold: rule.threshold,
    level: rule.level,
    sort_order: rule.sort_order,
    is_active: !!rule.is_active
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (isEdit.value) {
      await adminAchievementApi.updateRule(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await adminAchievementApi.createRule(formData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchRules()
  } catch (err) {
    if (err !== false) {
      ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      console.error(err)
    }
  }
}

const toggleStatus = async (rule) => {
  try {
    const newStatus = rule.is_active ? 0 : 1
    await adminAchievementApi.updateRule(rule.id, { is_active: newStatus })
    rule.is_active = newStatus
    ElMessage.success('操作成功')
  } catch (err) {
    ElMessage.error('操作失败')
    console.error(err)
  }
}

const deleteRule = async (rule) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除成就「${rule.name}」吗？`,
      '确认删除',
      { type: 'warning' }
    )
    
    await adminAchievementApi.deleteRule(rule.id)
    ElMessage.success('删除成功')
    fetchRules()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(err)
    }
  }
}

const handleRecalculateAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重新计算所有用户的成就吗？这可能需要一些时间。',
      '确认计算',
      { type: 'info' }
    )
    
    recalculating.value = true
    const res = await adminAchievementApi.recalculateAll()
    ElMessage.success(`计算完成，共更新 ${res.updated_users} 个用户`)
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('计算失败')
      console.error(err)
    }
  } finally {
    recalculating.value = false
  }
}

onMounted(() => {
  fetchRules()
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

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filter-select {
  width: 180px;
}

.category-section {
  margin-bottom: 2rem;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

.category-icon {
  font-size: 1.5rem;
}

.achievement-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.achievement-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;
}

.achievement-card:hover {
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.achievement-card.disabled {
  opacity: 0.5;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.achievement-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.achievement-level {
  font-size: 0.8rem;
  color: var(--primary-color);
  font-weight: 500;
}

.achievement-desc {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
  min-height: 2.5rem;
}

.achievement-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.card-actions .el-button {
  flex: 1;
}

.form-tip {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}
</style>
