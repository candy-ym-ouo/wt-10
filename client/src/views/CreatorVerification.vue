<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎖️ 创作者认证</h1>
      <p class="page-subtitle">申请成为认证创作者，获得专属标识和更多权益</p>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else>
      <el-row :gutter="24">
        <el-col :span="16">
          <div v-if="!isVerified && !currentVerification" class="card">
            <h3 class="section-title">提交认证申请</h3>
            <el-alert
              title="认证权益"
              type="info"
              :closable="false"
              style="margin-bottom: 20px;"
            >
              <ul style="margin: 8px 0 0 20px; padding: 0;">
                <li>专属创作者认证标识</li>
                <li>作品获得更多曝光机会</li>
                <li>优先参与官方活动</li>
                <li>专属创作者工作台</li>
              </ul>
            </el-alert>

            <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
              <el-form-item label="真实姓名" prop="real_name">
                <el-input v-model="form.real_name" placeholder="请输入真实姓名" />
              </el-form-item>
              <el-form-item label="身份证号">
                <el-input v-model="form.id_card" placeholder="请输入身份证号（选填）" />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="form.phone" placeholder="请输入联系电话" />
              </el-form-item>
              <el-form-item label="认证邮箱">
                <el-input v-model="form.email" placeholder="请输入认证邮箱" />
              </el-form-item>
              <el-form-item label="从业年限">
                <el-input-number
                  v-model="form.experience_years"
                  :min="0"
                  :max="50"
                  style="width: 200px;"
                />
              </el-form-item>
              <el-form-item label="专业领域">
                <el-select v-model="form.professional_field" placeholder="请选择专业领域" style="width: 100%;">
                  <el-option label="模块化合成器演奏" value="modular_performance" />
                  <el-option label="声音设计" value="sound_design" />
                  <el-option label="音乐制作" value="music_production" />
                  <el-option label="模块开发" value="module_development" />
                  <el-option label="现场演出" value="live_performance" />
                  <el-option label="教学/培训" value="education" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
              <el-form-item label="个人简介">
                <el-input
                  v-model="form.bio"
                  type="textarea"
                  :rows="4"
                  placeholder="请简单介绍您的创作经历和成就"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
              <el-form-item label="作品集链接">
                <el-input v-model="form.portfolio_url" placeholder="请输入您的作品集、SoundCloud、Bandcamp等链接" />
              </el-form-item>
              <el-form-item label="社交链接">
                <div class="social-inputs">
                  <div v-for="(link, index) in form.social_links" :key="index" class="social-input-row">
                    <el-input
                      v-model="form.social_links[index]"
                      placeholder="社交平台链接"
                      style="flex: 1;"
                    />
                    <el-button
                      type="danger"
                      :icon="Delete"
                      circle
                      size="small"
                      @click="removeSocialLink(index)"
                    />
                  </div>
                  <el-button type="primary" plain :icon="Plus" @click="addSocialLink">
                    添加社交链接
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item label="身份证正面">
                <el-input v-model="form.id_card_front" placeholder="身份证正面照片链接（选填）" />
              </el-form-item>
              <el-form-item label="身份证背面">
                <el-input v-model="form.id_card_back" placeholder="身份证背面照片链接（选填）" />
              </el-form-item>
              <el-form-item label="资质证明">
                <el-input
                  v-model="form.certificate"
                  type="textarea"
                  :rows="2"
                  placeholder="请提供相关资质证明、获奖经历等材料链接或说明"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" class="btn-primary" @click="submitApplication" :loading="submitting">
                  提交认证申请
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div v-if="currentVerification && currentVerification.status === 'pending'" class="card">
            <div class="status-header status-pending">
              <el-icon class="status-icon"><Trophy /></el-icon>
              <div>
                <h3>认证申请审核中</h3>
                <p>我们已收到您的申请，工作人员将在3-5个工作日内完成审核</p>
              </div>
            </div>
            <div class="application-info">
              <h4 class="info-title">提交的申请信息</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="真实姓名">{{ currentVerification.real_name }}</el-descriptions-item>
                <el-descriptions-item label="联系电话">{{ currentVerification.phone || '-' }}</el-descriptions-item>
                <el-descriptions-item label="认证邮箱">{{ currentVerification.email }}</el-descriptions-item>
                <el-descriptions-item label="从业年限">{{ currentVerification.experience_years }} 年</el-descriptions-item>
                <el-descriptions-item label="专业领域">{{ getFieldLabel(currentVerification.professional_field) }}</el-descriptions-item>
                <el-descriptions-item label="提交时间">{{ formatDate(currentVerification.created_at) }}</el-descriptions-item>
                <el-descriptions-item label="个人简介" :span="2">{{ currentVerification.bio || '-' }}</el-descriptions-item>
                <el-descriptions-item label="作品集链接" :span="2">{{ currentVerification.portfolio_url || '-' }}</el-descriptions-item>
                <el-descriptions-item label="社交链接" :span="2">
                  <div v-if="currentVerification.social_links && currentVerification.social_links.length > 0">
                    <div v-for="(link, idx) in currentVerification.social_links" :key="idx">
                      <a :href="link" target="_blank" class="link">{{ link }}</a>
                    </div>
                  </div>
                  <span v-else>-</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <div v-if="currentVerification && currentVerification.status === 'rejected'" class="card">
            <div class="status-header status-rejected">
              <el-icon class="status-icon"><Delete /></el-icon>
              <div>
                <h3>认证申请未通过</h3>
                <p v-if="currentVerification.review_note">原因：{{ currentVerification.review_note }}</p>
              </div>
            </div>
            <div class="application-info">
              <h4 class="info-title">您可以修改资料后重新提交申请</h4>
              <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
                <el-form-item label="真实姓名" prop="real_name">
                  <el-input v-model="form.real_name" placeholder="请输入真实姓名" />
                </el-form-item>
                <el-form-item label="身份证号">
                  <el-input v-model="form.id_card" placeholder="请输入身份证号（选填）" />
                </el-form-item>
                <el-form-item label="联系电话">
                  <el-input v-model="form.phone" placeholder="请输入联系电话" />
                </el-form-item>
                <el-form-item label="认证邮箱">
                  <el-input v-model="form.email" placeholder="请输入认证邮箱" />
                </el-form-item>
                <el-form-item label="从业年限">
                  <el-input-number v-model="form.experience_years" :min="0" :max="50" style="width: 200px;" />
                </el-form-item>
                <el-form-item label="专业领域">
                  <el-select v-model="form.professional_field" placeholder="请选择专业领域" style="width: 100%;">
                    <el-option label="模块化合成器演奏" value="modular_performance" />
                    <el-option label="声音设计" value="sound_design" />
                    <el-option label="音乐制作" value="music_production" />
                    <el-option label="模块开发" value="module_development" />
                    <el-option label="现场演出" value="live_performance" />
                    <el-option label="教学/培训" value="education" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
                <el-form-item label="个人简介">
                  <el-input v-model="form.bio" type="textarea" :rows="4" placeholder="请简单介绍您的创作经历和成就" maxlength="500" show-word-limit />
                </el-form-item>
                <el-form-item label="作品集链接">
                  <el-input v-model="form.portfolio_url" placeholder="请输入您的作品集、SoundCloud、Bandcamp等链接" />
                </el-form-item>
                <el-form-item label="身份证正面">
                  <el-input v-model="form.id_card_front" placeholder="身份证正面照片链接（选填）" />
                </el-form-item>
                <el-form-item label="身份证背面">
                  <el-input v-model="form.id_card_back" placeholder="身份证背面照片链接（选填）" />
                </el-form-item>
                <el-form-item label="资质证明">
                  <el-input v-model="form.certificate" type="textarea" :rows="2" placeholder="请提供相关资质证明、获奖经历等材料链接或说明" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" class="btn-primary" @click="submitApplication" :loading="submitting">
                    重新提交申请
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <div v-if="isVerified" class="card">
            <div class="status-header status-approved">
              <el-icon class="status-icon"><CircleCheck /></el-icon>
              <div>
                <h3>🎉 恭喜！您已通过创作者认证</h3>
                <p>认证时间：{{ formatDate(verifiedAt) }}</p>
              </div>
            </div>
            <div class="verified-benefits">
              <h4 class="info-title">您已获得以下权益</h4>
              <el-row :gutter="16">
                <el-col :span="12">
                  <div class="benefit-item">
                    <el-icon><Medal /></el-icon>
                    <div>
                      <h5>专属认证标识</h5>
                      <p>在个人主页、作品页展示创作者认证徽章</p>
                    </div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="benefit-item">
                    <el-icon><Star /></el-icon>
                    <div>
                      <h5>更多曝光机会</h5>
                      <p>作品将获得优先推荐和展示机会</p>
                    </div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="benefit-item">
                    <el-icon><Present /></el-icon>
                    <div>
                      <h5>优先参与活动</h5>
                      <p>优先获得官方活动参与资格和邀请</p>
                    </div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="benefit-item">
                    <el-icon><Tools /></el-icon>
                    <div>
                      <h5>创作者工作台</h5>
                      <p>专属的数据分析和作品管理工具</p>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="card">
            <h3 class="section-title">申请记录</h3>
            <div v-if="history.length === 0" class="empty-tip">
              <p>暂无申请记录</p>
            </div>
            <el-timeline v-else>
              <el-timeline-item
                v-for="item in history"
                :key="item.id"
                :timestamp="formatDate(item.created_at)"
                :type="getStatusType(item.status)"
                :icon="getStatusIcon(item.status)"
              >
                <div class="timeline-content">
                  <h5>{{ getStatusText(item.status) }}</h5>
                  <p v-if="item.review_note" class="review-note">{{ item.review_note }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>

          <div class="card" style="margin-top: 24px;">
            <h3 class="section-title">认证须知</h3>
            <el-ul class="notice-list">
              <li>请确保提交的所有信息真实有效</li>
              <li>审核周期一般为3-5个工作日</li>
              <li>认证通过后不可转让或出售</li>
              <li>如发现虚假信息，将取消认证资格</li>
              <li>如需修改认证信息，请联系客服</li>
            </el-ul>
          </div>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Loading, Trophy, Delete, CircleCheck, Medal,
  Plus, Star, Present, Tools
} from '@element-plus/icons-vue'
import { creatorVerificationAPI } from '@/api'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

