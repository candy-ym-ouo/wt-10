<template>
  <div class="container messages-page">
    <div class="page-header">
      <h1 class="page-title">💬 消息中心</h1>
      <p class="page-subtitle">查看评论、点赞、收藏和审核结果</p>
    </div>

    <div class="category-tabs">
      <div
        v-for="tab in categoryTabs"
        :key="tab.key"
        class="category-tab"
        :class="{ active: messageStore.currentCategory === tab.key }"
        @click="handleCategoryChange(tab.key)"
      >
        <el-icon><component :is="tab.icon" /></el-icon>
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-switch
          v-model="messageStore.unreadOnly"
          active-text="仅未读"
          @change="handleUnreadOnlyChange"
        />
      </div>
      <div class="toolbar-right">
        <el-button
          :icon="Check"
          @click="handleMarkAllRead"
          :disabled="messageStore.messages.unreadCount === 0"
        >
          全部已读
        </el-button>
        <el-button
          :icon="Delete"
          type="danger"
          plain
          @click="handleClearRead"
        >
          清除已读
        </el-button>
      </div>
    </div>

    <div class="batch-actions" v-if="messageStore.hasSelection">
      <el-checkbox
        :model-value="messageStore.isAllSelected"
        :indeterminate="!messageStore.isAllSelected && messageStore.hasSelection"
        @change="messageStore.toggleSelectAll()"
      >
        已选择 {{ messageStore.selectedIds.size }} 项
      </el-checkbox>
      <div class="batch-buttons">
        <el-button size="small" :icon="Check" @click="handleBatchRead">标记已读</el-button>
        <el-button size="small" :icon="Delete" type="danger" @click="handleBatchDelete">删除</el-button>
        <el-button size="small" @click="messageStore.clearSelection()">取消选择</el-button>
      </div>
    </div>

    <div v-if="messageStore.messages.loading" class="empty-state">
      <el-icon class="empty-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="messageStore.messages.list.length === 0" class="empty-state">
      <el-icon class="empty-icon"><ChatLineSquare /></el-icon>
      <p>暂无消息</p>
    </div>

    <div v-else class="message-list">
      <div
        v-for="item in messageStore.messages.list"
        :key="item.id"
        class="message-item"
        :class="{ unread: !item.is_read, selected: messageStore.selectedIds.has(item.id) }"
      >
        <div class="message-checkbox">
          <el-checkbox
            :model-value="messageStore.selectedIds.has(item.id)"
            @change="messageStore.toggleSelection(item.id)"
          />
        </div>
        <div class="message-icon" :class="`cat-${item.category}`">
          <el-icon>
            <component :is="getCategoryIcon(item.category)" />
          </el-icon>
        </div>
        <div class="message-content" @click="handleMessageClick(item)">
          <div class="message-header">
            <span class="message-type">{{ getCategoryLabel(item.category) }}</span>
            <span class="message-time">{{ formatTime(item.created_at) }}</span>
          </div>
          <div class="message-body">
            <div class="message-avatar" v-if="item.from_avatar">
              <el-avatar :size="32" :src="item.from_avatar">
                {{ item.from_username?.charAt(0).toUpperCase() }}
              </el-avatar>
            </div>
            <div class="message-text">
              <p v-if="item.title" class="message-title">{{ item.title }}</p>
              <p>{{ item.content }}</p>
            </div>
          </div>
        </div>
        <div class="message-actions">
          <el-button
            v-if="!item.is_read"
            size="small"
            link
            type="primary"
            @click.stop="messageStore.markAsRead(item.id)"
          >
            标记已读
          </el-button>
          <el-button
            size="small"
            link
            type="danger"
            @click.stop="messageStore.deleteMessage(item.id)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="messageStore.messages.total > messageStore.messages.limit" class="pagination">
      <el-pagination
        v-model:current-page="messageStore.messages.page"
        :page-size="messageStore.messages.limit"
        :total="messageStore.messages.total"
        layout="prev, pager, next, total"
        @current-change="handlePageChange"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Loading, ChatLineSquare, Check, Delete,
  ChatDotRound, Star, Collection, EditPen
} from '@element-plus/icons-vue'
import { useMessageStore } from '@/stores/messageStore'

