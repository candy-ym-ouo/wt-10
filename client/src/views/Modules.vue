<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">📦 设备库</h1>
      <p class="page-subtitle">探索全球知名厂商的模块合成器设备</p>
    </div>

    <div class="filter-bar">
      <el-select v-model="selectedType" placeholder="模块类型" @change="fetchModules" clearable>
        <el-option v-for="type in moduleTypes" :key="type" :label="type" :value="type" />
      </el-select>
      <el-select v-model="selectedManufacturer" placeholder="厂商" @change="fetchModules" clearable>
        <el-option v-for="m in manufacturers" :key="m.id" :label="m.name" :value="m.id" />
      </el-select>
      <el-input
        v-model="search"
        placeholder="搜索模块..."
        style="width: 250px"
        :prefix-icon="Search"
        @keyup.enter="fetchModules"
      />
    </div>

    <el-row :gutter="24">
      <el-col :span="18">
        <div v-if="loading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else class="module-grid">
          <div
            v-for="mod in modules"
            :key="mod.id"
            class="module-card"
            @click="$router.push(`/modules/${mod.id}`)"
          >
            <span class="module-type">{{ mod.type }}</span>
            <h3 class="module-name">{{ mod.name }}</h3>
            <p class="module-manu" v-if="mod.manufacturer_name">{{ mod.manufacturer_name }}</p>
            <p class="module-desc">{{ mod.description }}</p>
            <div class="module-specs">
              <span v-if="mod.hp">宽度: {{ mod.hp }} HP</span>
            </div>
            <div class="module-actions">
              <el-button size="small" text type="primary" @click.stop="viewModuleDetail(mod.id)">
                <el-icon><Document /></el-icon> 详情
              </el-button>
              <el-button size="small" text @click.stop="goToPatchesWithModule(mod.id)">
                <el-icon><SetUp /></el-icon> 相关 Patch
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="total > limit" class="pagination">
          <el-pagination
            v-model:current-page="page"
            :page-size="limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="fetchModules"
            background
          />
        </div>
      </el-col>

      <el-col :span="6">
        <div class="card">
          <h3 class="sidebar-title">🔥 热门模块组合</h3>
          <div v-if="popularCombinations.length > 0" class="popular-combos">
            <div
              v-for="combo in popularCombinations"
              :key="combo.module_id + '-' + combo.paired_module_id"
              class="popular-combo-item"
              @click="viewCombination(combo)"
            >
              <div class="combo-modules">
                <span class="mini-type">{{ combo.module_type }}</span>
                <span class="mini-name">{{ combo.module_name }}</span>
                <span class="combo-plus">+</span>
                <span class="mini-type">{{ combo.paired_type }}</span>
                <span class="mini-name">{{ combo.paired_name }}</span>
              </div>
              <div class="combo-meta">
                <el-tag size="small" type="warning">
                  {{ Math.round((combo.confidence_score || 0) * 100) }}% 匹配
                </el-tag>
                <span class="combo-count">{{ combo.co_occurrence_count }} 次</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-sidebar">
            <el-icon><Connection /></el-icon>
            <p>暂无热门组合数据</p>
          </div>
        </div>

        <div class="card" style="margin-top: 20px;">
          <h3 class="sidebar-title">🏭 厂商列表</h3>
          <div class="manufacturer-list">
            <div
              v-for="m in manufacturers"
              :key="m.id"
              class="manufacturer-item"
              @click="selectedManufacturer = selectedManufacturer === m.id ? null : m.id; fetchModules()"
              :class="{ active: selectedManufacturer === m.id }"
            >
              <span class="manu-name">{{ m.name }}</span>
              <span class="manu-count">{{ m.modules_count || 0 }} 个模块</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading, Document, SetUp, Connection } from '@element-plus/icons-vue'
import { useModuleStore } from '@/stores/moduleStore'
import { moduleAPI } from '@/api'

const router = useRouter()
const moduleStore = useModuleStore()

const loading = ref(false)
const modules = ref([])
const manufacturers = ref([])
const moduleTypes = ref([])
const popularCombinations = ref([])
const total = ref(0)
const page = ref(1)
const limit = 12
const search = ref('')
const selectedType = ref('')
const selectedManufacturer = ref(null)

onMounted(async () => {
  await Promise.all([fetchModules(), fetchManufacturers(), fetchPopularCombinations()])
})

const fetchModules = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit
    }
    if (search.value) params.search = search.value
    if (selectedType.value) params.type = selectedType.value
    if (selectedManufacturer.value) params.manufacturer_id = selectedManufacturer.value

    const res = await moduleStore.fetchModules(params)
    modules.value = res.list
    total.value = res.total
    moduleTypes.value = res.types || []
  } finally {
    loading.value = false
  }
}

const fetchManufacturers = async () => {
  const res = await moduleStore.fetchManufacturers()
  manufacturers.value = res.list || []
}

const fetchPopularCombinations = async () => {
  try {
    const res = await moduleAPI.getPopularCombinations({ limit: 10 })
    popularCombinations.value = res.list || []
  } catch (e) {
    console.error('获取热门组合失败:', e)
  }
}

const viewModuleDetail = (moduleId) => {
  router.push(`/modules/${moduleId}`)
}

const goToPatchesWithModule = (moduleId) => {
  router.push({
    path: '/patches',
    query: { modules: String(moduleId) }
  })
}

const viewCombination = (combo) => {
  router.push({
    path: '/patches',
    query: { modules: `${combo.module_id},${combo.paired_module_id}` }
  })
}
</script>

<style scoped>
.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 16px;
}

.manufacturer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manufacturer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.manufacturer-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.manufacturer-item.active {
  background: rgba(255, 215, 0, 0.15);
}

.manu-name {
  font-size: 14px;
  color: #fff;
}

.manu-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}

.module-manu {
  font-size: 12px;
  color: #ffd700;
  margin-bottom: 8px;
}

.module-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
  line-height: 1.5;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.module-specs {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 12px;
}

.module-actions {
  display: flex;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.module-actions .el-button {
  padding: 4px 0;
  font-size: 12px;
}

.module-actions .el-icon {
  margin-right: 4px;
}

.popular-combos {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popular-combo-item {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.popular-combo-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.2);
}

.combo-modules {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.mini-type {
  font-size: 10px;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
}

.mini-name {
  font-size: 12px;
  color: #fff;
  font-weight: 500;
}

.combo-plus {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  margin: 0 2px;
}

.combo-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.combo-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-sidebar {
  text-align: center;
  padding: 30px 10px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-sidebar .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.3;
}

.empty-sidebar p {
  font-size: 13px;
  margin: 0;
}
</style>
