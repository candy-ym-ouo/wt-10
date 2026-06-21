<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">✏️ 编辑 Patch</h1>
      <p class="page-subtitle">修改你的 Patch 信息</p>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else class="card">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-form-item label="使用模块">
          <div class="modules-input-wrapper">
            <el-select
              v-model="form.modules_used"
              multiple
              filterable
              placeholder="选择使用的模块"
              style="width: 100%"
              @change="onModulesChange"
            >
              <el-option v-for="mod in moduleList" :key="mod.id" :label="mod.name" :value="mod.id" />
            </el-select>
            <el-dropdown
              class="template-apply-dropdown"
              @command="applyTemplateForModule"
              :disabled="form.modules_used.length === 0"
              trigger="click"
            >
              <el-button type="warning">
                <el-icon><MagicStick /></el-icon>
                应用模板
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="modId in form.modules_used"
                    :key="modId"
                    :disabled="!moduleTemplates[modId] || moduleTemplates[modId].length === 0"
                  >
                    <span class="dd-mod-name">{{ getModuleName(modId) }}</span>
                    <el-dropdown
                      @command="(tid) => applyTemplateForModule({ moduleId: modId, templateId: tid })"
                      trigger="hover"
                      :disabled="!moduleTemplates[modId] || moduleTemplates[modId].length === 0"
                    >
                      <span class="dd-template-hint">选择模板 →</span>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item
                            v-for="tpl in moduleTemplates[modId] || []"
                            :key="tpl.id"
                            :command="tpl.id"
                          >
                            <div class="dd-tpl-item">
                              <span class="dd-tpl-name">
                                <el-icon v-if="tpl.is_default" style="color: #e6a23c"><Star /></el-icon>
                                {{ tpl.name }}
                              </span>
                              <span class="dd-tpl-tag" v-if="tpl.is_official">官方</span>
                              <span class="dd-tpl-tag" v-else>自定义</span>
                            </div>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </el-dropdown-item>
                  <el-dropdown-item divided command="apply-all-defaults" v-if="hasAnyDefaultTemplate">
                    <el-icon><Promotion /></el-icon>
                    一键应用全部默认模板
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="applied-templates-tip" v-if="appliedTemplateNames.length > 0">
            <el-icon style="color: #67c23a"><CircleCheck /></el-icon>
            <span>已应用模板：{{ appliedTemplateNames.join('、') }}</span>
            <el-button text size="small" type="danger" @click="clearAppliedTemplates">
              清除
            </el-button>
          </div>
        </el-form-item>

        <el-divider content-position="left">🎚️ 参数设置</el-divider>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-card class="param-card">
              <template #header>🎹 振荡器</template>
              <el-form-item label="波形">
                <el-select v-model="form.parameters.oscillators[0].type">
                  <el-option label="锯齿波" value="saw" />
                  <el-option label="方波" value="square" />
                  <el-option label="三角波" value="triangle" />
                  <el-option label="正弦波" value="sine" />
                </el-select>
              </el-form-item>
              <el-form-item label="失谐">
                <el-slider v-model="form.parameters.oscillators[0].detune" :min="-50" :max="50" show-input />
              </el-form-item>
              <el-form-item label="八度">
                <el-slider v-model="form.parameters.oscillators[0].octave" :min="-3" :max="3" show-input />
              </el-form-item>
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card class="param-card">
              <template #header>🔍 滤波器</template>
              <el-form-item label="截止频率">
                <el-slider v-model="form.parameters.filter.cutoff" :min="20" :max="20000" show-input />
              </el-form-item>
              <el-form-item label="共振">
                <el-slider v-model="form.parameters.filter.resonance" :min="0" :max="1" :step="0.1" show-input />
              </el-form-item>
              <el-form-item label="包络量">
                <el-slider v-model="form.parameters.filter.envAmount" :min="0" :max="1" :step="0.1" show-input />
              </el-form-item>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="24" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="param-card">
              <template #header>📈 包络线</template>
              <el-form-item label="起音 (ms)">
                <el-slider v-model="form.parameters.envelope.attack" :min="0" :max="2000" show-input />
              </el-form-item>
              <el-form-item label="衰减 (ms)">
                <el-slider v-model="form.parameters.envelope.decay" :min="0" :max="5000" show-input />
              </el-form-item>
              <el-form-item label="持续">
                <el-slider v-model="form.parameters.envelope.sustain" :min="0" :max="1" :step="0.1" show-input />
              </el-form-item>
              <el-form-item label="释放 (ms)">
                <el-slider v-model="form.parameters.envelope.release" :min="0" :max="10000" show-input />
              </el-form-item>
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card class="param-card">
              <template #header>〰️ LFO</template>
              <el-form-item label="频率 (Hz)">
                <el-slider v-model="form.parameters.lfo.rate" :min="0.1" :max="20" :step="0.1" show-input />
              </el-form-item>
              <el-form-item label="深度">
                <el-slider v-model="form.parameters.lfo.depth" :min="0" :max="100" show-input />
              </el-form-item>
              <el-form-item label="波形">
                <el-select v-model="form.parameters.lfo.wave">
                  <el-option label="正弦" value="sine" />
                  <el-option label="三角" value="triangle" />
                  <el-option label="方波" value="square" />
                  <el-option label="随机" value="random" />
                </el-select>
              </el-form-item>
            </el-card>
          </el-col>
        </el-row>

        <el-divider content-position="left">🔗 附加资源</el-divider>

        <el-form-item label="音频链接">
          <el-input v-model="form.audio_url" />
        </el-form-item>

        <el-form-item label="Patch 文件">
          <el-input v-model="form.patch_file" />
        </el-form-item>

        <el-form-item label="公开">
          <el-switch v-model="form.is_public" active-text="公开" inactive-text="私有" />
        </el-form-item>

        <el-divider content-position="left">💰 付费设置</el-divider>

        <el-form-item label="付费内容">
          <el-switch v-model="form.is_paid" active-text="开启" inactive-text="关闭" />
          <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 8px;">
            开启后，您可以设置价格，用户购买后才能查看完整内容
          </div>
        </el-form-item>

        <template v-if="form.is_paid">
          <el-form-item label="售价" prop="price">
            <el-input-number 
              v-model="form.price" 
              :min="0" 
              :precision="2"
              style="width: 100%; max-width: 300px;"
            />
          </el-form-item>
          <el-form-item label="预览内容">
            <el-input 
              v-model="form.preview_content" 
              type="textarea" 
              :rows="3" 
              placeholder="输入部分预览内容，吸引用户购买完整内容"
            />
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 8px;">
              这部分内容对所有用户可见，用于展示内容价值
            </div>
          </el-form-item>
        </template>

        <el-divider content-position="left">⏰ 发布设置</el-divider>

        <el-form-item label="定时发布">
          <el-switch v-model="useScheduled" active-text="开启" inactive-text="关闭" />
          <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 8px;">
            开启后，可设置指定时间自动发布 Patch
          </div>
        </el-form-item>

        <el-form-item v-if="useScheduled" label="发布时间" prop="scheduled_at">
          <el-date-picker
            v-model="form.scheduled_at"
            type="datetime"
            placeholder="选择发布时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="disabledDate"
            style="width: 100%; max-width: 300px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button size="large" @click="saveDraft" :loading="savingDraft" v-if="patchStatus !== 'approved'">
            💾 保存为草稿
          </el-button>
          <el-button 
            v-if="useScheduled" 
            type="warning" 
            size="large" 
            @click="schedulePublish" 
            :loading="scheduling"
          >
            ⏰ 定时发布
          </el-button>
          <el-button 
            type="primary" 
            size="large" 
            class="btn-primary" 
            @click="submit" 
            :loading="saving"
          >
            💾 保存并发布
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="card" style="margin-top: 24px;">
      <PatchVersionHistory
        ref="versionHistoryRef"
        :patch-id="route.params.id"
        :can-rollback="true"
        :page-size="5"
        @rollback="onVersionRollback"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { 
  MagicStick, ArrowDown, Star, Promotion, CircleCheck 
} from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { moduleAPI } from '@/api'
import PatchVersionHistory from '@/components/PatchVersionHistory.vue'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()

