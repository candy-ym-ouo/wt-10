<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🔍 全局搜索</h1>
    </div>

    <div class="search-hero">
      <p class="page-subtitle">统一检索 Patch、模块、厂商，快速定位目标内容</p>
      <UnifiedSearch
        ref="searchRef"
        placeholder="输入关键词搜索 Patch、模块、厂商..."
        :search-types="['patch', 'module', 'manufacturer']"
        :page-size="10"
        admin-mode
        @search="handleSearch"
        @select="handleSelect"
      />
    </div>

    <div class="quick-actions">
      <h3 class="section-title">快捷入口</h3>
      <div class="action-grid">
        <div class="action-card" @click="goToPatches">
          <div class="action-icon patch">📝</div>
          <div class="action-info">
            <div class="action-title">Patch 管理</div>
            <div class="action-desc">管理所有用户提交的 Patch 作品</div>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="action-card" @click="goToModules">
          <div class="action-icon module">🧩</div>
          <div class="action-info">
            <div class="action-title">模块管理</div>
            <div class="action-desc">管理合成器模块数据库</div>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="action-card" @click="goToManufacturers">
          <div class="action-icon mfr">🏭</div>
          <div class="action-info">
            <div class="action-title">厂商管理</div>
            <div class="action-desc">管理模块厂商信息</div>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="action-card" @click="goToSearchOps">
          <div class="action-icon ops">⚙️</div>
          <div class="action-info">
            <div class="action-title">搜索运营</div>
            <div class="action-desc">管理热搜词和广告位</div>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <div v-if="recentSearches.length > 0" class="recent-searches">
      <h3 class="section-title">最近搜索</h3>
      <div class="recent-list">
        <span
          v-for="(item, idx) in recentSearches"
          :key="idx"
          class="recent-tag"
          @click="doQuickSearch(item.keyword)"
        >
          <el-icon><Clock /></el-icon>
          {{ item.keyword }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Clock } from '@element-plus/icons-vue'
import UnifiedSearch from '@/components/UnifiedSearch.vue'
import { searchAPI } from '@/api'

const router = useRouter()
const searchRef = ref(null)
const recentSearches = ref([])

const handleSearch = (data) => {
  console.log('Search performed:', data)
  fetchRecentSearches()
}

const handleSelect = (data) => {
  console.log('Item selected:', data)
}

const doQuickSearch = (keyword) => {
  if (searchRef.value) {
    searchRef.value.keyword = keyword
    searchRef.value.search()
  }
}

const goToPatches = () => router.push('/admin/patches')
const goToModules = () => router.push('/admin/modules')
const goToManufacturers = () => router.push('/admin/manufacturers')
const goToSearchOps = () => router.push('/admin/search')

const fetchRecentSearches = async () => {
  try {
    const res = await searchAPI.getMyHistory({ limit: 10 })
    recentSearches.value = res.list || []
  } catch (e) {
    // ignore
  }
}

onMounted(() => {
  fetchRecentSearches()
})
</script>

<style scoped>
.search-hero {
  text-align: center;
  padding: 32px 0;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.quick-actions {
  max-width: 960px;
  margin: 40px auto 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
  transform: translateY(-2px);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.action-icon.patch {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(255, 107, 107, 0.05));
}

.action-icon.module {
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(78, 205, 196, 0.05));
}

.action-icon.mfr {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.05));
}

.action-icon.ops {
  background: linear-gradient(135deg, rgba(156, 136, 255, 0.2), rgba(156, 136, 255, 0.05));
}

.action-info {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 15px;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.action-card .el-icon {
  color: var(--text-muted);
  transition: transform 0.3s ease;
}

.action-card:hover .el-icon {
  color: var(--primary-color);
  transform: translateX(4px);
}

.recent-searches {
  max-width: 960px;
  margin: 32px auto 0;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.recent-tag:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(139, 92, 246, 0.1);
}

.recent-tag .el-icon {
  font-size: 12px;
}
</style>
