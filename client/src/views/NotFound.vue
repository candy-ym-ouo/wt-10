<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">页面未找到</h2>
      <p class="error-message">抱歉，您访问的页面不存在或已被移除。</p>
      <el-button type="primary" size="large" @click="goHome">
        <el-icon><HomeFilled /></el-icon>
        返回首页
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { HomeFilled } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.not-found-content {
  text-align: center;
  padding: 3rem;
}

.error-code {
  font-size: 8rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1;
}

.error-title {
  font-size: 2rem;
  color: var(--text-primary);
  margin: 1rem 0 0.5rem 0;
}

.error-message {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}
</style>
