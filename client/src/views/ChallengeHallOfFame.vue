<template>
  <div class="hall-of-fame">
    <section class="hof-hero">
      <div class="hof-hero-bg"></div>
      <div class="hof-hero-content">
        <div class="hof-badge">⭐ HALL OF FAME</div>
        <h1 class="hof-title">Patch 挑战赛名人堂</h1>
        <p class="hof-subtitle">记录每一个荣耀时刻，见证创作者的光辉历程</p>
        <div class="hof-total-stats">
          <div class="stat-box">
            <span class="stat-emoji">🏆</span>
            <span class="stat-value">{{ totalWinners }}</span>
            <span class="stat-label">获奖总人次</span>
          </div>
          <div class="stat-box">
            <span class="stat-emoji">📅</span>
            <span class="stat-value">{{ totalSeasons }}</span>
            <span class="stat-label">成功举办赛季</span>
          </div>
          <div class="stat-box">
            <span class="stat-emoji">👑</span>
            <span class="stat-value">{{ topChampionsCount }}</span>
            <span class="stat-label">冠军获得者</span>
          </div>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="filter-bar">
        <div class="filter-left">
          <el-select v-model="yearFilter" placeholder="赛季年份" clearable @change="fetchData" style="width: 160px;">
            <el-option v-for="y in availableYears" :key="y" :label="y + '年'" :value="y" />
          </el-select>
          <el-select v-model="awardLevel" placeholder="奖项级别" clearable @change="fetchData" style="width: 160px;">
            <el-option label="🥇 金奖/冠军" value="gold" />
            <el-option label="🥈 银奖/亚军" value="silver" />
            <el-option label="🥉 铜奖/季军" value="bronze" />
            <el-option label="✨ 特别奖" value="special" />
            <el-option label="🔥 人气奖" value="popularity" />
          </el-select>
        </div>
        <div class="filter-right">
          <el-radio-group v-model="viewMode" size="large">
            <el-radio-button value="season">
              <el-icon><Collection /></el-icon>
              赛季视图
            </el-radio-button>
            <el-radio-button value="winner">
              <el-icon><Trophy /></el-icon>
              获奖者视图
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div v-if="viewMode === 'season'">
        <div v-if="loading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="seasonsWithWinners.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Trophy /></el-icon>
          <p>暂无获奖记录</p>
        </div>

        <div v-else class="seasons-timeline">
          <div
            v-for="(seasonItem, idx) in seasonsWithWinners"
            :key="seasonItem.id"
            class="timeline-season-block"
          >
            <div class="season-header-row" @click="toggleSeason(seasonItem.id)">
              <div class="season-header-left">
                <div class="season-year-badge">{{ seasonItem.year }}</div>
                <div class="season-main-info">
                  <div class="season-name-row">
                    <h3 class="season-name">{{ seasonItem.name }}</h3>
                    <el-tag type="warning" size="small">第{{ seasonItem.season_no }}季</el-tag>
                    <span v-if="seasonItem.theme" class="season-theme-inline">🎨 {{ seasonItem.theme }}</span>
                  </div>
                  <div class="season-meta-row-inline">
                    <span><el-icon><Calendar /></el-icon> {{ formatDate(seasonItem.start_date) }} - {{ formatDate(seasonItem.end_date) }}</span>
                    <span><el-icon><Trophy /></el-icon> {{ (seasonItem.winners || []).length }} 位获奖者</span>
                  </div>
                </div>
              </div>
              <div class="season-header-right">
                <el-button type="primary" link @click.stop="viewSeason(seasonItem)">查看赛季详情 →</el-button>
                <el-icon :class="['expand-icon', expandedSeasons.includes(seasonItem.id) ? 'expanded' : '']">
                  <ArrowDown />
                </el-icon>
              </div>
            </div>

            <transition name="slide">
              <div v-show="expandedSeasons.includes(seasonItem.id)" class="season-winners-content">
                <div v-if="(seasonItem.winners || []).length === 0" class="empty-inline">
                  本赛季暂无获奖者记录
                </div>

                <div v-else>
                  <div class="top-winners-row">
                    <div
                      v-for="w in getAwardLevelWinners(seasonItem.winners, 'gold').slice(0, 3)"
                      :key="w.id"
                      class="top-winner-card gold"
                    >
                      <div class="twc-crown">👑</div>
                      <el-avatar :size="72" :src="w.avatar" class="twc-avatar">
                        {{ w.username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                      <div class="twc-award">🥇 {{ w.award_name || '金奖' }}</div>
                      <div class="twc-name">{{ w.username }}</div>
                      <div class="twc-work">{{ w.submission_title || '—' }}</div>
                      <div class="twc-score">{{ w.final_score?.toFixed(2) }} 分</div>
                    </div>

                    <div
                      v-for="w in getAwardLevelWinners(seasonItem.winners, 'silver').slice(0, 2)"
                      :key="w.id"
                      class="top-winner-card silver"
                    >
                      <el-avatar :size="60" :src="w.avatar" class="twc-avatar">
                        {{ w.username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                      <div class="twc-award">🥈 {{ w.award_name || '银奖' }}</div>
                      <div class="twc-name">{{ w.username }}</div>
                      <div class="twc-work">{{ w.submission_title || '—' }}</div>
                    </div>

                    <div
                      v-for="w in getAwardLevelWinners(seasonItem.winners, 'bronze').slice(0, 2)"
                      :key="w.id"
                      class="top-winner-card bronze"
                    >
                      <el-avatar :size="56" :src="w.avatar" class="twc-avatar">
                        {{ w.username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                      <div class="twc-award">🥉 {{ w.award_name || '铜奖' }}</div>
                      <div class="twc-name">{{ w.username }}</div>
                      <div class="twc-work">{{ w.submission_title || '—' }}</div>
                    </div>
                  </div>

                  <div class="other-winners">
                    <div class="ow-header">🏅 其他奖项</div>
                    <el-table :data="getOtherWinners(seasonItem.winners)" size="default" stripe>
                      <el-table-column label="排名" width="90" align="center">
                        <template #default="{ row }">
                          <span v-if="row.rank_position" class="rank-num">第{{ row.rank_position }}名</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="奖项" width="150">
                        <template #default="{ row }">
                          <el-tag :type="getAwardTagType(row.award_level)" size="large">
                            {{ getAwardIcon(row.award_level) }} {{ row.award_name || '获奖' }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column label="获奖者" min-width="180">
                        <template #default="{ row }">
                          <div class="creator-cell">
                            <el-avatar :size="32" :src="row.avatar">
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
                      <el-table-column label="最终得分" width="130" align="center">
                        <template #default="{ row }">
                          <span class="score-final">{{ row.final_score?.toFixed(2) || '—' }}</span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>

                <div v-if="seasonItem.result_published" class="published-meta">
                  <el-icon><Promotion /></el-icon>
                  <span>结果公布于 {{ formatDateTime(seasonItem.result_publish_date) }}</span>
                </div>
              </div>
            </transition>

            <div v-if="idx < seasonsWithWinners.length - 1" class="timeline-connector"></div>
          </div>
        </div>
      </div>

      <div v-else>
        <div v-if="loading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="allWinnersUnique.length === 0" class="empty-state">
          <el-icon class="empty-icon"><User /></el-icon>
          <p>暂无获奖者数据</p>
        </div>

        <div v-else>
          <div class="champions-wall">
            <div class="cw-header">
              <h3>👑 冠军墙</h3>
              <p>历届金奖/冠军获得者</p>
            </div>
            <div class="cw-grid">
              <div
                v-for="c in goldWinners"
                :key="c.user_id + '_' + c.season_id"
                class="champion-card"
              >
                <div class="champion-badge">🏆 CHAMPION</div>
                <el-avatar :size="80" :src="c.avatar" class="champion-avatar">
                  {{ c.username?.charAt(0).toUpperCase() }}
                </el-avatar>
                <div class="champion-name">{{ c.username }}</div>
                <div class="champion-season">{{ getSeasonNameById(c.season_id) }}</div>
                <div class="champion-work">{{ c.submission_title || '—' }}</div>
              </div>
            </div>
          </div>

          <div class="all-winners-table-card">
            <div class="awt-header">
              <h3>📊 全部获奖者</h3>
              <div class="awt-search">
                <el-input
                  v-model="searchWinner"
                  placeholder="搜索获奖者姓名"
                  clearable
                  style="width: 220px;"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
            </div>

            <el-table :data="filteredAllWinners" stripe>
              <el-table-column label="获奖者" min-width="200" fixed="left">
                <template #default="{ row }">
                  <div class="creator-cell">
                    <el-avatar :size="40" :src="row.avatar">
                      {{ row.username?.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <div>
                      <div class="creator-name">{{ row.username }}</div>
                      <div class="creator-wincount">
                        <el-tag type="warning" size="small">🏆 {{ getUserWinCount(row.user_id) }}次获奖</el-tag>
                      </div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="奖项" width="160">
                <template #default="{ row }">
                  <el-tag :type="getAwardTagType(row.award_level)" size="large">
                    {{ getAwardIcon(row.award_level) }} {{ row.award_name || '获奖' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="作品" min-width="220">
                <template #default="{ row }">
                  <span class="work-title">{{ row.submission_title || '—' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="赛季" min-width="200">
                <template #default="{ row }">
                  <span class="season-cell" @click="viewSeasonById(row.season_id)">
                    <el-tag>{{ getSeasonNameById(row.season_id) }}</el-tag>
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="得分" width="110" align="center">
                <template #default="{ row }">
                  <span class="score-final">{{ row.final_score?.toFixed(2) || '—' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="排名" width="100" align="center">
                <template #default="{ row }">
                  <span v-if="row.rank_position" class="rank-num">#{{ row.rank_position }}</span>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="allWinnersCount > 50" class="pagination">
              <el-pagination
                v-model:current-page="page"
                :page-size="50"
                :total="allWinnersCount"
                layout="prev, pager, next, total"
                background
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Loading, Trophy, Calendar, Collection, User,
  Search, ArrowDown, Promotion
} from '@element-plus/icons-vue'
import { challengeApi } from '@/api'

const router = useRouter()

const loading = ref(true)
const viewMode = ref('season')
const yearFilter = ref('')
const awardLevel = ref('')
const searchWinner = ref('')
const page = ref(1)
const limit = 100
const expandedSeasons = ref([])

const allSeasons = ref([])
const allWinners = ref([])

const availableYears = computed(() => {
  const years = new Set(allSeasons.value.map(s => s.year))
  return Array.from(years).sort((a, b) => b - a)
})

const seasonsWithWinners = computed(() => {
  let list = allSeasons.value
  if (yearFilter.value) list = list.filter(s => s.year === yearFilter.value)
  return list.filter(s => (s.winners || []).length > 0 || s.status === 'ended')
})

const totalWinners = computed(() => allWinners.value.length)
const totalSeasons = computed(() => allSeasons.value.filter(s => s.status === 'ended').length)

const goldWinners = computed(() => {
  let list = allWinners.value.filter(w => w.award_level === 'gold')
  if (yearFilter.value) list = list.filter(w => {
    const s = allSeasons.value.find(x => x.id === w.season_id)
    return s?.year === yearFilter.value
  })
  return list
})

const topChampionsCount = computed(() => {
  const set = new Set()
  goldWinners.value.forEach(w => set.add(w.user_id))
  return set.size
})

const allWinnersUnique = computed(() => {
  let list = [...allWinners.value]
  if (yearFilter.value) {
    list = list.filter(w => {
      const s = allSeasons.value.find(x => x.id === w.season_id)
      return s?.year === yearFilter.value
    })
  }
  if (awardLevel.value) {
    list = list.filter(w => w.award_level === awardLevel.value)
  }
  return list
})

const allWinnersCount = computed(() => allWinnersUnique.value.length)

const filteredAllWinners = computed(() => {
  let list = allWinnersUnique.value
  if (searchWinner.value) {
    const kw = searchWinner.value.toLowerCase()
    list = list.filter(w => w.username?.toLowerCase().includes(kw))
  }
  return list
})

const formatDate = (dateStr) => {
  if (!dateStr) return '待定'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getSeasonNameById = (id) => {
  const s = allSeasons.value.find(x => x.id === id)
  if (!s) return '未知赛季'
  return `${s.year}年 第${s.season_no}季`
}

const getAwardLevelWinners = (winners, level) => {
  return (winners || []).filter(w => w.award_level === level)
}

const getOtherWinners = (winners) => {
  return (winners || []).filter(w => !['gold', 'silver', 'bronze'].includes(w.award_level) || getAwardLevelWinners(winners, w.award_level).indexOf(w) >= 2)
}

const getAwardTagType = (level) => {
  const types = { gold: 'warning', silver: 'info', bronze: '', special: 'success', popularity: 'danger' }
  return types[level] || ''
}

const getAwardIcon = (level) => {
  const icons = { gold: '🥇', silver: '🥈', bronze: '🥉', special: '✨', popularity: '🔥' }
  return icons[level] || '🏅'
}

const getUserWinCount = (uid) => allWinners.value.filter(w => w.user_id === uid).length

const toggleSeason = (sid) => {
  const idx = expandedSeasons.value.indexOf(sid)
  if (idx === -1) expandedSeasons.value.push(sid)
  else expandedSeasons.value.splice(idx, 1)
}

const viewSeason = (s) => router.push(`/challenge/seasons/${s.id}`)
const viewSeasonById = (sid) => router.push(`/challenge/seasons/${sid}`)

const fetchData = async () => {
  loading.value = true
  try {
    const seasonsRes = await challengeApi.getSeasons({ page: 1, limit: 100 })
    const seasonsList = seasonsRes.list || seasonsRes || []

    const detailPromises = seasonsList
      .filter(s => s.status === 'ended' || (s.total_submissions || 0) > 0)
      .map(s => challengeApi.getSeasonDetail(s.id))

    const details = await Promise.all(detailPromises)

    allSeasons.value = details.sort((a, b) => (b.year * 100 + b.season_no) - (a.year * 100 + a.season_no))
    allWinners.value = allSeasons.value.flatMap(s => (s.winners || []).map(w => ({ ...w, season_id: s.id })))

    expandedSeasons.value = allSeasons.value.slice(0, 1).map(s => s.id)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.hall-of-fame {
  min-height: 100vh;
}

.hof-hero {
  position: relative;
  padding: 100px 20px 80px;
  text-align: center;
  overflow: hidden;
}

.hof-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(139, 92, 246, 0.15));
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hof-hero-content {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
}

.hof-badge {
  display: inline-block;
  padding: 8px 28px;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border-radius: 50px;
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 24px;
  font-size: 14px;
}

.hof-title {
  font-size: 56px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffd700, #ffaa00, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px;
}

.hof-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 40px;
}

.hof-total-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 36px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 160px;
}

.stat-emoji {
  font-size: 36px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-left, .filter-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.seasons-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-season-block {
  position: relative;
}

.season-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.season-header-row:hover {
  border-color: rgba(255, 215, 0, 0.3);
}

.season-header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.season-year-badge {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border-radius: 16px;
  font-size: 24px;
  font-weight: 800;
  flex-shrink: 0;
}

.season-main-info {
  flex: 1;
  min-width: 0;
}

.season-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.season-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.season-theme-inline {
  font-size: 13px;
  color: #c4b5fd;
}

.season-meta-row-inline {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  flex-wrap: wrap;
}

.season-meta-row-inline span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.season-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.expand-icon {
  font-size: 20px;
  color: #ffd700;
  transition: transform 0.3s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to, .slide-leave-from {
  opacity: 1;
  max-height: 3000px;
}

.season-winners-content {
  margin-top: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.top-winners-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}

.top-winner-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 24px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  min-width: 180px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.top-winner-card.gold {
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.15), rgba(255, 255, 255, 0.03));
  border-color: rgba(255, 215, 0, 0.4);
  transform: translateY(-8px);
}

.top-winner-card.silver {
  border-color: rgba(196, 196, 196, 0.3);
}

.top-winner-card.bronze {
  border-color: rgba(205, 127, 50, 0.3);
}

.twc-crown {
  position: absolute;
  top: -18px;
  font-size: 32px;
}

.twc-avatar {
  margin-bottom: 12px;
}

.twc-award {
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 8px;
  font-size: 14px;
}

.twc-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.twc-work {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.twc-score {
  font-family: 'Monaco', monospace;
  font-size: 14px;
  color: #ffd700;
  font-weight: 700;
}

.other-winners {
  margin-bottom: 20px;
}

.ow-header {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}

.published-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.timeline-connector {
  width: 2px;
  height: 30px;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.3), rgba(255, 255, 255, 0.1));
  margin: 8px auto;
}

.champions-wall {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.cw-header {
  text-align: center;
  margin-bottom: 32px;
}

.cw-header h3 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
}

.cw-header p {
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.cw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  position: relative;
  border: 1px solid rgba(255, 215, 0, 0.2);
  transition: all 0.3s ease;
}

.champion-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.15);
}

.champion-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 10px;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}

.champion-avatar {
  margin-bottom: 12px;
}

.champion-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.champion-season {
  font-size: 12px;
  color: #ffd700;
  margin-bottom: 4px;
}

.champion-work {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-winners-table-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  padding: 24px;
}

.awt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.awt-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.creator-name {
  color: #fff;
  font-weight: 500;
}

.creator-wincount {
  margin-top: 4px;
}

.work-title {
  color: rgba(255, 255, 255, 0.8);
}

.season-cell {
  cursor: pointer;
}

.rank-num {
  font-weight: 600;
  color: #ffd700;
}

.score-final {
  font-size: 15px;
  font-weight: 700;
  color: #ffd700;
}

.empty-inline {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state {
  text-align: center;
  padding: 100px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .hof-title {
    font-size: 36px;
  }
  .season-header-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .season-header-left {
    flex-direction: column;
  }
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-left, .filter-right {
    justify-content: center;
  }
}
</style>
