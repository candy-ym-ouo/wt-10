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
            <el-dropdown v-if="isOwner || userStore.isAdmin" @command="handleAction">
              <el-button>
                <el-icon><MoreFilled /></el-icon>
                更多
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit" v-if="isOwner">
                    <el-icon><Edit /></el-icon> 编辑
                  </el-dropdown-item>
                  <el-dropdown-item command="delete">
                    <el-icon><Delete /></el-icon> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <h1 class="detail-title">{{ patch.title }}</h1>
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

      <el-row :gutter="24">
        <el-col :span="16">
          <div class="card" v-if="parameters">
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

          <div class="card" v-if="patch.audio_url || patch.patch_file">
            <div class="param-section">
              <h3>🔗 资源链接</h3>
              <div v-if="patch.audio_url">
                <a :href="patch.audio_url" target="_blank">🎵 试听音频</a>
              </div>
              <div v-if="patch.patch_file" style="margin-top: 12px;">
                <a :href="patch.patch_file" target="_blank">📄 Patch 文件</a>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Warning, ArrowLeft, Star, Collection, SetUp, MoreFilled, Edit, Delete, View } from '@element-plus/icons-vue'
import { usePatchStore } from '@/stores/patchStore'
import { useUserStore } from '@/stores/userStore'
import { moduleAPI } from '@/api'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()
const userStore = useUserStore()

const loading = ref(true)
const commentLoading = ref(false)
const patch = ref(null)
const newComment = ref('')
const moduleList = ref([])

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

onMounted(async () => {
  try {
    const [patchData, modules] = await Promise.all([
      patchStore.fetchPatchDetail(route.params.id),
      moduleAPI.getModules({ limit: 100 })
    ])
    patch.value = patchData
    moduleList.value = modules.list
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
  }
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

.detail-title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
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
