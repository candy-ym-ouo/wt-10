<template>
  <div class="unified-search">
    <div class="search-input-wrapper" :class="{ focused: isFocused }">
      <el-input
        ref="searchInput"
        v-model="keyword"
        :placeholder="placeholder"
        size="large"
        clearable
        @keyup.enter="handleSearch"
        @focus="isFocused = true"
        @blur="handleBlur"
        @clear="handleClear"
        class="search-input"
      >
        <template #prefix>
          <el-icon class="search-icon"><Search /></el-icon>
        </template>
        <template #append>
          <el-button @click="handleSearch" type="primary" class="search-btn">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </template>
      </el-input>

      <div v-if="showDropdown" class="search-dropdown">
        <div v-if="suggestions.length > 0" class="dropdown-section">
          <div class="section-title">
            <el-icon><MagicStick /></el-icon>
            搜索联想
          </div>
          <div
            v-for="(item, idx) in suggestions"
            :key="'sug-' + idx"
            class="dropdown-item"
            @mousedown.prevent="selectSuggestion(item)"
          >
            <el-icon class="item-icon"><Search /></el-icon>
            <span class="item-text" v-html="highlightText(item)"></span>
          </div>
        </div>

        <div v-if="searchHistory.length > 0 && keyword.trim() === ''" class="dropdown-section">
          <div class="section-title">
            <el-icon><Clock /></el-icon>
            搜索历史
            <el-button link type="danger" size="small" @mousedown.prevent="clearHistory">
              清空
            </el-button>
          </div>
          <div
            v-for="(item, idx) in searchHistory"
            :key="'hist-' + idx"
            class="dropdown-item"
            @mousedown.prevent="selectHistory(item)"
          >
            <el-icon class="item-icon history"><Clock /></el-icon>
            <span class="item-text">{{ item.keyword }}</span>
          </div>
        </div>

        <div v-if="hotQueries.length > 0 && keyword.trim() === ''" class="dropdown-section">
          <div class="section-title">
            <el-icon><TrendCharts /></el-icon>
            热门搜索
          </div>
          <div
            v-for="(item, idx) in hotQueries"
            :key="'hot-' + idx"
            class="dropdown-item"
            @mousedown.prevent="selectHotQuery(item)"
          >
            <span class="hot-rank" :class="{ top3: idx < 3 }">{{ idx + 1 }}</span>
            <span class="item-text">{{ item.keyword }}</span>
            <el-tag v-if="item.is_pinned" size="small" type="warning" effect="light">
              置顶
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasSearched && showResults" class="search-results-container">
      <div class="results-header">
        <span class="results-count">
          找到 <strong>{{ totalResults }}</strong> 条结果
        </span>
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
        <el-icon class="empty-icon is-loading"><Loading /></el-icon>
        <p>搜索中...</p>
      </div>

      <div v-else-if="totalResults === 0" class="empty-state">
        <el-icon class="empty-icon"><Search /></el-icon>
        <p>未找到相关结果，试试其他关键词？</p>
      </div>

      <template v-else>
        <div v-if="activeType === 'all' || activeType === 'patch'" class="result-section">
          <div class="section-label">
            <el-icon><Collection /></el-icon>
            Patch
            <span class="count-badge">{{ results.patches?.total || 0 }}</span>
            <el-button
              v-if="activeType === 'all' && results.patches?.total > 3"
              link
              size="small"
              @click="switchType('patch')"
            >
              查看全部
            </el-button>
          </div>
          <div class="result-list">
            <div
              v-for="item in displayPatches"
              :key="'patch-' + item.id"
              class="result-card"
              @click="navigateTo('patch', item)"
            >
              <div class="result-thumb">
                <img v-if="item.image_url" :src="item.image_url" />
                <span v-else>🎛️</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlightText(item.title || item.name)"></div>
                <div class="result-desc" v-html="highlightText(truncate(item.description, 100))"></div>
                <div class="result-meta">
                  <span v-if="item.author_name || item.username">👤 {{ item.author_name || item.username }}</span>
                  <span>❤️ {{ item.likes_count || 0 }}</span>
                  <span>👁️ {{ item.views_count || 0 }}</span>
                </div>
              </div>
              <div class="result-actions">
                <el-button size="small" type="primary" @click.stop="navigateTo('patch', item)">
                  查看
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'all' || activeType === 'module'" class="result-section">
          <div class="section-label">
            <el-icon><Cpu /></el-icon>
            模块
            <span class="count-badge">{{ results.modules?.total || 0 }}</span>
            <el-button
              v-if="activeType === 'all' && results.modules?.total > 3"
              link
              size="small"
              @click="switchType('module')"
            >
              查看全部
            </el-button>
          </div>
          <div class="result-list">
            <div
              v-for="item in displayModules"
              :key="'module-' + item.id"
              class="result-card compact"
              @click="navigateTo('module', item)"
            >
              <div class="result-thumb small">
                <img v-if="item.image" :src="item.image" />
                <span v-else>🧩</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlightText(item.name)"></div>
                <div class="result-desc">
                  <el-tag size="small" type="info">{{ item.type }}</el-tag>
                  <span v-if="item.manufacturer_name">{{ item.manufacturer_name }}</span>
                  <span v-if="item.hp">{{ item.hp }} HP</span>
                </div>
              </div>
              <div class="result-actions">
                <el-button size="small" type="primary" @click.stop="navigateTo('module', item)">
                  查看
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'all' || activeType === 'manufacturer'" class="result-section">
          <div class="section-label">
            <el-icon><OfficeBuilding /></el-icon>
            厂商
            <span class="count-badge">{{ results.manufacturers?.total || 0 }}</span>
            <el-button
              v-if="activeType === 'all' && results.manufacturers?.total > 3"
              link
              size="small"
              @click="switchType('manufacturer')"
            >
              查看全部
            </el-button>
          </div>
          <div class="result-list">
            <div
              v-for="item in displayManufacturers"
              :key="'mfr-' + item.id"
              class="result-card compact"
              @click="navigateTo('manufacturer', item)"
            >
              <div class="result-thumb small">
                <img v-if="item.logo" :src="item.logo" />
                <span v-else>🏭</span>
              </div>
              <div class="result-body">
                <div class="result-title" v-html="highlightText(item.name)"></div>
                <div class="result-desc">
                  <span v-if="item.country">{{ item.country }}</span>
                  <span>{{ item.modules_count || 0 }} 个模块</span>
                </div>
              </div>
              <div class="result-actions">
                <el-button size="small" type="primary" @click.stop="navigateTo('manufacturer', item)">
                  查看
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeType !== 'all' && hasMore" class="load-more">
          <el-button @click="loadMore" :loading="loadingMore">
            加载更多
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search, Clock, TrendCharts, MagicStick, Loading,
  Collection, Cpu, OfficeBuilding
} from '@element-plus/icons-vue'
import { searchAPI } from '@/api'

