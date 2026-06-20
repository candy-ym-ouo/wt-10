<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📊 数据报表</h1>
      <div class="header-actions">
        <el-dropdown @command="handleExport">
          <el-button type="primary">
            <el-icon><Download /></el-icon>
            导出报表
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item 
                v-if="activeTab !== 'overview'"
                :command="activeTab"
              >
                导出当前筛选结果 (CSV)
              </el-dropdown-item>
              <el-dropdown-item 
                v-if="activeTab !== 'overview'"
                :command="activeTab + '_current_json'"
              >
                导出当前筛选结果 (JSON)
              </el-dropdown-item>
              <el-dropdown-item divided command="all_users">全部用户 (CSV)</el-dropdown-item>
              <el-dropdown-item command="all_patches">全部Patch (CSV)</el-dropdown-item>
              <el-dropdown-item command="all_modules">全部模块 (CSV)</el-dropdown-item>
              <el-dropdown-item command="all_manufacturers">全部厂商 (CSV)</el-dropdown-item>
              <el-dropdown-item divided command="all_users_json">全部用户 (JSON)</el-dropdown-item>
              <el-dropdown-item command="all_patches_json">全部Patch (JSON)</el-dropdown-item>
              <el-dropdown-item command="all_modules_json">全部模块 (JSON)</el-dropdown-item>
              <el-dropdown-item command="all_manufacturers_json">全部厂商 (JSON)</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="report-tabs">
      <el-tab-pane label="概览看板" name="overview">
        <OverviewTab :overview-data="overviewData" :loading="overviewLoading" />
      </el-tab-pane>

      <el-tab-pane label="用户统计" name="users">
        <UserStatsTab 
          ref="userTabRef" 
          :loading="userLoading" 
          :data="userData" 
          :total="userTotal" 
          @refresh="fetchUserStats" 
        />
      </el-tab-pane>

      <el-tab-pane label="Patch统计" name="patches">
        <PatchStatsTab 
          ref="patchTabRef" 
          :loading="patchLoading" 
          :data="patchData" 
          :total="patchTotal" 
          @refresh="fetchPatchStats" 
        />
      </el-tab-pane>

      <el-tab-pane label="模块统计" name="modules">
        <ModuleStatsTab 
          ref="moduleTabRef" 
          :loading="moduleLoading" 
          :data="moduleData" 
          :total="moduleTotal" 
          @refresh="fetchModuleStats" 
        />
      </el-tab-pane>

      <el-tab-pane label="厂商统计" name="manufacturers">
        <ManufacturerStatsTab 
          ref="manufacturerTabRef" 
          :loading="manufacturerLoading" 
          :data="manufacturerData" 
          :total="manufacturerTotal" 
          @refresh="fetchManufacturerStats" 
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, ArrowDown } from '@element-plus/icons-vue'
import { adminReportApi } from '@/api'
import OverviewTab from './components/OverviewTab.vue'
import UserStatsTab from './components/UserStatsTab.vue'
import PatchStatsTab from './components/PatchStatsTab.vue'
import ModuleStatsTab from './components/ModuleStatsTab.vue'
import ManufacturerStatsTab from './components/ManufacturerStatsTab.vue'

const activeTab = ref('overview')

const overviewLoading = ref(true)
const overviewData = ref(null)

const userLoading = ref(true)
const userData = ref([])
const userTotal = ref(0)
const userTabRef = ref(null)

const patchLoading = ref(true)
const patchData = ref([])
const patchTotal = ref(0)
const patchTabRef = ref(null)

const moduleLoading = ref(true)
const moduleData = ref([])
const moduleTotal = ref(0)
const moduleTabRef = ref(null)

const manufacturerLoading = ref(true)
const manufacturerData = ref([])
const manufacturerTotal = ref(0)
const manufacturerTabRef = ref(null)

const fetchOverview = async () => {
  try {
    overviewLoading.value = true
    const res = await adminReportApi.getOverview()
    overviewData.value = res.data || res
  } catch (err) {
    ElMessage.error('获取概览数据失败')
    console.error(err)
  } finally {
    overviewLoading.value = false
  }
}

const fetchUserStats = async (params = {}) => {
  try {
    userLoading.value = true
    const res = await adminReportApi.getUserStats(params)
    userData.value = res.list || []
    userTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取用户统计失败')
    console.error(err)
  } finally {
    userLoading.value = false
  }
}

const fetchPatchStats = async (params = {}) => {
  try {
    patchLoading.value = true
    const res = await adminReportApi.getPatchStats(params)
    patchData.value = res.list || []
    patchTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取Patch统计失败')
    console.error(err)
  } finally {
    patchLoading.value = false
  }
}

const fetchModuleStats = async (params = {}) => {
  try {
    moduleLoading.value = true
    const res = await adminReportApi.getModuleStats(params)
    moduleData.value = res.list || []
    moduleTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取模块统计失败')
    console.error(err)
  } finally {
    moduleLoading.value = false
  }
}

const fetchManufacturerStats = async (params = {}) => {
  try {
    manufacturerLoading.value = true
    const res = await adminReportApi.getManufacturerStats(params)
    manufacturerData.value = res.list || []
    manufacturerTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取厂商统计失败')
    console.error(err)
  } finally {
    manufacturerLoading.value = false
  }
}

const getCurrentFilters = () => {
  const tabRefs = {
    users: userTabRef,
    patches: patchTabRef,
    modules: moduleTabRef,
    manufacturers: manufacturerTabRef
  }
  const ref = tabRefs[activeTab.value]
  if (ref && ref.value && typeof ref.value.getExportFilters === 'function') {
    return ref.value.getExportFilters()
  }
  return {}
}

const handleExport = (command) => {
  let type = command
  let format = 'csv'
  let exportAll = false

  if (command.startsWith('all_')) {
    exportAll = true
    type = command.replace('all_', '')
  }

  if (type.endsWith('_json')) {
    format = 'json'
    type = type.replace('_json', '')
  }

  if (type.endsWith('_current_json')) {
    format = 'json'
    type = type.replace('_current_json', '')
  }

  let params = {}
  if (!exportAll) {
    params = getCurrentFilters()
  }

  const url = adminReportApi.getExportUrl(type, format, params)
  
  const link = document.createElement('a')
  link.href = url
  link.download = ''
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  ElMessage.success('开始导出...')
}

watch(activeTab, (tab) => {
  if (tab === 'overview' && !overviewData.value) {
    fetchOverview()
  } else if (tab === 'users' && userData.value.length === 0) {
    fetchUserStats()
  } else if (tab === 'patches' && patchData.value.length === 0) {
    fetchPatchStats()
  } else if (tab === 'modules' && moduleData.value.length === 0) {
    fetchModuleStats()
  } else if (tab === 'manufacturers' && manufacturerData.value.length === 0) {
    fetchManufacturerStats()
  }
})

onMounted(() => {
  fetchOverview()
})
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.8rem;
  margin: 0;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.report-tabs {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}
</style>