const router = useRouter()
const messageStore = useMessageStore()

const categoryIconMap = {
  comment: ChatDotRound,
  like: Star,
  favorite: Collection,
  review: EditPen
}

const categoryLabelMap = {
  comment: '评论',
  like: '点赞',
  favorite: '收藏',
  review: '审核'
}

const categoryTabs = computed(() => {
  const counts = messageStore.messages.countsByCategory || {}
  return [
    { key: 'all', label: '全部', icon: ChatLineSquare, count: messageStore.messages.unreadCount || 0 },
    { key: 'comment', label: '评论', icon: ChatDotRound, count: counts.comment || 0 },
    { key: 'like', label: '点赞', icon: Star, count: counts.like || 0 },
    { key: 'favorite', label: '收藏', icon: Collection, count: counts.favorite || 0 },
    { key: 'review', label: '审核', icon: EditPen, count: counts.review || 0 }
  ]
})

const getCategoryIcon = (category) => {
  return categoryIconMap[category] || ChatLineSquare
}

const getCategoryLabel = (category) => {
  return categoryLabelMap[category] || '消息'
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

const handleCategoryChange = (category) => {
  messageStore.setCategory(category)
  messageStore.resetMessages()
  messageStore.fetchMessages({ page: 1 })
}

const handleUnreadOnlyChange = (value) => {
  messageStore.setUnreadOnly(value)
  messageStore.resetMessages()
  messageStore.fetchMessages({ page: 1 })
}

const handlePageChange = (page) => {
  messageStore.fetchMessages({ page })
}

const handleMessageClick = async (item) => {
  if (!item.is_read) {
    await messageStore.markAsRead(item.id)
  }
  if (item.link_url) {
    router.push(item.link_url)
  }
}

const handleMarkAllRead = async () => {
  try {
    await messageStore.markAllAsRead()
    ElMessage.success('已将全部消息标记为已读')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleClearRead = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有已读消息吗？此操作不可恢复。',
      '确认清除',
      { type: 'warning' }
    )
    await messageStore.clearRead()
    ElMessage.success('已清除已读消息')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleBatchRead = async () => {
  try {
    await messageStore.markBatchAsRead()
    ElMessage.success('已标记为已读')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${messageStore.selectedIds.size} 条消息吗？`,
      '确认删除',
      { type: 'warning' }
    )
    await messageStore.deleteBatchMessages()
    ElMessage.success('已删除选中的消息')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  messageStore.resetMessages()
  messageStore.fetchMessages({ page: 1 })
})
</script>

<style scoped>
.messages-page {
  max-width: 1000px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.category-tab {
  padding: 10px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.category-tab.active {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.tab-count {
  background: #ffd700;
  color: #1a1a2e;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 10px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.message-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.message-item.unread {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.2);
}

.message-item.selected {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
}

.message-checkbox {
  padding-top: 4px;
}

.message-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-icon.cat-comment {
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.message-icon.cat-like {
  background: rgba(255, 157, 84, 0.2);
  color: #ff9d54;
}

.message-icon.cat-favorite {
  background: rgba(216, 131, 255, 0.2);
  color: #d883ff;
}

.message-icon.cat-review {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

.message-content {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-type {
  font-size: 12px;
  color: #ffd700;
  font-weight: 600;
}

.message-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.message-body {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.message-text {
  flex: 1;
  min-width: 0;
}

.message-title {
  color: #ffd700;
  font-weight: 600;
  font-size: 14px;
  margin: 0 0 4px 0;
}

.message-text p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.pagination :deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: rgba(255, 255, 255, 0.7);
  --el-pagination-hover-color: #fff;
  --el-pagination-button-bg-color: rgba(255, 255, 255, 0.05);
  --el-pagination-button-disabled-bg-color: rgba(255, 255, 255, 0.02);
}

.empty-state {
  padding: 80px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}
</style>
