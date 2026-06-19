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
          <el-select
            v-model="form.modules_used"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option v-for="mod in moduleList" :key="mod.id" :label="mod.name" :value="mod.id" />
          </el-select>
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

        <el-form-item>
          <el-button type="primary" size="large" class="btn-primary" @click="submit" :loading="saving">
            保存修改
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { moduleAPI } from '@/api'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()

const formRef = ref()
const loading = ref(true)
const saving = ref(false)
const moduleList = ref([])

const commonTags = ['bass', 'pad', 'lead', 'drums', 'ambient', 'techno', 'house', 'experimental', 'classic', 'modern']

const form = reactive({
  title: '',
  description: '',
  tags: [],
  modules_used: [],
  audio_url: '',
  patch_file: '',
  is_public: true,
  parameters: {
    oscillators: [{ type: 'saw', detune: 0, octave: 0 }],
    filter: { cutoff: 5000, resonance: 0.3, envAmount: 0.5 },
    envelope: { attack: 10, decay: 200, sustain: 0.7, release: 500 },
    lfo: { rate: 4, depth: 20, wave: 'sine' }
  }
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
}

onMounted(async () => {
  try {
    const [patchData, modules] = await Promise.all([
      patchStore.fetchPatchDetail(route.params.id),
      moduleAPI.getModules({ limit: 100 })
    ])

    moduleList.value = modules.list
    form.title = patchData.title
    form.description = patchData.description || ''
    form.tags = JSON.parse(patchData.tags || '[]')
    form.modules_used = JSON.parse(patchData.modules_used || '[]')
    form.audio_url = patchData.audio_url || ''
    form.patch_file = patchData.patch_file || ''
    form.is_public = patchData.is_public ? true : false

    if (patchData.parameters) {
      const params = JSON.parse(patchData.parameters)
      if (params.oscillators) form.parameters.oscillators = params.oscillators
      if (params.filter) form.parameters.filter = params.filter
      if (params.envelope) form.parameters.envelope = params.envelope
      if (params.lfo) form.parameters.lfo = params.lfo
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
    await patchStore.updatePatch(route.params.id, form)
    ElMessage.success('保存成功！')
    router.push(`/patches/${route.params.id}`)
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  } finally {
    saving.value = false
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
</style>
