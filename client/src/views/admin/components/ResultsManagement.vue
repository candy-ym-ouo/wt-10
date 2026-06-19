<template>
  <div class="config-panel">
    <div class="action-bar-top">
      <el-select
        v-model="selectedActivity"
        placeholder="选择要计算排名的活动"
        style="width: 320px;"
        clearable
        @change="fetchRankings"
      >
        <el-option
          v-for="act in seasonActivities"
          :key="act.id"
          :label="act.title"
          :value="act.id"
        />
      </el-select>
      <el-button type="primary" @click="calculateRankings" :loading="calculating" :disabled="!selectedActivity">
        <el-icon><DataAnalysis /></el-icon>
        计算排名
      </el-button>
      <el-button type="warning" @click="calculateAndPublish" :loading="publishing" :disabled="!selectedActivity">
        <el-icon><Promotion /></el-icon>
        计算并发布
      </el-button>
      <el-button type="success" @click="publishResults" :disabled="!selectedActivity">
        <el-icon><CircleCheck /></el-icon>
        生成获奖名单
      </el-button>
    </div>

    <el-divider />

    <div v-if="rankings.length > 0" class="rankings-section">
      <div class="section-header">
        <h3>实时排名预览 ({{ rankings.length }}份作品)</h3>
        <el-tag type="info">最后计算: {{ lastCalcTime || '-' }}</el-tag>
      </div>

      <div v-if="rankings.slice(0, 3).length > 0" class="podium-preview">
        <div
          v-for="(r, i) in rankings.slice(0, 3)"
          :key="r.id"
          :class="['podium-card', `podium-${i + 1}`]"
        >
          <div class="podium-rank-badge">
            <span v-if="i === 0">👑 #{{ r.rank }}</span>
            <span v-else>#{{ r.rank }}</span>
          </div>
          <el-avatar :size="52" :src="r.avatar">
            {{ r.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="podium-name">{{ r.username }}</div>
          <div class="podium-work">{{ r.title }}</div>
          <div class="podium-score-box">
            <div class="score-big">{{ r.final_score?.toFixed(2) }}</div>
            <div class="score-breakdown">
              <span title="公众分">P:{{ r.public_score?.toFixed(1) }}</span>
              <span title="评审分">J:{{ r.jury_score?.toFixed(1) }}</span>
            </div>
          </div>
        </div>
      </div>

      <el-table :data="rankings" style="margin-top: 20px;" border size="small">
        <el-table-column label="排名" width="80" align="center">
          <template #default="{ row }">
            <span :class="['rank-num', { medal: row.rank <= 3 }]">#{{ row.rank }}</span>
          </template>
        </el-table-column>
        <el-table-column label="作品 & 作者" min-width="220">
          <template #default="{ row }">
            <div class="work-cell">
              <el-avatar :size="32" :src="row.avatar">
                {{ row.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <div>
                <div class="work-title">{{ row.title }}</div>
                <div class="work-author">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最终得分" width="110" align="center">
          <template #default="{ row }">
            <span class="score-final">{{ row.final_score?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="公众" width="90" align="center">
          <template #default="{ row }">{{ row.public_score?.toFixed(1) }}</template>
        </el-table-column>
        <el-table-column label="评审" width="90" align="center">
          <template #default="{ row }">{{ row.jury_score?.toFixed(1) }}</template>
        </el-table-column>
        <el-table-column label="票数" width="80" align="center">
          <template #default="{ row }">{{ row.votes_count }}</template>
        </el-table-column>
        <el-table-column label="评审次数" width="90" align="center">
          <template #default="{ row }">{{ row.jury_review_count || 0 }}</template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else class="empty-state-inline">
      <el-icon><Histogram /></el-icon>
      <p>选择活动后可查看排名</p>
    </div>

    <el-divider>🏆 结果沉淀 - 获奖记录</el-divider>

    <div v-if="winnersLoading" class="empty-state-inline">加载中...</div>
    <div v-else-if="winners.length === 0" class="empty-state-inline">
      <el-icon><Trophy /></el-icon>
      <p>暂无获奖数据，点击「生成获奖名单」创建</p>
    </div>
    <el-table v-else :data="winners" border size="small">
      <el-table-column label="排名" width="80" align="center">
        <template #default="{ row }">
          <span class="rank-num medal">#{{ row.rank_position }}</span>
        </template>
      </el-table-column>
      <el-table-column label="奖项" width="160">
        <template #default="{ row }">
          <el-tag :type="awardTagType(row.award_level)">{{ row.award_name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="作品 & 作者" min-width="220">
        <template #default="{ row }">
          <div class="work-cell">
            <el-avatar :size="32" :src="row.avatar">
              {{ row.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div>
              <div class="work-title">{{ row.submission_title }}</div>
              <div class="work-author">{{ row.username }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="最终得分" width="110" align="center">
        <template #default="{ row }">
          <span class="score-final">{{ row.final_score?.toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="票数" width="80" align="center">
        <template #default="{ row }">{{ row.votes_count }}</template>
      </el-table-column>
      <el-table-column label="获奖时间" width="180">
        <template #default="{ row }">{{ formatTime(row.awarded_at) }}</template>
      </el-table-column>
    </el-table>

    <div v-if="snapshots.length > 0" style="margin-top: 16px;">
      <el-divider>📸 历史快照</el-divider>
      <el-timeline>
        <el-timeline-item
          v-for="s in snapshots"
          :key="s.id"
          :timestamp="formatTime(s.created_at)"
          type="primary"
          size="large"
        >
          <div class="snapshot-item">
            <el-tag size="small" type="success">{{ s.snapshot_type === 'final' ? '最终结果' : '临时快照' }}</el-tag>
            <span v-if="s.summary" class="snapshot-summary">
              {{ s.summary?.total_submissions || 0 }}份作品 · {{ s.summary?.winners_count || 0 }}名获奖者 · {{ s.summary?.total_votes || 0 }}票
            </span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DataAnalysis, Promotion, CircleCheck, Histogram, Trophy } from '@element-plus/icons-vue'
import { challengeApi, adminChallengeApi } from '@/api'

const props = defineProps({
  season: Object
})

const seasonActivities = computed(() => props.season?.activities || [])
const selectedActivity = ref(null)
const rankings = ref([])
const winners = ref([])
const winnersLoading = ref(false)
const snapshots = ref([])
const calculating = ref(false)
const publishing = ref(false)
const lastCalcTime = ref('')

const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN') : '-'
const awardTagType = (l) => ({ special: 'danger', first: 'danger', second: 'warning', third: 'success', excellence: 'info', popular: 'primary', custom: '' }[l] || '')

const fetchRankings = async () => {
  if (!selectedActivity.value) return
  try {
    const res = await challengeApi.getWinners({ season_id: props.season?.id, activity_id: selectedActivity.value })
    winners.value = res || []
  } catch {}
  try {
    const snaps = await challengeApi.getSnapshots({ season_id: props.season?.id, activity_id: selectedActivity.value })
    snapshots.value = snaps || []
  } catch {}
}

const calculateRankings = async () => {
  if (!selectedActivity.value) return
  calculating.value = true
  try {
    const res = await adminChallengeApi.calculateRankings(selectedActivity.value, { publish: false })
    rankings.value = res.rankings || []
    lastCalcTime.value = new Date().toLocaleTimeString('zh-CN')
    ElMessage.success(`排名已重新计算，共 ${res.count} 份作品`)
  } catch (e) {
    ElMessage.error(e?.error || '计算失败')
  } finally {
    calculating.value = false
  }
}

const calculateAndPublish = async () => {
  if (!selectedActivity.value) return
  try {
    await ElMessageBox.confirm('将立即计算排名并标记为已发布状态，确认继续？', '确认发布', { type: 'warning' })
    calculating.value = true
    publishing.value = true
    const res = await adminChallengeApi.calculateRankings(selectedActivity.value, { publish: true })
    rankings.value = res.rankings || []
    lastCalcTime.value = new Date().toLocaleTimeString('zh-CN')
    ElMessage.success(`排名已计算并发布，共 ${res.count} 份作品`)
    fetchRankings()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.error || '操作失败')
  } finally {
    calculating.value = false
    publishing.value = false
  }
}

const publishResults = async () => {
  if (!selectedActivity.value) return
  try {
    await ElMessageBox.confirm(
      '将按排名顺序自动分配奖项并生成获奖名单，同时写入历史快照。此操作不可撤销，确认继续？',
      '发布最终结果',
      { type: 'warning', confirmButtonText: '确认发布' }
    )
    publishing.value = true
    const res = await adminChallengeApi.publishResults(selectedActivity.value, { generate_winners: true })
    ElMessage.success(`结果已发布！产生 ${res.total_winners} 名获奖者，${res.total_rankings} 份作品上榜`)
    fetchRankings()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.error || '发布失败')
  } finally {
    publishing.value = false
  }
}

onMounted(() => {
  if (seasonActivities.value?.length > 0) {
    selectedActivity.value = seasonActivities.value[0].id
    fetchRankings()
  }
})

watch(() => props.season, () => {
  if (seasonActivities.value?.length > 0) {
    selectedActivity.value = seasonActivities.value[0].id
    fetchRankings()
  }
}, { deep: true })
</script>

<style scoped>
.config-panel { padding: 8px 0; }
.action-bar-top {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
}
.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.section-header h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
.podium-preview {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.podium-card {
  padding: 20px; border-radius: 12px; text-align: center;
  border: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.05), transparent);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.podium-1 {
  order: 2; transform: translateY(-12px);
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.15), transparent);
  border-color: rgba(255, 215, 0, 0.4);
}
.podium-2 { order: 1; background: linear-gradient(180deg, rgba(192, 192, 192, 0.1), transparent); }
.podium-3 { order: 3; background: linear-gradient(180deg, rgba(205, 127, 50, 0.1), transparent); }
.podium-rank-badge {
  font-weight: 700; font-size: 1.1rem; color: var(--primary-color);
}
.podium-name { font-weight: 600; color: var(--text-primary); }
.podium-work {
  font-size: 0.8125rem; color: var(--text-secondary);
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.podium-score-box { margin-top: 4px; }
.score-big {
  font-size: 1.5rem; font-weight: 700; color: #ffd700;
}
.score-breakdown {
  display: flex; gap: 10px; justify-content: center;
  font-size: 0.75rem; color: var(--text-secondary);
}
.work-cell { display: flex; align-items: center; gap: 10px; }
.work-title { font-weight: 500; color: var(--text-primary); }
.work-author { font-size: 0.75rem; color: var(--text-secondary); }
.score-final { font-weight: 700; color: var(--primary-color); font-size: 1rem; }
.rank-num {
  font-weight: 600; color: var(--text-secondary);
}
.rank-num.medal { color: #ffd700; }
.empty-state-inline {
  padding: 40px 20px; text-align: center; color: var(--text-secondary);
}
.empty-state-inline .el-icon {
  font-size: 36px; margin-bottom: 8px; opacity: 0.4;
}
.snapshot-item {
  display: flex; align-items: center; gap: 12px;
}
.snapshot-summary {
  font-size: 0.8125rem; color: var(--text-secondary);
}
@media (max-width: 768px) {
  .podium-preview { grid-template-columns: 1fr; }
  .podium-1 { transform: none; order: 0; }
  .podium-2 { order: 0; }
  .podium-3 { order: 0; }
}
</style>
