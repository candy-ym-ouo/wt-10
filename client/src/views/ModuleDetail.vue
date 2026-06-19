<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else-if="module">
      <el-button @click="$router.back()" text style="margin-bottom: 20px;">
        <el-icon><ArrowLeft /></el-icon> 返回设备库
      </el-button>

      <div class="detail-hero">
        <div class="detail-header">
          <div class="detail-image">📦</div>
          <div class="detail-info">
            <span class="module-type">{{ module.type }}</span>
            <h1 class="detail-title">{{ module.name }}</h1>
            <p class="detail-manu" v-if="module.manufacturer_name">
              厂商: <a :href="module.manufacturer_website" target="_blank">{{ module.manufacturer_name }}</a>
            </p>
            <p class="detail-desc">{{ module.description }}</p>
          </div>
        </div>

        <div class="module-specs">
          <div class="spec-item">
            <span class="spec-label">宽度</span>
            <span class="spec-value">{{ module.width || '-' }} HP</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">供电</span>
            <span class="spec-value">{{ module.power || '-' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">类型</span>
            <span class="spec-value">{{ module.type }}</span>
          </div>
        </div>
      </div>

      <div class="card" v-if="module.specs">
        <div class="param-section">
          <h3>📋 技术规格</h3>
          <div class="param-grid">
            <div v-for="(value, key) in moduleSpecs" :key="key" class="param-item">
              <div class="param-label">{{ key }}</div>
              <div class="param-value">{{ value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" v-if="module.patches && module.patches.length > 0">
        <div class="param-section">
          <h3>🎛️ 使用此模块的 Patch ({{ module.patches.length }})</h3>
          <div class="grid-patches" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr);">
            <div
              v-for="patch in module.patches"
              :key="patch.id"
              class="card patch-card"
              @click="$router.push(`/patches/${patch.id}');"
            >
              <div class="patch-image">🎛️</div>
              <div class="patch-title">{{ patch.title }}</div>
              <div class="patch-meta">
                <span>by {{ patch.username }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Warning /></el-icon>
      <p>模块不存在</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, ArrowLeft, Warning } from '@element-plus/icons-vue'
import { moduleAPI } from '@/api'

const route = useRoute()

const loading = ref(true)
const module = ref(null)

const moduleSpecs = computed(() => {
  try {
    return JSON.parse(module.value?.specs) || {}
  } catch {
    return {}
  }
})

onMounted(async () => {
  try {
    module.value = await moduleAPI.getModuleDetail(route.params.id)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-header {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.detail-image {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #2d2d44, #1e1e33);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
}

.detail-info {
  flex: 1;
}

.detail-title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 8px 0 12px;
}

.detail-manu {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
}

.detail-manu a {
  color: #ffd700;
  text-decoration: none;
}

.detail-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.module-specs {
  display: flex;
  gap: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 215, 0, 0.2);
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spec-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.spec-value {
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
}
</style>
