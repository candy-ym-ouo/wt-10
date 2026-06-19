<template>
  <div class="overview-tab">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">用户总数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalUsers || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon patches">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">Patch 总数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalPatches || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon modules">
          <el-icon><Box /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">模块总数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalModules || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon manufacturers">
          <el-icon><OfficeBuilding /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">厂商总数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalManufacturers || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon likes">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">总点赞数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalLikes || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon favorites">
          <el-icon><Collection /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">总收藏数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalFavorites || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon comments">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">总评论数</p>
          <p class="stat-value">{{ overviewData?.stats?.totalComments || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon views">
          <el-icon><View /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">总浏览量</p>
          <p class="stat-value">{{ formatNumber(overviewData?.stats?.totalViews || 0) }}</p>
        </div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <h3 class="chart-title">用户增长趋势（近30天）</h3>
        <div class="bar-chart">
          <div 
            v-for="item in overviewData?.dailyNewUsers || []" 
            :key="item.date"
            class="bar-item"
          >
            <div 
              class="bar" 
              :style="{ height: getBarHeight(item.count, maxUsers) }"
              :title="`${item.date}: ${item.count}人`"
            ></div>
            <span class="bar-label">{{ formatDate(item.date) }}</span>
          </div>
        </div>
      </div>
      
      <div class="chart-card">
        <h3 class="chart-title">Patch 增长趋势（近30天）</h3>
        <div class="bar-chart">
          <div 
            v-for="item in overviewData?.dailyNewPatches || []" 
            :key="item.date"
            class="bar-item"
          >
            <div 
              class="bar patch-bar" 
              :style="{ height: getBarHeight(item.count, maxPatches) }"
              :title="`${item.date}: ${item.count}个`"
            ></div>
            <span class="bar-label">{{ formatDate(item.date) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <h3 class="chart-title">模块类型分布</h3>
        <div class="pie-chart-wrapper">
          <div class="pie-chart" :style="pieStyle">
            <div class="pie-center"></div>
          </div>
          <div class="pie-legend">
            <div 
              v-for="(item, index) in overviewData?.modulesByType || []" 
              :key="item.type"
              class="legend-item"
            >
              <span class="legend-color" :style="{ background: moduleColors[index % moduleColors.length] }"></span>
              <span class="legend-label">{{ item.type }}</span>
              <span class="legend-value">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="chart-card">
        <h3 class="chart-title">Patch 状态分布</h3>
        <div class="status-list">
          <div 
            v-for="item in overviewData?.patchesByStatus || []" 
            :key="item.status"
            class="status-item"
          >
            <div class="status-info">
              <span class="status-name">{{ getStatusLabel(item.status) }}</span>
              <span class="status-count">{{ item.count }}</span>
            </div>
            <el-progress 
              :percentage="getStatusPercentage(item.count)" 
              :color="getStatusColor(item.status)"
              :show-text="false"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card full-width">
        <h3 class="chart-title">用户角色分布</h3>
        <div class="role-list">
          <div 
            v-for="item in overviewData?.usersByRole || []" 
            :key="item.role"
            class="role-item"
          >
            <div class="role-info">
              <span class="role-name">{{ getRoleLabel(item.role) }}</span>
              <span class="role-count">{{ item.count }} 人</span>
            </div>
            <el-progress 
              :percentage="getRolePercentage(item.count)" 
              :color="getRoleColor(item.role)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  User, Document, Box, OfficeBuilding, 
  Star, Collection, ChatDotRound, View 
} from '@element-plus/icons-vue'

const props = defineProps({
  overviewData: Object,
  loading: Boolean
})

const moduleColors = [
  '#667eea', '#f093fb', '#4facfe', '#43e97b',
  '#fa709a', '#fee140', '#30cfd0', '#a8edea',
  '#667eea', '#f5576c'
]

const maxUsers = computed(() => {
  const list = props.overviewData?.dailyNewUsers || []
  return Math.max(...list.map(i => i.count), 1)
})

const maxPatches = computed(() => {
  const list = props.overviewData?.dailyNewPatches || []
  return Math.max(...list.map(i => i.count), 1)
})

const totalPatches = computed(() => {
  return (props.overviewData?.patchesByStatus || []).reduce((sum, item) => sum + item.count, 0) || 1
})

const totalUsers = computed(() => {
  return (props.overviewData?.usersByRole || []).reduce((sum, item) => sum + item.count, 0) || 1
})

const pieStyle = computed(() => {
  const modules = props.overviewData?.modulesByType || []
  const total = modules.reduce((sum, m) => sum + m.count, 0) || 1
  
  let gradient = 'conic-gradient('
  let startAngle = 0
  
  modules.forEach((item, index) => {
    const angle = (item.count / total) * 360
    const color = moduleColors[index % moduleColors.length]
    gradient += `${color} ${startAngle}deg ${startAngle + angle}deg`
    if (index < modules.length - 1) gradient += ', '
    startAngle += angle
  })
  
  gradient += ')'
  return { background: gradient }
})

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getBarHeight = (count, max) => {
  return `${Math.max((count / max) * 100, 2)}%`
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    pending: '#e6a23c',
    approved: '#67c23a',
    rejected: '#f56c6c'
  }
  return colors[status] || '#909399'
}

const getStatusPercentage = (count) => {
  return Math.round((count / totalPatches.value) * 100)
}

const getRoleLabel = (role) => {
  const labels = {
    admin: '管理员',
    user: '普通用户'
  }
  return labels[role] || role
}

const getRoleColor = (role) => {
  const colors = {
    admin: '#8b5cf6',
    user: '#4facfe'
  }
  return colors[role] || '#909399'
}

const getRolePercentage = (count) => {
  return Math.round((count / totalUsers.value) * 100)
}
</script>

<style scoped>
.overview-tab {
  padding: 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  flex-shrink: 0;
}

.stat-icon.users { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-icon.patches { background: linear-gradient(135deg, #f093fb, #f5576c); }
.stat-icon.modules { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-icon.manufacturers { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.stat-icon.likes { background: linear-gradient(135deg, #fa709a, #fee140); }
.stat-icon.favorites { background: linear-gradient(135deg, #30cfd0, #330867); }
.stat-icon.comments { background: linear-gradient(135deg, #a8edea, #fed6e3); color: #666; }
.stat-icon.views { background: linear-gradient(135deg, #ff9a9e, #fecfef); color: #666; }

.stat-info { flex: 1; min-width: 0; }

.stat-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0 0 0.25rem 0;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.chart-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.25rem;
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  gap: 4px;
  padding: 0 0.5rem;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.bar {
  width: 100%;
  max-width: 24px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: all 0.3s ease;
  margin-top: auto;
}

.bar:hover {
  opacity: 0.8;
}

.bar.patch-bar {
  background: linear-gradient(180deg, #f093fb, #f5576c);
}

.bar-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 6px;
  white-space: nowrap;
}

.pie-chart-wrapper {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.pie-chart {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: var(--bg-secondary);
  border-radius: 50%;
}

.pie-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  color: var(--text-primary);
}

.legend-value {
  color: var(--text-secondary);
  font-weight: 600;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-name {
  font-weight: 500;
  color: var(--text-primary);
}

.status-count {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
}

.role-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-name {
  font-weight: 500;
  color: var(--text-primary);
}

.role-count {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .pie-chart-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
