<template>
  <div class="comment-item" :id="`comment-${comment.id}`">
    <el-avatar :size="36" :src="comment.avatar">
      {{ comment.username?.charAt(0).toUpperCase() }}
    </el-avatar>
    <div class="comment-content">
      <div class="comment-header">
        <span class="comment-user" @click="goToUser(comment.user_id)">
          {{ comment.username }}
        </span>
        <span v-if="comment.reply_to_username" class="reply-to">
          回复 <span class="reply-to-user">{{ comment.reply_to_username }}</span>
        </span>
        <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
      </div>
      <div class="comment-text">{{ comment.content }}</div>
      <div class="comment-actions">
        <el-button
          type="text"
          size="small"
          :class="{ 'liked': comment.is_liked }"
          @click="handleLike"
        >
          <el-icon><Star :fill="comment.is_liked ? '#ffd700' : 'none'" /></el-icon>
          {{ comment.is_liked ? '已赞' : '点赞' }} ({{ comment.likes_count || 0 }})
        </el-button>
        <el-button
          v-if="userStore.isLoggedIn"
          type="text"
          size="small"
          @click="toggleReply"
        >
          <el-icon><ChatDotRound /></el-icon>
          回复
        </el-button>
        <el-button
          v-if="(userStore.user?.id === comment.user_id) || userStore.isAdmin"
          type="text"
          size="small"
          @click="handleDelete"
        >
          <el-icon><Delete /></el-icon> 删除
        </el-button>
        <el-button
          v-if="userStore.isLoggedIn && userStore.user?.id !== comment.user_id"
          type="text"
          size="small"
          @click="handleReport"
        >
          <el-icon><WarningFilled /></el-icon> 举报
        </el-button>
      </div>

      <div v-if="showReplyForm" class="reply-form">
        <el-input
          v-model="replyContent"
          type="textarea"
          :rows="2"
          :placeholder="`回复 ${comment.reply_to_username || comment.username}...`"
          maxlength="500"
          show-word-limit
          @keydown.enter.ctrl="submitReply"
        />
        <div class="reply-form-actions">
          <el-button size="small" @click="cancelReply">取消</el-button>
          <el-button type="primary" size="small" class="btn-primary" @click="submitReply" :loading="replyLoading">
            回复
          </el-button>
        </div>
      </div>

      <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :patch-id="patchId"
          :article-id="articleId"
          :is-reply="true"
          @like="onReplyLike"
          @delete="onReplyDelete"
          @report="onReplyReport"
          @reply="onReplyReply"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star, ChatDotRound, Delete, WarningFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  patchId: {
    type: [Number, String],
    default: null
  },
  articleId: {
    type: [Number, String],
    default: null
  },
  isReply: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['like', 'delete', 'report', 'reply'])

const router = useRouter()
const userStore = useUserStore()

const showReplyForm = ref(false)
const replyContent = ref('')
const replyLoading = ref(false)

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

const goToUser = (userId) => {
  router.push(`/users/${userId}`)
}

const handleLike = () => {
  emit('like', props.comment)
}

const toggleReply = () => {
  showReplyForm.value = !showReplyForm.value
  if (showReplyForm.value) {
    replyContent.value = ''
  }
}

const cancelReply = () => {
  showReplyForm.value = false
  replyContent.value = ''
}

const submitReply = async () => {
  if (!replyContent.value.trim()) return
  replyLoading.value = true
  try {
    emit('reply', {
      parentId: props.comment.parent_id || props.comment.id,
      replyToUserId: props.comment.user_id,
      content: replyContent.value.trim()
    })
    showReplyForm.value = false
    replyContent.value = ''
  } catch (e) {
    ElMessage.error(e.error || '回复失败')
  } finally {
    replyLoading.value = false
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定删除这条评论？', '确认', { type: 'warning' })
    emit('delete', props.comment)
  } catch {}
}

const handleReport = () => {
  emit('report', props.comment)
}

const onReplyLike = (reply) => {
  emit('like', reply)
}

const onReplyDelete = (reply) => {
  emit('delete', reply)
}

const onReplyReport = (reply) => {
  emit('report', reply)
}

const onReplyReply = (data) => {
  emit('reply', data)
}
</script>

<style scoped>
.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.comment-user {
  font-weight: 600;
  color: #ffd700;
  cursor: pointer;
}

.reply-to {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.reply-to-user {
  color: #ffd700;
  font-weight: 500;
}

.comment-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.comment-text {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 8px;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.comment-actions :deep(.el-button) {
  color: rgba(255, 255, 255, 0.6);
}

.comment-actions :deep(.el-button:hover) {
  color: #ffd700;
}

.comment-actions :deep(.el-button.liked) {
  color: #ffd700;
}

.reply-form {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.reply-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.replies-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 12px;
  border-left: 2px solid rgba(255, 215, 0, 0.2);
}

.replies-list .comment-item {
  padding: 12px;
  background: rgba(0, 0, 0, 0.15);
}
</style>