const props = defineProps({
  placeholder: {
    type: String,
    default: '搜索 Patch、模块、厂商...'
  },
  showResults: {
    type: Boolean,
    default: true
  },
  searchTypes: {
    type: Array,
    default: () => ['patch', 'module', 'manufacturer']
  },
  pageSize: {
    type: Number,
    default: 5
  },
  adminMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['search', 'select', 'clear'])

const router = useRouter()
const searchInput = ref(null)

const keyword = ref('')
const isFocused = ref(false)
const hasSearched = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const results = ref({})
const totalResults = ref(0)
const activeType = ref('all')
const currentPage = ref(1)
const suggestions = ref([])
const searchHistory = ref([])
const hotQueries = ref([])

let suggestTimer = null
let dropdownHideTimer = null

const typeTabs = computed(() => {
  const tabs = [{ key: 'all', label: '全部', count: totalResults.value }]
  if (props.searchTypes.includes('patch')) {
    tabs.push({ key: 'patch', label: 'Patch', count: results.value.patches?.total || 0 })
  }
  if (props.searchTypes.includes('module')) {
    tabs.push({ key: 'module', label: '模块', count: results.value.modules?.total || 0 })
  }
  if (props.searchTypes.includes('manufacturer')) {
    tabs.push({ key: 'manufacturer', label: '厂商', count: results.value.manufacturers?.total || 0 })
  }
  return tabs
})

const showDropdown = computed(() => {
  if (!isFocused.value || hasSearched.value) return false
  return suggestions.length > 0 || searchHistory.value.length > 0 || hotQueries.value.length > 0
})

const displayPatches = computed(() => {
  const list = results.value.patches?.list || []
  return activeType.value === 'all' ? list.slice(0, 3) : list
})

const displayModules = computed(() => {
  const list = results.value.modules?.list || []
  return activeType.value === 'all' ? list.slice(0, 3) : list
})

const displayManufacturers = computed(() => {
  const list = results.value.manufacturers?.list || []
  return activeType.value === 'all' ? list.slice(0, 3) : list
})

const hasMore = computed(() => {
  if (activeType.value === 'all') return false
  const typeKey = activeType.value === 'patch' ? 'patches' :
                  activeType.value === 'module' ? 'modules' : 'manufacturers'
  const total = results.value[typeKey]?.total || 0
  const current = results.value[typeKey]?.list?.length || 0
  return current < total
})

const highlightText = (text) => {
  if (!text || !keyword.value.trim()) return text
  const escaped = keyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(text).replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="highlight">$1</mark>'
  )
}

