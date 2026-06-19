<template>
  <div class="challenge-home">
    <section class="hero-section">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-badge">🏆 PATCH CHALLENGE</div>
        <h1 class="hero-title">Patch 创作挑战赛</h1>
        <p class="hero-subtitle">展示你的声音设计才华，与全球创作者一较高下</p>
        <p class="hero-desc">每赛季设置丰厚奖项，专业评委团队 + 大众投票，公平公正见证实力</p>
        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-num">{{ totalSeasons }}</div>
            <div class="stat-label">已办赛季</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-num">{{ totalRegistrations }}</div>
            <div class="stat-label">累计参赛</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-num">{{ totalSubmissions }}</div>
            <div class="stat-label">作品投稿</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-num">{{ totalWinners }}</div>
            <div class="stat-label">诞生获奖者</div>
          </div>
        </div>
        <div class="hero-actions">
          <el-button v-if="currentSeason" type="primary" size="large" @click="goToSeason(currentSeason)">
            🔥 参与本赛季
          </el-button>
          <el-button size="large" @click="$router.push('/challenge/hall-of-fame')">
            🏆 名人堂
          </el-button>
        </div>
      </div>
    </section>

    <div class="container">
      <section v-if="currentSeason" class="section current-season-section">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">🎯 当前赛季</h2>
            <p class="section-subtitle">{{ currentSeason.name }} · 火热进行中</p>
          </div>
          <el-button type="primary" @click="goToSeason(currentSeason)">
            查看详情 →
          </el-button>
        </div>

        <div class="current-season-card" @click="goToSeason(currentSeason)">
          <div class="cs-cover">
            <img v-if="currentSeason.banner_url" :src="currentSeason.banner_url" :alt="currentSeason.name" />
            <div v-else class="cs-cover-placeholder">
              <span class="cs-icon">🏆</span>
            </div>
            <div class="cs-status-badge active">进行中</div>
          </div>
          <div class="cs-info">
            <div class="cs-header">
              <div class="cs-title-wrap">
                <el-tag type="warning" size="large">{{ currentSeason.year }}年 第{{ currentSeason.season_no }}季</el-tag>
                <h3 class="cs-name">{{ currentSeason.name }}</h3>
              </div>
              <div class="cs-countdown">
                <div class="countdown-label">距结束</div>
                <div class="countdown-timer">{{ countdown }}</div>
              </div>
            </div>

            <p class="cs-desc">{{ currentSeason.description || '暂无描述' }}</p>

            <div v-if="currentSeason.theme" class="cs-theme">
              <span class="theme-label">🎨 赛季主题</span>
              <span class="theme-text">{{ currentSeason.theme }}</span>
            </div>

            <div class="cs-meta-grid">
              <div class="meta-cell">
                <el-icon><Calendar /></el-icon>
                <span>报名: {{ formatDate(currentSeason.registration_start) }} ~ {{ formatDate(currentSeason.registration_end) }}</span>
              </div>
              <div class="meta-cell">
                <el-icon><Edit /></el-icon>
                <span>投稿: {{ formatDate(currentSeason.submission_start) }} ~ {{ formatDate(currentSeason.submission_end) }}</span>
              </div>
              <div class="meta-cell">
                <el-icon><ChatDotRound /></el-icon>
                <span>投票: {{ formatDate(currentSeason.voting_start) }} ~ {{ formatDate(currentSeason.voting_end) }}</span>
              </div>
              <div class="meta-cell">
                <el-icon><Trophy /></el-icon>
                <span>颁奖: {{ formatDate(currentSeason.result_publish_date) }}</span>
              </div>
            </div>

            <div class="cs-stats-row">
              <div class="mini-stat">
                <span class="ms-num">{{ currentSeason.activity_count || 0 }}</span>
                <span class="ms-label">赛道</span>
              </div>
              <div class="mini-stat">
                <span class="ms-num">{{ currentSeason.total_registrations || 0 }}</span>
                <span class="ms-label">报名</span>
              </div>
              <div class="mini-stat">
                <span class="ms-num">{{ currentSeason.total_submissions || 0 }}</span>
                <span class="ms-label">作品</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">📅 全部赛季</h2>
            <p class="section-subtitle">历届挑战赛，见证每一位创作者的精彩</p>
          </div>
          <div class="filters">
            <el-select v-model="yearFilter" placeholder="年份筛选" clearable @change="fetchSeasons">
              <el-option v-for="y in availableYears" :key="y" :label="y + '年'" :value="y" />
            </el-select>
            <el-radio-group v-model="statusFilter" @change="fetchSeasons">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="published">进行中</el-radio-button>
              <el-radio-button value="ended">已结束</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div v-if="seasonsLoading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="seasons.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Box /></el-icon>
          <p>暂无赛季数据</p>
        </div>

        <div v-else class="seasons-grid">
          <div
            v-for="season in seasons"
            :key="season.id"
            :class="['season-card', season.status]"
            @click="goToSeason(season)"
          >
            <div class="season-card-cover">
              <img v-if="season.cover_url" :src="season.cover_url" :alt="season.name" />
              <div v-else class="scc-placeholder">
                <span>{{ getSeasonIcon(season.status) }}</span>
              </div>
              <span :class="['sc-status', season.status]">{{ getStatusText(season.status) }}</span>
              <span class="sc-year-tag">{{ season.year }} S{{ season.season_no }}</span>
            </div>
            <div class="season-card-body">
              <h3 class="sc-name">{{ season.name }}</h3>
              <p v-if="season.theme" class="sc-theme">🎨 {{ season.theme }}</p>
              <p class="sc-desc">{{ season.description || '暂无描述' }}</p>
              <div class="sc-footer">
                <div class="sc-stats">
                  <span><el-icon><User /></el-icon> {{ season.total_registrations || 0 }}</span>
                  <span><el-icon><Document /></el-icon> {{ season.total_submissions || 0 }}</span>
                </div>
                <span class="sc-link">查看 →</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="total > limit" class="pagination">
          <el-pagination
            v-model:current-page="page"
            :page-size="limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="fetchSeasons"
            background
          />
        </div>
      </section>

      <section class="section awards-section">
        <div class="section-header">
          <h2 class="section-title">🎁 奖项设置说明</h2>
          <p class="section-subtitle">每个赛季都设置了丰富的奖项等你拿</p>
        </div>
        <div class="awards-grid">
          <div class="award-info-card">
            <div class="aic-icon">🥇</div>
            <h3>冠军 · 金奖</h3>
            <p>综合评分最高作品</p>
          </div>
          <div class="award-info-card">
            <div class="aic-icon">🥈</div>
            <h3>亚军 · 银奖</h3>
            <p>综合评分第二名</p>
          </div>
          <div class="award-info-card">
            <div class="aic-icon">🥉</div>
            <h3>季军 · 铜奖</h3>
            <p>综合评分第三名</p>
          </div>
          <div class="award-info-card">
            <div class="aic-icon">👥</div>
            <h3>人气奖</h3>
            <p>大众投票最高</p>
          </div>
          <div class="award-info-card">
            <div class="aic-icon">🎨</div>
            <h3>创意奖</h3>
            <p>评委选出最具创意</p>
          </div>
          <div class="award-info-card">
            <div class="aic-icon">💎</div>
            <h3>新锐奖</h3>
            <p>首次参赛优秀作品</p>
          </div>
        </div>
      </section>

      <section class="section workflow-section">
        <h2 class="section-title text-center">📋 参赛流程</h2>
        <p class="section-subtitle text-center">简单四步，开启你的创作挑战之旅</p>
        <div class="workflow-steps">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-icon">📝</div>
            <h3>报名参赛</h3>
            <p>选择感兴趣的赛道活动，完成报名登记</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-icon">🎵</div>
            <h3>创作投稿</h3>
            <p>按照主题要求进行创作，提交你的 Patch 作品</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-icon">🗳️</div>
            <h3>投票评选</h3>
            <p>大众投票 + 专业评审团评分，综合排名</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-num">4</div>
            <div class="step-icon">🏆</div>
            <h3>结果公布</h3>
            <p>官方公布获奖名单，发放奖励与荣誉</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, Calendar, Edit, Trophy, User, Document, Box, ChatDotRound } from '@element-plus/icons-vue'
