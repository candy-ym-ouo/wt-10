<template>
  <div class="container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">📚 知识专栏</h1>
        <p class="page-subtitle">探索创作者分享的深度知识与教程</p>
      </div>
      <div class="header-right">
        <el-button
          v-if="userStore.isLoggedIn"
          type="primary"
          class="btn-primary"
          @click="goToCreate"
        >
          <el-icon><Edit /></el-icon>
          写文章
        </el-button>
      </div>
    </div>

    <div class="search-bar">
      <el-input
        v-model="search"
        placeholder="搜索文章标题、摘要或内容..."
        size="large"
        :prefix-icon="Search"
        @keyup.enter="fetchData"
      >
        <template #append>
          <el-button @click="fetchData" type="primary" class="btn-primary">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </template>
      </el-input>
    </div>

    <div class="filter-bar">
      <el-select v-model="sort" placeholder="排序方式" @change="fetchData">
        <el-option label="最新发布" value="newest" />
        <el-option label="最受欢迎" value="popular" />
        <el-option label="最多点赞" value="likes" />
        <el-option label="最多评论" value="comments" />
      </el-select>
      <el-input
        v-model="tagFilter"
        placeholder="按标签筛选，如: 教程, 测评, 心得"
        style="width: 250px"
        @keyup.enter="fetchData"
      />
    </div>

    <div v-if="loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="articles.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>暂无专栏文章</p>
    </div>

    <div v-else class="article-list">
      <div
        v-for="article in articles"
        :key="article.id"
        class="article-card"
        @click="goToDetail(article)"
      >
        <div v-if="article.cover_image" class="article-cover">
          <img :src="article.cover_image" :alt="article.title" />
        </div>
        <div class="article-content">
          <h3 class="article-title">{{ article.title }}</h3>
          <p class="article-summary">{{ article.summary || article.content }}</p>
          <div class="article-meta">
            <div class="author-info" @click.stop="goToUser(article.user_id)">
              <el-avatar :size="24" :src="article.avatar">
                {{ article.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="author-name">{{ article.username }}</span>
              <CreatorBadge
                v-if="article.is_creator_verified"
                :verified="true"
                size="small"
              />
            </div>
            <div class="article-stats">
              <span class="stat">
                <el-icon><View /></el-icon>
                {{ article.views_count || 0 }}
              </span>
              <span class="stat">
                <el-icon><Star /></el-icon>
                {{ article.real_likes || article.likes_count || 0 }}
              </span>
              <span class="stat">
                <el-icon><ChatDotRound /></el-icon>
                {{ article.comments_count || 0 }}
              </span>
            </div>
          </div>
          <div v-if="article.tags" class="article-tags">
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
        </div>
      </div>
    </div>

    <div v-if="total > limit" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="fetchData"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Loading, Document, Edit, View, Star, ChatDotRound } from '@element-plus/icons-vue'
import { useArticleStore } from '@/stores/articleStore'
import { useUserStore } from '@/stores/userStore'
import CreatorBadge from '@/components/CreatorBadge.vue'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()
const userStore = useUserStore()

const loading = ref(false)
const articles = ref([])
const total = ref(0)
const page = ref(parseInt(route.query.page) || 1)
const limit = 10
const search = ref(route.query.search || '')
const sort = ref(route.query.sort || 'newest')
const tagFilter = ref(route.query.tag || '')

const parseTags = (tagsStr) => {
  try {
    const tags = JSON.parse(tagsStr)
    return Array.isArray(tags) ? tags : []
  } catch {
    return []
  }
}

onMounted(() => {
  fetchData()
})

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit,
      sort: sort.value
    }
    if (search.value) params.search = search.value
    if (tagFilter.value) params.tag = tagFilter.value

    const res = await articleStore.fetchArticles(params)
    articles.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('加载失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goToDetail = (article) => {
  router.push(`/articles/${article.id}`)
}

const goToCreate = () => {
  router.push('/articles/create')
}

const goToUser = (userId) => {
  router.push(`/users/${userId}`)
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left h1 {
  margin: 0 0 8px 0;
}

.header-left p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.article-card {
  display: flex;
  gap: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.article-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
}

.article-cover {
  flex-shrink: 0;
  width: 200px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
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

.article-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
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
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.article-stats {
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

.article-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.search-bar {
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
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
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>
