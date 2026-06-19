<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎉 运营活动中心</h1>
      <p class="page-subtitle">参与丰富的社区活动，展示你的创作才华</p>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="activeTab" @change="filterChange">
        <el-radio-button value="all">全部活动</el-radio-button>
        <el-radio-button value="published">进行中</el-radio-button>
        <el-radio-button value="upcoming">即将开始</el-radio-button>
        <el-radio-button value="ended">已结束</el-radio-button>
      </el-radio-group>

      <el-select v-model="typeFilter" placeholder="活动类型" @change="filterChange" clearable>
        <el-option label="创作大赛" value="contest" />
        <el-option label="专题征集" value="collection" />
        <el-option label="投票评选" value="vote" />
        <el-option label="其他活动" value="other" />
      </el-select>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="activities.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Calendar /></el-icon>
      <p>暂无活动</p>
    </div>

    <div v-else class="activities-grid">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-card"
        @click="goToDetail(activity)"
      >
        <div class="activity-cover">
          <img v-if="activity.cover_url" :src="activity.cover_url" :alt="activity.title" />
          <div v-else class="cover-placeholder">
            <span class="cover-icon">{{ getTypeIcon(activity.type) }}</span>
          </div>
          <div class="activity-badges">
            <span :class="['status-badge', activity.status]">
              {{ getStatusText(activity.status) }}
            </span>
            <span class="type-badge">{{ getTypeText(activity.type) }}</span>
          </div>
          <div class="activity-stats-overlay">
            <span><el-icon><User /></el-icon> {{ activity.registration_count }}</span>
            <span><el-icon><Document /></el-icon> {{ activity.submission_count }}</span>
          </div>
        </div>
        <div class="activity-info">
          <h3 class="activity-title">{{ activity.title }}</h3>
          <p class="activity-desc">{{ activity.description || '暂无描述' }}</p>
          
          <div class="activity-dates">
            <div class="date-item">
              <el-icon><Calendar /></el-icon>
              <span>报名: {{ formatDateRange(activity.registration_start, activity.registration_end) }}</span>
            </div>
            <div class="date-item">
              <el-icon><Clock /></el-icon>
              <span>活动: {{ formatDateRange(activity.start_date, activity.end_date) }}</span>
            </div>
          </div>

          <div class="activity-footer">
            <div class="prizes" v-if="activity.prizes">
              <el-icon><Trophy /></el-icon>
              <span>{{ activity.prizes }}</span>
            </div>
            <el-button type="primary" size="small" class="btn-join">
              {{ activity.is_registered ? '已报名' : '立即参与' }}
            </el-button>
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
        @current-change="fetchData"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, Calendar, User, Document, Clock, Trophy } from '@element-plus/icons-vue'
import { activityApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const activities = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12
const activeTab = ref('all')
const typeFilter = ref('')

const getTypeIcon = (type) => {
  const icons = {
    contest: '🏆',
    collection: '📝',
    vote: '🗳️',
    other: '🎪'
  }
  return icons[type] || '🎯'
}

const getTypeText = (type) => {
  const texts = {
    contest: '创作大赛',
    collection: '专题征集',
    vote: '投票评选',
    other: '其他活动'
  }
  return texts[type] || '活动'
}

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    published: '进行中',
    upcoming: '即将开始',
    ended: '已结束'
  }
  return texts[status] || status
}

const formatDate = (dateStr) => {
  if (!dateStr) return '待定'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateRange = (start, end) => {
  const s = formatDate(start)
  const e = formatDate(end)
  if (s === e) return s
  return `${s} ~ ${e}`
}

const filterChange = () => {
  page.value = 1
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit
    }
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    if (typeFilter.value) {
      params.type = typeFilter.value
    }
    const res = await activityApi.getActivities(params)
    activities.value = res.list || res || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const goToDetail = (activity) => {
  router.push(`/activities/${activity.id}`)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.page-header {
  text-align: center;
  padding: 40px 0 30px;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 8px;
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.activity-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.activity-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
}

.activity-cover {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 170, 0, 0.05));
}

.activity-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 72px;
}

.activity-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
}

.status-badge, .type-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

.status-badge {
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
}

.status-badge.published {
  background: rgba(67, 233, 123, 0.8);
  color: #000;
}

.status-badge.upcoming {
  background: rgba(79, 172, 254, 0.8);
  color: #fff;
}

.status-badge.ended {
  background: rgba(156, 163, 175, 0.8);
  color: #fff;
}

.type-badge {
  background: rgba(255, 215, 0, 0.8);
  color: #1a1a2e;
}

.activity-stats-overlay {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 12px;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  backdrop-filter: blur(4px);
}

.activity-stats-overlay span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.activity-info {
  padding: 20px;
}

.activity-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  line-height: 1.4;
}

.activity-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.activity-dates {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.date-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
}

.activity-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.prizes {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: #ffd700;
  flex: 1;
  overflow: hidden;
}

.prizes span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-join {
  flex-shrink: 0;
}

.pagination {
  display: flex;
  justify-content: center;
  margin: 40px 0;
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

@media (max-width: 600px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
