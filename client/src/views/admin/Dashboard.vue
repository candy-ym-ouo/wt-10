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
    </div>

    <div class="recent-section">
      <div class="recent-card">
        <h2 class="card-title">最近注册用户</h2>
        <el-table :data="recentUsers" v-loading="loading">
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="created_at" label="注册时间">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="recent-card">
        <h2 class="card-title">最近发布 Patch</h2>
        <el-table :data="recentPatches" v-loading="loading">
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="author_name" label="作者" />
          <el-table-column prop="created_at" label="发布时间">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Document, Box, OfficeBuilding } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const loading = ref(true)
const stats = ref(null)
const recentUsers = ref([])
const recentPatches = ref([])

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchDashboard = async () => {
  try {
    loading.value = true
    const [statsRes, usersRes, patchesRes] = await Promise.all([
      adminApi.getStats(),
      adminApi.getRecentUsers(),
      adminApi.getRecentPatches()
    ])
    stats.value = statsRes.data
    recentUsers.value = usersRes.data
    recentPatches.value = patchesRes.data
  } catch (err) {
    ElMessage.error('获取仪表盘数据失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
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

.stat-info {
  flex: 1;
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

.recent-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.recent-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.card-title {
  font-size: 1.2rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

@media (max-width: 900px) {
  .recent-section {
    grid-template-columns: 1fr;
  }
}
</style>
