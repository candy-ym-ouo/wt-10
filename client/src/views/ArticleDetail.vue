<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else-if="article">
      <div class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta-top">
          <div class="author-section" @click="goToUser(article.user_id)">
            <el-avatar :size="40" :src="article.avatar">
              {{ article.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="author-info">
              <div class="author-name-row">
                <span class="author-name">{{ article.username }}</span>
                <CreatorBadge
                  v-if="article.is_creator_verified"
                  :verified="true"
                  size="small"
                />
              </div>
              <span class="publish-time">{{ formatDate(article.created_at) }}</span>
            </div>
          </div>
          <div class="action-buttons">
            <FollowButton
              v-if="!isMe && userStore.isLoggedIn"
              :user-id="article.user_id"
              size="default"
            />
            <el-button
              v-if="isMe"
              type="primary"
              plain
              @click="editArticle"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="article.cover_image" class="article-cover">
        <img :src="article.cover_image" :alt="article.title" />
      </div>

      <div v-if="article.tags && parseTags(article.tags).length > 0" class="article-tags">
        <el-tag
          v-for="tag in parseTags(article.tags)"
          :key="tag"
          size="small"
          type="info"
          effect="plain"
        >
          {{ tag }}
        </el-tag>
      </div>

      <div v-if="article.summary" class="article-summary">
        <p>{{ article.summary }}</p>
      </div>

      <div class="article-content-wrapper">
        <div class="article-content" v-html="renderMarkdown(article.content)"></div>
      </div>

      <div v-if="moduleRefs.length > 0" class="module-refs-section">
        <h3 class="section-title">📦 引用的模块</h3>
        <div class="module-refs-list">
          <div
            v-for="ref in moduleRefs"
            :key="ref.id"
            class="module-ref-card"
            @click="goToModule(ref.module_id)"
          >
            <div class="module-ref-image">
              <img :src="ref.module_image" v-if="ref.module_image" />
              <el-icon v-else><Box /></el-icon>
            </div>
            <div class="module-ref-info">
              <h4 class="module-ref-name">{{ ref.module_name }}</h4>
              <p class="module-ref-type">{{ ref.module_type }}</p>
              <p v-if="ref.note" class="module-ref-note">{{ ref.note }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="article-actions">
        <div class="action-group">
          <el-button
            :class="{ active: isLiked }"
            @click="handleLike"
          >
            <el-icon><Star v-if="isLiked" /><StarFilled v-else /></el-icon>
            点赞 ({{ likesCount }})
          </el-button>
          <el-button
            :class="{ active: isFavorited }"
            @click="handleFavorite"
          >
            <el-icon><CollectionTag v-if="isFavorited" /><CollectionTag v-else /></el-icon>
            收藏
          </el-button>
        </div>
        <div class="stats-group">
          <span class="stat-item">
            <el-icon><View /></el-icon>
            {{ article.views_count || 0 }} 阅读
          </span>
          <span class="stat-item">
            <el-icon><ChatDotRound /></el-icon>
            {{ comments.length }} 评论
          </span>
        </div>
      </div>

      <div class="comments-section">
        <h3 class="section-title">💬 评论 ({{ comments.length }})</h3>
        
        <div v-if="userStore.isLoggedIn" class="comment-input">
          <el-avatar :size="36" :src="userStore.user?.avatar">
            {{ userStore.user?.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="comment-input-area">
            <el-input
              v-model="newComment"
              type="textarea"
              :rows="3"
              placeholder="写下你的评论..."
              maxlength="500"
              show-word-limit
            />
            <div class="comment-actions">
              <el-button type="primary" :disabled="!newComment.trim()" @click="submitComment">
                发表评论
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="comment-login-prompt">
          <p>登录后发表评论</p>
          <el-button type="primary" @click="goToLogin">立即登录</el-button>
        </div>

        <div v-if="comments.length === 0" class="empty-comments">
          <el-icon class="empty-icon"><ChatDotRound /></el-icon>
          <p>暂无评论，快来抢沙发吧~</p>
        </div>

        <div v-else class="comments-list">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item"
          >
            <el-avatar :size="40" :src="comment.avatar">
              {{ comment.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-author" @click="goToUser(comment.user_id)">
                  {{ comment.username }}
                </span>
                <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
              </div>
              <p class="comment-text">{{ comment.content }}</p>
              <div class="comment-footer">
                <el-button
                  v-if="userStore.isLoggedIn && (comment.user_id === userStore.user?.id || userStore.isAdmin)"
                  link
                  type="danger"
                  size="small"
                  @click="deleteComment(comment.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>文章不存在</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Loading, Document, Edit, View, ChatDotRound,
  Star, StarFilled, CollectionTag, Box
} from '@element-plus/icons-vue'
import { useArticleStore } from '@/stores/articleStore'
import { useUserStore } from '@/stores/userStore'
import CreatorBadge from '@/components/CreatorBadge.vue'
import FollowButton from '@/components/FollowButton.vue'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()
const userStore = useUserStore()

const loading = ref(true)
const article = ref(null)
const moduleRefs = ref([])
const comments = ref([])
const newComment = ref('')
const isLiked = ref(false)
const isFavorited = ref(false)
const likesCount = ref(0)

const isMe = computed(() => userStore.user?.id === article.value?.user_id)

const parseTags = (tagsStr) => {
  try {
    const tags = JSON.parse(tagsStr)
    return Array.isArray(tags) ? tags : []
  } catch {
    return []
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const renderMarkdown = (content) => {
  if (!content) return ''
  try {
    return marked.parse(content)
  } catch {
    return content.replace(/\n/g, '<br>')
  }
}

onMounted(() => {
  fetchArticle()
})

const fetchArticle = async () => {
  loading.value = true
  try {
    const id = route.params.id
    const res = await articleStore.fetchArticleDetail(id)
    article.value = res
    moduleRefs.value = res.module_refs || []
    comments.value = res.comments || []
    isLiked.value = res.is_liked || false
    isFavorited.value = res.is_favorited || false
    likesCount.value = res.real_likes || res.likes_count || 0
  } catch (err) {
    ElMessage.error(err.error || '加载失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToUser = (userId) => {
  router.push(`/users/${userId}`)
}

const goToModule = (moduleId) => {
  router.push(`/modules/${moduleId}`)
}

const goToLogin = () => {
  router.push('/login')
}

const editArticle = () => {
  router.push(`/articles/edit/${article.value.id}`)
}

const handleLike = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    const res = await articleStore.toggleLike(article.value.id)
    isLiked.value = res.liked
    likesCount.value = res.likes_count
    ElMessage.success(res.liked ? '点赞成功' : '取消点赞')
  } catch (err) {
    ElMessage.error(err.error || '操作失败')
  }
}

const handleFavorite = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    const res = await articleStore.toggleFavorite(article.value.id)
    isFavorited.value = res.favorited
    ElMessage.success(res.favorited ? '已收藏' : '已取消收藏')
  } catch (err) {
    ElMessage.error(err.error || '操作失败')
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  try {
    const comment = await articleStore.addComment(article.value.id, newComment.value)
    comments.value.unshift(comment)
    newComment.value = ''
    ElMessage.success('评论成功')
  } catch (err) {
    ElMessage.error(err.error || '评论失败')
  }
}

const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '删除确认', {
      type: 'warning'
    })
    await articleStore.deleteComment(article.value.id, commentId)
    comments.value = comments.value.filter(c => c.id !== commentId)
    ElMessage.success('删除成功')
  } catch {
  }
}
</script>

<style scoped>
.article-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.article-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 20px 0;
  line-height: 1.3;
}

.article-meta-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-name {
  font-weight: 600;
  color: var(--text-primary);
}

.publish-time {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.article-cover {
  width: 100%;
  max-height: 400px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.article-summary {
  padding: 16px 20px;
  background: rgba(139, 92, 246, 0.1);
  border-left: 4px solid var(--primary-color);
  border-radius: 0 8px 8px 0;
  margin-bottom: 24px;
}

.article-summary p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-style: italic;
}

.article-content-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 32px;
}

.article-content {
  line-height: 1.8;
  color: var(--text-primary);
  font-size: 1rem;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  margin-top: 24px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.article-content :deep(p) {
  margin-bottom: 16px;
}

.article-content :deep(code) {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.article-content :deep(pre) {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.article-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.article-content :deep(blockquote) {
  border-left: 4px solid var(--primary-color);
  margin: 16px 0;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.05);
  color: var(--text-secondary);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.module-refs-section {
  margin-bottom: 32px;
}

.module-refs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.module-ref-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.module-ref-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.module-ref-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.module-ref-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.module-ref-image .el-icon {
  font-size: 24px;
  color: var(--text-muted);
}

.module-ref-info {
  flex: 1;
  min-width: 0;
}

.module-ref-name {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  font-size: 0.95rem;
}

.module-ref-type {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 4px 0;
}

.module-ref-note {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 32px;
}

.action-group {
  display: flex;
  gap: 12px;
}

.action-group .el-button.active {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background: rgba(139, 92, 246, 0.1);
}

.stats-group {
  display: flex;
  gap: 24px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comments-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.comment-input {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.comment-input-area {
  flex: 1;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.comment-login-prompt {
  text-align: center;
  padding: 24px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.comment-login-prompt p {
  color: var(--text-muted);
  margin: 0 0 12px 0;
}

.empty-comments {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-comments .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.comment-author {
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.comment-author:hover {
  color: var(--primary-color);
}

.comment-time {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.comment-text {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 8px 0;
}

.comment-footer {
  display: flex;
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>
