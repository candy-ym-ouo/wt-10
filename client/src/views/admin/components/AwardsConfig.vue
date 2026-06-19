<template>
  <div class="config-panel">
    <div class="awards-toolbar">
      <el-button type="primary" @click="addAward" :icon="Plus">添加奖项</el-button>
      <el-alert
        type="warning"
        :closable="false"
        style="flex: 1; margin-left: 16px;"
      >
        <template #title>系统将按「最终得分」从高到低自动分配奖项，排名优先的奖项先派位。</template>
      </el-alert>
    </div>

    <el-table :data="awards" style="margin-top: 16px;" border>
      <el-table-column label="排序" width="80" align="center">
        <template #default="{ $index }">
          <div class="drag-handle">
            <el-icon><Sort /></el-icon>
            <span>{{ $index + 1 }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="奖项名称" min-width="160">
        <template #default="{ row }">
          <el-input v-model="row.award_name" placeholder="如: 最佳创意奖" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="奖项等级" width="140">
        <template #default="{ row }">
          <el-select v-model="row.award_level" size="small">
            <el-option label="🥇 特等奖" value="special" />
            <el-option label="🥇 一等奖" value="first" />
            <el-option label="🥈 二等奖" value="second" />
            <el-option label="🥉 三等奖" value="third" />
            <el-option label="🎖️ 优秀奖" value="excellence" />
            <el-option label="🌟 人气奖" value="popular" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="名额" width="100" align="center">
        <template #default="{ row }">
          <el-input-number v-model="row.count" :min="1" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="锁定排名" width="140" align="center">
        <template #default="{ row }">
          <el-input-number
            v-model="row.rank_position"
            :min="0"
            size="small"
            placeholder="自动"
            controls-position="right"
          />
        </template>
      </el-table-column>
      <el-table-column label="奖品/奖金">
        <template #default="{ row }">
          <el-input v-model="row.prize_description" placeholder="奖品描述" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="奖励积分" width="120" align="center">
        <template #default="{ row }">
          <el-input-number v-model="row.reward_coins" :min="0" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ $index }">
          <el-button type="danger" link size="small" @click="removeAward($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="preset-section">
      <span class="preset-label">快速模板:</span>
      <el-button size="small" @click="applyPreset('standard')">标准大赛</el-button>
      <el-button size="small" @click="applyPreset('simple')">简洁版</el-button>
      <el-button size="small" @click="applyPreset('popularity')">人气投票版</el-button>
    </div>

    <div class="action-bar">
      <el-button type="primary" @click="save" :loading="saving">保存奖项设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Sort } from '@element-plus/icons-vue'
import { challengeApi, adminChallengeApi } from '@/api'

const props = defineProps({
  seasonId: Number,
  activityId: Number
})

const emit = defineEmits(['saved'])

const saving = ref(false)
const awards = ref([])

const presets = {
  standard: [
    { award_name: '🏆 总冠军', award_level: 'special', count: 1, rank_position: 1, prize_description: '价值5000元设备 + 证书', reward_coins: 5000 },
    { award_name: '🥇 一等奖', award_level: 'first', count: 2, rank_position: null, prize_description: '价值2000元设备 + 证书', reward_coins: 2000 },
    { award_name: '🥈 二等奖', award_level: 'second', count: 3, rank_position: null, prize_description: '价值800元礼品 + 证书', reward_coins: 800 },
    { award_name: '🥉 三等奖', award_level: 'third', count: 5, rank_position: null, prize_description: '价值300元礼品 + 证书', reward_coins: 300 },
    { award_name: '🎖️ 优秀奖', award_level: 'excellence', count: 10, rank_position: null, prize_description: '电子证书', reward_coins: 100 }
  ],
  simple: [
    { award_name: '🥇 第一名', award_level: 'first', count: 1, rank_position: 1, prize_description: '冠军奖品 + 证书', reward_coins: 3000 },
    { award_name: '🥈 第二名', award_level: 'second', count: 1, rank_position: 2, prize_description: '亚军奖品 + 证书', reward_coins: 1500 },
    { award_name: '🥉 第三名', award_level: 'third', count: 1, rank_position: 3, prize_description: '季军奖品 + 证书', reward_coins: 800 }
  ],
  popularity: [
    { award_name: '🌟 人气王', award_level: 'special', count: 1, rank_position: 1, prize_description: '人气大奖', reward_coins: 3000 },
    { award_name: '✨ 人气之星', award_level: 'popular', count: 5, rank_position: null, prize_description: '人气奖', reward_coins: 500 },
    { award_name: '💖 优秀作品', award_level: 'excellence', count: 10, rank_position: null, prize_description: '电子证书', reward_coins: 100 }
  ]
}

const load = async () => {
  try {
    const res = await challengeApi.getAwards({
      activity_id: props.activityId,
      season_id: props.seasonId
    })
    awards.value = res.length > 0 ? res : []
  } catch {}
}

const save = async () => {
  if (awards.value.some(a => !a.award_name)) {
    ElMessage.warning('请填写所有奖项名称')
    return
  }
  saving.value = true
  try {
    await adminChallengeApi.saveAwards({
      activity_id: props.activityId,
      season_id: props.seasonId,
      awards: awards.value.map((a, i) => ({ ...a, sort_order: i }))
    })
    emit('saved')
  } catch (e) {
    ElMessage.error(e?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const addAward = () => {
  awards.value.push({
    award_name: '', award_level: 'custom', count: 1,
    rank_position: null, prize_description: '', reward_coins: 0,
    badge_url: ''
  })
}

const removeAward = (idx) => {
  awards.value.splice(idx, 1)
}

const applyPreset = (key) => {
  awards.value = JSON.parse(JSON.stringify(presets[key]))
}

onMounted(load)
watch(() => [props.seasonId, props.activityId], load)
</script>

<style scoped>
.config-panel { padding: 8px 0; }
.awards-toolbar {
  display: flex; align-items: center;
}
.drag-handle {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; color: var(--text-secondary);
}
.preset-section {
  margin-top: 16px; padding-top: 16px;
  border-top: 1px dashed var(--border-color);
  display: flex; align-items: center; gap: 12px;
}
.preset-label {
  font-size: 0.875rem; color: var(--text-secondary);
}
.action-bar {
  margin-top: 24px; padding-top: 16px;
  border-top: 1px solid var(--border-color); text-align: right;
}
</style>
