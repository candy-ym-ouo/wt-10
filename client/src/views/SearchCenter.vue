<template>
  <div class="container">
    <div class="search-hero">
      <h1 class="page-title">🔍 全局搜索中心</h1>
      <p class="page-subtitle">统一搜索 Patch、模块、厂商、用户、专题</p>

      <div class="search-box">
        <el-input
          v-model="keyword"
          placeholder="输入关键词搜索全站内容..."
          size="large"
          :prefix-icon="Search"
          @keyup.enter="doSearch"
          clearable
          @clear="onClear"
        >
          <template #append>
            <el-button @click="doSearch" type="primary" class="btn-primary">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </template>
        </el-input>
        <div v-if="suggestions.length > 0 && !hasSearched" class="suggestions-dropdown">
          <div
            v-for="s in suggestions"
            :key="s"
            class="suggestion-item"
            @click="keyword = s; doSearch()"
          >
            <el-icon><Search /></el-icon>
            {{ s }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="!hasSearched" class="pre-search">
      <div v-if="ads.length > 0" class="search-ads">
        <div
          v-for="ad in ads"
          :key="ad.id"
          class="ad-card"
          @click="goAdLink(ad)"
        >
          <img v-if="ad.image_url" :src="ad.image_url" class="ad-image" />
          <div class="ad-info">
            <div class="ad-title">{{ ad.title }}</div>
            <div v-if="ad.description" class="ad-desc">{{ ad.description }}</div>
          </div>
          <el-tag size="small" type="warning">推广</el-tag>
        </div>
      </div>

      <div class="hot-and-history">
        <div class="hot-section">
          <div class="section-header">
            <h3>🔥 热门搜索</h3>
          </div>
          <div class="hot-list">
            <span
              v-for="(item, idx) in hotQueries"
              :key="item.keyword"
              class="hot-tag"
              :class="{ 'top3': idx < 3 }"
              @click="keyword = item.keyword; doSearch()"
            >
              <span class="hot-rank">{{ idx + 1 }}</span>
              {{ item.keyword }}
              <el-icon v-if="item.is_pinned" class="pin-icon"><Star /></el-icon>
            </span>
          </div>
        </div>

        <div v-if="searchHistory.length > 0" class="history-section">
          <div class="section-header">
            <h3>🕐 搜索历史</h3>
            <el-button link type="danger" @click="clearHistory">清空</el-button>
          </div>
          <div class="history-list">
            <span
              v-for="item in searchHistory"
              :key="item.keyword"
              class="history-tag"
              @click="keyword = item.keyword; doSearch()"
            >
              {{ item.keyword }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="search-results">
      <div class="results-header">
        <span class="results-count">找到 <strong>{{ totalResults }}</strong> 条结果</span>
        <div class="type-tabs">
          <span
            v-for="tab in typeTabs"
            :key="tab.key"
            class="type-tab"
            :class="{ active: activeType === tab.key }"
            @click="switchType(tab.key)"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </span>
        </div>
      </div>

      <div v-if="loading" class="empty-state">
        <el-icon class="empty-icon"><Loading /></el-icon>
        <p>搜索中...</p>
      </div>

      <div v-else-if="totalResults === 0" class="empty-state">
        <el-icon class="empty-icon"><Search /></el-icon>
        <p>未找到相关结果，试试其他关键词？</p>
      </div>

      <template v-else>
        <div v-if="activeType === 'all' || activeType === 'patch'" class="result-section">
          <div class="section-label">
            <el-icon><Collection /></el-icon> Patch
            <span class="count-badge">{{ results.patches?.total || 0 }}</span>
          </div>
          <div class="patch-results">
            <div
              v-for="item in (results.patches?.list || [])"
              :key="item.id"
              class="result-card"
              @click="$router.push(`/patches/${item.id}`)"
            >
              <div class="result-thumb">
                <img v-if="item.image_url" :src="item.image_url" />
                <span v-else>🎛️</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlight(item.title)"></div>
                <div class="result-desc" v-html="highlight(truncate(item.description, 100))"></div>
                <div class="result-meta">
                  <span v-if="item.username">👤 {{ item.username }}</span>
                  <span>❤️ {{ item.likes_count || 0 }}</span>
                  <span>👁️ {{ item.views_count || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'all' || activeType === 'module'" class="result-section">
          <div class="section-label">
            <el-icon><Cpu /></el-icon> 模块
            <span class="count-badge">{{ results.modules?.total || 0 }}</span>
          </div>
          <div class="module-results">
            <div
              v-for="item in (results.modules?.list || [])"
              :key="item.id"
              class="result-card compact"
              @click="$router.push(`/modules/${item.id}`)"
            >
              <div class="result-thumb small">
                <img v-if="item.image" :src="item.image" />
                <span v-else>🧩</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlight(item.name)"></div>
                <div class="result-desc">
                  <el-tag size="small" type="info">{{ item.type }}</el-tag>
                  <span v-if="item.manufacturer_name">{{ item.manufacturer_name }}</span>
                  <span v-if="item.hp">{{ item.hp }} HP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'all' || activeType === 'manufacturer'" class="result-section">
          <div class="section-label">
            <el-icon><OfficeBuilding /></el-icon> 厂商
            <span class="count-badge">{{ results.manufacturers?.total || 0 }}</span>
          </div>
          <div class="mfr-results">
            <div
              v-for="item in (results.manufacturers?.list || [])"
              :key="item.id"
              class="result-card compact"
              @click="$router.push('/modules?manufacturer_id=' + item.id)"
            >
              <div class="result-thumb small">
                <img v-if="item.logo" :src="item.logo" />
                <span v-else>🏭</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlight(item.name)"></div>
                <div class="result-desc">
                  <span v-if="item.country">{{ item.country }}</span>
                  <span>{{ item.modules_count || 0 }} 个模块</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'all' || activeType === 'user'" class="result-section">
          <div class="section-label">
            <el-icon><User /></el-icon> 用户
            <span class="count-badge">{{ results.users?.total || 0 }}</span>
          </div>
          <div class="user-results">
            <div
              v-for="item in (results.users?.list || [])"
              :key="item.id"
              class="result-card compact"
              @click="$router.push(`/users/${item.id}`)"
            >
              <el-avatar :size="40" :src="item.avatar">
                {{ item.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <div class="result-body">
                <div class="result-title">
                  <span v-html="highlight(item.username)"></span>
                  <el-tag v-if="item.is_creator_verified" size="small" type="warning">认证创作者</el-tag>
                </div>
                <div class="result-desc" v-if="item.bio">{{ truncate(item.bio, 60) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'all' || activeType === 'collection'" class="result-section">
          <div class="section-label">
            <el-icon><CollectionTag /></el-icon> 专题
            <span class="count-badge">{{ results.collections?.total || 0 }}</span>
          </div>
          <div class="collection-results">
            <div
              v-for="item in (results.collections?.list || [])"
              :key="item.id"
              class="result-card"
              @click="$router.push(`/collections/${item.id}`)"
            >
              <div class="result-thumb">
                <img v-if="item.cover_image" :src="item.cover_image" />
                <span v-else>🎯</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlight(item.title)"></div>
                <div class="result-desc" v-if="item.description" v-html="highlight(truncate(item.description, 80))"></div>
                <div class="result-meta">
                  <span>{{ item.patches_count || 0 }} 个 Patch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Collection, Cpu, OfficeBuilding, User, CollectionTag, Star, Loading } from '@element-plus/icons-vue'
import { searchAPI } from '@/api'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const hasSearched = ref(false)
const loading = ref(false)
const results = ref({})
const totalResults = ref(0)
const activeType = ref('all')
const hotQueries = ref([])
const searchHistory = ref([])
const ads = ref([])
const suggestions = ref([])

let suggestTimer = null

const typeTabs = computed(() => [
  { key: 'all', label: '全部', count: totalResults.value },
  { key: 'patch', label: 'Patch', count: results.value.patches?.total || 0 },
  { key: 'module', label: '模块', count: results.value.modules?.total || 0 },
  { key: 'manufacturer', label: '厂商', count: results.value.manufacturers?.total || 0 },
  { key: 'user', label: '用户', count: results.value.users?.total || 0 },
  { key: 'collection', label: '专题', count: results.value.collections?.total || 0 }
])

const doSearch = async () => {
  if (!keyword.value.trim()) return
  hasSearched.value = true
  loading.value = true
  suggestions.value = []
  activeType.value = 'all'

  try {
    const types = activeType.value === 'all' ? undefined : activeType.value
    const res = await searchAPI.globalSearch({ keyword: keyword.value.trim(), types, limit: 5 })
    results.value = res.results || {}
    totalResults.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const switchType = async (type) => {
  activeType.value = type
  if (type === 'all') {
    doSearch()
    return
  }
  loading.value = true
  try {
    const res = await searchAPI.globalSearch({ keyword: keyword.value.trim(), types: type, limit: 10 })
    results.value = { ...results.value, [type === 'patch' ? 'patches' : type === 'module' ? 'modules' : type === 'manufacturer' ? 'manufacturers' : type === 'user' ? 'users' : 'collections']: res.results[type === 'patch' ? 'patches' : type === 'module' ? 'modules' : type === 'manufacturer' ? 'manufacturers' : type === 'user' ? 'users' : 'collections'] || { list: [], total: 0 } }
  } finally {
    loading.value = false
  }
}

const highlight = (text) => {
  if (!text || !keyword.value.trim()) return text
  const escaped = keyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

const truncate = (text, len) => {
  if (!text) return ''
  return text.length > len ? text.substring(0, len) + '...' : text
}

const onClear = () => {
  hasSearched.value = false
  results.value = {}
  totalResults.value = 0
}

const goAdLink = (ad) => {
  if (ad.link_type === 'external') {
    window.open(ad.link_url, '_blank')
  } else {
    router.push(ad.link_url)
  }
}

const fetchHotQueries = async () => {
  try {
    const res = await searchAPI.getHotQueries({ limit: 15 })
    hotQueries.value = res.list || []
  } catch (e) { /* ignore */ }
}

const fetchHistory = async () => {
  try {
    const res = await searchAPI.getMyHistory({ limit: 10 })
    searchHistory.value = res.list || []
  } catch (e) { /* ignore */ }
}

const fetchAds = async () => {
  try {
    const res = await searchAPI.getSearchAds({ position: 'search_top' })
    ads.value = res.list || []
  } catch (e) { /* ignore */ }
}

const clearHistory = async () => {
  try {
    await searchAPI.clearMyHistory()
    searchHistory.value = []
  } catch (e) { /* ignore */ }
}

watch(keyword, (val) => {
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!val.trim() || hasSearched.value) {
    suggestions.value = []
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await searchAPI.getSuggestions({ keyword: val.trim(), limit: 6 })
      suggestions.value = res.suggestions || []
    } catch (e) {
      suggestions.value = []
    }
  }, 300)
})

onMounted(() => {
  fetchHotQueries()
  fetchAds()
  fetchHistory()

  if (route.query.q) {
    keyword.value = route.query.q
    doSearch()
  }
})
</script>

<style scoped>
.search-hero {
  text-align: center;
  padding: 48px 0 32px;
}

.search-box {
  max-width: 640px;
  margin: 24px auto 0;
  position: relative;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #2a2a3e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-top: 4px;
  z-index: 50;
  overflow: hidden;
}

.suggestion-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  transition: background 0.2s;
}

.suggestion-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.suggestion-item .el-icon {
  color: rgba(255, 255, 255, 0.4);
}

.pre-search {
  max-width: 900px;
  margin: 0 auto;
}

.search-ads {
  margin-bottom: 32px;
}

.ad-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 12px;
}

.ad-card:hover {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.08);
}

.ad-image {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.ad-info {
  flex: 1;
}

.ad-title {
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.ad-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.hot-and-history {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  color: #ffd700;
  font-size: 16px;
}

.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hot-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
}

.hot-tag:hover {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.3);
  color: #ffd700;
}

.hot-tag.top3 {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.hot-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 700;
}

.top3 .hot-rank {
  background: rgba(255, 215, 0, 0.3);
  color: #1a1a2e;
}

.pin-icon {
  color: #ffd700;
  font-size: 12px;
}

.history-section {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding-left: 24px;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.history-tag:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.search-results {
  max-width: 960px;
  margin: 0 auto;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.results-count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.results-count strong {
  color: #ffd700;
  font-size: 18px;
}

.type-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.type-tab {
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.type-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.type-tab.active {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.tab-count {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 8px;
}

.type-tab.active .tab-count {
  background: rgba(255, 215, 0, 0.3);
}

.result-section {
  margin-bottom: 32px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.15);
}

.count-badge {
  font-size: 12px;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 400;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.result-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 215, 0, 0.2);
  transform: translateX(4px);
}

.result-card.compact {
  padding: 12px 16px;
}

.result-thumb {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 32px;
}

.result-thumb.small {
  width: 48px;
  height: 48px;
  font-size: 24px;
}

.result-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-body {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 600;
  color: #fff;
  font-size: 15px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-title :deep(mark) {
  background: rgba(255, 215, 0, 0.3);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

.result-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-desc :deep(mark) {
  background: rgba(255, 215, 0, 0.3);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

.result-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .hot-and-history {
    grid-template-columns: 1fr;
  }

  .history-section {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 24px;
  }

  .result-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-thumb {
    width: 100%;
    height: 120px;
  }

  .result-thumb.small {
    width: 48px;
    height: 48px;
  }
}
</style>
