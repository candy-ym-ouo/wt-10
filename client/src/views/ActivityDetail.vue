<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="!activity" class="empty-state">
      <el-icon class="empty-icon"><Warning /></el-icon>
      <p>活动不存在</p>
    </div>

    <div v-else>
      <div class="activity-header">
        <div class="activity-cover-large">
          <img v-if="activity.cover_url" :src="activity.cover_url" :alt="activity.title" />
          <div v-else class="cover-placeholder-large">
            <span class="cover-icon">{{ getTypeIcon(activity.type) }}</span>
          </div>
        </div>

        <div class="activity-header-info">
          <div class="badges-row">
            <el-tag :type="getStatusTagType(activity.status)" size="large">
              {{ getStatusText(activity.status) }}
            </el-tag>
            <el-tag type="warning" size="large">
              {{ getTypeText(activity.type) }}
            </el-tag>
          </div>

          <h1 class="activity-title">{{ activity.title }}</h1>
          <p class="activity-desc">{{ activity.description }}</p>

          <div class="activity-meta">
            <div class="meta-item">
              <el-icon><Calendar /></el-icon>
              <span>活动时间: {{ formatDateRange(activity.start_date, activity.end_date) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>报名时间: {{ formatDateRange(activity.registration_start, activity.registration_end) }}</span>
            </div>
            <div v-if="activity.allow_submission" class="meta-item">
              <el-icon><Edit /></el-icon>
              <span>投稿时间: {{ formatDateRange(activity.submission_start, activity.submission_end) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><User /></el-icon>
              <span>{{ activity.registration_count }} 人已报名</span>
            </div>
            <div class="meta-item">
              <el-icon><Document /></el-icon>
              <span>{{ activity.submission_count }} 份作品</span>
            </div>
            <div v-if="activity.max_registrations > 0" class="meta-item">
              <el-icon><Avatar /></el-icon>
              <span>限制 {{ activity.max_registrations }} 人</span>
            </div>
          </div>

          <div class="action-buttons">
            <template v-if="!userStore.isLoggedIn">
              <el-button type="primary" size="large" @click="$router.push('/login')">
                登录后报名
              </el-button>
            </template>
            <template v-else-if="activity.is_registered">
              <el-button type="success" size="large" disabled>
                <el-icon><Check /></el-icon>
                已报名
              </el-button>
              <el-button size="large" @click="showSubmitDialog = true" :disabled="!canSubmit">
                <el-icon><Upload /></el-icon>
                提交作品
              </el-button>
              <el-button size="large" @click="cancelRegistration">
                取消报名
              </el-button>
            </template>
            <template v-else>
              <el-button type="primary" size="large" @click="registerActivity" :disabled="!canRegister">
                <el-icon><UserFilled /></el-icon>
                立即报名
              </el-button>
            </template>

            <el-button v-if="activity.show_ranking" size="large" @click="activeTab = 'ranking'">
              <el-icon><Trophy /></el-icon>
              查看榜单
            </el-button>
          </div>

          <div v-if="!canRegister && !activity.is_registered" class="tip-text">
            <el-icon><InfoFilled /></el-icon>
            {{ registerTip }}
          </div>
          <div v-if="activity.is_registered && !canSubmit" class="tip-text">
            <el-icon><InfoFilled /></el-icon>
            {{ submitTip }}
          </div>
        </div>
      </div>

      <div class="activity-content">
        <el-tabs v-model="activeTab" class="activity-tabs">
          <el-tab-pane label="活动详情" name="detail">
            <div class="tab-content">
              <div v-if="activity.content" class="markdown-body" v-html="parseMarkdown(activity.content)"></div>
              <div v-else class="empty-tab">
                <el-icon><Document /></el-icon>
                <p>暂无活动详情</p>
              </div>

              <div v-if="activity.rules" class="content-section">
                <h3><el-icon><List /></el-icon> 活动规则</h3>
                <div class="markdown-body" v-html="parseMarkdown(activity.rules)"></div>
              </div>

              <div v-if="activity.prizes" class="content-section">
                <h3><el-icon><Trophy /></el-icon> 奖项设置</h3>
                <div class="markdown-body" v-html="parseMarkdown(activity.prizes)"></div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="作品展示" name="submissions">
            <div class="tab-content">
              <div v-if="submissionsLoading" class="empty-state">
                <el-icon class="empty-icon"><Loading /></el-icon>
                <p>加载中...</p>
              </div>

              <div v-else-if="submissions.length === 0" class="empty-tab">
                <el-icon><FolderOpened /></el-icon>
                <p>暂无作品</p>
              </div>

              <div v-else class="submissions-grid">
                <div
                  v-for="submission in submissions"
                  :key="submission.id"
                  class="submission-card"
                  @click="viewSubmission(submission)"
                >
                  <div class="submission-rank" v-if="submission.rank">
                    #{{ submission.rank }}
                  </div>
                  <div class="submission-header">
                    <h4 class="submission-title">{{ submission.title }}</h4>
                    <div class="submission-author">
                      <el-avatar :size="24" :src="submission.avatar">
                        {{ submission.username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                      <span>{{ submission.username }}</span>
                    </div>
                  </div>
                  <p class="submission-desc">{{ submission.description || '暂无描述' }}</p>
                  <div class="submission-footer">
                    <div class="submission-stats">
                      <span class="stat-item" :class="{ voted: submission.has_voted }">
                        <el-icon @click.stop="voteSubmission(submission)">
                          <component :is="submission.has_voted ? StarFilled : Star" />
                        </el-icon>
                        {{ submission.votes_count }}
                      </span>
                      <span class="stat-item">
                        <el-icon><Medal /></el-icon>
                        {{ submission.score }}
                      </span>
                    </div>
                    <el-tag :type="getSubmissionStatusType(submission.status)" size="small">
                      {{ getSubmissionStatusText(submission.status) }}
                    </el-tag>
                  </div>
                </div>
              </div>

              <div v-if="submissionsTotal > submissionsLimit" class="pagination">
                <el-pagination
                  v-model:current-page="submissionsPage"
                  :page-size="submissionsLimit"
                  :total="submissionsTotal"
                  layout="prev, pager, next, total"
                  @current-change="fetchSubmissions"
                  background
                />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="排行榜" name="ranking" v-if="activity.show_ranking">
            <div class="tab-content">
              <div v-if="rankingLoading" class="empty-state">
                <el-icon class="empty-icon"><Loading /></el-icon>
                <p>加载中...</p>
              </div>

              <div v-else-if="rankings.length === 0" class="empty-tab">
                <el-icon><Trophy /></el-icon>
                <p>暂无排名数据</p>
              </div>

              <div v-else>
                <div class="podium" v-if="rankings.length >= 3">
                  <div class="podium-item second" v-if="rankings[1]">
                    <div class="podium-rank">2</div>
                    <div class="podium-avatar">
                      <el-avatar :size="64" :src="rankings[1].avatar">
                        {{ rankings[1].username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="podium-name">{{ rankings[1].username }}</div>
                    <div class="podium-score">{{ rankings[1].score }} 分</div>
                    <div class="podium-title">{{ rankings[1].title }}</div>
                  </div>
                  <div class="podium-item first" v-if="rankings[0]">
                    <div class="podium-crown">👑</div>
                    <div class="podium-rank">1</div>
                    <div class="podium-avatar">
                      <el-avatar :size="80" :src="rankings[0].avatar">
                        {{ rankings[0].username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="podium-name">{{ rankings[0].username }}</div>
                    <div class="podium-score">{{ rankings[0].score }} 分</div>
                    <div class="podium-title">{{ rankings[0].title }}</div>
                  </div>
                  <div class="podium-item third" v-if="rankings[2]">
                    <div class="podium-rank">3</div>
                    <div class="podium-avatar">
                      <el-avatar :size="56" :src="rankings[2].avatar">
                        {{ rankings[2].username?.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="podium-name">{{ rankings[2].username }}</div>
                    <div class="podium-score">{{ rankings[2].score }} 分</div>
                    <div class="podium-title">{{ rankings[2].title }}</div>
                  </div>
                </div>

                <el-table :data="rankings.slice(3)" v-if="rankings.length > 3" class="ranking-table">
                  <el-table-column label="排名" width="80" align="center">
                    <template #default="{ $index }">
                      <span class="rank-num">{{ $index + 4 }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="作者">
                    <template #default="{ row }">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <el-avatar :size="32" :src="row.avatar">
                          {{ row.username?.charAt(0).toUpperCase() }}
                        </el-avatar>
                        <span>{{ row.username }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="title" label="作品" />
                  <el-table-column prop="score" label="得分" width="100" align="center" />
                  <el-table-column prop="votes_count" label="票数" width="100" align="center" />
                  <el-table-column label="操作" width="100" align="center">
                    <template #default="{ row }">
                      <el-button type="primary" size="small" @click="viewSubmission(row)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="我的参赛" name="my" v-if="userStore.isLoggedIn">
            <div class="tab-content">
              <div v-if="mySubmission" class="my-submission-card">
                <h3>我的作品</h3>
                <el-tag :type="getSubmissionStatusType(mySubmission.status)" style="margin-bottom: 16px;">
                  {{ getSubmissionStatusText(mySubmission.status) }}
                </el-tag>
                <h4>{{ mySubmission.title }}</h4>
                <p>{{ mySubmission.description }}</p>
                <div v-if="mySubmission.review_note" class="review-note">
                  <strong>评审意见：</strong>{{ mySubmission.review_note }}
                </div>
                <div class="submission-meta">
                  <span>得分: {{ mySubmission.score }}</span>
                  <span>票数: {{ mySubmission.votes_count }}</span>
                  <span v-if="mySubmission.rank">排名: #{{ mySubmission.rank }}</span>
                </div>
              </div>
              <div v-else class="empty-tab">
                <el-icon><Document /></el-icon>
                <p>您还没有提交作品</p>
                <el-button v-if="activity.is_registered && canSubmit" type="primary" @click="showSubmitDialog = true">
                  提交作品
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <el-dialog v-model="showSubmitDialog" title="提交作品" width="600px">
      <el-form :model="submitForm" label-width="100px">
        <el-form-item label="关联Patch">
          <el-select v-model="submitForm.patch_id" placeholder="可选择关联您的Patch" filterable clearable>
            <el-option
              v-for="patch in myPatches"
              :key="patch.id"
              :label="patch.title"
              :value="patch.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="作品标题" required>
          <el-input v-model="submitForm.title" placeholder="请输入作品标题" />
        </el-form-item>
        <el-form-item label="作品描述">
          <el-input v-model="submitForm.description" type="textarea" :rows="3" placeholder="请描述您的作品" />
        </el-form-item>
        <el-form-item label="作品内容">
          <el-input v-model="submitForm.content" type="textarea" :rows="6" placeholder="详细介绍您的作品" />
        </el-form-item>
        <el-form-item label="附件链接">
          <el-input v-model="submitForm.attachment_url" placeholder="音频/视频等附件链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubmitDialog = false">取消</el-button>
        <el-button type="primary" @click="submitWork" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSubmissionDetail" title="作品详情" width="700px">
      <div v-if="currentSubmission" class="submission-detail">
        <div class="submission-detail-header">
          <h2>{{ currentSubmission.title }}</h2>
          <div class="submission-detail-meta">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-avatar :size="32" :src="currentSubmission.avatar">
                {{ currentSubmission.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ currentSubmission.username }}</span>
            </div>
            <div class="stats-row">
              <el-button
                :type="currentSubmission.has_voted ? 'success' : 'primary'"
                @click="voteSubmission(currentSubmission)"
                :disabled="currentSubmission.user_id === userStore.user?.id"
              >
                <el-icon>{{ currentSubmission.has_voted ? 'Check' : 'StarFilled' }}</el-icon>
                {{ currentSubmission.has_voted ? '已投票' : '投票' }} ({{ currentSubmission.votes_count }})
              </el-button>
              <span class="score-badge">得分: {{ currentSubmission.score }}</span>
            </div>
          </div>
        </div>

        <div v-if="currentSubmission.description" class="detail-section">
          <h4>作品描述</h4>
          <p>{{ currentSubmission.description }}</p>
        </div>

        <div v-if="currentSubmission.content" class="detail-section">
          <h4>作品详情</h4>
          <div class="markdown-body" v-html="parseMarkdown(currentSubmission.content)"></div>
        </div>

        <div v-if="currentSubmission.attachment_url" class="detail-section">
          <h4>附件</h4>
          <el-link :href="currentSubmission.attachment_url" target="_blank" type="primary">
            {{ currentSubmission.attachment_url }}
          </el-link>
        </div>

        <div v-if="currentSubmission.patch_title" class="detail-section">
          <h4>关联Patch</h4>
          <el-link @click="$router.push(`/patches/${currentSubmission.patch_id}`)" type="primary">
            {{ currentSubmission.patch_title }}
          </el-link>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import {
  Loading, Warning, Calendar, Clock, Edit, User, Document, Avatar,
  Check, Upload, Trophy, InfoFilled, List, FolderOpened, Star,
  StarFilled, Medal, UserFilled
} from '@element-plus/icons-vue'
import { activityApi, patchApi } from '@/api'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activityId = computed(() => parseInt(route.params.id))

const loading = ref(true)
const activity = ref(null)
const activeTab = ref('detail')

const submissions = ref([])
const submissionsLoading = ref(false)
const submissionsPage = ref(1)
const submissionsLimit = 12
const submissionsTotal = ref(0)

const rankings = ref([])
const rankingLoading = ref(false)

const myPatches = ref([])
const showSubmitDialog = ref(false)
const showSubmissionDetail = ref(false)
const currentSubmission = ref(null)
const submitting = ref(false)

const submitForm = ref({
  patch_id: null,
  title: '',
  description: '',
  content: '',
  attachment_url: ''
})

const now = new Date()

const canRegister = computed(() => {
  if (!activity.value) return false
  if (activity.value.status !== 'published') return false
  
  if (activity.value.registration_start && new Date(activity.value.registration_start) > now) {
    return false
  }
  if (activity.value.registration_end && new Date(activity.value.registration_end) < now) {
    return false
  }
  if (activity.value.max_registrations > 0 && activity.value.registration_count >= activity.value.max_registrations) {
    return false
  }
  return true
})

const registerTip = computed(() => {
  if (!activity.value) return ''
  if (activity.value.status !== 'published') return '活动尚未开始'
  if (activity.value.registration_start && new Date(activity.value.registration_start) > now) {
    return `报名尚未开始，开始时间: ${formatDate(activity.value.registration_start)}`
  }
  if (activity.value.registration_end && new Date(activity.value.registration_end) < now) {
    return `报名已结束，结束时间: ${formatDate(activity.value.registration_end)}`
  }
  if (activity.value.max_registrations > 0 && activity.value.registration_count >= activity.value.max_registrations) {
    return '报名人数已满'
  }
  return ''
})

const canSubmit = computed(() => {
  if (!activity.value) return false
  if (!activity.value.allow_submission) return false
  if (!activity.value.is_registered || activity.value.registration_status !== 'approved') return false
  
  if (activity.value.submission_start && new Date(activity.value.submission_start) > now) {
    return false
  }
  if (activity.value.submission_end && new Date(activity.value.submission_end) < now) {
    return false
  }
  if (activity.value.my_submission) return false
  return true
})

const submitTip = computed(() => {
  if (!activity.value) return ''
  if (!activity.value.allow_submission) return '此活动不接受投稿'
  if (!activity.value.is_registered) return '请先报名此活动'
  if (activity.value.registration_status !== 'approved') return '报名审核中，请耐心等待'
  if (activity.value.submission_start && new Date(activity.value.submission_start) > now) {
    return `投稿尚未开始，开始时间: ${formatDate(activity.value.submission_start)}`
  }
  if (activity.value.submission_end && new Date(activity.value.submission_end) < now) {
    return `投稿已结束，结束时间: ${formatDate(activity.value.submission_end)}`
  }
  if (activity.value.my_submission) return '您已提交过作品，每人限投一份'
  return ''
})

const mySubmission = computed(() => activity.value?.my_submission)

const getTypeIcon = (type) => {
  const icons = { contest: '🏆', collection: '📝', vote: '🗳️', other: '🎪' }
  return icons[type] || '🎯'
}

const getTypeText = (type) => {
  const texts = { contest: '创作大赛', collection: '专题征集', vote: '投票评选', other: '其他活动' }
  return texts[type] || '活动'
}

const getStatusText = (status) => {
  const texts = { draft: '草稿', published: '进行中', upcoming: '即将开始', ended: '已结束' }
  return texts[status] || status
}

const getStatusTagType = (status) => {
  const types = { draft: 'info', published: 'success', upcoming: 'primary', ended: 'danger' }
  return types[status] || 'info'
}

const getSubmissionStatusText = (status) => {
  const texts = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return texts[status] || status
}

const getSubmissionStatusType = (status) => {
  const types = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return types[status] || 'info'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '待定'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const formatDateRange = (start, end) => {
  const s = formatDate(start)
  const e = formatDate(end)
  if (s === e) return s
  return `${s} ~ ${e}`
}

const parseMarkdown = (text) => {
  if (!text) return ''
  return marked.parse(text)
}

const fetchActivity = async () => {
  loading.value = true
  try {
    activity.value = await activityApi.getDetail(activityId.value)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchSubmissions = async () => {
  submissionsLoading.value = true
  try {
    const res = await activityApi.getSubmissions(activityId.value, {
      page: submissionsPage.value,
      limit: submissionsLimit
    })
    submissions.value = res.list || res || []
    submissionsTotal.value = res.total || 0
  } finally {
    submissionsLoading.value = false
  }
}

const fetchRankings = async () => {
  rankingLoading.value = true
  try {
    const res = await activityApi.getRankings(activityId.value)
    rankings.value = res.rankings || []
  } finally {
    rankingLoading.value = false
  }
}

const fetchMyPatches = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const res = await patchApi.getList({ user_id: userStore.user.id, limit: 100 })
    myPatches.value = res.list || res || []
  } catch (err) {
    console.error(err)
  }
}

const registerActivity = async () => {
  try {
    await activityApi.register(activityId.value)
    ElMessage.success('报名成功！')
    fetchActivity()
  } catch (err) {
    ElMessage.error(err.error || '报名失败')
  }
}

const cancelRegistration = async () => {
  try {
    await ElMessageBox.confirm('确定要取消报名吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await activityApi.cancelRegistration(activityId.value)
    ElMessage.success('已取消报名')
    fetchActivity()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.error || '操作失败')
    }
  }
}

const submitWork = async () => {
  if (!submitForm.value.title) {
    ElMessage.warning('请填写作品标题')
    return
  }
  submitting.value = true
  try {
    await activityApi.submitWork(activityId.value, submitForm.value)
    ElMessage.success('作品提交成功，等待审核！')
    showSubmitDialog.value = false
    submitForm.value = { patch_id: null, title: '', description: '', content: '', attachment_url: '' }
    fetchActivity()
  } catch (err) {
    ElMessage.error(err.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

const voteSubmission = async (submission) => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  if (submission.user_id === userStore.user?.id) {
    ElMessage.warning('不能给自己的作品投票')
    return
  }
  try {
    const res = await activityApi.voteSubmission(submission.id)
    submission.has_voted = !res.canceled
    submission.votes_count = res.votes_count
    if (currentSubmission.value?.id === submission.id) {
      currentSubmission.value.has_voted = submission.has_voted
      currentSubmission.value.votes_count = submission.votes_count
    }
    ElMessage.success(res.canceled ? '已取消投票' : '投票成功！')
  } catch (err) {
    ElMessage.error(err.error || '操作失败')
  }
}

const viewSubmission = async (submission) => {
  try {
    currentSubmission.value = await activityApi.getSubmissionDetail(submission.id)
    showSubmissionDetail.value = true
  } catch (err) {
    ElMessage.error('获取作品详情失败')
  }
}

onMounted(() => {
  fetchActivity()
  fetchMyPatches()
})

watch(activeTab, (val) => {
  if (val === 'submissions') {
    fetchSubmissions()
  } else if (val === 'ranking') {
    fetchRankings()
  }
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}

.activity-header {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 32px;
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.activity-cover-large {
  width: 100%;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.1));
}

.activity-cover-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder-large {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 96px;
}

.badges-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.activity-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px;
}

.activity-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 20px;
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tip-text {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f59e0b;
  font-size: 0.875rem;
}

.activity-content {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.activity-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
}

.tab-content {
  min-height: 300px;
}

.content-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.content-section h3 {
  color: #ffd700;
  font-size: 1.25rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.markdown-body {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  color: #fff;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.markdown-body :deep(p) {
  margin: 0.5em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
}

.markdown-body :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.empty-tab {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-tab .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
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

.submissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.submission-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.submission-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 215, 0, 0.3);
}

.submission-rank {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
}

.submission-header {
  margin-bottom: 12px;
}

.submission-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.submission-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.submission-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.submission-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submission-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: color 0.3s ease;
}

.stat-item:hover {
  color: #ffd700;
}

.stat-item.voted {
  color: #ffd700;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 40px;
  padding: 40px 0;
}

.podium-item {
  text-align: center;
  position: relative;
}

.podium-item.first {
  order: 2;
}

.podium-item.second {
  order: 1;
}

.podium-item.third {
  order: 3;
}

.podium-rank {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  z-index: 2;
}

.podium-item.first .podium-rank {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  width: 40px;
  height: 40px;
  font-size: 1.25rem;
  color: #1a1a2e;
}

.podium-item.second .podium-rank {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
}

.podium-item.third .podium-rank {
  background: linear-gradient(135deg, #cd7f32, #b87333);
}

.podium-crown {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32px;
  z-index: 3;
}

.podium-avatar {
  margin-bottom: 12px;
  margin-top: 16px;
}

.podium-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.podium-score {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 4px;
}

.podium-title {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-table {
  margin-top: 24px;
}

.rank-num {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.my-submission-card {
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  padding: 24px;
}

.my-submission-card h3 {
  color: #ffd700;
  margin: 0 0 12px;
}

.my-submission-card h4 {
  color: #fff;
  margin: 12px 0 8px;
}

.my-submission-card p {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.review-note {
  background: rgba(67, 233, 123, 0.1);
  border-left: 3px solid #43e97b;
  padding: 12px;
  margin: 16px 0;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.submission-meta {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.submission-detail-header {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.submission-detail-header h2 {
  color: #fff;
  margin: 0 0 16px;
}

.submission-detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-badge {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  color: #ffd700;
  margin: 0 0 8px;
}

.detail-section p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

@media (max-width: 900px) {
  .activity-header {
    grid-template-columns: 1fr;
  }
  
  .activity-cover-large {
    height: 200px;
  }
  
  .podium {
    flex-direction: column;
    align-items: center;
  }
  
  .podium-item.first {
    order: 0;
  }
}
</style>