const truncate = (text, len) => {
  if (!text) return ''
  return text.length > len ? text.substring(0, len) + '...' : text
}

const handleBlur = () => {
  dropdownHideTimer = setTimeout(() => {
    isFocused.value = false
  }, 200)
}

const handleSearch = async () => {
  if (!keyword.value.trim()) return

  hasSearched.value = true
  loading.value = true
  suggestions.value = []
  activeType.value = 'all'
  currentPage.value = 1

  try {
    const types = props.searchTypes.join(',')
    const res = await searchAPI.globalSearch({
      keyword: keyword.value.trim(),
      types,
      limit: props.pageSize
    })
    results.value = res.results || {}
    totalResults.value = res.total || 0
    emit('search', { keyword: keyword.value, results: results.value })
  } catch (e) {
    ElMessage.error('搜索失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const switchType = async (type) => {
  activeType.value = type
  currentPage.value = 1

  if (type === 'all') {
    handleSearch()
    return
  }

  loading.value = true
  try {
    const res = await searchAPI.globalSearch({
      keyword: keyword.value.trim(),
      types: type,
      limit: props.pageSize
    })
    const typeKey = type === 'patch' ? 'patches' :
                    type === 'module' ? 'modules' : 'manufacturers'
    results.value = {
      ...results.value,
      [typeKey]: res.results[typeKey] || { list: [], total: 0 }
    }
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (activeType.value === 'all') return

  loadingMore.value = true
  currentPage.value += 1

  try {
    const typeKey = activeType.value === 'patch' ? 'patches' :
                    activeType.value === 'module' ? 'modules' : 'manufacturers'
    const res = await searchAPI.globalSearch({
      keyword: keyword.value.trim(),
      types: activeType.value,
      limit: props.pageSize,
      offset: (currentPage.value - 1) * props.pageSize
    })
    const newItems = res.results[typeKey]?.list || []
    results.value[typeKey].list = [...results.value[typeKey].list, ...newItems]
  } finally {
    loadingMore.value = false
  }
}

const selectSuggestion = (item) => {
  keyword.value = item
  handleSearch()
}

const selectHistory = (item) => {
  keyword.value = item.keyword
  handleSearch()
}

const selectHotQuery = (item) => {
  keyword.value = item.keyword
  handleSearch()
}

const handleClear = () => {
  keyword.value = ''
  hasSearched.value = false
  results.value = {}
  totalResults.value = 0
  activeType.value = 'all'
  currentPage.value = 1
  emit('clear')
}

const clearHistory = async () => {
  try {
    await searchAPI.clearMyHistory()
    searchHistory.value = []
    ElMessage.success('已清空搜索历史')
  } catch (e) {
    console.error(e)
  }
}

const navigateTo = (type, item) => {
  emit('select', { type, item })

  let path = ''
  if (props.adminMode) {
    if (type === 'patch') path = `/admin/patches`
    else if (type === 'module') path = `/admin/modules`
    else if (type === 'manufacturer') path = `/admin/manufacturers`
  } else {
    if (type === 'patch') path = `/patches/${item.id}`
    else if (type === 'module') path = `/modules/${item.id}`
    else if (type === 'manufacturer') path = `/modules?manufacturer_id=${item.id}`
  }
  router.push(path)
}

const fetchSuggestions = async (val) => {
  if (!val.trim()) {
    suggestions.value = []
    return
  }
  try {
    const res = await searchAPI.getSuggestions({
      keyword: val.trim(),
      types: props.searchTypes.join(','),
      limit: 6
    })
    suggestions.value = res.suggestions || []
  } catch (e) {
    suggestions.value = []
  }
}

const fetchHotQueries = async () => {
  try {
    const res = await searchAPI.getHotQueries({ limit: 10 })
    hotQueries.value = res.list || []
  } catch (e) {
    hotQueries.value = []
  }
}

const fetchHistory = async () => {
  try {
    const res = await searchAPI.getMyHistory({ limit: 8 })
    searchHistory.value = res.list || []
  } catch (e) {
    searchHistory.value = []
  }
}

watch(keyword, (val) => {
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!val.trim()) {
    suggestions.value = []
    return
  }
  suggestTimer = setTimeout(() => fetchSuggestions(val), 300)
})

watch(isFocused, (val) => {
  if (val) {
    if (dropdownHideTimer) clearTimeout(dropdownHideTimer)
    fetchHotQueries()
    fetchHistory()
  }
})

onMounted(() => {
  fetchHotQueries()
})

defineExpose({
  focus: () => searchInput.value?.focus(),
  clear: handleClear,
  search: handleSearch
})
</script>

<style scoped>
.unified-search {
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  max-width: 700px;
  margin: 0 auto;
}

.search-input-wrapper :deep(.el-input__wrapper) {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 8px 12px;
  transition: all 0.3s ease;
}

.search-input-wrapper.focused :deep(.el-input__wrapper) {
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.25);
}

.search-icon {
  color: var(--text-secondary);
}

.search-btn {
  border-radius: 8px;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}

.dropdown-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.dropdown-section:last-child {
  border-bottom: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  justify-content: space-between;
}

.section-title .el-icon {
  color: var(--primary-color);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: rgba(139, 92, 246, 0.1);
}

.item-icon {
  color: var(--text-muted);
  font-size: 14px;
}

.item-icon.history {
  color: var(--text-secondary);
}

.item-text {
  flex: 1;
  color: var(--text-primary);
  font-size: 14px;
}

.item-text :deep(.highlight) {
  background: rgba(255, 215, 0, 0.25);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

.hot-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.hot-rank.top3 {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.search-results-container {
  max-width: 960px;
  margin: 24px auto 0;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.results-count {
  color: var(--text-secondary);
  font-size: 14px;
}

.results-count strong {
  color: var(--primary-color);
  font-size: 18px;
  margin: 0 4px;
}

.type-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.type-tab {
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.type-tab.active {
  background: var(--primary-color);
  color: #fff;
}

.tab-count {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.15);
  padding: 1px 8px;
  border-radius: 10px;
}

.type-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
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
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.section-label .el-icon {
  color: var(--primary-color);
}

.count-badge {
  font-size: 12px;
  background: rgba(139, 92, 246, 0.2);
  color: var(--primary-color);
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 400;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.result-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.15);
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
  font-size: 28px;
}

.result-thumb.small {
  width: 48px;
  height: 48px;
  font-size: 22px;
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
  color: var(--text-primary);
  font-size: 15px;
  margin-bottom: 4px;
}

.result-title :deep(.highlight) {
  background: rgba(255, 215, 0, 0.25);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

.result-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-desc :deep(.highlight) {
  background: rgba(255, 215, 0, 0.25);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

.result-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  gap: 16px;
}

.result-actions {
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-icon.is-loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.load-more {
  text-align: center;
  padding: 16px 0;
}

@media (max-width: 768px) {
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

  .result-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
