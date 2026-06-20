<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else-if="patch">
      <div class="detail-hero">
        <div class="detail-header">
          <el-button @click="$router.back()" text>
            <el-icon><ArrowLeft /></el-icon> 返回
          </el-button>
          <div class="detail-actions" v-if="userStore.isLoggedIn">
            <el-button
              :type="patch.is_liked ? 'warning' : 'default'"
              @click="toggleLike"
            >
              <el-icon><Star :fill="patch.is_liked ? '#ffd700' : 'none'" /></el-icon>
              {{ patch.is_liked ? '已点赞' : '点赞' }} ({{ patch.likes_count }})
            </el-button>
            <el-button
              :type="patch.is_favorited ? 'success' : 'default'"
              @click="toggleFavorite"
            >
              <el-icon><Collection :fill="patch.is_favorited ? '#67c23a' : 'none'" /></el-icon>
              {{ patch.is_favorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button type="primary" class="btn-primary" @click="addToCompare">
              <el-icon><SetUp /></el-icon>
              加入对比
            </el-button>
            <el-dropdown v-if="userStore.isLoggedIn" @command="handleAction">
              <el-button>
                <el-icon><MoreFilled /></el-icon>
                更多
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="isOwner" command="edit">
                    <el-icon><Edit /></el-icon> 编辑
                  </el-dropdown-item>
                  <el-dropdown-item v-if="isOwner || userStore.isAdmin" command="delete">
                    <el-icon><Delete /></el-icon> 删除
                  </el-dropdown-item>
                  <el-dropdown-item v-if="!isOwner" command="report">
                    <el-icon><WarningFilled /></el-icon> 举报
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div class="title-row">
          <h1 class="detail-title">{{ patch.title }}</h1>
          <el-tag v-if="patch.is_paid" type="danger" size="large" class="paid-tag">
            <el-icon><Lock /></el-icon> 付费内容
          </el-tag>
        </div>
        <p class="detail-desc">{{ patch.description }}</p>

        <div class="detail-meta">
          <div class="author-info" @click="goToUser(patch.user_id)">
            <el-avatar :size="40" :src="patch.avatar">
              {{ patch.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div>
              <div class="author-name">{{ patch.username }}</div>
              <div class="publish-date">{{ formatDate(patch.created_at) }}</div>
            </div>
          </div>
          <div class="detail-stats">
            <span><el-icon><View /></el-icon> {{ patch.views_count }} 浏览</span>
            <span><el-icon><Star /></el-icon> {{ patch.likes_count }} 点赞</span>
          </div>
        </div>

        <div class="patch-tags">
          <span class="tag" v-for="tag in patchTags" :key="tag">#{{ tag }}</span>
        </div>
      </div>

      <div v-if="patch.is_paid && product && !hasPermission" class="paid-product-card">
        <div class="product-info">
          <div class="product-header">
            <h3>🎵 解锁完整内容</h3>
            <div class="price-info">
              <span class="current-price">¥{{ product.price }}</span>
              <span v-if="product.original_price" class="original-price">
                ¥{{ product.original_price }}
              </span>
              <el-tag v-if="product.is_discount" type="warning" size="small">限时特惠</el-tag>
            </div>
          </div>
          <div class="product-description" v-if="product.description">
            {{ product.description }}
          </div>
          <div class="product-benefits">
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>完整参数配置</span>
            </div>
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>线缆连接图</span>
            </div>
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>Patch 文件下载</span>
            </div>
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>永久访问权限</span>
            </div>
          </div>
          <div class="product-preview" v-if="patch.preview_content">
            <h4>预览内容</h4>
            <div class="preview-text">{{ patch.preview_content }}</div>
          </div>
          <div class="purchase-section" v-if="userStore.isLoggedIn">
            <el-button 
              type="primary" 
              size="large" 
              class="purchase-btn"
              :loading="purchasing"
              @click="purchasePatch"
            >
              <el-icon><ShoppingCart /></el-icon>
              立即购买 ¥{{ product.price }}
            </el-button>
            <p class="purchase-note">
              <el-icon><InfoFilled /></el-icon>
              支持创作者，购买后可永久查看完整内容
            </p>
          </div>
          <div v-else class="login-prompt">
            <el-button type="primary" @click="$router.push('/login')">
              登录后购买
            </el-button>
          </div>
        </div>
      </div>

      <div v-else-if="patch.is_paid && hasPermission" class="permission-banner">
        <el-icon><Unlock /></el-icon>
        <span>
          {{ permission?.permission_type === 'owner' ? '您是该内容的创作者' : '您已购买该内容' }}，可查看完整内容
        </span>
        <span v-if="permission?.purchased_at" class="purchase-time">
          购买时间：{{ formatDate(permission.purchased_at) }}
        </span>
      </div>

      <el-row :gutter="24">
        <el-col :span="16">
          <div class="card" v-if="hasPermission && parameters">
            <div class="param-section">
              <h3>🎚️ 参数设置</h3>
              <div v-for="(value, key) in parameters" :key="key" class="param-block">
                <h4>{{ paramLabels[key] || key }}</h4>
                <div class="param-grid">
                  <div v-for="(v, k) in value" :key="k" class="param-item">
                    <div class="param-label">{{ k }}</div>
                    <div class="param-value">{{ formatValue(v) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card" v-if="hasPermission && cables">
            <div class="param-section">
              <h3>🔌 线缆连接</h3>
              <div class="cables-content">{{ cables }}</div>
            </div>
          </div>

          <div v-else-if="patch.is_paid && !hasPermission" class="card locked-content">
            <div class="locked-overlay">
              <el-icon class="locked-icon"><Lock /></el-icon>
              <p>参数设置为付费内容</p>
              <el-button type="primary" @click="scrollToProduct">
                购买解锁完整内容
              </el-button>
            </div>
          </div>

          <div class="card" v-if="modulesUsed.length > 0">
            <div class="param-section">
              <h3>📦 使用的模块</h3>
              <div class="module-grid">
                <div
                  v-for="mod in modulesUsed"
                  :key="mod.id"
                  class="module-card"
                  @click="$router.push(`/modules/${mod.id}`)"
                >
                  <div class="module-type">{{ mod.type }}</div>
                  <div class="module-name">{{ mod.name }}</div>
                  <div class="module-manu" v-if="mod.manufacturer_name">
                    {{ mod.manufacturer_name }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="param-section">
              <h3>💬 评论 ({{ patch.comments?.length || 0 }})</h3>
              
              <div v-if="userStore.isLoggedIn" class="comment-form">
                <el-input
                  v-model="newComment"
                  type="textarea"
                  :rows="3"
                  placeholder="写下你的评论..."
                  maxlength="500"
                  show-word-limit
                />
                <div style="text-align: right; margin-top: 12px;">
                  <el-button type="primary" class="btn-primary" @click="addComment" :loading="commentLoading">
                    发表评论
                  </el-button>
                </div>
              </div>
              <div v-else class="empty-state" style="padding: 20px;">
                <p>请 <router-link to="/login">登录</router-link> 后发表评论</p>
              </div>

              <div class="comments-list" v-if="patch.comments?.length > 0">
                <div v-for="comment in patch.comments" :key="comment.id" class="comment-item">
                  <el-avatar :size="36" :src="comment.avatar">
                    {{ comment.username?.charAt(0).toUpperCase() }}
                  </el-avatar>
                  <div class="comment-content">
                    <div class="comment-header">
                      <span class="comment-user" @click="goToUser(comment.user_id)">
                        {{ comment.username }}
                      </span>
                      <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
                      <el-button
                        v-if="(userStore.user?.id === comment.user_id) || userStore.isAdmin"
                        type="text"
                        size="small"
                        @click="deleteComment(comment.id)"
                      >
                        <el-icon><Delete /></el-icon> 删除
                      </el-button>
                      <el-button
                        v-if="userStore.isLoggedIn && userStore.user?.id !== comment.user_id"
                        type="text"
                        size="small"
                        @click="reportComment(comment)"
                      >
                        <el-icon><WarningFilled /></el-icon> 举报
                      </el-button>
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="card">
            <div class="param-section">
              <h3>📊 数据统计</h3>
              <div class="param-grid">
                <div class="param-item">
                  <div class="param-label">浏览次数</div>
                  <div class="param-value">{{ patch.views_count }}</div>
                </div>
                <div class="param-item">
                  <div class="param-label">点赞数</div>
                  <div class="param-value">{{ patch.likes_count }}</div>
                </div>
                <div class="param-item">
                  <div class="param-label">评论数</div>
                  <div class="param-value">{{ patch.comments?.length || 0 }}</div>
                </div>
                <div class="param-item">
                  <div class="param-label">使用模块</div>
                  <div class="param-value">{{ modulesUsed.length }} 个</div>
                </div>
                <div class="param-item">
                  <div class="param-label">创建时间</div>
                  <div class="param-value">{{ formatDate(patch.created_at) }}</div>
                </div>
                <div class="param-item">
                  <div class="param-label">更新时间</div>
                  <div class="param-value">{{ formatDate(patch.updated_at) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card" v-if="hasPermission && (patch.audio_url || patch.patch_file)">
            <div class="param-section">
              <h3>🔗 资源链接</h3>
              <div v-if="patch.audio_url">
                <el-button type="primary" link @click="openLink(patch.audio_url)">
                  <el-icon><Headset /></el-icon> 试听音频
                </el-button>
              </div>
              <div v-if="patch.patch_file" style="margin-top: 12px;">
                <el-button type="success" link @click="openLink(patch.patch_file)">
                  <el-icon><Download /></el-icon> 下载 Patch 文件
                </el-button>
              </div>
            </div>
          </div>

          <div v-else-if="patch.is_paid && !hasPermission" class="card locked-content">
            <div class="locked-overlay">
              <el-icon class="locked-icon"><Lock /></el-icon>
              <p>资源链接为付费内容</p>
            </div>
          </div>

          <div class="card" v-if="patch.is_paid && product && product.sales_count > 0">
            <div class="param-section">
              <h3>👥 销售数据</h3>
              <div class="sales-info">
                <div class="sales-item">
                  <span class="sales-label">已售出</span>
                  <span class="sales-value">{{ product.sales_count }} 份</span>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </template>

    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Warning /></el-icon>
      <p>Patch 不存在</p>
    </div>

    <ReportDialog
      v-model="reportDialogVisible"
      :target-type="reportTargetType"
      :target-id="reportTargetId"
      :target-description="reportTargetDescription"
      @success="onReportSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Loading, Warning, ArrowLeft, Star, Collection, SetUp, MoreFilled, Edit, Delete, 
  View, WarningFilled, Lock, Unlock, ShoppingCart, Check, InfoFilled,
  Headset, Download
} from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useUserStore } from '@/stores/userStore'
import { useProductStore } from '@/stores/productStore'
import { moduleAPI } from '@/api'
import ReportDialog from '@/components/ReportDialog.vue'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()
const userStore = useUserStore()
const productStore = useProductStore()

const loading = ref(true)
const commentLoading = ref(false)
const purchasing = ref(false)
const patch = ref(null)
const product = ref(null)
const permission = ref(null)
const newComment = ref('')
const moduleList = ref([])
const reportDialogVisible = ref(false)
const reportTargetType = ref('patch')
const reportTargetId = ref(null)
const reportTargetDescription = ref('')

const paramLabels = {
  oscillators: '🎹 振荡器',
  filter: '🔍 滤波器',
  envelope: '📈 包络线',
  lfo: '〰️ 低频振荡器',
  effects: '✨ 效果器'
}

const patchTags = computed(() => {
  try {
    return JSON.parse(patch.value?.tags) || []
  } catch {
    return []
  }
})

const parameters = computed(() => {
  try {
    return JSON.parse(patch.value?.parameters) || {}
  } catch {
    return {}
  }
})

const cables = computed(() => {
  try {
    return patch.value?.cables || ''
  } catch {
    return ''
  }
})

const modulesUsed = computed(() => {
  try {
    const ids = JSON.parse(patch.value?.modules_used) || []
    return moduleList.value.filter(m => ids.includes(m.id))
  } catch {
    return []
  }
})

const isOwner = computed(() => 
  userStore.user?.id === patch.value?.user_id
)

const hasPermission = computed(() => {
  if (!patch.value?.is_paid) return true
  if (isOwner.value) return true
  return permission.value?.has_permission || false
})

onMounted(async () => {
  try {
    const [patchData, modules] = await Promise.all([
      patchStore.fetchPatchDetail(route.params.id),
      moduleAPI.getModules({ limit: 100 })
    ])
    patch.value = patchData
    moduleList.value = modules.list

    if (patch.value.is_paid) {
      const [productData, permissionData] = await Promise.all([
        productStore.getProductByPatchId(patch.value.id).catch(() => null),
        productStore.checkPermission(patch.value.id).catch(() => ({ has_permission: false }))
      ])
      product.value = productData
      permission.value = permissionData
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatValue = (v) => {
  if (typeof v === 'object') return JSON.stringify(v)
  return v ?? '-'
}

const goToUser = (userId) => {
  router.push(`/users/${userId}`)
}

const toggleLike = async () => {
  const res = await patchStore.toggleLike(patch.value.id)
  patch.value.is_liked = res.liked
  patch.value.likes_count = res.likes_count
  ElMessage.success('操作成功')
}

const toggleFavorite = async () => {
  const res = await patchStore.toggleFavorite(patch.value.id)
  patch.value.is_favorited = res.favorited
  ElMessage.success(res.favorited ? '已收藏' : '已取消收藏')
}

const addToCompare = async () => {
  try {
    await patchStore.addToCompare(patch.value.id)
    ElMessage.success('已添加到对比列表')
  } catch (e) {
    ElMessage.error(e.error || '添加失败')
  }
}

const handleAction = async (cmd) => {
  if (cmd === 'edit') {
    router.push(`/edit/${patch.value.id}`)
  } else if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这个 Patch 吗？', '确认删除', {
        type: 'warning'
      })
      await patchStore.deletePatch(patch.value.id)
      ElMessage.success('删除成功')
      router.push('/patches')
    } catch {}
  } else if (cmd === 'report') {
    reportPatch()
  }
}

const reportPatch = () => {
  reportTargetType.value = 'patch'
  reportTargetId.value = patch.value.id
  reportTargetDescription.value = `Patch：${patch.value.title}`
  reportDialogVisible.value = true
}

const reportComment = (comment) => {
  reportTargetType.value = 'comment'
  reportTargetId.value = comment.id
  reportTargetDescription.value = `评论（来自 ${comment.username}）：${comment.content.slice(0, 50)}${comment.content.length > 50 ? '...' : ''}`
  reportDialogVisible.value = true
}

const onReportSuccess = () => {
}

const addComment = async () => {
  if (!newComment.value.trim()) return
  commentLoading.value = true
  try {
    const comment = await patchStore.addComment(patch.value.id, newComment.value.trim())
    patch.value.comments.unshift(comment)
    newComment.value = ''
    ElMessage.success('评论成功')
  } catch (e) {
    ElMessage.error(e.error || '评论失败')
  } finally {
    commentLoading.value = false
  }
}

const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论？', '确认', { type: 'warning' })
    await patchStore.deleteComment(patch.value.id, commentId)
    patch.value.comments = patch.value.comments.filter(c => c.id !== commentId)
    ElMessage.success('删除成功')
  } catch {}
}

const purchasePatch = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要以 ¥${product.value.price} 购买 "${patch.value.title}" 吗？`,
      '确认购买',
      { type: 'warning' }
    )
    
    purchasing.value = true
    await productStore.createOrder({
      patch_id: patch.value.id,
      product_id: product.value.id
    })
    
    ElMessage.success('购买成功！')
    
    const permissionData = await productStore.checkPermission(patch.value.id)
    permission.value = permissionData
    
    if (product.value) {
      product.value.sales_count++
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.error || '购买失败')
      console.error(err)
    }
  } finally {
    purchasing.value = false
  }
}

const scrollToProduct = () => {
  const el = document.querySelector('.paid-product-card')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

const openLink = (url) => {
  window.open(url, '_blank')
}
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.paid-tag {
  font-size: 14px;
}

.detail-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
  line-height: 1.6;
}

.detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.author-name {
  font-weight: 600;
  color: #ffd700;
}

.publish-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.detail-stats {
  display: flex;
  gap: 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.patch-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.patch-tags .tag {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
}

.paid-product-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid rgba(245, 108, 108, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.product-info {
  max-width: 800px;
  margin: 0 auto;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.product-header h3 {
  margin: 0;
  font-size: 20px;
  color: #fff;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-price {
  font-size: 32px;
  font-weight: bold;
  color: #f56c6c;
}

.original-price {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: line-through;
}

.product-description {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  line-height: 1.6;
}

.product-benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
}

.benefit-item .el-icon {
  color: #67c23a;
}

.product-preview {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.product-preview h4 {
  margin: 0 0 8px 0;
  color: #ffd700;
  font-size: 14px;
}

.preview-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.6;
}

.purchase-section {
  text-align: center;
}

.purchase-btn {
  width: 100%;
  max-width: 300px;
  font-size: 16px;
  padding: 12px 24px;
}

.purchase-note {
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.login-prompt {
  text-align: center;
  padding: 20px;
}

.permission-banner {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%);
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #67c23a;
}

.permission-banner .el-icon {
  font-size: 20px;
}

.purchase-time {
  margin-left: auto;
  color: rgba(103, 194, 58, 0.7);
  font-size: 13px;
}

.locked-content {
  position: relative;
  min-height: 200px;
  overflow: hidden;
}

.locked-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.locked-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.5);
}

.locked-overlay p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.cables-content {
  white-space: pre-wrap;
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-family: monospace;
  line-height: 1.8;
}

.sales-info {
  display: flex;
  justify-content: space-around;
}

.sales-item {
  text-align: center;
}

.sales-label {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  margin-bottom: 4px;
}

.sales-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.param-block {
  margin-bottom: 24px;
}

.param-block h4 {
  color: #ffaa00;
  font-size: 15px;
  margin-bottom: 12px;
}

.comment-form {
  margin-bottom: 24px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-user {
  font-weight: 600;
  color: #ffd700;
  cursor: pointer;
}

.comment-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.comment-text {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.module-name {
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.module-manu {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
