<template>
  <div class="season-detail">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="!season" class="empty-state">
      <el-icon class="empty-icon"><Warning /></el-icon>
      <p>赛季不存在</p>
    </div>

    <div v-else>
      <section class="season-hero">
        <div v-if="season.banner_url" class="season-banner">
          <img :src="season.banner_url" :alt="season.name" />
        </div>
        <div class="season-hero-overlay"></div>
        <div class="season-hero-content">
          <div class="sh-badges">
            <el-tag type="warning" size="large">{{ season.year }}年 第{{ season.season_no }}季</el-tag>
            <el-tag :type="getStatusTagType(season.status)" size="large">{{ getStatusText(season.status) }}</el-tag>
          </div>
          <h1 class="sh-title">{{ season.name }}</h1>
          <p v-if="season.theme" class="sh-theme">🎨 赛季主题: {{ season.theme }}</p>
          <p class="sh-desc">{{ season.description || '暂无描述' }}</p>
          <div class="sh-meta-row">
            <div class="sh-meta-item">
              <el-icon><Calendar /></el-icon>
              <span>{{ formatDate(season.start_date) }} - {{ formatDate(season.end_date) }}</span>
            </div>
            <div class="sh-meta-item">
              <el-icon><User /></el-icon>
              <span>{{ season.total_registrations || 0 }} 人参赛</span>
            </div>
            <div class="sh-meta-item">
              <el-icon><Document /></el-icon>
              <span>{{ season.total_submissions || 0 }} 份作品</span>
            </div>
            <div class="sh-meta-item">
              <el-icon><Trophy /></el-icon>
              <span>{{ (season.winners || []).length }} 位获奖者</span>
            </div>
          </div>
        </div>
      </section>

      <div class="container">
        <div v-if="season.voting_rule" class="voting-rule-banner">
          <div class="vrb-icon">📊</div>
          <div class="vrb-content">
            <h4>📋 本赛季评分规则</h4>
            <p class="vrb-tags">
              <span>公众投票 {{ season.voting_rule.public_weight || 40 }}%</span>
              <span>评委评分 {{ season.voting_rule.jury_weight || 40 }}%</span>
              <span>创作加分 {{ season.voting_rule.creator_weight || 20 }}%</span>
            </p>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="main-tabs">
          <el-tab-pane name="activities">
            <template #label>
              <span class="tab-label">
                <el-icon><Flag /></el-icon>
                赛道活动
                <el-badge v-if="activities.length" :value="activities.length" class="tab-badge" />
              </span>
            </template>

            <div v-if="activities.length === 0" class="empty-tab">
              <el-icon><Flag /></el-icon>
              <p>暂无赛道活动</p>
            </div>

            <div v-else class="tracks-grid">
              <div
                v-for="act in activities"
                :key="act.id"
                class="track-card"
                @click="goToActivity(act)"
              >
                <div class="track-cover">
                  <img v-if="act.cover_url" :src="act.cover_url" :alt="act.title" />
                  <div v-else class="track-cover-placeholder">🎯</div>
                  <span :class="['track-status', act.status]">{{ getStatusText(act.status) }}</span>
                </div>
                <div class="track-body">
                  <div class="track-tags">
                    <el-tag size="small" type="warning">{{ getTypeText(act.type) }}</el-tag>
                    <span v-if="act.prizes" class="track-prize">
                      <el-icon><Trophy /></el-icon>{{ act.prizes }}
                    </span>
                  </div>
                  <h3 class="track-title">{{ act.title }}</h3>
                  <p class="track-desc">{{ act.description || '暂无描述' }}</p>
                  <div class="track-footer">
                    <div class="track-stats">
                      <span><el-icon><User /></el-icon> {{ act.registration_count }}</span>
                      <span><el-icon><Document /></el-icon> {{ act.submission_count }}</span>
                    </div>
                    <el-button size="small" type="primary">
                      进入赛道
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane name="ranking">
            <template #label>
              <span class="tab-label">
                <el-icon><Medal /></el-icon>
                实时排行
              </span>
            </template>

            <div class="ranking-section">
              <div class="ranking-header-info">
                <el-alert
                  v-if="season.status !== 'ended'"
                  type="info"
                  :closable="false"
                  show-icon
                  title="排行榜数据实时更新中"
                  description="最终排名以活动结束后官方公布结果为准"
                />
                <el-alert
                  v-else
                  type="success"
                  :closable="false"
                  show-icon
                  title="赛季已结束"
                  description="以下为最终排名结果"
                />
              </div>

              <div v-if="rankingsLoading" class="empty-state">
                <el-icon class="empty-icon"><Loading /></el-icon>
                <p>加载排行榜...</p>
              </div>

              <div v-else-if="rankings.length === 0" class="empty-tab">
                <el-icon><Medal /></el-icon>
                <p>暂无排行数据</p>
                <el-button type="primary" class="refresh-btn" @click="fetchRankings">刷新数据</el-button>
              </div>

              <div v-else>
                <div class="podium-row">
                  <div class="podium-item second" v-if="rankings[1]">
                    <div class="podium-rank">🥈</div>
                    <div class="podium-avatar">
                      <el-avatar :size="72" :src="rankings[1].avatar">
                        {{ rankings[1].username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="podium-name">{{ rankings[1].username }}</div>
                    <div class="podium-title">{{ rankings[1].submission_title || '作品' }}</div>
                    <div class="podium-score">{{ rankings[1].final_score?.toFixed(2) }} 分</div>
                    <div class="podium-stand s2">2</div>
                  </div>

                  <div class="podium-item first" v-if="rankings[0]">
                    <div class="podium-crown">👑</div>
                    <div class="podium-rank">🥇</div>
                    <div class="podium-avatar">
                      <el-avatar :size="96" :src="rankings[0].avatar">
                        {{ rankings[0].username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="podium-name">{{ rankings[0].username }}</div>
                    <div class="podium-title">{{ rankings[0].submission_title || '作品' }}</div>
                    <div class="podium-score">{{ rankings[0].final_score?.toFixed(2) }} 分</div>
                    <div class="podium-stand s1">1</div>
                  </div>

                  <div class="podium-item third" v-if="rankings[2]">
                    <div class="podium-rank">🥉</div>
                    <div class="podium-avatar">
                      <el-avatar :size="64" :src="rankings[2].avatar">
                        {{ rankings[2].username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="podium-name">{{ rankings[2].username }}</div>
                    <div class="podium-title">{{ rankings[2].submission_title || '作品' }}</div>
                    <div class="podium-score">{{ rankings[2].final_score?.toFixed(2) }} 分</div>
                    <div class="podium-stand s3">3</div>
                  </div>
                </div>

                <div class="rankings-table-card">
                  <div class="rt-header">
                    <h3>📊 完整榜单</h3>
                    <el-button type="primary" size="small" @click="fetchRankings">
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                  </div>
                  <el-table :data="rankings" stripe>
                    <el-table-column label="排名" width="90" align="center">
                      <template #default="{ $index }">
                        <span v-if="$index < 3" class="rank-top">{{ ['🥇', '🥈', '🥉'][$index] }}</span>
                        <span v-else class="rank-num">{{ $index + 1 }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="创作者" min-width="180">
                      <template #default="{ row }">
                        <div class="creator-cell">
                          <el-avatar :size="36" :src="row.avatar">
                            {{ row.username?.charAt(0).toUpperCase() }}
                          </el-avatar>
                          <span class="creator-name">{{ row.username }}</span>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="作品" min-width="200">
                      <template #default="{ row }">
                        <span class="work-title">{{ row.submission_title || '—' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="大众票" width="110" align="center">
                      <template #default="{ row }">
                        <span class="score-public">{{ row.public_score || 0 }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="评委分" width="110" align="center">
                      <template #default="{ row }">
                        <span class="score-jury">{{ row.jury_score?.toFixed(1) || '—' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="创作分" width="110" align="center">
                      <template #default="{ row }">
                        <span class="score-creator">{{ row.creator_score?.toFixed(1) || '—' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="总分" width="120" align="center">
                      <template #default="{ row }">
                        <span class="score-final">{{ row.final_score?.toFixed(2) || '—' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100" align="center" v-if="season.status !== 'ended'">
                      <template #default="{ row }">
                        <el-button
                          type="primary"
                          size="small"
                          link
                          @click.stop="viewWork(row)"
                        >
                          查看
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane name="winners">
            <template #label>
              <span class="tab-label">
                <el-icon><Trophy /></el-icon>
                获奖名单
                <el-badge v-if="(season.winners || []).length" :value="(season.winners || []).length" class="tab-badge" />
              </span>
            </template>

            <div class="winners-section">
              <div v-if="!season.result_published && season.status !== 'ended'" class="empty-tab">
                <el-icon><Timer /></el-icon>
                <p>结果尚未公布，敬请期待</p>
                <p class="sub-info">公布时间: {{ formatDate(season.result_publish_date) }}</p>
              </div>

              <div v-else-if="(season.winners || []).length === 0" class="empty-tab">
                <el-icon><Trophy /></el-icon>
                <p>暂无获奖数据</p>
              </div>

              <div v-else>
                <div class="winners-hero-grid">
                  <div
                    v-for="award in topAwards"
                    :key="award.id"
                    :class="['award-hero-card', award.level]"
                  >
                    <div class="ahc-icon">{{ award.icon }}</div>
                    <div class="ahc-name">{{ award.name }}</div>
                    <div v-if="award.winner" class="winner-info">
                      <el-avatar :size="64" :src="award.winner.avatar">
                        {{ award.winner.username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                      <div class="winner-name">{{ award.winner.username }}</div>
                      <div class="winner-work">{{ award.winner.submission_title }}</div>
                      <div class="winner-score">{{ award.winner.final_score?.toFixed(2) }} 分</div>
                    </div>
                    <div v-else class="no-winner">
                      <span>虚位以待</span>
                    </div>
                  </div>
                </div>

                <div class="winners-list-card">
                  <h3 class="wl-title">🏅 全部奖项</h3>
                  <el-table :data="season.winners" stripe>
                    <el-table-column label="奖项" width="160">
                      <template #default="{ row }">
                        <el-tag :type="getAwardTagType(row.award_level)" size="large">
                          {{ row.award_name || '获奖' }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="获奖者" min-width="180">
                      <template #default="{ row }">
                        <div class="creator-cell">
                          <el-avatar :size="36" :src="row.avatar">
                            {{ row.username?.charAt(0).toUpperCase() }}
                          </el-avatar>
                          <span class="creator-name">{{ row.username }}</span>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="获奖作品" min-width="220">
                      <template #default="{ row }">
                        <span class="work-title">{{ row.submission_title || '—' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="排名" width="90" align="center">
                      <template #default="{ row }">
                        <span class="rank-num" v-if="row.rank_position">
                          第 {{ row.rank_position }} 名
                        </span>
                      </template>
                    </el-table-column>
                    <el-table-column label="得分" width="120" align="center">
                      <template #default="{ row }">
                        <span class="score-final">{{ row.final_score?.toFixed(2) || '—' }}</span>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane name="jury">
            <template #label>
              <span class="tab-label">
                <el-icon><UserFilled /></el-icon>
                评审团
              </span>
            </template>

            <div class="jury-section">
              <div v-if="juryList.length === 0" class="empty-tab">
                <el-icon><UserFilled /></el-icon>
                <p>评审团名单尚未公布</p>
              </div>

              <div v-else>
                <h3 class="jury-section-title">✨ 专业评审团</h3>
                <p class="jury-section-desc">行业专家与资深创作者组成，为比赛提供专业视角</p>
                <div class="jury-grid">
                  <div v-for="member in juryList" :key="member.id" class="jury-card">
                    <div class="jury-avatar-wrap">
                      <el-avatar :size="80" :src="member.avatar_url">
                        {{ member.name?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="jury-name">{{ member.name }}</div>
                    <div class="jury-title">{{ member.title || '评审' }}</div>
                    <div v-if="member.bio" class="jury-bio">{{ member.bio }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane name="awards">
            <template #label>
              <span class="tab-label">
                <el-icon><Present /></el-icon>
                奖项设置
              </span>
            </template>

            <div class="awards-section">
              <div v-if="(season.awards || []).length === 0" class="empty-tab">
                <el-icon><Present /></el-icon>
                <p>奖项设置待定</p>
              </div>

              <div v-else class="awards-list">
                <div
                  v-for="award in season.awards"
                  :key="award.id"
                  :class="['award-item-card', award.level]"
                >
                  <div class="aic-left">
                    <div class="aic-emoji">{{ award.icon || '🏅' }}</div>
                  </div>
                  <div class="aic-mid">
                    <h4 class="aic-name">{{ award.name }}</h4>
                    <p class="aic-desc">{{ award.description || '—' }}</p>
                    <div class="aic-meta">
                      <span v-if="award.count">名额 {{ award.count }} 名</span>
                      <span v-if="award.prize">奖励: {{ award.prize }}</span>
                    </div>
                  </div>
                  <div class="aic-right">
                    <el-tag :type="getAwardTagType(award.level)" size="large">{{ getAwardLevelText(award.level) }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Loading, Warning, Calendar, User, Document, Trophy,
  Flag, Medal, Refresh, Timer, Present, UserFilled
} from '@element-plus/icons-vue'
import { challengeApi, activityApi } from '@/api'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const season = ref(null)
const activities = ref([])
const activeTab = ref('activities')
const rankings = ref([])
const rankingsLoading = ref(false)
const juryList = ref([])

const formatDate = (dateStr) => {
  if (!dateStr) return '待定'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getStatusText = (status) => {
  const texts = { draft: '未开始', published: '进行中', upcoming: '即将开始', ended: '已结束' }
  return texts[status] || status
}

const getStatusTagType = (status) => {
  const types = { draft: 'info', published: 'success', upcoming: 'warning', ended: 'danger' }
  return types[status] || 'info'
}

const getTypeText = (type) => {
  const texts = { contest: '创作大赛', collection: '专题征集', vote: '投票评选', other: '其他活动' }
  return texts[type] || '活动'
}

const getAwardTagType = (level) => {
  const types = { gold: 'warning', silver: 'info', bronze: '', special: 'success', popularity: 'danger' }
  return types[level] || ''
}

const getAwardLevelText = (level) => {
  const texts = { gold: '金奖级', silver: '银奖级', bronze: '铜奖级', special: '特别奖', popularity: '人气奖' }
  return texts[level] || '常规奖'
}

const topAwards = computed(() => {
  const awards = season.value?.awards || []
  const winners = season.value?.winners || []
  return awards.slice(0, 6).map(a => ({
    ...a,
    winner: winners.find(w => w.award_id === a.id)
  }))
})

const fetchSeason = async () => {
  loading.value = true
  try {
    const id = parseInt(route.params.id)
    const data = await challengeApi.getSeasonDetail(id)
    season.value = data
    activities.value = data.activities || []
    if (season.value.status === 'ended' || (season.value.winners || []).length > 0) {
      activeTab.value = 'winners'
    }
    await fetchRankings()
    await fetchJury()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchRankings = async () => {
  rankingsLoading.value = true
  try {
    const act = activities.value[0]
    if (act) {
      const res = await activityApi.getRankings(act.id, { limit: 50 })
      rankings.value = res.list || res || []
    } else {
      rankings.value = (season.value?.winners || []).map((w, i) => ({
        ...w,
        rank_position: i + 1
      }))
    }
  } catch (e) {
    rankings.value = []
  } finally {
    rankingsLoading.value = false
  }
}

const fetchJury = async () => {
  try {
    const res = await challengeApi.getJury({ season_id: route.params.id })
    juryList.value = res.list || res || []
  } catch (e) {
    juryList.value = []
  }
}

const goToActivity = (act) => {
  router.push(`/activities/${act.id}`)
}

const viewWork = (row) => {
  if (row.submission_id) {
    router.push(`/activities/submissions/${row.submission_id}`)
  }
}

onMounted(() => {
  fetchSeason()
})
</script>

<style scoped>
.season-detail {
  min-height: 100vh;
}

.season-hero {
  position: relative;
  min-height: 420px;
  overflow: hidden;
}

.season-banner {
  position: absolute;
  inset: 0;
}

.season-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.5);
}

.season-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(26,26,46,0.9) 100%);
}

.season-hero-content {
  position: relative;
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 20px 60px;
}

.sh-badges {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.sh-title {
  font-size: 48px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 12px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.sh-theme {
  display: inline-block;
  padding: 8px 20px;
  background: rgba(139, 92, 246, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 24px;
  font-size: 16px;
  color: #c4b5fd;
  margin-bottom: 16px;
}

.sh-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  max-width: 700px;
  margin: 0 0 28px;
}

.sh-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.sh-meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.voting-rule-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(255, 215, 0, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 20px 28px;
  margin: 28px 0;
}

.vrb-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.vrb-content h4 {
  color: #fff;
  margin: 0 0 8px;
  font-size: 16px;
}

.vrb-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.vrb-tags span {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 13px;
  color: #ffd700;
}

.main-tabs {
  margin-top: 20px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-badge {
  margin-left: 4px;
}

.tracks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.track-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.track-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
}

.track-cover {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(255, 215, 0, 0.1));
}

.track-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
}

.track-status {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.track-status.published { background: rgba(67, 233, 123, 0.9); color: #000; }
.track-status.upcoming { background: rgba(79, 172, 254, 0.9); color: #fff; }
.track-status.ended { background: rgba(156, 163, 175, 0.9); color: #fff; }

.track-body {
  padding: 18px;
}

.track-tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.track-prize {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #ffd700;
}

.track-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.track-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.track-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.track-stats {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.track-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ranking-section {
  padding: 20px 0;
}

.ranking-header-info {
  margin-bottom: 24px;
}

.podium-row {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 20px;
  padding: 40px 0 30px;
  margin-bottom: 30px;
}

.podium-item {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px 20px 0 0;
  padding: 24px 30px 60px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 180px;
}

.podium-item.first {
  transform: translateY(-20px);
  border-color: rgba(255, 215, 0, 0.5);
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.15), rgba(255, 255, 255, 0.05));
  min-width: 220px;
}

.podium-item.second {
  border-color: rgba(196, 196, 196, 0.3);
}

.podium-item.third {
  border-color: rgba(205, 127, 50, 0.3);
}

.podium-crown {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 36px;
}

.podium-rank {
  font-size: 32px;
  margin-bottom: 12px;
}

.podium-avatar {
  margin-bottom: 12px;
}

.podium-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.podium-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.podium-score {
  font-family: 'Monaco', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
}

.podium-stand {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  border-radius: 0 0 0 0;
}

.podium-stand.s1 {
  background: linear-gradient(180deg, #ffd700, #ff8c00);
}

.podium-stand.s2 {
  background: linear-gradient(180deg, #c0c0c0, #808080);
}

.podium-stand.s3 {
  background: linear-gradient(180deg, #cd7f32, #8b4513);
}

.rankings-table-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.rt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rt-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.rank-top {
  font-size: 20px;
}

.rank-num {
  font-weight: 600;
  color: #ffd700;
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.creator-name {
  color: #fff;
  font-weight: 500;
}

.work-title {
  color: rgba(255, 255, 255, 0.8);
}

.score-public {
  color: #4ade80;
  font-weight: 600;
}

.score-jury {
  color: #8b5cf6;
  font-weight: 600;
}

.score-creator {
  color: #f59e0b;
  font-weight: 600;
}

.score-final {
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
}

.winners-section {
  padding: 20px 0;
}

.winners-hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.award-hero-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.award-hero-card.gold {
  border-color: rgba(255, 215, 0, 0.4);
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.1), rgba(255, 255, 255, 0.05));
}

.award-hero-card.silver {
  border-color: rgba(196, 196, 196, 0.3);
}

.award-hero-card.bronze {
  border-color: rgba(205, 127, 50, 0.3);
}

.ahc-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.ahc-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 16px;
}

.winner-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.winner-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.winner-work {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.winner-score {
  font-family: 'Monaco', monospace;
  font-size: 14px;
  color: #ffd700;
  font-weight: 700;
}

.no-winner {
  padding: 20px 0;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.winners-list-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  padding: 24px;
}

.wl-title {
  margin: 0 0 20px;
  color: #fff;
  font-size: 18px;
}

.jury-section {
  padding: 20px 0;
}

.jury-section-title {
  text-align: center;
  color: #fff;
  font-size: 24px;
  margin: 0 0 8px;
}

.jury-section-desc {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 32px;
}

.jury-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.jury-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.jury-card:hover {
  transform: translateY(-4px);
  border-color: rgba(139, 92, 246, 0.4);
}

.jury-avatar-wrap {
  margin-bottom: 16px;
}

.jury-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.jury-title {
  font-size: 13px;
  color: #8b5cf6;
  font-weight: 500;
  margin-bottom: 12px;
}

.jury-bio {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
}

.awards-section {
  padding: 20px 0;
}

.awards-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.award-item-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  padding: 18px 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.award-item-card.gold {
  border-color: rgba(255, 215, 0, 0.3);
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), rgba(255, 255, 255, 0.05));
}

.aic-left {
  flex-shrink: 0;
}

.aic-emoji {
  font-size: 40px;
}

.aic-mid {
  flex: 1;
  min-width: 0;
}

.aic-name {
  margin: 0 0 6px;
  color: #fff;
  font-size: 17px;
}

.aic-desc {
  margin: 0 0 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.aic-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.aic-right {
  flex-shrink: 0;
}

.sub-info {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.empty-tab {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state {
  text-align: center;
  padding: 120px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.refresh-btn {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .sh-title {
    font-size: 32px;
  }
  .podium-row {
    flex-direction: column;
    align-items: center;
  }
  .podium-item.first {
    transform: none;
    order: -1;
  }
  .sh-meta-row {
    gap: 12px;
  }
}
</style>
