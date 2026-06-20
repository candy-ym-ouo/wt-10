<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">📝 我的文章</h1>
      <el-button type="primary" class="btn-primary" @click="goToCreate">
        <el-icon><Edit /></el-icon>
        写新文章
      </el-button>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" @change="fetchArticles">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="pending">待审核</el-radio-button>
        <el-radio-button label="approved">已通过</el-radio-button>
        <el-radio-button label="rejected">已驳回</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="articles.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>暂无文章，快来写第一篇吧~</p>
      <el-button type="primary" class="btn-primary" @click="goToCreate">
        立即创作
      </el-button>
    </div>

    <div v-else class="article-list">
      <div
        v-for="article in articles"
        :key="article.id"
        class="article-card"
      >
        <div v-if="article.cover_image" class="article-cover" @click="viewArticle(article)">
          <img :src="article.cover_image" :alt="article.title" />
        </div>
        <div class="article-content">
          <div class="article-header" @click="viewArticle(article)">
            <h3 class="article-title">{{ article.title }}</h3>
            <el-tag :type="statusType(article.status)" size="small">
              {{ statusText(article.status) }}
            </el-tag>
          </div>
          <p class="article-summary" @click="viewArticle(article)">
            {{ article.summary || article.content }}
          </p>
          <div v-if="article.review_note && article.status === 'rejected'" class="reject-note">
            <el-icon><WarningFilled /></el-icon>
            <span>驳回原因：{{ article.review_note }}</span>
          </div>
          <div class="article-footer">
            <div class="stats">
              <span class="stat">
                <el-icon><View /></el-icon>
                {{ article.views_count || 0 }}
              </span>
              <span class="stat">
                <el-icon><Star /></el-icon>
                {{ article.likes_count || 0 }}
              </span>
              <span class="stat">
                <el-icon><ChatDotRound /></el-icon>
                {{ article.comments_count || 0 }}
              </span>
            </div>
            <div class="actions">
              <el-button size="small" @click="viewArticle(article)">
                查看
              </el-button>
              <el-button size="small" type="primary" @click="editArticle(article)">
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteArticle(article)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchArticles"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Document, Edit, View, Star, ChatDotRound, WarningFilled } from '@element-plus/icons-vue'
import { articleApi } from '@/api'

const router = useRouter()
const loading = ref(false)
const articles = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const statusFilter = ref('')

const statusType = (status) => {
  const map = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = {
    approved: '已通过',
    pending: '待审核',
    rejected: '已驳回'
  }
  return map[status] || status
}

onMounted(() => {
  fetchArticles()
})

const fetchArticles = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit: pageSize
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    const res = await articleApi.getMyArticles(params)
    articles.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('加载失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/articles/create')
}

const viewArticle = (article) => {
  router.push(`/articles/${article.id}`)
}

const editArticle = (article) => {
  router.push(`/articles/edit/${article.id}`)
}

const deleteArticle = async (article) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文章 "${article.title}" 吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    await articleApi.delete(article.id)
    articles.value = articles.value.filter(a => a.id !== article.id)
    ElMessage.success('删除成功')
  } catch {
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  color: var(--text-primary);
}

.filter-bar {
  margin-bottom: 20px;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.article-card:hover {
  border-color: var(--primary-color);
}

.article-cover {
  flex-shrink: 0;
  width: 200px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.article-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  cursor: pointer;
}

.article-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
}

.article-summary {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.reject-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #f44336;
  border-radius: 0 6px 6px 0;
  color: #f44336;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.reject-note .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.stats {
  display: flex;
  gap: 16px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions {
  display: flex;
  gap: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state .el-button {
  margin-top: 16px;
}
</style>