const formRef = ref()
const loading = ref(true)
const saving = ref(false)
const savingDraft = ref(false)
const scheduling = ref(false)
const moduleList = ref([])
const useScheduled = ref(false)
const patchStatus = ref('')
const versionHistoryRef = ref(null)
const moduleTemplates = ref({})
const appliedTemplates = ref({})

const appliedTemplateNames = computed(() => {
  return Object.values(appliedTemplates.value).map(t => t.name).filter(Boolean)
})

const hasAnyDefaultTemplate = computed(() => {
  return form.modules_used.some(modId => {
    const tpls = moduleTemplates.value[modId] || []
    return tpls.some(t => t.is_default)
  })
})

const getModuleName = (modId) => {
  const mod = moduleList.value.find(m => m.id === modId)
  return mod ? mod.name : `模块 #${modId}`
}

const fetchTemplatesForModules = async (moduleIds) => {
  if (!moduleIds || moduleIds.length === 0) {
    moduleTemplates.value = {}
    return
  }
  try {
    const res = await moduleAPI.getBatchParameterTemplates(moduleIds)
    moduleTemplates.value = res.templates || {}
  } catch (e) {
    console.error('获取模块模板失败:', e)
  }
}

const onModulesChange = (newModules) => {
  fetchTemplatesForModules(newModules)
  Object.keys(appliedTemplates.value).forEach(modId => {
    if (!newModules.includes(parseInt(modId))) {
      delete appliedTemplates.value[modId]
    }
  })
}

