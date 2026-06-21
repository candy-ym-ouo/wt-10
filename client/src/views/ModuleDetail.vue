<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else-if="wikiData">
      <el-button @click="$router.back()" text style="margin-bottom: 20px;">
        <el-icon><ArrowLeft /></el-icon> 返回设备库
      </el-button>

      <div class="detail-hero">
        <div class="detail-header">
          <div class="detail-image">📦</div>
          <div class="detail-info">
            <div class="wiki-badge">
              <el-icon><Reading /></el-icon>
              <span>模块百科</span>
            </div>
            <span class="module-type">{{ wikiData.module.type }}</span>
            <h1 class="detail-title">{{ wikiData.module.name }}</h1>
            <p class="detail-manu" v-if="wikiData.module.manufacturer_name">
              厂商: <a :href="wikiData.module.manufacturer_website" target="_blank">{{ wikiData.module.manufacturer_name }}</a>
            </p>
            <p class="detail-desc">{{ wikiData.module.description }}</p>
          </div>
        </div>

        <div class="module-specs">
          <div class="spec-item">
            <span class="spec-label">宽度</span>
            <span class="spec-value">{{ wikiData.module.hp || '-' }} HP</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">供电</span>
            <span class="spec-value">{{ wikiData.module.power || '-' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">类型</span>
            <span class="spec-value">{{ wikiData.module.type }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">参数</span>
            <span class="spec-value">{{ wikiData.parameters.length }} 个</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">技巧</span>
            <span class="spec-value">{{ wikiData.tips.length }} 条</span>
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="wiki-tabs">
        <el-tab-pane label="概览" name="overview">
          <div class="card" v-if="wikiData.wiki">
            <div class="wiki-section">
              <h3><el-icon><InfoFilled /></el-icon> 模块概述</h3>
              <p class="wiki-content">{{ wikiData.wiki.overview || '暂无概述信息' }}</p>
            </div>

            <div class="wiki-section" v-if="wikiData.wiki.history">
              <h3><el-icon><Timer /></el-icon> 历史背景</h3>
              <p class="wiki-content">{{ wikiData.wiki.history }}</p>
            </div>

            <div class="wiki-section" v-if="wikiData.wiki.design_philosophy">
              <h3><el-icon><Star /></el-icon> 设计理念</h3>
              <p class="wiki-content">{{ wikiData.wiki.design_philosophy }}</p>
            </div>

            <div class="wiki-section" v-if="wikiData.wiki.notable_features">
              <h3><el-icon><Star /></el-icon> 主要特点</h3>
              <p class="wiki-content">{{ wikiData.wiki.notable_features }}</p>
            </div>

            <div class="wiki-section" v-if="wikiData.wiki.use_cases">
              <h3><el-icon><Suitcase /></el-icon> 典型应用</h3>
              <p class="wiki-content">{{ wikiData.wiki.use_cases }}</p>
            </div>

            <div class="wiki-empty" v-if="!hasWikiContent">
              <el-icon><DocumentAdd /></el-icon>
              <p>百科内容正在编辑中，敬请期待...</p>
            </div>
          </div>

          <div class="card" v-if="wikiData.module.specs">
            <div class="wiki-section">
              <h3>📋 技术规格</h3>
              <div class="param-grid">
                <div v-for="(value, key) in moduleSpecs" :key="key" class="param-item">
                  <div class="param-label">{{ key }}</div>
                  <div class="param-value">{{ value }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`参数详解 (${wikiData.parameters.length})`" name="parameters">
          <div class="card" v-if="wikiData.parameters.length > 0">
            <div class="params-list">
              <div 
                v-for="(param, index) in wikiData.parameters" 
                :key="param.id" 
                class="param-card"
              >
                <div class="param-header">
                  <span class="param-number">{{ index + 1 }}</span>
                  <div class="param-main">
                    <h4 class="param-name">{{ param.label || param.name }}</h4>
                    <el-tag size="small" type="info">{{ param.type }}</el-tag>
                  </div>
                </div>
                <div class="param-details">
                  <div class="param-meta-row">
                    <div class="param-meta-item" v-if="param.min_value !== null">
                      <span class="meta-label">最小值</span>
                      <span class="meta-value">{{ param.min_value }}{{ param.unit || '' }}</span>
                    </div>
                    <div class="param-meta-item" v-if="param.max_value !== null">
                      <span class="meta-label">最大值</span>
                      <span class="meta-value">{{ param.max_value }}{{ param.unit || '' }}</span>
                    </div>
                    <div class="param-meta-item" v-if="param.default_value">
                      <span class="meta-label">默认值</span>
                      <span class="meta-value">{{ param.default_value }}{{ param.unit || '' }}</span>
                    </div>
                  </div>
                  <div class="param-desc" v-if="param.description">
                    <span class="desc-label">说明</span>
                    <p>{{ param.description }}</p>
                  </div>
                  <div class="param-tips" v-if="param.tips">
                    <el-icon><Star /></el-icon>
                    <span class="tips-text">{{ param.tips }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="card empty-card" v-else>
            <el-icon><Setting /></el-icon>
            <p>暂无参数详解</p>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`使用技巧 (${wikiData.tips.length})`" name="tips">
          <div class="tips-categories">
            <el-button 
              v-for="cat in tipCategories" 
              :key="cat.value"
              :type="activeTipCategory === cat.value ? 'primary' : 'default'"
              size="small"
              @click="activeTipCategory = cat.value"
            >
              {{ cat.label }} ({{ getTipsByCategory(cat.value).length }})
            </el-button>
          </div>

          <div class="tips-list" v-if="filteredTips.length > 0">
            <div v-for="tip in filteredTips" :key="tip.id" class="card tip-card">
              <div class="tip-header">
                <div class="tip-icon">
                  <el-icon :size="20"><Star /></el-icon>
                </div>
                <div class="tip-info">
                  <h4>{{ tip.title }}</h4>
                  <div class="tip-meta">
                    <el-tag size="small" :type="getDifficultyType(tip.difficulty)">
                      {{ getDifficultyLabel(tip.difficulty) }}
                    </el-tag>
                    <span class="tip-category">{{ getCategoryLabel(tip.category) }}</span>
                  </div>
                </div>
              </div>
              <div class="tip-content">
                <p>{{ tip.content }}</p>
              </div>
            </div>
          </div>

          <div class="card empty-card" v-else>
            <el-icon><Star /></el-icon>
            <p>暂无使用技巧</p>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`推荐 Patch (${wikiData.recommendedPatches.length})`" name="recommended">
          <div class="grid-patches" v-if="wikiData.recommendedPatches.length > 0">
            <div
              v-for="rec in wikiData.recommendedPatches"
              :key="rec.id"
              class="card patch-card recommended-patch"
              @click="$router.push(`/patches/${rec.patch_id}`)"
            >
              <div class="recommend-badge">
                <el-icon><Star /></el-icon>
                <span>推荐</span>
              </div>
              <div class="patch-image">🎛️</div>
              <div class="patch-title">{{ rec.title }}</div>
              <div class="patch-meta">
                <span>by {{ rec.username }}</span>
                <span class="patch-likes">
                  <el-icon><Star /></el-icon>
                  {{ rec.likes_count || 0 }}
                </span>
              </div>
              <div class="recommend-reason" v-if="rec.reason">
                <span class="reason-label">推荐理由：</span>
                <span class="reason-text">{{ rec.reason }}</span>
              </div>
            </div>
          </div>
          <div class="card empty-card" v-else>
            <el-icon><Star /></el-icon>
            <p>暂无推荐 Patch</p>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`相关 Patch (${wikiData.patches.length})`" name="patches">
          <div class="grid-patches" v-if="wikiData.patches.length > 0">
            <div
              v-for="patch in wikiData.patches"
              :key="patch.id"
              class="card patch-card"
              @click="$router.push(`/patches/${patch.id}`)"
            >
              <div class="patch-image">🎛️</div>
              <div class="patch-title">{{ patch.title }}</div>
              <div class="patch-meta">
                <span>by {{ patch.username }}</span>
              </div>
            </div>
          </div>
          <div class="card empty-card" v-else>
            <el-icon><Document /></el-icon>
            <p>暂无相关 Patch</p>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`参数模板 (${parameterTemplates.length})`" name="templates">
          <div class="templates-header">
            <div class="templates-intro">
              <el-icon><MagicStick /></el-icon>
              <span>保存和复用参数配置，创建 Patch 时一键带入</span>
            </div>
            <el-button type="primary" @click="openCreateTemplate" v-if="currentUser">
              <el-icon><Plus /></el-icon>
              保存为模板
            </el-button>
          </div>

          <div class="templates-list" v-if="parameterTemplates.length > 0">
            <div
              v-for="tpl in parameterTemplates"
              :key="tpl.id"
              class="card template-card"
            >
              <div class="template-header">
                <div class="template-title-row">
                  <h4 class="template-name">{{ tpl.name }}</h4>
                  <el-tag v-if="tpl.is_default" type="warning" size="small">
                    <el-icon><Star /></el-icon> 默认
                  </el-tag>
                  <el-tag v-if="tpl.is_official" type="success" size="small">
                    <el-icon><Medal /></el-icon> 官方
                  </el-tag>
                  <el-tag v-else type="info" size="small">
                    {{ tpl.creator_name || '用户' }} 创建
                  </el-tag>
                </div>
                <div class="template-meta">
                  <span>使用次数：{{ tpl.use_count || 0 }}</span>
                  <span>{{ formatDate(tpl.created_at) }}</span>
                </div>
              </div>
              <p class="template-desc" v-if="tpl.description">{{ tpl.description }}</p>
              <div class="template-params-preview">
                <div class="preview-grid">
                  <div v-for="param in getTemplatePreviewParams(tpl)" :key="param.name" class="preview-item">
                    <span class="preview-key">{{ param.label || param.name }}</span>
                    <span class="preview-val">{{ formatModuleParamValue(param, tpl.parameter_values[param.name]) }}</span>
                  </div>
                </div>
              </div>
              <div class="template-actions">
                <el-button size="small" @click="viewTemplateParams(tpl)">
                  <el-icon><View /></el-icon> 查看详情
                </el-button>
                <el-button size="small" type="primary" @click="applyTemplateToPatch(tpl)">
                  <el-icon><Promotion /></el-icon> 用于创建 Patch
                </el-button>
                <el-dropdown v-if="!tpl.is_official || isAdmin" @command="(cmd) => handleTemplateAction(cmd, tpl)">
                  <el-button size="small">
                    <el-icon><MoreFilled /></el-icon> 操作
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="setDefault" v-if="!tpl.is_default">
                        设为默认
                      </el-dropdown-item>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided style="color: #f56c6c">
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
          <div class="card empty-card" v-else>
            <el-icon><MagicStick /></el-icon>
            <p>暂无参数模板</p>
            <el-button type="primary" size="small" @click="openCreateTemplate" style="margin-top: 12px;" v-if="currentUser">
              <el-icon><Plus /></el-icon> 保存第一个模板
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`搭配推荐 (${recommendedCombinations.length})`" name="combinations">
          <div v-if="recommendedCombinations.length > 0">
            <div class="combo-filter-bar">
              <span class="filter-label">筛选：</span>
              <el-tag
                v-for="t in combinationTypes"
                :key="t"
                :type="selectedComboType === t ? 'warning' : 'info'"
                class="filter-tag"
                @click="selectedComboType = selectedComboType === t ? '' : t"
              >
                {{ t }}
              </el-tag>
            </div>

            <div class="combo-grid">
              <div
                v-for="combo in filteredCombinations"
                :key="combo.paired_module_id"
                class="card combo-card"
              >
                <div class="combo-header">
                  <div class="combo-source" :class="combo.source">
                    <el-icon v-if="combo.source === 'manual'"><Star /></el-icon>
                    <el-icon v-else><TrendCharts /></el-icon>
                    <span>{{ combo.source === 'manual' ? '精选推荐' : '统计推荐' }}</span>
                  </div>
                  <div class="combo-confidence">
                    <el-progress
                      :percentage="Math.round((combo.confidence_score || 0) * 100)"
                      :stroke-width="8"
                      :show-text="false"
                      color="#ffd700"
                    />
                    <span class="confidence-text">匹配度 {{ Math.round((combo.confidence_score || 0) * 100) }}%</span>
                  </div>
                </div>

                <div class="combo-module" @click="$router.push(`/modules/${combo.paired_module_id}`)">
                  <span class="combo-type">{{ combo.paired_type }}</span>
                  <h4 class="combo-name">{{ combo.paired_name }}</h4>
                  <p class="combo-manu" v-if="combo.paired_manufacturer_name">
                    {{ combo.paired_manufacturer_name }}
                  </p>
                  <p class="combo-desc">{{ combo.paired_description }}</p>
                </div>

                <div class="combo-stats">
                  <span>共同出现 {{ combo.co_occurrence_count || 0 }} 次</span>
                  <span v-if="combo.avg_patch_likes">平均点赞 {{ combo.avg_patch_likes }}</span>
                </div>

                <div class="combo-reason" v-if="combo.reason">
                  <el-icon><InfoFilled /></el-icon>
                  <span>{{ combo.reason }}</span>
                </div>

                <div class="combo-samples" v-if="combo.sample_patches && combo.sample_patches.length > 0">
                  <div class="sample-title">示例 Patch：</div>
                  <div class="sample-list">
                    <div
                      v-for="sample in combo.sample_patches"
                      :key="sample.id"
                      class="sample-item"
                      @click="goToPatchesWithFilter(wikiData.module.id, combo.paired_module_id)"
                    >
                      <span class="sample-name">{{ sample.title }}</span>
                      <span class="sample-likes">
                        <el-icon><Star /></el-icon> {{ sample.likes_count || 0 }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="combo-actions">
                  <el-button size="small" @click="$router.push(`/modules/${combo.paired_module_id}`)">
                    查看模块
                  </el-button>
                  <el-button 
                    size="small" 
                    type="primary" 
                    @click="goToPatchesWithFilter(wikiData.module.id, combo.paired_module_id)"
                  >
                    查看 Patch
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div class="card empty-card" v-else>
            <el-icon><Connection /></el-icon>
            <p>暂无搭配推荐，更多 Patch 发布后将自动生成</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Warning /></el-icon>
      <p>模块不存在</p>
    </div>

    <el-dialog
      v-model="createTemplateDialogVisible"
      :title="editingTemplate ? '编辑参数模板' : '保存为参数模板'"
      width="640px"
    >
      <el-form :model="templateForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="templateForm.name" placeholder="给这个参数配置起个名字" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="模板说明">
          <el-input v-model="templateForm.description" type="textarea" :rows="2" placeholder="简要描述这个参数模板的特点" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="templateForm.is_default" />
          <div class="form-hint">设为默认后，创建 Patch 时选择此模块会优先使用该模板</div>
        </el-form-item>
        <el-divider content-position="left">参数配置</el-divider>
        <div class="template-form-params">
          <div v-if="moduleParams.length === 0" class="empty-params-tip">
            <el-icon><Setting /></el-icon>
            <p>该模块暂无参数定义</p>
          </div>
          <div v-else class="dynamic-param-grid">
            <div v-for="param in moduleParams" :key="param.id" class="dynamic-param-item">
              <el-form-item :label="param.label || param.name">
                <el-slider
                  v-if="param.type === 'knob' || param.type === 'slider'"
                  v-model="templateForm.parameter_values[param.name]"
                  :min="param.min_value !== null ? Number(param.min_value) : 0"
                  :max="param.max_value !== null ? Number(param.max_value) : 100"
                  :step="getParamStep(param)"
                  show-input
                />
                <el-select
                  v-else-if="param.type === 'select' || param.type === 'switch'"
                  v-model="templateForm.parameter_values[param.name]"
                  style="width: 100%"
                >
                  <el-option
                    v-for="opt in getParamOptions(param)"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
                <el-input-number
                  v-else
                  v-model="templateForm.parameter_values[param.name]"
                  :min="param.min_value !== null ? Number(param.min_value) : undefined"
                  :max="param.max_value !== null ? Number(param.max_value) : undefined"
                  :step="getParamStep(param)"
                  style="width: 100%"
                />
              </el-form-item>
              <div class="param-hint" v-if="param.unit || param.description">
                <span v-if="param.unit" class="param-unit">单位：{{ param.unit }}</span>
                <span v-if="param.description" class="param-desc">{{ param.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createTemplateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplateForm">
          {{ editingTemplate ? '保存修改' : '创建模板' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="viewTemplateDialogVisible"
      :title="`模板详情：${viewingTemplate?.name || ''}`"
      width="560px"
    >
      <div v-if="viewingTemplate" class="template-detail">
        <div class="detail-tags" style="margin-bottom: 16px;">
          <el-tag v-if="viewingTemplate.is_default" type="warning">
            <el-icon><Star /></el-icon> 默认模板
          </el-tag>
          <el-tag v-if="viewingTemplate.is_official" type="success">
            <el-icon><Medal /></el-icon> 官方模板
          </el-tag>
          <el-tag type="info">
            使用次数：{{ viewingTemplate.use_count || 0 }}
          </el-tag>
        </div>
        <p v-if="viewingTemplate.description" class="template-detail-desc">
          {{ viewingTemplate.description }}
        </p>
        <el-divider>参数配置详情</el-divider>
        <div class="detail-params-list">
          <div v-if="!viewingTemplate.parameter_values || Object.keys(viewingTemplate.parameter_values).length === 0" class="empty-detail">
            <p>暂无参数数据</p>
          </div>
          <div v-else class="detail-param-grid">
            <div v-for="param in moduleParams" :key="param.id" class="detail-param-item">
              <div class="detail-param-label">{{ param.label || param.name }}</div>
              <div class="detail-param-value">
                {{ formatModuleParamValue(param, viewingTemplate.parameter_values[param.name]) }}
                <span v-if="param.unit" class="detail-param-unit">{{ param.unit }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="viewTemplateDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Loading, ArrowLeft, Warning, Reading, InfoFilled, 
  Timer, Star, Suitcase, DocumentAdd, Setting,
  Document, TrendCharts, Connection, MagicStick, Plus,
  View, Promotion, MoreFilled, Medal
} from '@element-plus/icons-vue'
import { moduleAPI } from '@/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const wikiData = ref(null)
const activeTab = ref('overview')
const activeTipCategory = ref('all')
const recommendedCombinations = ref([])
const selectedComboType = ref('')
const parameterTemplates = ref([])
const templatesLoading = ref(false)
const createTemplateDialogVisible = ref(false)
const viewTemplateDialogVisible = ref(false)
const editingTemplate = ref(null)
const viewingTemplate = ref(null)

const currentUser = computed(() => {
  try {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  } catch { return null }
})

const isAdmin = computed(() => currentUser.value?.role === 'admin')

const moduleParams = computed(() => {
  return wikiData.value?.parameters || []
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  } catch { return '' }
}

const getParamStep = (param) => {
  if (param.step) return Number(param.step)
  const range = (Number(param.max_value) || 100) - (Number(param.min_value) || 0)
  if (range > 1000) return 1
  if (range > 10) return 0.1
  return 0.01
}

const getParamOptions = (param) => {
  if (param.options) {
    if (typeof param.options === 'string') {
      try { return JSON.parse(param.options) } catch { return [] }
    }
    return param.options
  }
  return [
    { label: '开启', value: 'on' },
    { label: '关闭', value: 'off' }
  ]
}

const formatModuleParamValue = (param, value) => {
  if (value === null || value === undefined) return '-'
  if (param.type === 'select' || param.type === 'switch') {
    const opts = getParamOptions(param)
    const opt = opts.find(o => o.value === value)
    return opt ? opt.label : value
  }
  if (typeof value === 'number') {
    return Math.round(value * 1000) / 1000
  }
  return String(value)
}

const getDefaultParamValue = (param) => {
  if (param.default_value !== null && param.default_value !== undefined && param.default_value !== '') {
    const num = Number(param.default_value)
    if (!isNaN(num)) return num
    return param.default_value
  }
  if (param.type === 'select' || param.type === 'switch') {
    const opts = getParamOptions(param)
    return opts[0]?.value || ''
  }
  const min = Number(param.min_value) || 0
  const max = Number(param.max_value) || 100
  return (min + max) / 2
}

const getTemplatePreviewParams = (tpl) => {
  if (!tpl?.parameter_values || !moduleParams.value.length) return []
  return moduleParams.value.slice(0, 4)
}

const getInitialTemplateParams = () => {
  const result = {}
  moduleParams.value.forEach(param => {
    result[param.name] = getDefaultParamValue(param)
  })
  return result
}

const fetchParameterTemplates = async () => {
  if (!wikiData.value?.module?.id) return
  try {
    templatesLoading.value = true
    const res = await moduleAPI.getParameterTemplates(wikiData.value.module.id)
    parameterTemplates.value = res.list || []
  } catch (e) {
    console.error(e)
  } finally {
    templatesLoading.value = false
  }
}

const templateForm = ref({
  name: '',
  description: '',
  is_default: false,
  parameter_values: {}
})

const openCreateTemplate = () => {
  editingTemplate.value = null
  templateForm.value = {
    name: '',
    description: '',
    is_default: false,
    parameter_values: getInitialTemplateParams()
  }
  createTemplateDialogVisible.value = true
}

const viewTemplateParams = (tpl) => {
  viewingTemplate.value = tpl
  viewTemplateDialogVisible.value = true
}

const applyTemplateToPatch = async (tpl) => {
  try {
    await moduleAPI.useTemplate(tpl.id)
    router.push({
      path: '/create-patch',
      query: {
        template_id: tpl.id,
        module_id: wikiData.value.module.id
      }
    })
  } catch (e) {
    console.error(e)
    ElMessage.error('操作失败')
  }
}

const submitTemplateForm = async () => {
  if (!templateForm.value.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  try {
    const moduleId = wikiData.value.module.id
    if (editingTemplate.value) {
      await moduleAPI.updateParameterTemplate(editingTemplate.value.id, templateForm.value)
      ElMessage.success('模板更新成功')
    } else {
      await moduleAPI.createParameterTemplate(moduleId, templateForm.value)
      ElMessage.success('模板创建成功')
    }
    createTemplateDialogVisible.value = false
    fetchParameterTemplates()
  } catch (e) {
    console.error(e)
    ElMessage.error(e.error || '操作失败')
  }
}

const handleTemplateAction = async (cmd, tpl) => {
  try {
    if (cmd === 'setDefault') {
      await moduleAPI.setDefaultTemplate(tpl.id)
      ElMessage.success('已设为默认')
      fetchParameterTemplates()
    } else if (cmd === 'edit') {
      editingTemplate.value = tpl
      const existingParams = tpl.parameter_values || {}
      const defaultParams = getInitialTemplateParams()
      templateForm.value = {
        name: tpl.name,
        description: tpl.description || '',
        is_default: !!tpl.is_default,
        parameter_values: { ...defaultParams, ...existingParams }
      }
      createTemplateDialogVisible.value = true
    } else if (cmd === 'delete') {
      await ElMessageBox.confirm(`确定要删除模板"${tpl.name}"吗？`, '删除确认', {
        type: 'warning'
      })
      await moduleAPI.deleteParameterTemplate(tpl.id)
      ElMessage.success('删除成功')
      fetchParameterTemplates()
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error(e.error || '操作失败')
    }
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'templates' && parameterTemplates.value.length === 0) {
    fetchParameterTemplates()
  }
})

const tipCategories = [
  { value: 'all', label: '全部' },
  { value: 'general', label: '通用' },
  { value: 'sound_design', label: '音色设计' },
  { value: 'performance', label: '演奏技巧' },
  { value: 'patch_tip', label: 'Patch 技巧' },
  { value: 'advanced', label: '进阶' }
]

const moduleSpecs = computed(() => {
  try {
    return JSON.parse(wikiData.value?.module?.specs) || {}
  } catch {
    return {}
  }
})

const hasWikiContent = computed(() => {
  const w = wikiData.value?.wiki
  if (!w) return false
  return w.overview || w.history || w.design_philosophy || w.notable_features || w.use_cases
})

const filteredTips = computed(() => {
  if (activeTipCategory.value === 'all') {
    return wikiData.value?.tips || []
  }
  return getTipsByCategory(activeTipCategory.value)
})

const getTipsByCategory = (category) => {
  return (wikiData.value?.tips || []).filter(t => t.category === category)
}

const getDifficultyLabel = (diff) => {
  const map = {
    beginner: '入门',
    intermediate: '中级',
    advanced: '进阶',
    expert: '专家'
  }
  return map[diff] || diff
}

const getDifficultyType = (diff) => {
  const map = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger',
    expert: 'info'
  }
  return map[diff] || 'info'
}

const getCategoryLabel = (cat) => {
  const map = {
    general: '通用',
    sound_design: '音色设计',
    performance: '演奏技巧',
    patch_tip: 'Patch 技巧',
    advanced: '进阶'
  }
  return map[cat] || cat
}

const combinationTypes = computed(() => {
  const types = new Set()
  recommendedCombinations.value.forEach(c => {
    if (c.paired_type) types.add(c.paired_type)
  })
  return [...types]
})

const filteredCombinations = computed(() => {
  if (!selectedComboType.value) return recommendedCombinations.value
  return recommendedCombinations.value.filter(c => c.paired_type === selectedComboType.value)
})

const goToPatchesWithFilter = (moduleId, pairedId) => {
  router.push({
    path: '/patches',
    query: { modules: `${moduleId},${pairedId}` }
  })
}

onMounted(async () => {
  try {
    const [wiki, combos] = await Promise.all([
      moduleAPI.getModuleWiki(route.params.id),
      moduleAPI.getRecommendedCombinations(route.params.id)
    ])
    wikiData.value = wiki
    recommendedCombinations.value = combos.list || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.wiki-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.1));
  color: #ffd700;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.wiki-tabs {
  margin-top: 24px;
}

.wiki-tabs :deep(.el-tabs__item) {
  color: rgba(255, 255, 255, 0.6);
}

.wiki-tabs :deep(.el-tabs__item.is-active) {
  color: #ffd700;
}

.wiki-tabs :deep(.el-tabs__active-bar) {
  background-color: #ffd700;
}

.wiki-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(255, 255, 255, 0.1);
}

.wiki-section {
  margin-bottom: 28px;
}

.wiki-section:last-child {
  margin-bottom: 0;
}

.wiki-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffd700;
  font-size: 18px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.wiki-section h3 .el-icon {
  color: #ffd700;
}

.wiki-content {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;
  font-size: 14px;
  white-space: pre-wrap;
}

.wiki-empty {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.wiki-empty .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.param-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.param-card:hover {
  border-color: rgba(255, 215, 0, 0.2);
  background: rgba(255, 215, 0, 0.02);
}

.param-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.param-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.param-main {
  flex: 1;
}

.param-name {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.param-details {
  padding-left: 48px;
}

.param-meta-row {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.param-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.meta-value {
  font-size: 14px;
  color: #ffd700;
  font-weight: 500;
}

.param-desc {
  margin-bottom: 12px;
}

.param-desc .desc-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  margin-bottom: 4px;
}

.param-desc p {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  font-size: 14px;
}

.param-tips {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(255, 215, 0, 0.1);
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 3px solid #ffd700;
}

.param-tips .el-icon {
  color: #ffd700;
  flex-shrink: 0;
  margin-top: 2px;
}

.tips-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  line-height: 1.6;
}

.tips-categories {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tip-card {
  transition: all 0.3s ease;
}

.tip-card:hover {
  transform: translateY(-2px);
}

.tip-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.tip-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.1));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffd700;
  flex-shrink: 0;
}

.tip-info {
  flex: 1;
}

.tip-info h4 {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tip-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tip-category {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.tip-content {
  padding-left: 60px;
}

.tip-content p {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  font-size: 14px;
}

.recommended-patch {
  position: relative;
}

.recommend-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  z-index: 1;
}

.recommend-reason {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 12px;
}

.reason-label {
  color: rgba(255, 255, 255, 0.5);
}

.reason-text {
  color: rgba(255, 215, 0, 0.8);
}

.patch-likes {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.5);
}

.patch-likes .el-icon {
  color: #ff6b6b;
}

.empty-card {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-card .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.combo-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.filter-tag {
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tag:hover {
  transform: translateY(-1px);
}

.combo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.combo-card {
  transition: all 0.3s ease;
}

.combo-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 215, 0, 0.3);
}

.combo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.combo-source {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.combo-source.manual {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.1));
  color: #ffd700;
}

.combo-source.stats {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}

.combo-confidence {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.combo-module {
  cursor: pointer;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.combo-module:hover {
  background: rgba(255, 215, 0, 0.05);
}

.combo-type {
  display: inline-block;
  font-size: 11px;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.combo-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
}

.combo-manu {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px 0;
}

.combo-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.combo-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.combo-reason {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: rgba(255, 215, 0, 0.08);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;
  line-height: 1.5;
}

.combo-reason .el-icon {
  color: #ffd700;
  flex-shrink: 0;
  margin-top: 2px;
}

.combo-samples {
  margin-bottom: 12px;
}

.sample-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.sample-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sample-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sample-item:hover {
  background: rgba(255, 215, 0, 0.08);
}

.sample-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.sample-likes {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.sample-likes .el-icon {
  color: #ff6b6b;
}

.combo-actions {
  display: flex;
  gap: 8px;
}

.combo-actions .el-button {
  flex: 1;
}

.templates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.templates-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 215, 0, 0.8);
  background: rgba(255, 215, 0, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
}

.templates-intro .el-icon {
  color: #ffd700;
}

.templates-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.template-card {
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 215, 0, 0.3);
}

.template-header {
  margin-bottom: 12px;
}

.template-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.template-name {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.template-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.template-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.template-params-preview {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.preview-key {
  color: rgba(255, 255, 255, 0.5);
}

.preview-val {
  color: #ffd700;
  font-weight: 500;
}

.template-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  flex-wrap: wrap;
}

.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.subparam-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
}

.subparam-card h5 {
  margin: 0 0 16px 0;
  color: #ffd700;
  font-size: 14px;
  font-weight: 600;
}

.empty-params-tip {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-params-tip .el-icon {
  font-size: 40px;
  margin-bottom: 10px;
  opacity: 0.3;
}

.dynamic-param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
}

.dynamic-param-item {
  background: rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  border-radius: 8px;
}

.dynamic-param-item .el-form-item {
  margin-bottom: 8px;
}

.param-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.param-unit {
  color: rgba(255, 215, 0, 0.6);
}

.detail-param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 20px;
}

.detail-param-grid .detail-param-item {
  background: rgba(0, 0, 0, 0.15);
  padding: 10px 14px;
  border-radius: 8px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-param-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.detail-param-value {
  font-size: 15px;
  font-weight: 600;
  color: #ffd700;
}

.detail-param-unit {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;
  font-weight: normal;
}

.empty-detail {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
}

.template-detail-desc {
  background: rgba(255, 215, 0, 0.08);
  padding: 12px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  font-size: 13px;
  margin: 0;
}

.detail-param-section {
  margin-bottom: 20px;
}

.detail-param-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  padding-left: 10px;
  border-left: 3px solid #ffd700;
  color: #ffd700;
  font-size: 14px;
  font-weight: 600;
}

.param-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  margin-bottom: 6px;
}

.detail-param-item {
  background: rgba(0, 0, 0, 0.1);
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}
</style>
