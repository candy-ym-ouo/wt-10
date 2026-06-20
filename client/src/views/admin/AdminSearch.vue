<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🔍 搜索运营中心</h1>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="🔥 热搜管理" name="hot">
        <div class="action-bar">
          <el-button type="primary" @click="showAddHotDialog = true">
            <el-icon><Plus /></el-icon>
            添加热搜词
          </el-button>
          <el-button @click="fetchHotQueries">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="hotQueries" v-loading="hotLoading" stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="keyword" label="关键词" min-width="200" />
          <el-table-column prop="search_count" label="搜索次数" width="120" align="center" />
          <el-table-column label="置顶" width="100" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="!!row.is_pinned"
                @change="togglePin(row)"
                active-color="#ffd700"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                {{ row.is_active ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button
                size="small"
                :type="row.is_active ? 'warning' : 'success'"
                @click="toggleActive(row)"
              >
                {{ row.is_active ? '禁用' : '启用' }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteHotQuery(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="hotTotal > hotLimit" class="pagination-wrap">
          <el-pagination
            v-model:current-page="hotPage"
            :page-size="hotLimit"
            :total="hotTotal"
            layout="prev, pager, next, total"
            @current-change="fetchHotQueries"
            background
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="📢 搜索运营位" name="ads">
        <div class="action-bar">
          <el-button type="primary" @click="openAdDialog()">
            <el-icon><Plus /></el-icon>
            添加运营位
          </el-button>
          <el-select v-model="adPositionFilter" placeholder="位置筛选" clearable class="filter-select" @change="fetchAdPlacements">
            <el-option label="搜索顶部" value="search_top" />
            <el-option label="搜索结果上方" value="result_top" />
            <el-option label="搜索结果侧边" value="result_side" />
          </el-select>
          <el-button @click="fetchAdPlacements">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="adPlacements" v-loading="adsLoading" stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="图片" width="100" align="center">
            <template #default="{ row }">
              <el-image
                v-if="row.image_url"
                :src="row.image_url"
                style="width: 50px; height: 40px"
                fit="cover"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="link_url" label="链接" min-width="200" show-overflow-tooltip />
          <el-table-column label="位置" width="120" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ getPositionLabel(row.position) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort_order" label="排序" width="80" align="center" />
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                {{ row.is_active ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="有效期" width="200">
            <template #default="{ row }">
              <template v-if="row.start_time || row.end_time">
                {{ row.start_time ? formatDate(row.start_time) : '∞' }} ~ {{ row.end_time ? formatDate(row.end_time) : '∞' }}
              </template>
              <span v-else>永久</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="openAdDialog(row)">编辑</el-button>
              <el-button
                size="small"
                :type="row.is_active ? 'warning' : 'success'"
                @click="toggleAdActive(row)"
              >
                {{ row.is_active ? '停用' : '启用' }}
              </el-button>
              <el-button size="small" type="danger" @click="deleteAd(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="adsTotal > adsLimit" class="pagination-wrap">
          <el-pagination
            v-model:current-page="adsPage"
            :page-size="adsLimit"
            :total="adsTotal"
            layout="prev, pager, next, total"
            @current-change="fetchAdPlacements"
            background
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showAddHotDialog" title="添加热搜词" width="450px">
      <el-form label-width="80px">
        <el-form-item label="关键词">
          <el-input v-model="hotForm.keyword" placeholder="请输入热搜关键词" />
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="hotForm.is_pinned" active-color="#ffd700" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddHotDialog = false">取消</el-button>
        <el-button type="primary" @click="createHotQuery" :loading="hotSubmitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAdDialog" :title="adForm.id ? '编辑运营位' : '添加运营位'" width="600px">
      <el-form label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="adForm.title" placeholder="运营位标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="adForm.description" type="textarea" :rows="2" placeholder="运营位描述" />
        </el-form-item>
        <el-form-item label="图片 URL">
          <el-input v-model="adForm.image_url" placeholder="封面图片地址" />
        </el-form-item>
        <el-form-item label="链接 URL" required>
          <el-input v-model="adForm.link_url" placeholder="点击跳转链接" />
        </el-form-item>
        <el-form-item label="链接类型">
          <el-select v-model="adForm.link_type">
            <el-option label="站内链接" value="internal" />
            <el-option label="外部链接" value="external" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示位置">
          <el-select v-model="adForm.position">
            <el-option label="搜索顶部" value="search_top" />
            <el-option label="搜索结果上方" value="result_top" />
            <el-option label="搜索结果侧边" value="result_side" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="adForm.sort_order" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="adForm.is_active" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="adForm.start_time" type="datetime" placeholder="可选" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="adForm.end_time" type="datetime" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAdForm" :loading="adsSubmitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { adminSearchAPI } from '@/api'

const activeTab = ref('hot')

const hotQueries = ref([])
const hotLoading = ref(false)
const hotTotal = ref(0)
const hotPage = ref(1)
const hotLimit = 20
const showAddHotDialog = ref(false)
const hotSubmitting = ref(false)
const hotForm = ref({ keyword: '', is_pinned: false })

const adPlacements = ref([])
const adsLoading = ref(false)
const adsTotal = ref(0)
const adsPage = ref(1)
const adsLimit = 20
const adPositionFilter = ref('')
const showAdDialog = ref(false)
const adsSubmitting = ref(false)
const adForm = ref({
  id: null,
  title: '',
  description: '',
  image_url: '',
  link_url: '',
  link_type: 'internal',
  position: 'search_top',
  sort_order: 0,
  is_active: true,
  start_time: null,
  end_time: null
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getPositionLabel = (position) => {
  const map = { search_top: '搜索顶部', result_top: '结果上方', result_side: '结果侧边' }
  return map[position] || position
}

const fetchHotQueries = async () => {
  hotLoading.value = true
  try {
    const res = await adminSearchAPI.getHotQueries({ page: hotPage.value, limit: hotLimit })
    hotQueries.value = res.list || []
    hotTotal.value = res.total || 0
  } finally {
    hotLoading.value = false
  }
}

const createHotQuery = async () => {
  if (!hotForm.value.keyword.trim()) {
    ElMessage.warning('请输入关键词')
    return
  }
  hotSubmitting.value = true
  try {
    await adminSearchAPI.createHotQuery({ keyword: hotForm.value.keyword.trim(), is_pinned: hotForm.value.is_pinned })
    ElMessage.success('添加成功')
    showAddHotDialog.value = false
    hotForm.value = { keyword: '', is_pinned: false }
    fetchHotQueries()
  } finally {
    hotSubmitting.value = false
  }
}

const togglePin = async (row) => {
  try {
    await adminSearchAPI.updateHotQuery(row.id, { is_pinned: !row.is_pinned })
    ElMessage.success(row.is_pinned ? '已取消置顶' : '已置顶')
    fetchHotQueries()
  } catch (e) { /* ignore */ }
}

const toggleActive = async (row) => {
  try {
    await adminSearchAPI.updateHotQuery(row.id, { is_active: !row.is_active })
    ElMessage.success(row.is_active ? '已禁用' : '已启用')
    fetchHotQueries()
  } catch (e) { /* ignore */ }
}

const deleteHotQuery = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除热搜词「${row.keyword}」？`, '确认')
    await adminSearchAPI.deleteHotQuery(row.id)
    ElMessage.success('已删除')
    fetchHotQueries()
  } catch (e) { /* ignore */ }
}

const fetchAdPlacements = async () => {
  adsLoading.value = true
  try {
    const params = { page: adsPage.value, limit: adsLimit }
    if (adPositionFilter.value) params.position = adPositionFilter.value
    const res = await adminSearchAPI.getAdPlacements(params)
    adPlacements.value = res.list || []
    adsTotal.value = res.total || 0
  } finally {
    adsLoading.value = false
  }
}

const openAdDialog = (row = null) => {
  if (row) {
    adForm.value = {
      id: row.id,
      title: row.title,
      description: row.description || '',
      image_url: row.image_url || '',
      link_url: row.link_url,
      link_type: row.link_type || 'internal',
      position: row.position || 'search_top',
      sort_order: row.sort_order || 0,
      is_active: !!row.is_active,
      start_time: row.start_time || null,
      end_time: row.end_time || null
    }
  } else {
    adForm.value = {
      id: null,
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      link_type: 'internal',
      position: 'search_top',
      sort_order: 0,
      is_active: true,
      start_time: null,
      end_time: null
    }
  }
  showAdDialog.value = true
}

const submitAdForm = async () => {
  if (!adForm.value.title || !adForm.value.link_url) {
    ElMessage.warning('标题和链接为必填项')
    return
  }
  adsSubmitting.value = true
  try {
    const payload = { ...adForm.value }
    if (payload.start_time) payload.start_time = new Date(payload.start_time).toISOString()
    if (payload.end_time) payload.end_time = new Date(payload.end_time).toISOString()
    delete payload.id

    if (adForm.value.id) {
      await adminSearchAPI.updateAdPlacement(adForm.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await adminSearchAPI.createAdPlacement(payload)
      ElMessage.success('创建成功')
    }
    showAdDialog.value = false
    fetchAdPlacements()
  } finally {
    adsSubmitting.value = false
  }
}

const toggleAdActive = async (row) => {
  try {
    await adminSearchAPI.updateAdPlacement(row.id, { ...row, is_active: !row.is_active })
    ElMessage.success(row.is_active ? '已停用' : '已启用')
    fetchAdPlacements()
  } catch (e) { /* ignore */ }
}

const deleteAd = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除运营位「${row.title}」？`, '确认')
    await adminSearchAPI.deleteAdPlacement(row.id)
    ElMessage.success('已删除')
    fetchAdPlacements()
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  fetchHotQueries()
  fetchAdPlacements()
})
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-select {
  width: 160px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
