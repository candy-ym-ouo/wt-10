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
          <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="stat-card">
              <div class="stat-value">{{ stats.patches }}</div>
              <div class="stat-label">发布的 Patch</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.likes }}</div>
              <div class="stat-label">获得的点赞</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.favorites }}</div>
              <div class="stat-label">收藏的 Patch</div>
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
import { Document, Star, Medal, Tools } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { patchAPI, socialApi, creatorVerificationAPI } from '@/api'
import { useRouter } from 'vue-router'
import CreatorBadge from '@/components/CreatorBadge.vue'

const userStore = useUserStore()
const router = useRouter()

const formRef = ref()
const saving = ref(false)
const stats = ref({ patches: 0, likes: 0, favorites: 0 })
const verificationStatus = ref(null)

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
})

const loadStats = async () => {
  try {
    const [myPatches, favorites] = await Promise.all([
      patchAPI.getList({ user_id: userStore.user?.id, limit: 1 }),
      socialApi.getMyFavorites({ limit: 1 })
    ])
    
    let totalLikes = 0
    if (myPatches.list && myPatches.list.length > 0) {
      const allPatches = await patchAPI.getList({ user_id: userStore.user?.id, limit: 100 })
      totalLikes = allPatches.list.reduce((sum, p) => sum + (p.likes_count || 0), 0)
    }

    stats.value = {
      patches: myPatches.total || 0,
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
</style>
