<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">🏆 Patch 挑战赛 - 赛季管理</h1>
      <el-button type="primary" @click="showSeasonDialog = true">
        <el-icon><Plus /></el-icon>
        新建赛季
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="search"
        placeholder="搜索赛季名称/主题"
        clearable
        @keyup.enter="fetchSeasons"
        style="width: 300px;"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="赛季状态" clearable @change="fetchSeasons">
        <el-option label="草稿" value="draft" />
        <el-option label="报名中" value="published" />
        <el-option label="进行中" value="upcoming" />
        <el-option label="已结束" value="ended" />
      </el-select>
    </div>

    <div class="table-card">
      <el-table :data="seasons" v-loading="loading" stripe>
        <el-table-column label="ID" width="80">
          <template #default="{ row }">{{ row.id }}</template>
        </el-table-column>
        <el-table-column label="赛季" min-width="250">
          <template #default="{ row }">
            <div class="season-info-cell">
              <div class="season-name">{{ row.name }}</div>
              <div class="season-meta">
                <el-tag type="warning" size="small">{{ row.year }}年 第{{ row.season_no }}季</el-tag>
                <el-tag :type="getStatusTagType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
              </div>
              <div v-if="row.theme" class="season-theme">🎨 主题: {{ row.theme }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="活动数" width="100" align="center">
          <template #default="{ row }">{{ row.activity_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="排序" width="100" align="center">
          <el-input-number v-model="row.sort_order" size="small" :min="0" @change="updateSortOrder(row)" />
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editSeason(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button size="small" type="primary" @click="openSeasonConfig(row)">
              <el-icon><Setting /></el-icon> 配置
            </el-button>
            <el-button size="small" type="success" @click="viewFront(row)">
              <el-icon><View /></el-icon> 前台
            </el-button>
            <el-button size="small" type="danger" @click="deleteSeason(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="total > limit" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchSeasons"
        background
      />
    </div>

    <el-dialog
      v-model="showSeasonDialog"
      :title="isSeasonEdit ? '编辑赛季' : '新建赛季'"
      width="900px"
      destroy-on-close
    >
      <el-form :model="seasonForm" :rules="seasonFormRules" ref="seasonFormRef" label-width="120px">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="赛季名称" prop="name">
              <el-input v-model="seasonForm.name" placeholder="如: 2025春季挑战赛" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="年份" prop="year">
              <el-input-number v-model="seasonForm.year" :min="2020" :max="2030" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="赛季号" prop="season_no">
              <el-input-number v-model="seasonForm.season_no" :min="1" :max="12" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="赛季主题">
              <el-input v-model="seasonForm.theme" placeholder="如: 春日之声" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="赛季状态" prop="status">
              <el-select v-model="seasonForm.status" style="width: 100%;">
                <el-option label="草稿" value="draft" />
                <el-option label="报名中" value="published" />
                <el-option label="进行中" value="upcoming" />
                <el-option label="已结束" value="ended" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="赛季描述">
          <el-input v-model="seasonForm.description" type="textarea" :rows="2" />
        </el-form-item>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="封面图URL">
              <el-input v-model="seasonForm.cover_url" placeholder="赛季封面图" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="横幅图URL">
              <el-input v-model="seasonForm.banner_url" placeholder="赛季顶部横幅" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">关键时间节点</el-divider>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="报名开始">
              <el-date-picker
                v-model="seasonForm.registration_start"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报名结束">
              <el-date-picker
                v-model="seasonForm.registration_end"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="投稿开始">
              <el-date-picker
                v-model="seasonForm.submission_start"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投稿结束">
              <el-date-picker
                v-model="seasonForm.submission_end"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="投票开始">
              <el-date-picker
                v-model="seasonForm.voting_start"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投票结束">
              <el-date-picker
                v-model="seasonForm.voting_end"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="赛季开始">
              <el-date-picker
                v-model="seasonForm.start_date"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结果公布">
              <el-date-picker
                v-model="seasonForm.result_publish_date"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他设置</el-divider>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="最大报名人数">
              <el-input-number v-model="seasonForm.max_registrations" :min="0" style="width: 100%;" />
              <div class="form-tip">0表示不限制</div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="每人最多投稿">
              <el-input-number v-model="seasonForm.max_submissions_per_user" :min="1" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重">
              <el-input-number v-model="seasonForm.sort_order" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showSeasonDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSeason" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showConfigDialog"
      :title="`赛季配置 - ${currentSeason?.name || ''}`"
      width="1100px"
      destroy-on-close
    >
      <el-tabs v-model="configTab">
        <el-tab-pane label="📋 投票规则" name="voting">
          <VotingRuleConfig
            :season-id="currentSeason?.id"
            :activity-id="currentActivityId"
            @saved="() => ElMessage.success('投票规则已保存')"
          />
        </el-tab-pane>
        <el-tab-pane label="🎖️ 奖项设置" name="awards">
          <AwardsConfig
            :season-id="currentSeason?.id"
            :activity-id="currentActivityId"
            @saved="() => ElMessage.success('奖项设置已保存')"
          />
        </el-tab-pane>
        <el-tab-pane label="👨‍⚖️ 评审团管理" name="jury">
          <JuryManagement
            :season-id="currentSeason?.id"
            :activity-id="currentActivityId"
          />
        </el-tab-pane>
        <el-tab-pane label="📊 排名与结果" name="results">
          <ResultsManagement
            v-if="currentSeason"
            :season="currentSeason"
          />
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Edit, Setting, View, Delete } from '@element-plus/icons-vue'
import { adminChallengeApi } from '@/api'
import VotingRuleConfig from './components/VotingRuleConfig.vue'
import AwardsConfig from './components/AwardsConfig.vue'
import JuryManagement from './components/JuryManagement.vue'
import ResultsManagement from './components/ResultsManagement.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const loading = ref(false)
const seasons = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const search = ref('')
const statusFilter = ref('')

const showSeasonDialog = ref(false)
const isSeasonEdit = ref(false)
const editingSeasonId = ref(null)
const saving = ref(false)
const seasonFormRef = ref(null)

const seasonForm = ref({
  name: '', season_no: 1, year: new Date().getFullYear(),
  theme: '', description: '', cover_url: '', banner_url: '',
  status: 'draft', start_date: '', end_date: '',
  registration_start: '', registration_end: '',
  submission_start: '', submission_end: '',
  voting_start: '', voting_end: '',
  result_publish_date: '', max_registrations: 0,
  max_submissions_per_user: 1, sort_order: 0
})

const seasonFormRules = {
  name: [{ required: true, message: '请输入赛季名称', trigger: 'blur' }],
  year: [{ required: true, message: '请选择年份', trigger: 'change' }],
  season_no: [{ required: true, message: '请选择赛季号', trigger: 'change' }],
  status: [{ required: true, message: '请选择赛季状态', trigger: 'change' }]
}

const showConfigDialog = ref(false)
const configTab = ref('voting')
const currentSeason = ref(null)
const currentActivityId = ref(null)

const getStatusText = (s) => ({ draft: '草稿', published: '报名中', upcoming: '进行中', ended: '已结束' }[s] || s)
const getStatusTagType = (s) => ({ draft: 'info', published: 'success', upcoming: 'primary', ended: 'danger' }[s] || 'info')

const fetchSeasons = async () => {
  loading.value = true
  try {
    const res = await adminChallengeApi.getSeasons({
      page: page.value, limit: limit.value, search: search.value, status: statusFilter.value
    })
    seasons.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error('获取赛季列表失败')
  } finally {
    loading.value = false
  }
}

const updateSortOrder = async (row) => {
  try {
    await adminChallengeApi.updateSeason(row.id, { sort_order: row.sort_order })
    ElMessage.success('排序已更新')
  } catch {
    ElMessage.error('更新失败')
    fetchSeasons()
  }
}

const editSeason = (row) => {
  isSeasonEdit.value = true
  editingSeasonId.value = row.id
  seasonForm.value = {
    name: row.name, season_no: row.season_no, year: row.year,
    theme: row.theme || '', description: row.description || '',
    cover_url: row.cover_url || '', banner_url: row.banner_url || '',
    status: row.status, start_date: row.start_date || '', end_date: row.end_date || '',
    registration_start: row.registration_start || '',
    registration_end: row.registration_end || '',
    submission_start: row.submission_start || '',
    submission_end: row.submission_end || '',
    voting_start: row.voting_start || '',
    voting_end: row.voting_end || '',
    result_publish_date: row.result_publish_date || '',
    max_registrations: row.max_registrations || 0,
    max_submissions_per_user: row.max_submissions_per_user || 1,
    sort_order: row.sort_order || 0
  }
  showSeasonDialog.value = true
}

const resetSeasonForm = () => {
  seasonForm.value = {
    name: '', season_no: 1, year: new Date().getFullYear(),
    theme: '', description: '', cover_url: '', banner_url: '',
    status: 'draft', start_date: '', end_date: '',
    registration_start: '', registration_end: '',
    submission_start: '', submission_end: '',
    voting_start: '', voting_end: '',
    result_publish_date: '', max_registrations: 0,
    max_submissions_per_user: 1, sort_order: 0
  }
  isSeasonEdit.value = false
  editingSeasonId.value = null
}

const saveSeason = async () => {
  if (!seasonFormRef.value) return
  try { await seasonFormRef.value.validate() } catch { return }
  saving.value = true
  try {
    if (isSeasonEdit.value) {
      await adminChallengeApi.updateSeason(editingSeasonId.value, seasonForm.value)
      ElMessage.success('赛季更新成功')
    } else {
      await adminChallengeApi.createSeason(seasonForm.value)
      ElMessage.success('赛季创建成功')
    }
    showSeasonDialog.value = false
    resetSeasonForm()
    fetchSeasons()
  } catch (e) {
    ElMessage.error(e?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const deleteSeason = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除赛季「${row.name}」吗？`, '确认删除', { type: 'danger' })
    await adminChallengeApi.deleteSeason(row.id)
    ElMessage.success('删除成功')
    fetchSeasons()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

const openSeasonConfig = async (row) => {
  currentSeason.value = row
  currentActivityId.value = null
  showConfigDialog.value = true
  try {
    const detail = await challengeApi.getSeasonDetail(row.id)
    if (detail) {
      currentSeason.value = detail
      if (detail.activities?.length > 0) {
        currentActivityId.value = detail.activities[0].id
      }
    }
  } catch (e) {
    console.error('加载赛季详情失败', e)
  }
}

const viewFront = (row) => {
  window.open(`/challenge/seasons/${row.id}`, '_blank')
}

onMounted(fetchSeasons)
</script>

<style scoped>
.admin-page { padding: 0; }

.page-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
}
.page-title { font-size: 1.8rem; margin: 0; color: var(--text-primary); }

.filter-bar {
  display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;
}

.season-info-cell { display: flex; flex-direction: column; gap: 6px; }
.season-name { font-weight: 600; color: var(--text-primary); font-size: 1rem; }
.season-meta { display: flex; gap: 8px; }
.season-theme { font-size: 0.8125rem; color: var(--text-secondary); }

.pagination { display: flex; justify-content: center; margin-top: 1.5rem; }
.form-tip { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; }

@media (max-width: 768px) {
  .filter-bar { flex-direction: column; }
  .filter-bar > * { width: 100%; }
}
</style>
