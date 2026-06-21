<template>
  <div class="container notifications-page">
    <div class="page-header">
      <h1 class="page-title">🔔 通知中心</h1>
      <p class="page-subtitle">管理你的站内通知与订阅设置</p>
    </div>

    <el-tabs v-model="activeTab" class="notification-tabs">
      <el-tab-pane label="通知列表" name="list">
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="category-tabs">
              <div
                v-for="tab in categoryTabs"
                :key="tab.key"
                class="category-tab"
                :class="{ active: notificationStore.currentCategory === tab.key }"
                @click="handleCategoryChange(tab.key)"
              >
                {{ tab.label }}
                <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
              </div>
            </div>
          </div>
          <div class="toolbar-right">
            <el-switch
              v-model="notificationStore.unreadOnly"
              active-text="仅未读"
              @change="handleUnreadOnlyChange"
            />
            <el-button
              :icon="Check"
              @click="handleMarkAllRead"
              :disabled="notificationStore.notifications.unreadCount === 0"
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

        <div class="batch-actions" v-if="notificationStore.hasSelection">
          <el-checkbox
            :model-value="notificationStore.isAllSelected"
            :indeterminate="!notificationStore.isAllSelected && notificationStore.hasSelection"
            @change="notificationStore.toggleSelectAll()"
          >
            已选择 {{ notificationStore.selectedIds.size }} 项
          </el-checkbox>
          <div class="batch-buttons">
            <el-button size="small" :icon="Check" @click="handleBatchRead">标记已读</el-button>
            <el-button size="small" :icon="Delete" type="danger" @click="handleBatchDelete">删除</el-button>
            <el-button size="small" @click="notificationStore.clearSelection()">取消选择</el-button>
          </div>
        </div>

        <div v-if="notificationStore.notifications.loading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="notificationStore.notifications.list.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Bell /></el-icon>
          <p>暂无通知</p>
        </div>

        <div v-else class="notification-list">
          <div
            v-for="item in notificationStore.notifications.list"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.read, selected: notificationStore.selectedIds.has(item.id) }"
          >
            <div class="notification-checkbox">
              <el-checkbox
                :model-value="notificationStore.selectedIds.has(item.id)"
                @change="notificationStore.toggleSelection(item.id)"
              />
            </div>
            <div class="notification-icon" :class="`cat-${item.category}`">
              <el-icon>
                <component :is="getCategoryIcon(item.category)" />
              </el-icon>
            </div>
            <div class="notification-content" @click="handleNotificationClick(item)">
              <div class="notification-header">
                <span class="notification-type">{{ getCategoryLabel(item.category) }}</span>
                <span class="notification-time">{{ formatTime(item.created_at) }}</span>
              </div>
              <div class="notification-body">
                <div class="notification-avatar" v-if="item.avatar">
                  <el-avatar :size="32" :src="item.avatar">
                    {{ item.username?.charAt(0).toUpperCase() }}
                  </el-avatar>
                </div>
                <div class="notification-text">
                  <p>{{ item.content }}</p>
                </div>
              </div>
            </div>
            <div class="notification-actions">
              <el-button
                v-if="!item.read"
                size="small"
                link
                type="primary"
                @click.stop="notificationStore.markAsRead(item.id)"
              >
                标记已读
              </el-button>
              <el-button
                size="small"
                link
                type="danger"
                @click.stop="notificationStore.deleteNotification(item.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="notificationStore.notifications.total > notificationStore.notifications.limit" class="pagination">
          <el-pagination
            v-model:current-page="notificationStore.notifications.page"
            :page-size="notificationStore.notifications.limit"
            :total="notificationStore.notifications.total"
            layout="prev, pager, next, total"
            @current-change="handlePageChange"
            background
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="订阅设置" name="subscriptions">
        <div class="subscriptions-desc">
          <p>自定义你希望接收的通知类型，关闭后将不再接收对应类型的通知。</p>
        </div>

        <div v-if="notificationStore.subscriptionsLoading" class="empty-state">
          <el-icon class="empty-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else class="subscriptions-list">
          <div
            v-for="sub in notificationStore.subscriptions"
            :key="sub.category"
            class="subscription-item"
          >
            <div class="subscription-info">
              <div class="subscription-icon" :class="`cat-${sub.category}`">
                <el-icon>
                  <component :is="getCategoryIcon(sub.category)" />
                </el-icon>
              </div>
              <div class="subscription-text">
                <h4>{{ sub.label }}</h4>
                <p>{{ sub.description }}</p>
              </div>
            </div>
            <el-switch
              :model-value="!!sub.enabled"
              @change="(val) => handleSubscriptionChange(sub.category, val)"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Loading, Bell, Check, Delete,
  ChatDotRound, EditPen, User, Present, Star, Collection, Setting
} from '@element-plus/icons-vue'
import { useNotificationStore } from '@/stores/notificationStore'

const router = useRouter()
const notificationStore = useNotificationStore()

const activeTab = ref('list')

