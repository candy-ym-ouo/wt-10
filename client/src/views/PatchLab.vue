<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🧪 补丁实验室</h1>
      <p class="page-subtitle">参数试验记录 · A/B 对比 · 结果备注</p>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">总实验</span>
      </div>
      <div class="stat-item">
        <span class="stat-value stat-draft">{{ stats.draft }}</span>
        <span class="stat-label">进行中</span>
      </div>
      <div class="stat-item">
        <span class="stat-value stat-done">{{ stats.completed }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <el-button type="primary" class="btn-primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建实验
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索实验名称或描述"
        clearable
        class="search-input"
        @keyup.enter="fetchExperiments"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchExperiments">
        <el-option label="全部" value="" />
        <el-option label="进行中" value="draft" />
        <el-option label="已完成" value="completed" />
      </el-select>
      <el-button type="primary" @click="fetchExperiments">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div v-if="!currentExperiment" class="experiment-list">
      <div v-if="experiments.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Cpu /></el-icon>
        <p>还没有实验记录</p>
        <div class="empty-actions">
          <el-button type="primary" class="btn-primary" @click="quickStart">
            <el-icon><Lightning /></el-icon>
            快速开始（预置 A/B 方案）
          </el-button>
          <el-button @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            手动创建
          </el-button>
        </div>
      </div>

      <div v-for="exp in experiments" :key="exp.id" class="experiment-card" @click="openExperiment(exp)">
        <div class="exp-header">
          <h3 class="exp-name">{{ exp.name }}</h3>
          <el-tag :type="exp.status === 'completed' ? 'success' : 'warning'" size="small">
            {{ exp.status === 'completed' ? '已完成' : '进行中' }}
          </el-tag>
        </div>
        <p class="exp-desc">{{ exp.description || '暂无描述' }}</p>
        <div class="exp-meta">
          <span v-if="exp.patch_title" class="exp-patch">🎹 {{ exp.patch_title }}</span>
          <span class="exp-snapshots">📸 {{ exp.snapshot_count }} 个快照</span>
          <span class="exp-time">{{ formatDate(exp.updated_at) }}</span>
        </div>
      </div>

      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchExperiments"
        class="pagination"
      />
    </div>

    <div v-else class="experiment-detail">
      <div class="detail-header">
        <el-button @click="closeExperiment">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <div class="detail-title-row">
          <h2 class="detail-title">{{ currentExperiment.name }}</h2>
          <el-tag :type="currentExperiment.status === 'completed' ? 'success' : 'warning'" size="small">
            {{ currentExperiment.status === 'completed' ? '已完成' : '进行中' }}
          </el-tag>
        </div>
        <p v-if="currentExperiment.description" class="detail-desc">{{ currentExperiment.description }}</p>
        <p v-if="currentExperiment.patch_title" class="detail-patch-ref">关联 Patch: 🎹 {{ currentExperiment.patch_title }}</p>
      </div>

      <el-divider content-position="left">📸 参数快照 (A/B 对比)</el-divider>

      <div class="snapshots-section">
        <div class="snapshots-grid">
          <div v-for="snap in currentExperiment.snapshots" :key="snap.id" class="snapshot-card" :class="{ preferred: currentExperiment.result?.preferred_snapshot_id === snap.id }">
            <div class="snap-header">
              <span class="snap-label">{{ snap.label }}</span>
              <el-dropdown trigger="click" @command="(cmd) => handleSnapshotCommand(cmd, snap)">
                <el-button size="small" text>
                  <el-icon><More /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" style="color: #f56c6c;">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div v-if="currentExperiment.result?.preferred_snapshot_id === snap.id" class="preferred-badge">⭐ 首选</div>
            <div class="snap-params">
              <div v-for="(value, key) in snap.parameters" :key="key" class="param-row">
                <span class="param-key">{{ paramLabels[key] || key }}</span>
                <span class="param-val">{{ formatParamValue(value) }}</span>
              </div>
              <div v-if="!snap.parameters || Object.keys(snap.parameters).length === 0" class="no-params">暂无参数</div>
            </div>
            <div v-if="snap.notes" class="snap-notes">{{ snap.notes }}</div>
          </div>

          <div class="snapshot-card add-snapshot" @click="openSnapshotDialog">
            <el-icon class="add-icon"><Plus /></el-icon>
            <span>添加快照</span>
          </div>
        </div>
      </div>

      <el-divider content-position="left">📊 A/B 对比视图</el-divider>

      <div v-if="currentExperiment.snapshots.length >= 2" class="compare-view">
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>参数</th>
                <th v-for="snap in currentExperiment.snapshots" :key="snap.id">{{ snap.label }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="allParamKeys.length > 0">
                <tr v-for="key in allParamKeys" :key="key">
                  <td class="param-name-col">{{ paramLabels[key] || key }}</td>
                  <td v-for="snap in currentExperiment.snapshots" :key="snap.id" class="param-val-col">
                    <template v-if="snap.parameters[key] !== undefined">
                      <span v-if="typeof snap.parameters[key] === 'object'">{{ JSON.stringify(snap.parameters[key]) }}</span>
                      <span v-else>{{ snap.parameters[key] }}</span>
                    </template>
                    <span v-else class="missing">-</span>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td colspan="99" class="empty-compare">暂无参数数据可对比</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="compare-hint">至少需要 2 个快照才能进行 A/B 对比</div>

      <el-divider content-position="left">📝 实验结果与备注</el-divider>

      <div class="result-section">
        <el-form :model="resultForm" label-width="100px">
          <el-form-item label="首选方案">
            <el-select v-model="resultForm.preferred_snapshot_id" placeholder="选择首选快照" clearable style="width: 100%; max-width: 400px;">
              <el-option
                v-for="snap in currentExperiment.snapshots"
                :key="snap.id"
                :label="snap.label"
                :value="snap.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="评分">
            <el-rate v-model="resultForm.rating" :max="5" />
          </el-form-item>
          <el-form-item label="结果备注">
            <el-input
              v-model="resultForm.result_notes"
              type="textarea"
              :rows="4"
              placeholder="记录你的实验结论、参数偏好、声音特点等..."
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveResult" :loading="savingResult">保存结果</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-divider content-position="left">⚙️ 实验操作</el-divider>

      <div class="detail-actions">
        <el-button @click="openEditDialog(currentExperiment)">
          <el-icon><Edit /></el-icon>
          编辑实验
        </el-button>
        <el-button type="danger" @click="deleteExperiment(currentExperiment)">
          <el-icon><Delete /></el-icon>
          删除实验
        </el-button>
      </div>
    </div>

    <el-dialog v-model="createDialogVisible" :title="editingExperiment ? '编辑实验' : '新建实验'" width="500px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="实验名称" prop="name">
          <el-input v-model="createForm.name" placeholder="如：Bass 音色调试" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="描述实验目的或关注点" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="关联 Patch">
          <el-input v-model="createForm.patch_id" placeholder="输入 Patch ID（可选）" />
        </el-form-item>
        <el-form-item v-if="!editingExperiment" label="预置方案">
          <el-switch v-model="createForm.create_default_snapshots" active-text="自动创建 A/B 对比方案" />
          <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;">
            开启后将自动创建「方案 A」和「方案 B」两个快照，可直接开始对比
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="snapshotDialogVisible" :title="editingSnapshot ? '编辑快照' : '添加参数快照'" width="600px">
      <el-form :model="snapshotForm" :rules="snapshotRules" ref="snapshotFormRef" label-width="100px">
        <el-form-item label="标签" prop="label">
          <el-input v-model="snapshotForm.label" placeholder="如：方案 A、温暖版、激进版" maxlength="20" />
        </el-form-item>
        <el-form-item label="振荡器">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-select v-model="snapshotForm.parameters.osc_type" placeholder="波形" style="width: 100%">
                <el-option label="锯齿波" value="saw" />
                <el-option label="方波" value="square" />
                <el-option label="三角波" value="triangle" />
                <el-option label="正弦波" value="sine" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.osc_detune" :min="-50" :max="50" placeholder="失谐" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.osc_octave" :min="-3" :max="3" placeholder="八度" style="width: 100%" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="滤波器">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.filter_cutoff" :min="20" :max="20000" placeholder="截止频率" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.filter_resonance" :min="0" :max="1" :step="0.1" :precision="1" placeholder="共振" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.filter_env" :min="0" :max="1" :step="0.1" :precision="1" placeholder="包络量" style="width: 100%" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="包络线">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-input-number v-model="snapshotForm.parameters.env_attack" :min="0" :max="2000" placeholder="起音" style="width: 100%" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="snapshotForm.parameters.env_decay" :min="0" :max="5000" placeholder="衰减" style="width: 100%" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="snapshotForm.parameters.env_sustain" :min="0" :max="1" :step="0.1" :precision="1" placeholder="持续" style="width: 100%" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="snapshotForm.parameters.env_release" :min="0" :max="10000" placeholder="释放" style="width: 100%" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="LFO">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.lfo_rate" :min="0.1" :max="20" :step="0.1" :precision="1" placeholder="频率" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="snapshotForm.parameters.lfo_depth" :min="0" :max="100" placeholder="深度" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-select v-model="snapshotForm.parameters.lfo_wave" placeholder="波形" style="width: 100%">
                <el-option label="正弦" value="sine" />
                <el-option label="三角" value="triangle" />
                <el-option label="方波" value="square" />
                <el-option label="随机" value="random" />
              </el-select>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="snapshotForm.notes" type="textarea" :rows="2" placeholder="记录此参数方案的特点" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="snapshotDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSnapshot" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Search, ArrowLeft, Edit, Delete, More, Cpu, Lightning
} from '@element-plus/icons-vue'
import { patchLabAPI } from '@/api'

const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = 12
const total = ref(0)
const experiments = ref([])
const stats = ref({ total: 0, draft: 0, completed: 0 })

const currentExperiment = ref(null)
const savingResult = ref(false)
const submitting = ref(false)

const createDialogVisible = ref(false)
const editingExperiment = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  name: '',
  description: '',
  patch_id: '',
  create_default_snapshots: true
})
const createRules = {
  name: [{ required: true, message: '请输入实验名称', trigger: 'blur' }]
}

