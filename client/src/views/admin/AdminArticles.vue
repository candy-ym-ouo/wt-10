<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">📚 专栏管理</h1>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索文章标题"
        clearable
        class="search-input"
        @keyup.enter="fetchArticles"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态筛选" class="filter-select" @change="fetchArticles">
        <el-option label="全部" value="" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-button type="primary" @click="fetchArticles">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="articles" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="username" label="作者" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="views_count" label="浏览" width="80" />
        <el-table-column prop="likes_count" label="点赞" width="80" />
        <el-table-column prop="comments_count" label="评论" width="80" />
        <el-table-column prop="created_at" label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewArticle(row)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="success" 
              @click="approveArticle(row)"
            >
              通过
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="warning" 
              @click="rejectArticle(row)"
            >
              驳回
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteArticle(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <el-dialog v-model="detailVisible" title="文章详情" width="800px">
      <div v-if="currentArticle" class="article-detail">
        <h2 class="detail-title">{{ currentArticle.title }}</h2>
        <div class="detail-meta">
          <span>作者：{{ currentArticle.username }}</span>
          <span>状态：
            <el-tag :type="statusType(currentArticle.status)" size="small">
              {{ statusText(currentArticle.status) }}
            </el-tag>
          </span>
          <span>发布时间：{{ formatDate(currentArticle.created_at) }}</span>
        </div>
        <div v-if="currentArticle.cover_image" class="detail-cover">
          <img :src="currentArticle.cover_image" alt="封面" />
        </div>
        <div v-if="currentArticle.summary" class="detail-summary">
          <h4>摘要</h4>
          <p>{{ currentArticle.summary }}</p>
        </div>
        <div class="detail-content">
          <h4>正文</h4>
          <div class="content-html" v-html="renderMarkdown(currentArticle.content)"></div>
        </div>
        <div v-if="currentArticle.module_refs && currentArticle.module_refs.length > 0" class="detail-modules">
          <h4>引用模块</h4>
          <div class="module-refs">
            <div v-for="ref in currentArticle.module_refs" :key="ref.id" class="module-ref-item">
              <span class="module-name">{{ ref.module_name }}</span>
              <span v-if="ref.note" class="module-note">{{ ref.note }}</span>
            </div>
          </div>
        </div>
        <div v-if="currentArticle.review_note" class="detail-review-note">
          <h4>审核备注</h4>
          <p>{{ currentArticle.review_note }}</p>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回原因" width="500px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回原因">
          <el-input
            v-model="rejectForm.review_note"
            type="textarea"
            :rows="4"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminArticleApi } from '@/api'
import { marked } from 'marked'

const router = useRouter()
const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const articles = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const detailVisible = ref(false)
const currentArticle = ref(null)
const rejectVisible = ref(false)
const rejectForm = reactive({
  review_note: ''
})
let currentRejectArticle = null

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

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

const renderMarkdown = (content) => {
  if (!content) return ''
  try {
    return marked.parse(content)
  } catch {
    return content.replace(/\n/g, '<br>')
  }
}

onMounted(() => {
  fetchArticles()
})

const fetchArticles = async () => {
  try {
    loading.value = true
    const res = await adminArticleApi.getList({
      search: keyword.value,
      status: statusFilter.value,
      page: page.value,
      limit: pageSize
    })
    articles.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取文章列表失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const viewArticle = async (article) => {
  try {
    const res = await adminArticleApi.getDetail(article.id)
    currentArticle.value = res
    detailVisible.value = true
  } catch (err) {
    ElMessage.error('获取文章详情失败')
  }
}

const approveArticle = async (article) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过文章 "${article.title}" 的审核吗？`,
      '确认审核',
      { type: 'success' }
    )
    
    await adminArticleApi.review(article.id, { status: 'approved' })
    article.status = 'approved'
    ElMessage.success('审核通过')
  } catch {
  }
}

const rejectArticle = (article) => {
  currentRejectArticle = article
  rejectForm.review_note = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  if (!currentRejectArticle) return
  try {
    await adminArticleApi.review(currentRejectArticle.id, {
      status: 'rejected',
      review_note: rejectForm.review_note
    })
    currentRejectArticle.status = 'rejected'
    rejectVisible.value = false
    ElMessage.success('已驳回')
  } catch (err) {
    ElMessage.error(err.error || '操作失败')
  }
}

const deleteArticle = async (article) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文章 "${article.title}" 吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    
    await adminArticleApi.delete(article.id)
    articles.value = articles.value.filter(a => a.id !== article.id)
    ElMessage.success('删除成功')
  } catch {
  }
}
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 150px;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.article-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.detail-meta {
  display: flex;
  gap: 20px;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.detail-cover {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.detail-cover img {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
}

.detail-summary,
.detail-content,
.detail-modules,
.detail-review-note {
  margin-bottom: 20px;
}

.detail-summary h4,
.detail-content h4,
.detail-modules h4,
.detail-review-note h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
}

.detail-summary p,
.detail-review-note p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.content-html {
  line-height: 1.8;
  color: var(--text-secondary);
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.content-html :deep(h1),
.content-html :deep(h2),
.content-html :deep(h3) {
  color: var(--text-primary);
  margin-top: 20px;
  margin-bottom: 10px;
}

.content-html :deep(p) {
  margin-bottom: 12px;
}

.content-html :deep(code) {
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.content-html :deep(pre) {
  background: var(--bg-primary);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.module-refs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-ref-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.module-name {
  font-weight: 500;
  color: var(--text-primary);
}

.module-note {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.detail-review-note {
  padding: 12px 16px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 4px solid #f44336;
  border-radius: 0 6px 6px 0;
}
</style>