const formRef = ref()
const loading = ref(true)
const submitting = ref(false)
const isVerified = ref(false)
const verifiedAt = ref('')
const currentVerification = ref(null)
const history = ref([])

const form = reactive({
  real_name: '',
  id_card: '',
  phone: '',
  email: userStore.user?.email || '',
  experience_years: 0,
  professional_field: '',
  bio: '',
  portfolio_url: '',
  social_links: [],
  id_card_front: '',
  id_card_back: '',
  certificate: ''
})

const rules = {
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }]
}

const fieldLabels = {
  modular_performance: '模块化合成器演奏',
  sound_design: '声音设计',
  music_production: '音乐制作',
  module_development: '模块开发',
  live_performance: '现场演出',
  education: '教学/培训',
  other: '其他'
}

const getFieldLabel = (field) => fieldLabels[field] || field || '-'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getStatusType = (status) => {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const getStatusIcon = (status) => {
  const map = { pending: Trophy, approved: CircleCheck, rejected: Delete }
  return map[status]
}

const getStatusText = (status) => {
  const map = { pending: '审核中', approved: '已通过', rejected: '未通过' }
  return map[status] || status
}

const addSocialLink = () => {
  form.social_links.push('')
}

const removeSocialLink = (index) => {
  form.social_links.splice(index, 1)
}

const loadData = async () => {
  try {
    loading.value = true
    const [statusRes, historyRes] = await Promise.all([
      creatorVerificationAPI.getStatus(),
      creatorVerificationAPI.getHistory()
    ])

    isVerified.value = statusRes.is_verified
    verifiedAt.value = statusRes.verified_at
    currentVerification.value = statusRes.verification
    history.value = historyRes || []

    if (statusRes.verification && statusRes.verification.status === 'rejected') {
      form.real_name = statusRes.verification.real_name || ''
      form.id_card = statusRes.verification.id_card || ''
      form.phone = statusRes.verification.phone || ''
      form.email = statusRes.verification.email || ''
      form.experience_years = statusRes.verification.experience_years || 0
      form.professional_field = statusRes.verification.professional_field || ''
      form.bio = statusRes.verification.bio || ''
      form.portfolio_url = statusRes.verification.portfolio_url || ''
      form.social_links = statusRes.verification.social_links || []
      form.id_card_front = statusRes.verification.id_card_front || ''
      form.id_card_back = statusRes.verification.id_card_back || ''
      form.certificate = statusRes.verification.certificate || ''
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const submitApplication = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true
    await creatorVerificationAPI.submit(form)
    ElMessage.success('认证申请提交成功')
    await loadData()
  } catch (err) {
    if (err !== false) {
      ElMessage.error(err.error || '提交失败')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 20px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.status-pending {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%);
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.status-approved {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.15) 0%, rgba(82, 196, 26, 0.1) 100%);
  border: 1px solid rgba(103, 194, 58, 0.3);
}

.status-rejected {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.15) 0%, rgba(250, 84, 28, 0.1) 100%);
  border: 1px solid rgba(245, 108, 108, 0.3);
}

.status-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.status-pending .status-icon {
  color: #e6a23c;
}

.status-approved .status-icon {
  color: #67c23a;
}

.status-rejected .status-icon {
  color: #f56c6c;
}

.status-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #fff;
}

.status-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.application-info {
  margin-top: 24px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px 0;
}

.social-inputs {
  width: 100%;
}

.social-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.link {
  color: #ffd700;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.timeline-content h5 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 14px;
}

.review-note {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.empty-tip {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 20px 0;
}

.verified-benefits {
  margin-top: 24px;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 16px;
}

.benefit-item .el-icon {
  font-size: 28px;
  color: #ffd700;
  flex-shrink: 0;
}

.benefit-item h5 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 14px;
}

.benefit-item p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.5;
}

.notice-list {
  margin: 0;
  padding-left: 20px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 2;
  font-size: 14px;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.el-descriptions__label) {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.el-descriptions__content) {
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.el-timeline-item__timestamp) {
  color: rgba(255, 255, 255, 0.5);
}
</style>
