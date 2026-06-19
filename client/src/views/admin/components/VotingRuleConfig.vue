<template>
  <div class="config-panel">
    <el-form :model="form" label-width="160px">
      <el-form-item label="规则名称">
        <el-input v-model="form.rule_name" placeholder="投票规则名称" />
      </el-form-item>

      <el-divider content-position="left">基本规则</el-divider>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="允许给自己投票">
            <el-switch v-model="form.allow_self_vote" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="每作品限投票数">
            <el-input-number v-model="form.max_votes_per_submission" :min="1" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="每日投票上限">
            <el-input-number v-model="form.daily_vote_limit" :min="0" style="width: 100%;" />
            <div class="tip">0表示不限制</div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单用户总投票上限">
            <el-input-number v-model="form.total_vote_limit_per_user" :min="0" style="width: 100%;" />
            <div class="tip">0表示不限制</div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">投票权重</el-divider>

      <el-row :gutter="24">
        <el-col :span="8">
          <el-form-item label="公众投票权重">
            <el-input-number v-model="form.vote_weight_public" :min="0" :step="0.1" :precision="1" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="评审团权重">
            <el-input-number v-model="form.vote_weight_jury" :min="0" :step="0.1" :precision="1" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="创作者权重">
            <el-input-number v-model="form.vote_weight_creator" :min="0" :step="0.1" :precision="1" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">评分公式</el-divider>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="计算方式">
            <el-select v-model="form.score_formula" style="width: 100%;">
              <el-option label="加权求和 (推荐)" value="weighted_sum" />
              <el-option label="平均值" value="average" />
              <el-option label="仅评审团分" value="jury_only" />
              <el-option label="仅公众投票" value="public_only" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最少评审数">
            <el-input-number v-model="form.min_jury_reviews" :min="0" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="维度权重配置">
        <div class="dimensions-grid">
          <div v-for="(w, k) in dimWeights" :key="k" class="dim-item">
            <div class="dim-label">{{ dimLabels[k] }}</div>
            <el-slider v-model="dimWeights[k]" :min="0" :max="100" show-input />
            <div class="dim-val">{{ (w / 100).toFixed(2) }}</div>
          </div>
        </div>
        <div class="dim-total">合计: {{ Object.values(dimWeights).reduce((a, b) => a + b, 0) }}%</div>
      </el-form-item>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 16px;"
      >
        <template #title>
          最终得分 = 公众分 × {{ form.vote_weight_public }} + 评审分 × {{ form.vote_weight_jury }} + 创作分 × {{ form.vote_weight_creator }}
        </template>
      </el-alert>
    </el-form>

    <div class="action-bar">
      <el-button @click="save" type="primary" :loading="saving">保存规则</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { challengeApi, adminChallengeApi } from '@/api'

const props = defineProps({
  seasonId: Number,
  activityId: Number
})

const emit = defineEmits(['saved'])

const saving = ref(false)
const form = reactive({
  rule_name: '默认规则',
  allow_self_vote: 0,
  daily_vote_limit: 0,
  total_vote_limit_per_user: 0,
  max_votes_per_submission: 1,
  vote_weight_public: 1.0,
  vote_weight_jury: 3.0,
  vote_weight_creator: 2.0,
  score_formula: 'weighted_sum',
  min_jury_reviews: 0,
  require_jury_score: 0,
  score_weights: null
})

const dimLabels = { creativity: '创意性', technical: '技术性', musicality: '音乐性', originality: '独特性' }
const dimWeights = reactive({ creativity: 25, technical: 25, musicality: 25, originality: 25 })

const load = async () => {
  try {
    const res = await challengeApi.getVotingRule({
      activity_id: props.activityId,
      season_id: props.seasonId
    })
    Object.assign(form, res)
    if (res.score_weights) {
      try {
        const w = JSON.parse(res.score_weights)
        Object.keys(dimWeights).forEach(k => {
          if (w[k] !== undefined) dimWeights[k] = Math.round(w[k] * 100)
        })
      } catch {}
    }
  } catch {}
}

const save = async () => {
  saving.value = true
  try {
    await adminChallengeApi.saveVotingRule({
      activity_id: props.activityId,
      season_id: props.seasonId,
      ...form,
      score_weights: Object.fromEntries(
        Object.entries(dimWeights).map(([k, v]) => [k, v / 100])
      )
    })
    emit('saved')
  } catch (e) {
    ElMessage.error(e?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch(() => [props.seasonId, props.activityId], load)
</script>

<style scoped>
.config-panel { padding: 8px 0; }
.tip { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.dimensions-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 32px; margin-top: 8px;
}
.dim-item { display: flex; align-items: center; gap: 12px; }
.dim-label { width: 80px; font-size: 0.875rem; color: var(--text-primary); flex-shrink: 0; }
.dim-item .el-slider { flex: 1; }
.dim-val { width: 50px; text-align: right; font-size: 0.875rem; color: var(--primary-color); font-weight: 600; }
.dim-total {
  margin-top: 12px; text-align: right; font-size: 0.875rem;
  color: var(--text-secondary); font-weight: 500;
}
.action-bar {
  margin-top: 24px; padding-top: 16px;
  border-top: 1px solid var(--border-color); text-align: right;
}
</style>
