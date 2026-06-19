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
            <h2 class="profile-name">{{ userStore.user?.username }}</h2>
            <p class="profile-email">{{ userStore.user?.email }}</p>
            <p class="profile-role">
              <el-tag :type="userStore.isAdmin ? 'danger' : 'success'">
                {{ userStore.isAdmin ? '管理员' : '普通用户' }}
              </el-tag>
            </p>
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
import { useUserStore } from '@/stores/userStore'
import { patchAPI } from '@/api'

const userStore = useUserStore()

const formRef = ref()
const saving = ref(false)
const stats = ref({ patches: 0, likes: 0, favorites: 0 })

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

onMounted(() => {
  if (userStore.user) {
    form.username = userStore.user.username
    form.email = userStore.user.email
    form.avatar = userStore.user.avatar || ''
    form.bio = userStore.user.bio || ''
  }
  loadStats()
})

const loadStats = async () => {
  try {
    const [myPatches, favorites] = await Promise.all([
      patchAPI.getList({ user_id: userStore.user?.id, limit: 1 }),
      patchStore.fetchMyFavorites({ limit: 1 })
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

.profile-name {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 8px;
}

.profile-email {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
}

.profile-role {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}
</style>
