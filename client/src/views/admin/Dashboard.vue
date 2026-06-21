<template>
  <div class="dashboard">
    <h1 class="page-title">📊 仪表盘</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">用户总数</p>
          <p class="stat-value">{{ stats?.users || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon patches">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">Patch 总数</p>
          <p class="stat-value">{{ stats?.patches || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon modules">
          <el-icon><Box /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">模块总数</p>
          <p class="stat-value">{{ stats?.modules || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon manufacturers">
          <el-icon><OfficeBuilding /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">厂商总数</p>
          <p class="stat-value">{{ stats?.manufacturers || 0 }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon views">
          <el-icon><View /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">今日浏览</p>
          <p class="stat-value">{{ formatNumber(patchStats?.overview?.today_views || 0) }}</p>
          <div class="stat-growth" :class="patchStats?.overview?.daily_growth >= 0 ? 'positive' : 'negative'">
            <el-icon><component :is="patchStats?.overview?.daily_growth >= 0 ? 'Top' : 'Bottom'" /></el-icon>
            {{ Math.abs(patchStats?.overview?.daily_growth || 0) }}%
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon week">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">本周浏览</p>
          <p class="stat-value">{{ formatNumber(patchStats?.overview?.week_views || 0) }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon month">
          <el-icon><DataLine /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">本月浏览</p>
          <p class="stat-value">{{ formatNumber(patchStats?.overview?.month_views || 0) }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">累计浏览</p>
          <p class="stat-value">{{ formatNumber(patchStats?.overview?.total_views || 0) }}</p>
        </div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">📈 Patch 浏览热度趋势（{{ trendDateRangeText }}）</h3>
          <el-select v-model="trendGranularity" size="small" style="width: 100px" @change="fetchTrendData">
            <el-option label="近7天" value="day" />
            <el-option label="近4周" value="week" />
            <el-option label="近6个月" value="month" />
          </el-select>
        </div>
        <div class="line-chart">
          <div class="chart-y-axis">
            <span v-for="(label, idx) in yAxisLabels" :key="idx" class="y-label">{{ label }}</span>
          </div>
          <div class="chart-main">
            <div class="chart-grid">
              <div v-for="i in 5" :key="i" class="grid-line"></div>
            </div>
            <svg class="chart-svg" :viewBox="`0 0 ${chartWidth} ${chartHeight}`" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#667eea" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#667eea" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <polygon v-if="areaPoints" :points="areaPoints" fill="url(#areaGradient)" />
              <polyline
                v-if="linePoints"
                :points="linePoints"
                fill="none"
                stroke="#667eea"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-for="(point, idx) in chartPoints"
                :key="idx"
                :cx="point.x"
                :cy="point.y"
                r="4"
                fill="#fff"
                stroke="#667eea"
                stroke-width="2"
              />
            </svg>
            <div class="chart-x-axis">
              <span v-for="item in trendData" :key="item.period" class="x-label">{{ formatXLabel(item.period) }}</span>
            </div>
          </div>
        </div>
        <div class="chart-tooltip" v-if="hoveredPoint">
          <div class="tooltip-date">{{ hoveredPoint.period }}</div>
          <div class="tooltip-value">浏览量: {{ formatNumber(hoveredPoint.total_views) }}</div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">🌐 访问来源分布</h3>
        </div>
        <div class="source-chart">
          <div class="pie-chart-wrapper">
            <svg class="pie-chart" viewBox="0 0 100 100">
              <circle
                v-for="(segment, idx) in pieSegments"
                :key="idx"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                :stroke="segment.color"
                stroke-width="20"
                :stroke-dasharray="segment.dashArray"
                :stroke-dashoffset="segment.dashOffset"
                :style="{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }"
              />
              <circle cx="50" cy="50" r="25" fill="var(--card-bg)" />
            </svg>
            <div class="pie-center">
              <div class="pie-total">{{ formatNumber(sourceStats?.total_views || 0) }}</div>
              <div class="pie-label">总浏览</div>
            </div>
          </div>
          <div class="source-legend">
            <div
              v-for="source in sourceStats?.sources || []"
              :key="source.source"
              class="legend-item"
            >
              <span class="legend-dot" :style="{ background: getSourceColor(source.source) }"></span>
              <span class="legend-label">{{ getSourceLabel(source.source) }}</span>
              <span class="legend-value">{{ formatNumber(source.views) }}</span>
              <span class="legend-percent">{{ source.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">🏆 Patch 热门排行</h3>
          <div class="rank-filters">
            <el-radio-group v-model="rankPeriod" size="small" @change="fetchRankings">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="today">今日</el-radio-button>
              <el-radio-button label="week">本周</el-radio-button>
              <el-radio-button label="month">本月</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="ranking-list">
          <div
            v-for="item in rankings"
            :key="item.patch_id"
            class="ranking-item"
            @click="goToPatch(item.patch_id)"
          >
            <div class="rank-badge" :class="getRankClass(item.rank)">
              {{ item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : item.rank }}
            </div>
            <div class="rank-info">
              <div class="rank-title">{{ item.title }}</div>
              <div class="rank-author">
                <el-avatar :size="20" :src="item.avatar">
                  {{ item.author_name?.charAt(0).toUpperCase() }}
                </el-avatar>
                <span>{{ item.author_name }}</span>
              </div>
            </div>
            <div class="rank-stats">
              <div class="rank-stat primary">
                <el-icon><View /></el-icon>
                <span>{{ formatNumber(item.period_views) }}</span>
              </div>
              <div class="rank-stat secondary">
                <el-icon><Star /></el-icon>
                <span>{{ formatNumber(item.likes_count) }}</span>
              </div>
            </div>
          </div>
          <div v-if="rankings.length === 0 && !loading" class="empty-ranking">
            暂无排行数据
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">📝 最近动态</h3>
        </div>
        <div class="recent-section">
          <div class="recent-sub-card">
            <h4 class="sub-title">最近注册用户</h4>
            <el-table :data="recentUsers" v-loading="loading" size="small">
              <el-table-column prop="username" label="用户名" />
              <el-table-column prop="created_at" label="注册时间">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <div class="recent-sub-card">
            <h4 class="sub-title">最近发布 Patch</h4>
            <el-table :data="recentPatches" v-loading="loading" size="small">
              <el-table-column prop="title" label="标题" show-overflow-tooltip />
              <el-table-column prop="created_at" label="发布时间">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Document, Box, OfficeBuilding, View, Calendar, DataLine, TrendCharts, Star, Top, Bottom } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const router = useRouter()

const loading = ref(true)
const stats = ref(null)
const recentUsers = ref([])
const recentPatches = ref([])
const patchStats = ref(null)
const sourceStats = ref(null)
const trendData = ref([])
const rankings = ref([])
const rankPeriod = ref('week')
const trendGranularity = ref('day')
const hoveredPoint = ref(null)

const chartWidth = 600
const chartHeight = 200
const chartPadding = 10

const SOURCE_COLORS = {
  direct: '#667eea',
  search: '#f093fb',
  home: '#4facfe',
  patches_list: '#43e97b',
  patch_detail: '#fa709a',
  user_profile: '#fee140',
  collection: '#30cfd0',
  module_detail: '#a8edea',
  notification: '#ff9a9e',
  following_feed: '#ffecd2',
  compare: '#fcb69f',
  activities: '#a1c4fd',
  external: '#d4fc79',
  admin: '#cfd9df'
}

const SOURCE_LABELS = {
  direct: '直接访问',
  search: '搜索',
  home: '首页',
  patches_list: 'Patch 列表',
  patch_detail: 'Patch 详情',
  user_profile: '用户主页',
  collection: '合集',
  module_detail: '模块详情',
  notification: '通知',
  following_feed: '关注动态',
  compare: '对比',
  activities: '活动',
  external: '外部链接',
  admin: '后台管理'
}

const getSourceColor = (source) => SOURCE_COLORS[source] || '#999'
const getSourceLabel = (source) => SOURCE_LABELS[source] || source

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return (num || 0).toLocaleString()
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const formatXLabel = (period) => {
  if (period.includes('-W')) {
    const parts = period.split('-W')
    return `${parts[0]}年第${parseInt(parts[1])}周`
  }
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [y, m] = period.split('-')
    return `${y}年${parseInt(m)}月`
  }
  const d = new Date(period)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const chartPoints = computed(() => {
  if (!trendData.value?.length) return []
  const maxViews = Math.max(...trendData.value.map(t => t.total_views || 0), 1)
  const stepX = trendData.value.length > 1 ? (chartWidth - chartPadding * 2) / (trendData.value.length - 1) : 0
  
  return trendData.value.map((item, idx) => ({
    x: chartPadding + idx * stepX,
    y: chartHeight - chartPadding - ((item.total_views || 0) / maxViews) * (chartHeight - chartPadding * 2),
    period: item.period,
    total_views: item.total_views || 0
  }))
})

const linePoints = computed(() => {
  return chartPoints.value.map(p => `${p.x},${p.y}`).join(' ')
})

const areaPoints = computed(() => {
  if (!chartPoints.value.length) return ''
  const points = chartPoints.value
  const first = points[0]
  const last = points[points.length - 1]
  return `${first.x},${chartHeight} ${points.map(p => `${p.x},${p.y}`).join(' ')} ${last.x},${chartHeight}`
})

const yAxisLabels = computed(() => {
  if (!trendData.value?.length) return ['0', '0', '0', '0', '0']
  const maxViews = Math.max(...trendData.value.map(t => t.total_views || 0), 1)
  return [4, 3, 2, 1, 0].map(i => formatNumber(Math.round((maxViews / 4) * i)))
})

const trendDateRangeText = computed(() => {
  switch (trendGranularity.value) {
    case 'week':
      return '近4周'
    case 'month':
      return '近6个月'
    case 'day':
    default:
      return '近7天'
  }
})

const pieSegments = computed(() => {
  const sources = sourceStats.value?.sources || []
  if (!sources.length) return []
  
  const total = sources.reduce((sum, s) => sum + s.percentage, 0) || 100
  const circumference = 2 * Math.PI * 40
  let offset = 0
  
  return sources.map(s => {
    const length = (s.percentage / total) * circumference
    const segment = {
      color: getSourceColor(s.source),
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset
    }
    offset += length
    return segment
  })
})

const getRankClass = (rank) => {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

const goToPatch = (id) => {
  router.push({ path: `/patches/${id}`, query: { source: 'admin' } })
}

const fetchDashboard = async () => {
  try {
    loading.value = true
    const [statsRes, usersRes, patchesRes] = await Promise.all([
      adminApi.getStats(),
      adminApi.getRecentUsers(),
      adminApi.getRecentPatches()
    ])
    stats.value = statsRes.stats || statsRes.data?.stats || statsRes
    recentUsers.value = usersRes.data || usersRes
    recentPatches.value = patchesRes.data || patchesRes
  } catch (err) {
    ElMessage.error('获取仪表盘数据失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchPatchStats = async () => {
  try {
    const res = await adminApi.getPatchStatsOverview()
    patchStats.value = res
  } catch (err) {
    console.error('获取 Patch 统计概览失败:', err)
  }
}

const fetchSourceStats = async () => {
  try {
    const res = await adminApi.getPatchStatsSources()
    sourceStats.value = res
  } catch (err) {
    console.error('获取访问来源统计失败:', err)
  }
}

const fetchTrendData = async () => {
  try {
    const res = await adminApi.getPatchStatsTrend({ granularity: trendGranularity.value })
    trendData.value = res.trend || []
  } catch (err) {
    console.error('获取热度趋势失败:', err)
  }
}

const fetchRankings = async () => {
  try {
    const res = await adminApi.getPatchStatsRankings({ period: rankPeriod.value, limit: 10 })
    rankings.value = res.rankings || []
  } catch (err) {
    console.error('获取排行榜失败:', err)
  }
}

onMounted(() => {
  fetchDashboard()
  fetchPatchStats()
  fetchSourceStats()
  fetchTrendData()
  fetchRankings()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.page-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: white;
  flex-shrink: 0;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.stat-icon.patches {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.stat-icon.modules {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.stat-icon.manufacturers {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.stat-icon.views {
  background: linear-gradient(135deg, #fa709a, #fee140);
}

.stat-icon.week {
  background: linear-gradient(135deg, #30cfd0, #330867);
}

.stat-icon.month {
  background: linear-gradient(135deg, #a8edea, #fed6e3);
}

.stat-icon.total {
  background: linear-gradient(135deg, #ff9a9e, #fecfef);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.25rem 0;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.stat-growth {
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
}

.stat-growth.positive {
  color: #67c23a;
}

.stat-growth.negative {
  color: #f56c6c;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}

.line-chart {
  display: flex;
  height: 240px;
  position: relative;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 8px;
  width: 50px;
}

.y-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

.chart-main {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.chart-grid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px 0;
}

.grid-line {
  height: 1px;
  background: var(--border-color);
  opacity: 0.5;
}

.chart-svg {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.chart-x-axis {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  padding-left: 10px;
  padding-right: 10px;
}

.x-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.source-chart {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.pie-chart-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
  flex-shrink: 0;
}

.pie-chart {
  width: 100%;
  height: 100%;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.pie-total {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.pie-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.source-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  color: var(--text-primary);
}

.legend-value {
  color: var(--text-secondary);
  min-width: 50px;
  text-align: right;
}

.legend-percent {
  color: var(--text-secondary);
  min-width: 45px;
  text-align: right;
  font-weight: 600;
}

.rank-filters {
  display: flex;
  gap: 0.5rem;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: rgba(255, 215, 0, 0.1);
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.rank-badge.rank-gold {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #fff;
}

.rank-badge.rank-silver {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #fff;
}

.rank-badge.rank-bronze {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #fff;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-title {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.rank-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.rank-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.rank-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.empty-ranking {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.recent-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.recent-sub-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.sub-title {
  font-size: 0.95rem;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

@media (max-width: 1200px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .source-chart {
    flex-direction: column;
  }
}
</style>