const snapshotDialogVisible = ref(false)
const editingSnapshot = ref(null)
const snapshotFormRef = ref(null)
const snapshotForm = reactive({
  label: '',
  parameters: {
    osc_type: 'saw',
    osc_detune: 0,
    osc_octave: 0,
    filter_cutoff: 5000,
    filter_resonance: 0.3,
    filter_env: 0.5,
    env_attack: 10,
    env_decay: 200,
    env_sustain: 0.7,
    env_release: 500,
    lfo_rate: 4,
    lfo_depth: 20,
    lfo_wave: 'sine'
  },
  notes: ''
})
const snapshotRules = {
  label: [{ required: true, message: '请输入快照标签', trigger: 'blur' }]
}

const resultForm = reactive({
  preferred_snapshot_id: null,
  rating: 0,
  result_notes: ''
})

const paramLabels = {
  osc_type: '波形',
  osc_detune: '失谐',
  osc_octave: '八度',
  filter_cutoff: '截止频率',
  filter_resonance: '共振',
  filter_env: '包络量',
  env_attack: '起音(ms)',
  env_decay: '衰减(ms)',
  env_sustain: '持续',
  env_release: '释放(ms)',
  lfo_rate: 'LFO频率',
  lfo_depth: 'LFO深度',
  lfo_wave: 'LFO波形'
}