const deepMergeParams = (target, source) => {
  if (!source || typeof source !== 'object') return target
  const result = { ...target }
  for (const [key, val] of Object.entries(source)) {
    if (Array.isArray(val)) {
      result[key] = JSON.parse(JSON.stringify(val))
    } else if (val && typeof val === 'object') {
      result[key] = deepMergeParams(result[key] || {}, val)
    } else {
      result[key] = val
    }
  }
  return result
}

const applyTemplateParams = (template) => {
  if (!template || !template.parameter_values) return
  const existingParams = JSON.parse(JSON.stringify(form.parameters || {}))
  form.parameters = deepMergeParams(existingParams, template.parameter_values)
}

const applyTemplateForModule = async (command) => {
  if (command === 'apply-all-defaults') {
    for (const modId of form.modules_used) {
      const defaultTpl = (moduleTemplates.value[modId] || []).find(t => t.is_default)
      if (defaultTpl) {
        try {
          await moduleAPI.useTemplate(defaultTpl.id)
          applyTemplateParams(defaultTpl)
          appliedTemplates.value[modId] = defaultTpl
        } catch (e) { console.error(e) }
      }
    }
    if (appliedTemplateNames.value.length > 0) {
      ElMessage.success(`已应用 ${appliedTemplateNames.value.length} 个默认模板`)
    } else {
      ElMessage.info('没有找到默认模板')
    }
    return
  }

  if (command && command.moduleId && command.templateId) {
    const { moduleId, templateId } = command
    const tpl = (moduleTemplates.value[moduleId] || []).find(t => t.id === templateId)
    if (!tpl) return
    try {
      await moduleAPI.useTemplate(templateId)
      applyTemplateParams(tpl)
      appliedTemplates.value[moduleId] = tpl
      ElMessage.success(`已应用模板：${tpl.name}`)
    } catch (e) {
      console.error(e)
      ElMessage.error('应用模板失败')
    }
  }
}

const clearAppliedTemplates = () => {
  appliedTemplates.value = {}
  ElMessage.info('已清除模板记录（参数不会被回退）')
}

const commonTags = ['bass', 'pad', 'lead', 'drums', 'ambient', 'techno', 'house', 'experimental', 'classic', 'modern']

