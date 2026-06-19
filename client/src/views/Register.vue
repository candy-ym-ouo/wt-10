<template>
  <div class="auth-layout">
    <div class="auth-card">
      <div class="auth-logo">
        <h1>🎛️ Patch Vault</h1>
        <p>创建新账号</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="email">
          <el-input
            v-model="form.email"
            placeholder="邮箱"
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（至少 6 位）"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="btn-primary"
          style="width: 100%"
          :loading="loading"
          @click="handleRegister"
        >
          注册
        </el-button>
      </el-form>

      <div class="auth-footer">
        已有账号？
        <router-link to="/login" class="text-link">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Message } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== form.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    const { confirmPassword, ...data } = form.value
    await userStore.register(data)
    ElMessage.success('注册成功')
    router.push('/')
  } catch (e) {
    ElMessage.error(e.error || '注册失败')
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
</style>