import { challengeApi } from '@/api'

const router = useRouter()

const seasonsLoading = ref(true)
const seasons = ref([])
const currentSeason = ref(null)
const total = ref(0)
const page = ref(1)
const limit = 9
const statusFilter = ref('all')
const yearFilter = ref('')
const availableYears = ref([2024, 2025, 2026])

const totalSeasons = ref(0)
const totalRegistrations = ref(0)
const totalSubmissions = ref(0)
const totalWinners = ref(0)

const countdown = ref('--:--:--:--')
let countdownTimer = null

const formatDate = (dateStr) => {
  if (!dateStr) return '待定'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getStatusText = (status) => {
  const texts = { draft: '未开始', published: '进行中', upcoming: '即将开始', ended: '已结束' }
  return texts[status] || status
}

const getSeasonIcon = (status) => {
  const icons = { draft: '📌', published: '🔥', upcoming: '⏰', ended: '✅' }
  return icons[status] || '🏆'
}

const fetchSeasons = async () => {
  seasonsLoading.value = true
  try {
    const params = { page: page.value, limit: limit.value, status: statusFilter.value }
    if (yearFilter.value) params.year = yearFilter.value
    const res = await challengeApi.getSeasons(params)
    seasons.value = res.list || res || []
    total.value = res.total || 0
  } finally {
    seasonsLoading.value = false
  }
}

const fetchOverview = async () => {
  try {
    const res = await challengeApi.getSeasons({ page: 1, limit: 100 })
    const all = res.list || res || []
    totalSeasons.value = all.length
    totalRegistrations.value = all.reduce((s, x) => s + (x.total_registrations || 0), 0)
    totalSubmissions.value = all.reduce((s, x) => s + (x.total_submissions || 0), 0)

    currentSeason.value = all.find(s => s.status === 'published' || s.status === 'upcoming') || all[0]
    if (currentSeason.value) {
      try {
        const detail = await challengeApi.getSeasonDetail(currentSeason.value.id)
        totalWinners.value = (detail.winners || []).length
      } catch (e) {}
    }
  } catch (e) {}
}

const updateCountdown = () => {
  if (!currentSeason.value?.end_date) return
  const end = new Date(currentSeason.value.end_date).getTime()
  const now = Date.now()
  const diff = Math.max(0, end - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  countdown.value = `${d}天 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const goToSeason = (season) => {
  router.push(`/challenge/seasons/${season.id}`)
}

onMounted(async () => {
  await fetchSeasons()
  await fetchOverview()
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.challenge-home {
  min-height: 100vh;
}

.hero-section {
  position: relative;
  padding: 100px 20px 80px;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(255, 215, 0, 0.15));
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero-content {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  padding: 8px 24px;
  background: linear-gradient(90deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  border-radius: 50px;
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 24px;
  font-size: 14px;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffd700, #ff8c00, #ffd700);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  to { background-position: 200% center; }
}

.hero-subtitle {
  font-size: 28px;
  color: #fff;
  margin: 0 0 12px;
  font-weight: 600;
}

.hero-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 40px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px 40px;
  margin-bottom: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  padding: 0 32px;
  text-align: center;
}

.stat-num {
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.section {
  margin-bottom: 60px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.section-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
}

.section-title.text-center {
  text-align: center;
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.current-season-card {
  display: grid;
  grid-template-columns: 380px 1fr;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 215, 0, 0.25);
  cursor: pointer;
  transition: all 0.3s ease;
}

.current-season-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 12px 40px rgba(255, 215, 0, 0.15);
}

.cs-cover {
  position: relative;
  min-height: 320px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.1));
}

.cs-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cs-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cs-icon {
  font-size: 96px;
}

.cs-status-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
}

.cs-status-badge.active {
  background: rgba(67, 233, 123, 0.9);
  color: #000;
}

.cs-info {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
}

.cs-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.cs-name {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 12px 0 0;
}

.cs-countdown {
  text-align: right;
  flex-shrink: 0;
}

.countdown-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

.countdown-timer {
  font-family: 'Monaco', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 14px;
  border-radius: 8px;
}

.cs-desc {
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0 0 16px;
}

.cs-theme {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  margin-bottom: 16px;
}

.theme-label {
  font-size: 13px;
  color: #8b5cf6;
  font-weight: 600;
  flex-shrink: 0;
}

.theme-text {
  color: #fff;
  font-weight: 500;
}

.cs-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.meta-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.cs-stats-row {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ms-num {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
}

.ms-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.seasons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.season-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.season-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
}

.season-card.published {
  border-color: rgba(67, 233, 123, 0.3);
}

.season-card.ended {
  opacity: 0.85;
}

.season-card-cover {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(255, 215, 0, 0.1));
}

.season-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scc-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
}

.sc-status {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.sc-status.published { background: rgba(67, 233, 123, 0.9); color: #000; }
.sc-status.upcoming { background: rgba(79, 172, 254, 0.9); color: #fff; }
.sc-status.ended { background: rgba(156, 163, 175, 0.9); color: #fff; }
.sc-status.draft { background: rgba(0, 0, 0, 0.7); color: #fff; }

.sc-year-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  background: rgba(255, 215, 0, 0.85);
  color: #1a1a2e;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.season-card-body {
  padding: 18px;
}

.sc-name {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 6px;
}

.sc-theme {
  font-size: 13px;
  color: #ffd700;
  margin: 0 0 8px;
}

.sc-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sc-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.sc-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sc-link {
  font-size: 13px;
  color: #ffd700;
  font-weight: 500;
}

.awards-section {
  padding: 40px 0;
}

.awards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.award-info-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.award-info-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.3);
}

.aic-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.award-info-card h3 {
  font-size: 16px;
  color: #fff;
  margin: 0 0 6px;
}

.award-info-card p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.workflow-section {
  padding: 40px 0;
}

.workflow-steps {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 0;
  margin-top: 40px;
  flex-wrap: wrap;
}

.step-item {
  flex: 1;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.step-num {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
}

.step-icon {
  font-size: 40px;
  margin: 8px 0 16px;
}

.step-item h3 {
  font-size: 16px;
  color: #fff;
  margin: 0 0 8px;
}

.step-item p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}

.step-arrow {
  display: flex;
  align-items: center;
  font-size: 32px;
  color: #ffd700;
  padding: 0 8px;
  font-weight: 700;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

@media (max-width: 900px) {
  .current-season-card {
    grid-template-columns: 1fr;
  }
  .cs-cover {
    min-height: 200px;
  }
  .hero-stats {
    flex-wrap: wrap;
    padding: 20px;
  }
  .stat-item {
    padding: 12px 20px;
  }
  .stat-divider {
    display: none;
  }
  .step-arrow {
    display: none;
  }
  .hero-title {
    font-size: 40px;
  }
}
</style>
