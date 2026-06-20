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
          <h3 class="section-title">数据统计</h3>
          <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr);">
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
              <div class="stat-label">获得的点赞</div>
            </div>
            <div class="stat-card" @click="router.push('/favorites')" style="cursor: pointer;">
              <div class="stat-value">{{ stats.favorites }}</div>
              <div class="stat-label">收藏的 Patch</div>
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
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Star, Medal, Tools, Folder } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'
import { patchAPI, socialApi, creatorVerificationAPI } from '@/api'
import { useRouter } from 'vue-router'
import CreatorBadge from '@/components/CreatorBadge.vue'

const userStore = useUserStore()
const patchStore = usePatchStore()
const router = useRouter()

const formRef = ref()
const saving = ref(false)
const stats = ref({ patches: 0, drafts: 0, scheduled: 0, likes: 0, favorites: 0 })
const verificationStatus = ref(null)
const favoriteFolders = ref([])

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
    const [myPatches, favorites, myDrafts, myScheduled] = await Promise.all([
      patchAPI.getList({ user_id: userStore.user?.id, limit: 1 }),
      socialApi.getMyFavorites({ limit: 1 }),
      socialApi.getMyDrafts({ limit: 1 }).catch(() => ({ total: 0 })),
      socialApi.getMyScheduled({ limit: 1 }).catch(() => ({ total: 0 }))
    ])
    
    let totalLikes = 0
    if (myPatches.list && myPatches.list.length > 0) {
      const allPatches = await patchAPI.getList({ user_id: userStore.user?.id, limit: 100 })
      totalLikes = allPatches.list.reduce((sum, p) => sum + (p.likes_count || 0), 0)
    }

    stats.value = {
      patches: myPatches.total || 0,
      drafts: myDrafts.total || 0,
      scheduled: myScheduled.total || 0,
      likes: totalLikes,
      favorites: favorites.total || 0
    }
  } catch (e) {
    console.error(e)
  }
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
</style>