const allParamKeys = computed(() => {
  if (!currentExperiment.value?.snapshots?.length) return []
  const keySet = new Set()
  currentExperiment.value.snapshots.forEach(s => {
    if (s.parameters && typeof s.parameters === 'object') {
      Object.keys(s.parameters).forEach(k => keySet.add(k))
    }
  })
  return [...keySet]
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

const formatParamValue = (v) => {
  if (typeof v === 'object') return JSON.stringify(v)
  return v ?? '-'
}

const fetchStats = async () => {
  try {
    const res = await patchLabAPI.getStats()
    stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const fetchExperiments = async () => {
  try {
    const res = await patchLabAPI.getMyExperiments({
      page: page.value,
      limit: pageSize,
      keyword: keyword.value,
      status: statusFilter.value
    })
    experiments.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error('获取实验列表失败')
  }
}

const openCreateDialog = () => {
  editingExperiment.value = false
  Object.assign(createForm, {
    name: '',
    description: '',
    patch_id: '',
    create_default_snapshots: true
  })
  createDialogVisible.value = true
}

const quickStart = async () => {
  try {
    submitting.value = true
    const payload = {
      name: '我的第一个实验',
      description: 'A/B 参数对比试验',
      create_default_snapshots: true
    }
    const res = await patchLabAPI.create(payload)
    ElMessage.success('实验创建成功，已预置 A/B 方案')
    createDialogVisible.value = false
    await fetchExperiments()
    await fetchStats()
    await openExperiment({ id: res.id })
  } catch (e) {
    if (e !== false) {
      ElMessage.error(e.error || '创建失败')
    }
  } finally {
    submitting.value = false
  }
}

const openEditDialog = (exp) => {
  editingExperiment.value = true
  Object.assign(createForm, {
    id: exp.id,
    name: exp.name,
    description: exp.description || '',
    patch_id: exp.patch_id || ''
  })
  createDialogVisible.value = true
}

const submitCreate = async () => {
  if (!createFormRef.value) return
  try {
    await createFormRef.value.validate()
    submitting.value = true

    const payload = {
      name: createForm.name,
      description: createForm.description,
      patch_id: createForm.patch_id ? parseInt(createForm.patch_id) : null
    }

    if (!editingExperiment.value) {
      payload.create_default_snapshots = createForm.create_default_snapshots
    }

    if (editingExperiment.value) {
      await patchLabAPI.update(createForm.id, payload)
      ElMessage.success('更新成功')
      if (currentExperiment.value?.id === createForm.id) {
        await openExperiment({ id: createForm.id })
      }
    } else {
      const res = await patchLabAPI.create(payload)
      ElMessage.success(payload.create_default_snapshots ? '创建成功，已预置 A/B 方案' : '创建成功')
      createDialogVisible.value = false
      await fetchExperiments()
      await fetchStats()
      await openExperiment({ id: res.id })
      return
    }

    createDialogVisible.value = false
    fetchExperiments()
    fetchStats()
  } catch (e) {
    if (e !== false) {
      ElMessage.error(e.error || '操作失败')
    }
  } finally {
    submitting.value = false
  }
}

const deleteExperiment = async (exp) => {
  try {
    await ElMessageBox.confirm(`确定要删除实验「${exp.name}」吗？所有快照和结果将一并删除。`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await patchLabAPI.delete(exp.id)
    ElMessage.success('删除成功')
    currentExperiment.value = null
    fetchExperiments()
    fetchStats()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '删除失败')
    }
  }
}

const openExperiment = async (exp) => {
  try {
    const detail = await patchLabAPI.getDetail(exp.id)
    currentExperiment.value = detail

    resultForm.preferred_snapshot_id = detail.result?.preferred_snapshot_id || null
    resultForm.rating = detail.result?.rating || 0
    resultForm.result_notes = detail.result?.result_notes || ''
  } catch (e) {
    ElMessage.error('获取实验详情失败')
  }
}

const closeExperiment = () => {
  currentExperiment.value = null
  fetchExperiments()
}

const openSnapshotDialog = () => {
  editingSnapshot.value = null
  snapshotForm.label = ''
  snapshotForm.parameters = {
    osc_type: 'saw',
    osc_detune: 0,
    osc_octave: 0,
    filter_cutoff: 5000,
    filter_resonance: 0.3,
    filter_env: 0.5,
    env_attack: 10,
    env_decay: 200,
    env_sustain: 0.7,
    env_release: 500,
    lfo_rate: 4,
    lfo_depth: 20,
    lfo_wave: 'sine'
  }
  snapshotForm.notes = ''
  snapshotDialogVisible.value = true
}

const handleSnapshotCommand = (cmd, snap) => {
  if (cmd === 'edit') {
    editingSnapshot.value = snap
    snapshotForm.label = snap.label
    snapshotForm.parameters = { ...snap.parameters }
    snapshotForm.notes = snap.notes || ''
    snapshotDialogVisible.value = true
  } else if (cmd === 'delete') {
    deleteSnapshot(snap)
  }
}

const submitSnapshot = async () => {
  if (!snapshotFormRef.value) return
  try {
    await snapshotFormRef.value.validate()
    submitting.value = true

    const payload = {
      label: snapshotForm.label,
      parameters: snapshotForm.parameters,
      notes: snapshotForm.notes
    }

    if (editingSnapshot.value) {
      await patchLabAPI.updateSnapshot(currentExperiment.value.id, editingSnapshot.value.id, payload)
      ElMessage.success('快照更新成功')
    } else {
      await patchLabAPI.createSnapshot(currentExperiment.value.id, payload)
      ElMessage.success('快照添加成功')
    }

    snapshotDialogVisible.value = false
    await openExperiment({ id: currentExperiment.value.id })
  } catch (e) {
    if (e !== false) {
      ElMessage.error(e.error || '操作失败')
    }
  } finally {
    submitting.value = false
  }
}

const deleteSnapshot = async (snap) => {
  try {
    await ElMessageBox.confirm(`确定要删除快照「${snap.label}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await patchLabAPI.deleteSnapshot(currentExperiment.value.id, snap.id)
    ElMessage.success('快照已删除')
    await openExperiment({ id: currentExperiment.value.id })
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '删除失败')
    }
  }
}

const saveResult = async () => {
  try {
    savingResult.value = true
    await patchLabAPI.saveResult(currentExperiment.value.id, {
      preferred_snapshot_id: resultForm.preferred_snapshot_id,
      rating: resultForm.rating,
      result_notes: resultForm.result_notes
    })
    ElMessage.success('结果保存成功')
    await openExperiment({ id: currentExperiment.value.id })
    fetchStats()
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  } finally {
    savingResult.value = false
  }
}

onMounted(async () => {
  await fetchStats()
  fetchExperiments()
})
</script>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-draft {
  color: #e6a23c;
}

.stat-done {
  color: #67c23a;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  max-width: 400px;
}

.filter-select {
  width: 150px;
}

.experiment-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.experiment-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.experiment-card:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.3);
  transform: translateY(-2px);
}

.exp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.exp-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.exp-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0.4rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.exp-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.exp-patch {
  color: #ffd700;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.experiment-detail {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
}

.detail-header {
  margin-bottom: 1rem;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0 0.5rem;
}

.detail-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.detail-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.detail-patch-ref {
  color: #ffd700;
  font-size: 0.9rem;
  margin: 0.25rem 0;
}

.snapshots-section {
  margin-bottom: 1rem;
}

.snapshots-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.snapshot-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  min-width: 220px;
  max-width: 300px;
  flex: 1;
  position: relative;
}

.snapshot-card.preferred {
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.05);
}

.snapshot-card.add-snapshot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  border: 2px dashed rgba(255, 255, 255, 0.15);
  background: transparent;
}

.snapshot-card.add-snapshot:hover {
  border-color: rgba(255, 215, 0, 0.4);
  color: #ffd700;
  background: rgba(255, 215, 0, 0.03);
}

.add-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.snap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.snap-label {
  font-weight: 600;
  color: #ffd700;
  font-size: 1rem;
}

.preferred-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffd700;
  color: #1a1a2e;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.snap-params {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.param-key {
  color: var(--text-secondary);
}

.param-val {
  color: var(--text-primary);
  font-weight: 500;
}

.no-params {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
  padding: 1rem 0;
}

.snap-notes {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.compare-view {
  margin-bottom: 1rem;
}

.compare-table-wrap {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.compare-table th,
.compare-table td {
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.compare-table th {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  font-weight: 600;
}

.param-name-col {
  color: #ffd700;
  font-weight: 500;
  background: rgba(255, 215, 0, 0.03);
  min-width: 120px;
}

.param-val-col {
  min-width: 100px;
}

.missing {
  color: rgba(255, 255, 255, 0.2);
}

.empty-compare {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem;
}

.compare-hint {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.result-section {
  margin-bottom: 1rem;
}

.detail-actions {
  display: flex;
  gap: 0.75rem;
}

:deep(.el-divider__text) {
  background: transparent;
  color: #ffd700;
  font-weight: 600;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}
</style>
