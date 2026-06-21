<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">👤 个人中心</h1>
      <p class="page-subtitle">管理你的个人信息</p>
    </div>

    <el-row :gutter="24">
      <el-col :span="8">
        <div class="card">
          <div class="profile-avatar">
            <el-avatar :size="120" :src="form.avatar">
              {{ userStore.user?.username?.charAt(0).toUpperCase() }}
            </el-avatar>
          </div>
          <div class="profile-info">
            <div class="profile-name-row">
              <h2 class="profile-name">{{ userStore.user?.username }}</h2>
              <CreatorBadge
                v-if="userStore.user?.is_creator_verified"
                :verified="true"
                :verified-at="userStore.user?.creator_verified_at"
                size="default"
              />
            </div>
            <p class="profile-email">{{ userStore.user?.email }}</p>
            <div class="profile-tags">
              <el-tag :type="userStore.isAdmin ? 'danger' : 'success'">
                {{ userStore.isAdmin ? '管理员' : '普通用户' }}
              </el-tag>
              <el-tag
                v-if="!userStore.user?.is_creator_verified"
                type="warning"
                effect="plain"
                class="verify-tag"
                @click="goToVerification"
              >
                申请创作者认证 →
              </el-tag>
              <el-tag
                v-else-if="verificationStatus?.verification?.status === 'pending'"
                type="info"
                effect="plain"
                class="verify-tag"
                @click="goToVerification"
              >
                认证审核中 →
              </el-tag>
              <el-tag
                v-else
                type="success"
                effect="dark"
                class="verify-tag"
                @click="goToVerification"
              >
                🎖️ 已认证创作者
              </el-tag>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: 24px;">
          <h3 class="section-title">快捷入口</h3>
          <div class="quick-links">
            <div class="quick-link" @click="router.push('/my-patches')">
              <el-icon><Document /></el-icon>
              <span>我的作品</span>
            </div>
            <div class="quick-link" @click="router.push('/favorites')">
              <el-icon><Star /></el-icon>
              <span>我的收藏</span>
            </div>
            <div class="quick-link" @click="router.push('/creator-verification')">
              <el-icon><Medal /></el-icon>
              <span>创作者认证</span>
            </div>
            <div class="quick-link" @click="router.push('/workbench')">
              <el-icon><Tools /></el-icon>
              <span>创作者工作台</span>
            </div>
            <div class="quick-link" @click="goToAchievements">
              <el-icon><Trophy /></el-icon>
              <span>我的成就</span>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="16">
        <div class="card">
          <h3 class="section-title">编辑资料</h3>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="头像链接">
              <el-input v-model="form.avatar" placeholder="输入头像图片链接" />
            </el-form-item>
            <el-form-item label="个人简介">
              <el-input
                v-model="form.bio"
                type="textarea"
                :rows="4"
                placeholder="介绍一下自己..."
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" class="btn-primary" @click="submit" :loading="saving">
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="card" style="margin-top: 24px;">
          <h3 class="section-title">
            <el-icon><Lock /></el-icon> 隐私设置
          </h3>
          <div class="privacy-settings">
            <div class="privacy-item">
              <div class="privacy-item-header">
                <span class="privacy-item-title">邮箱可见性</span>
                <span class="privacy-item-desc">控制谁可以看到你的邮箱地址</span>
              </div>
              <el-radio-group v-model="privacySettings.privacy_email" size="default">
                <el-radio-button v-for="opt in privacyOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
            <div class="privacy-item">
              <div class="privacy-item-header">
                <span class="privacy-item-title">收藏夹可见性</span>
                <span class="privacy-item-desc">控制谁可以看到你的收藏夹和被收藏统计</span>
              </div>
              <el-radio-group v-model="privacySettings.privacy_favorites" size="default">
                <el-radio-button v-for="opt in privacyOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
            <div class="privacy-item">
              <div class="privacy-item-header">
                <span class="privacy-item-title">已发布 Patch 可见性</span>
                <span class="privacy-item-desc">控制谁可以看到你发布的 Patch 列表</span>
              </div>
              <el-radio-group v-model="privacySettings.privacy_patches" size="default">
                <el-radio-button v-for="opt in privacyOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
            <el-button type="primary" class="btn-primary" @click="savePrivacySettings" :loading="privacySaving">
              保存隐私设置
            </el-button>
          </div>
        </div>

        <div class="card" style="margin-top: 24px;">
          <h3 class="section-title">数据统计</h3>
          <div class="stats-grid" style="grid-template-columns: repeat(6, 1fr);">
            <div class="stat-card" @click="router.push('/my-patches?tab=published')" style="cursor: pointer;">
              <div class="stat-value">{{ stats.patches }}</div>
              <div class="stat-label">🚀 已发布</div>
            </div>
            <div class="stat-card" @click="router.push('/my-patches?tab=scheduled')" style="cursor: pointer;">
              <div class="stat-value" style="color: #e6a23c;">{{ stats.scheduled }}</div>
              <div class="stat-label">⏰ 定时中</div>
            </div>
            <div class="stat-card" @click="router.push('/my-patches?tab=draft')" style="cursor: pointer;">
              <div class="stat-value" style="color: #909399;">{{ stats.drafts }}</div>
              <div class="stat-label">📝 草稿</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.likes }}</div>
              <div class="stat-label">❤️ 获得的点赞</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.beingFavorited }}</div>
              <div class="stat-label">⭐ 被收藏次数</div>
            </div>
            <div class="stat-card" @click="router.push('/favorites')" style="cursor: pointer;">
              <div class="stat-value">{{ stats.myFavorites }}</div>
              <div class="stat-label">📌 我收藏的</div>
            </div>
          </div>

          <div v-if="favoriteFolders.length > 0" class="favorite-folders-section">
            <h4 class="subsection-title">
              <el-icon><Folder /></el-icon> 收藏分组
            </h4>
            <div class="folder-stats-grid">
              <div
                v-for="folder in favoriteFolders"
                :key="folder.id"
                class="folder-stat-card"
                @click="goToFolder(folder.id)"
              >
                <div class="folder-icon-wrapper" :style="{ backgroundColor: folder.color + '20' }">
                  <el-icon :color="folder.color"><Folder /></el-icon>
                </div>
                <div class="folder-info">
                  <div class="folder-name">{{ getFolderDisplayName(folder) }}</div>
                  <div class="folder-count">{{ folder.patch_count || folder.count || 0 }} 个收藏</div>
                </div>
              </div>
            </div>
          </div>

          <div class="achievements-section">
            <div class="section-header-row">
              <h4 class="subsection-title">
                <el-icon><Trophy /></el-icon> 我的成就
              </h4>
              <span class="view-more" @click="goToAchievements">查看全部 →</span>
            </div>
            <div v-if="achievementsLoading" class="achievements-loading">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
            <div v-else-if="achievements" class="achievements-preview">
              <div class="achievement-stats-row">
                <div class="achievement-stat">
                  <span class="stat-num">{{ achievements.unlocked_count }}</span>
                  <span class="stat-desc">已解锁</span>
                </div>
                <div class="achievement-stat">
                  <span class="stat-num">{{ achievements.total_count }}</span>
                  <span class="stat-desc">总成就</span>
                </div>
                <div class="achievement-stat">
                  <span class="stat-num">{{ Math.round(achievements.unlocked_count / achievements.total_count * 100) }}%</span>
                  <span class="stat-desc">完成度</span>
                </div>
              </div>
              <div class="unlocked-achievements">
                <div 
                  v-for="achievement in getAllUnlocked().slice(0, 6)" 
                  :key="achievement.id" 
                  class="mini-achievement"
                  :title="achievement.name"
                >
                  <span class="mini-icon">{{ achievement.icon }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Star, Medal, Tools, Folder, Trophy, Loading, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'
import { socialApi, creatorVerificationAPI, achievementApi, userApi } from '@/api'
import { useRouter } from 'vue-router'
import CreatorBadge from '@/components/CreatorBadge.vue'

const userStore = useUserStore()
const patchStore = usePatchStore()
const router = useRouter()

const formRef = ref()
const saving = ref(false)
const stats = ref({ patches: 0, drafts: 0, scheduled: 0, likes: 0, beingFavorited: 0, myFavorites: 0 })
const verificationStatus = ref(null)
const favoriteFolders = ref([])
const achievements = ref(null)
const achievementsLoading = ref(false)
const privacySaving = ref(false)
const privacySettings = reactive({
  privacy_email: 'public',
  privacy_favorites: 'public',
  privacy_patches: 'public'
})

const privacyOptions = [
  { value: 'public', label: '公开', desc: '所有人可见' },
  { value: 'followers', label: '仅粉丝', desc: '仅关注你的人可见' },
  { value: 'private', label: '仅自己', desc: '只有你自己可见' }
]

const form = reactive({
  username: '',
  email: '',
  avatar: '',
  bio: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const goToVerification = () => {
  router.push('/creator-verification')
}

const goToAchievements = () => {
  router.push(`/users/${userStore.user?.id}?tab=achievements`)
}

const loadVerificationStatus = async () => {
  try {
    const res = await creatorVerificationAPI.getStatus()
    verificationStatus.value = res
    if (res.user) {
      userStore.setUser(res.user)
    }
  } catch (e) {
    console.error(e)
  }
}

const loadPrivacySettings = async () => {
  try {
    const res = await userApi.getPrivacySettings()
    privacySettings.privacy_email = res.privacy_email || 'public'
    privacySettings.privacy_favorites = res.privacy_favorites || 'public'
    privacySettings.privacy_patches = res.privacy_patches || 'public'
  } catch (e) {
    console.error('加载隐私设置失败:', e)
  }
}

const savePrivacySettings = async () => {
  try {
    privacySaving.value = true
    await userApi.updatePrivacySettings(privacySettings)
    ElMessage.success('隐私设置已保存')
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  } finally {
    privacySaving.value = false
  }
}

onMounted(() => {
  if (userStore.user) {
    form.username = userStore.user.username
    form.email = userStore.user.email
    form.avatar = userStore.user.avatar || ''
    form.bio = userStore.user.bio || ''
  }
  loadStats()
  loadVerificationStatus()
  loadFavoriteFolders()
  loadAchievements()
  loadPrivacySettings()
})

const loadFavoriteFolders = async () => {
  try {
    const res = await patchStore.fetchFavoriteFolders()
    favoriteFolders.value = res.folders || []
  } catch (e) {
    console.error('加载收藏分组失败:', e)
  }
}

const getFolderDisplayName = (folder) => {
  if (folder.is_default || folder.name === 'default') return '默认分组'
  return folder.name
}

const goToFolder = (folderId) => {
  router.push({
    path: '/favorites',
    query: { folder: folderId }
  })
}

const loadStats = async () => {
  try {
    const [creatorStats, myDrafts, myScheduled] = await Promise.all([
      socialApi.getCreatorStats(),
      socialApi.getMyDrafts({ limit: 1 }).catch(() => ({ total: 0 })),
      socialApi.getMyScheduled({ limit: 1 }).catch(() => ({ total: 0 }))
    ])

    stats.value = {
      patches: creatorStats.publishedPatches || 0,
      drafts: myDrafts.total || creatorStats.totalDrafts || 0,
      scheduled: myScheduled.total || creatorStats.totalScheduled || 0,
      likes: creatorStats.totalLikes || 0,
      beingFavorited: creatorStats.totalFavorites || 0,
      myFavorites: creatorStats.myFavoritesCount || 0
    }
  } catch (e) {
    console.error(e)
  }
}

const loadAchievements = async () => {
  try {
    achievementsLoading.value = true
    const res = await achievementApi.getMyAchievements()
    achievements.value = res
  } catch (e) {
    console.error('加载成就数据失败:', e)
  } finally {
    achievementsLoading.value = false
  }
}

const getAllUnlocked = () => {
  if (!achievements.value?.achievements) return []
  const all = []
  Object.values(achievements.value.achievements).forEach(list => {
    list.forEach(a => {
      if (a.is_unlocked) all.push(a)
    })
  })
  return all.sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
}

const submit = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    await userStore.updateProfile(form)
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-avatar {
  text-align: center;
  margin-bottom: 20px;
}

.profile-info {
  text-align: center;
}

.profile-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.profile-name {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
  margin: 0;
}

.profile-email {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
}

.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.verify-tag {
  cursor: pointer;
  transition: all 0.3s ease;
}

.verify-tag:hover {
  transform: translateY(-1px);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 20px;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.8);
}

.quick-link:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
  color: #ffd700;
}

.quick-link .el-icon {
  font-size: 18px;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}

.privacy-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.privacy-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.privacy-item:hover {
  border-color: rgba(255, 215, 0, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.privacy-item-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.privacy-item-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.privacy-item-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.section-title .el-icon {
  margin-right: 6px;
  vertical-align: middle;
}

.favorite-folders-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.subsection-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
}

.subsection-title .el-icon {
  color: #ffd700;
}

.folder-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.folder-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.folder-stat-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 215, 0, 0.3);
  transform: translateY(-2px);
}

.folder-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.folder-icon-wrapper .el-icon {
  font-size: 22px;
}

.folder-info {
  flex: 1;
  min-width: 0;
}

.folder-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.achievements-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header-row .subsection-title {
  margin-bottom: 0;
}

.view-more {
  font-size: 13px;
  color: #ffd700;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.view-more:hover {
  opacity: 0.8;
}

.achievements-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.loading-icon {
  animation: spin 1s linear infinite;
  font-size: 18px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.achievements-preview {
  background: rgba(255, 215, 0, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 10px;
  padding: 16px;
}

.achievement-stats-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.achievement-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.achievement-stat .stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffd700;
}

.achievement-stat .stat-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.unlocked-achievements {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.mini-achievement {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.mini-achievement:hover {
  transform: scale(1.1);
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.1);
}

.mini-icon {
  font-size: 1.5rem;
}
</style>