const form = reactive({
  title: '',
  description: '',
  tags: [],
  modules_used: [],
  audio_url: '',
  patch_file: '',
  is_public: true,
  is_paid: false,
  price: 0,
  preview_content: '',
  scheduled_at: null,
  parameters: {
    oscillators: [{ type: 'saw', detune: 0, octave: 0 }],
    filter: { cutoff: 5000, resonance: 0.3, envAmount: 0.5 },
    envelope: { attack: 10, decay: 200, sustain: 0.7, release: 500 },
    lfo: { rate: 4, depth: 20, wave: 'sine' }
  }
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  price: [
    { 
      validator: (rule, value, callback) => {
        if (form.is_paid && (!value || value <= 0)) {
          callback(new Error('请输入有效的价格'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  scheduled_at: [
    {
      validator: (rule, value, callback) => {
        if (useScheduled.value && !value) {
          callback(new Error('请选择发布时间'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7
}

onMounted(async () => {
  try {
    const [patchData, modules] = await Promise.all([
      patchStore.fetchPatchDetail(route.params.id),
      moduleAPI.getModules({ limit: 100 })
    ])

    moduleList.value = modules.list
    patchStatus.value = patchData.status || ''
    form.title = patchData.title
    form.description = patchData.description || ''
    form.tags = JSON.parse(patchData.tags || '[]')
    form.modules_used = JSON.parse(patchData.modules_used || '[]')
    form.audio_url = patchData.audio_url || ''
    form.patch_file = patchData.patch_file || ''
    form.is_public = patchData.is_public ? true : false
    form.is_paid = patchData.is_paid ? true : false
    form.price = patchData.price || 0
    form.preview_content = patchData.preview_content || ''
    form.scheduled_at = patchData.scheduled_at || null
    if (patchData.status === 'scheduled') {
      useScheduled.value = true
    }

    if (patchData.parameters) {
      const params = JSON.parse(patchData.parameters)
      if (params.oscillators) form.parameters.oscillators = params.oscillators
      if (params.filter) form.parameters.filter = params.filter
      if (params.envelope) form.parameters.envelope = params.envelope
      if (params.lfo) form.parameters.lfo = params.lfo
    }

    if (form.modules_used.length > 0) {
      fetchTemplatesForModules(form.modules_used)
    }
  } catch (e) {
    ElMessage.error('加载失败')
    router.push('/my-patches')
  } finally {
    loading.value = false
  }
})

const submit = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    const data = { ...form, status: 'approved' }
    await patchStore.updatePatch(route.params.id, data)
    ElMessage.success('保存并发布成功！')
    router.push(`/patches/${route.params.id}`)
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const saveDraft = async () => {
  try {
    if (!form.title.trim()) {
      ElMessage.warning('请至少填写标题')
      return
    }
    savingDraft.value = true
    const data = { ...form, status: 'draft' }
    await patchStore.updatePatch(route.params.id, data)
    ElMessage.success('草稿保存成功！')
    router.push('/my-patches?tab=draft')
  } catch (e) {
    ElMessage.error(e.error || '保存草稿失败')
  } finally {
    savingDraft.value = false
  }
}

const schedulePublish = async () => {
  try {
    await formRef.value.validate()
    if (!form.scheduled_at) {
      ElMessage.warning('请选择发布时间')
      return
    }
    scheduling.value = true
    const data = { ...form, status: 'scheduled', scheduled_at: form.scheduled_at }
    await patchStore.updatePatch(route.params.id, data)
    ElMessage.success('定时发布设置成功！')
    router.push('/my-patches?tab=scheduled')
  } catch (e) {
    ElMessage.error(e.error || '设置定时发布失败')
  } finally {
    scheduling.value = false
  }
}

const onVersionRollback = async ({ version }) => {
  try {
    const patchData = await patchStore.fetchPatchDetail(route.params.id)
    patchStatus.value = patchData.status || ''
    form.title = patchData.title
    form.description = patchData.description || ''
    form.tags = JSON.parse(patchData.tags || '[]')
    form.modules_used = JSON.parse(patchData.modules_used || '[]')
    form.audio_url = patchData.audio_url || ''
    form.patch_file = patchData.patch_file || ''
    form.is_public = patchData.is_public ? true : false
    form.is_paid = patchData.is_paid ? true : false
    form.price = patchData.price || 0
    form.preview_content = patchData.preview_content || ''
    form.scheduled_at = patchData.scheduled_at || null
    if (patchData.status === 'scheduled') {
      useScheduled.value = true
    }

    if (patchData.parameters) {
      const params = JSON.parse(patchData.parameters)
      if (params.oscillators) form.parameters.oscillators = params.oscillators
      if (params.filter) form.parameters.filter = params.filter
      if (params.envelope) form.parameters.envelope = params.envelope
      if (params.lfo) form.parameters.lfo = params.lfo
    }

    ElMessage.success(`已回滚到版本 v${version.version}，表单数据已更新`)
  } catch (err) {
    console.error('刷新表单数据失败:', err)
  }
}
</script>

<style scoped>
.param-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.param-card :deep(.el-card__header) {
  background: rgba(255, 215, 0, 0.1);
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  color: #ffd700;
  font-weight: 600;
}

:deep(.el-divider__text) {
  background: transparent;
  color: #ffd700;
  font-weight: 600;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}

.modules-input-wrapper {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.modules-input-wrapper .el-select {
  flex: 1;
}

.template-apply-dropdown {
  flex-shrink: 0;
}

.applied-templates-tip {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  flex-wrap: wrap;
}

.applied-templates-tip .el-button {
  margin-left: auto;
}

.dd-mod-name {
  font-weight: 600;
  color: #ffd700;
  margin-right: 16px;
}

.dd-template-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  font-weight: normal;
}

.dd-tpl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dd-tpl-name {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.dd-tpl-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
}
</style>
