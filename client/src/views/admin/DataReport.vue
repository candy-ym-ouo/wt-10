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
              <el-dropdown-item command="users">用户统计 (CSV)</el-dropdown-item>
              <el-dropdown-item command="patches">Patch统计 (CSV)</el-dropdown-item>
              <el-dropdown-item command="modules">模块统计 (CSV)</el-dropdown-item>
              <el-dropdown-item command="manufacturers">厂商统计 (CSV)</el-dropdown-item>
              <el-dropdown-item divided command="users_json">用户统计 (JSON)</el-dropdown-item>
              <el-dropdown-item command="patches_json">Patch统计 (JSON)</el-dropdown-item>
              <el-dropdown-item command="modules_json">模块统计 (JSON)</el-dropdown-item>
              <el-dropdown-item command="manufacturers_json">厂商统计 (JSON)</el-dropdown-item>
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
        <UserStatsTab :loading="userLoading" :data="userData" :total="userTotal" @refresh="fetchUserStats" />
      </el-tab-pane>

      <el-tab-pane label="Patch统计" name="patches">
        <PatchStatsTab :loading="patchLoading" :data="patchData" :total="patchTotal" @refresh="fetchPatchStats" />
      </el-tab-pane>

      <el-tab-pane label="模块统计" name="modules">
        <ModuleStatsTab :loading="moduleLoading" :data="moduleData" :total="moduleTotal" @refresh="fetchModuleStats" />
      </el-tab-pane>

      <el-tab-pane label="厂商统计" name="manufacturers">
        <ManufacturerStatsTab :loading="manufacturerLoading" :data="manufacturerData" :total="manufacturerTotal" @refresh="fetchManufacturerStats" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
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

const patchLoading = ref(true)
const patchData = ref([])
const patchTotal = ref(0)

const moduleLoading = ref(true)
const moduleData = ref([])
const moduleTotal = ref(0)

const manufacturerLoading = ref(true)
const manufacturerData = ref([])
const manufacturerTotal = ref(0)

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

const handleExport = (command) => {
  const [type, format] = command.split('_')
  const fmt = format || 'csv'
  const url = adminReportApi.getExportUrl(type, fmt)
  
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