const categoryIconMap = {
  comment: ChatDotRound,
  review: EditPen,
  follow: User,
  activity: Present,
  like: Star,
  favorite: Collection,
  system: Setting
}

const categoryLabelMap = {
  comment: '评论通知',
  review: '审核通知',
  follow: '关注通知',
  activity: '活动通知',
  like: '点赞通知',
  favorite: '收藏通知',
  system: '系统通知'
}

const categoryTabs = computed(() => {
  const counts = notificationStore.notifications.countsByCategory || {}
  return [
    { key: 'all', label: '全部', count: notificationStore.notifications.unreadCount || 0 },
    { key: 'comment', label: '评论', count: counts.comment || 0 },
    { key: 'review', label: '审核', count: counts.review || 0 },
    { key: 'follow', label: '关注', count: counts.follow || 0 },
    { key: 'activity', label: '活动', count: counts.activity || 0 },
    { key: 'like', label: '点赞', count: counts.like || 0 },
    { key: 'favorite', label: '收藏', count: counts.favorite || 0 },
    { key: 'system', label: '系统', count: counts.system || 0 }
  ]
})

const getCategoryIcon = (category) => {
  return categoryIconMap[category] || Bell
}

const getCategoryLabel = (category) => {
  return categoryLabelMap[category] || '通知'
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
  notificationStore.setCategory(category)
  notificationStore.resetNotifications()
  notificationStore.fetchNotifications({ page: 1 })
}

const handleUnreadOnlyChange = (value) => {
  notificationStore.setUnreadOnly(value)
  notificationStore.resetNotifications()
  notificationStore.fetchNotifications({ page: 1 })
}

const handlePageChange = (page) => {
  notificationStore.fetchNotifications({ page })
}

const handleNotificationClick = async (item) => {
  if (!item.read) {
    await notificationStore.markAsRead(item.id)
  }
  if (item.link_url) {
    router.push(item.link_url)
  } else if (item.patch_id) {
    router.push({ path: `/patches/${item.patch_id}`, query: { source: 'notification' } })
  }
}

const handleMarkAllRead = async () => {
  try {
    await notificationStore.markAllAsRead()
    ElMessage.success('已将全部通知标记为已读')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleClearRead = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有已读通知吗？此操作不可恢复。',
      '确认清除',
      { type: 'warning' }
    )
    await notificationStore.clearRead()
    ElMessage.success('已清除已读通知')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleBatchRead = async () => {
  try {
    await notificationStore.markBatchAsRead()
    ElMessage.success('已标记为已读')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${notificationStore.selectedIds.size} 条通知吗？`,
      '确认删除',
      { type: 'warning' }
    )
    await notificationStore.deleteBatchNotifications()
    ElMessage.success('已删除选中的通知')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleSubscriptionChange = async (category, enabled) => {
  try {
    await notificationStore.updateSubscription(category, enabled)
    ElMessage.success(enabled ? '已开启订阅' : '已关闭订阅')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

watch(activeTab, (tab) => {
  if (tab === 'subscriptions') {
    notificationStore.fetchSubscriptions()
  }
})

onMounted(() => {
  notificationStore.resetNotifications()
  notificationStore.fetchNotifications({ page: 1 })
})
</script>

<style scoped>
.notifications-page {
  max-width: 1000px;
}

.notification-tabs {
  margin-top: 24px;
}

.notification-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
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
  flex: 1;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tab {
  padding: 8px 16px;
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

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.notification-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.notification-item.unread {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.2);
}

.notification-item.selected {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
}

.notification-checkbox {
  padding-top: 4px;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.notification-icon.cat-comment {
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.notification-icon.cat-review {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

.notification-icon.cat-follow {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

.notification-icon.cat-activity {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.notification-icon.cat-like {
  background: rgba(255, 157, 84, 0.2);
  color: #ff9d54;
}

.notification-icon.cat-favorite {
  background: rgba(216, 131, 255, 0.2);
  color: #d883ff;
}

.notification-icon.cat-system {
  background: rgba(144, 147, 153, 0.2);
  color: #909399;
}

.notification-content {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.notification-type {
  font-size: 12px;
  color: #ffd700;
  font-weight: 600;
}

.notification-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.notification-body {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-text p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.notification-actions {
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

.subscriptions-desc {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 20px;
}

.subscriptions-desc p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subscription-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.subscription-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.subscription-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.subscription-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.subscription-icon.cat-comment {
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.subscription-icon.cat-review {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

.subscription-icon.cat-follow {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

.subscription-icon.cat-activity {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.subscription-icon.cat-like {
  background: rgba(255, 157, 84, 0.2);
  color: #ff9d54;
}

.subscription-icon.cat-favorite {
  background: rgba(216, 131, 255, 0.2);
  color: #d883ff;
}

.subscription-icon.cat-system {
  background: rgba(144, 147, 153, 0.2);
  color: #909399;
}

.subscription-text h4 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.subscription-text p {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
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
