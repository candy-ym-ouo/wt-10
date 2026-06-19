<template>
  <div class="auth-layout">
    <div class="auth-card">
      <div class="auth-logo">
        <h1>🎛️ Patch Vault</h1>
        <p>欢迎回来</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名或邮箱"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="btn-primary"
          style="width: 100%"
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>

      <div class="auth-footer">
        还没有账号？
        <router-link to="/register" class="text-link">立即注册</router-link>
      </div>

      <div class="demo-accounts">
        <p class="demo-title">演示账号：</p>
        <p class="demo-text">管理员: admin / admin123</p>
        <p class="demo-text">普通用户: synthfan / 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { usePatchStore } from '@/stores/patchStore'

const router = useRouter()
const userStore = useUserStore()
const patchStore = usePatchStore()

const formRef = ref()
const loading = ref(false)
const form = ref({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    await userStore.login(form.value)
    ElMessage.success('登录成功')
    await patchStore.fetchCompareList()
    router.push('/')
  } catch (e) {
    ElMessage.error(e.error || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.text-link {
  color: #ffd700;
  text-decoration: none;
  margin-left: 4px;
}

.demo-accounts {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.demo-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.demo-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 4px 0;
}
</style>
