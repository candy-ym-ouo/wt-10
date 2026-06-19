<template>
  <el-button
    v-if="userStore.isLoggedIn && userId !== userStore.user?.id"
    :type="isFollowing ? 'info' : 'primary'"
    :class="['follow-btn', { 'is-following': isFollowing, 'small': size === 'small', 'large': size === 'large' }]"
    @click="handleFollow"
    :loading="loading"
    :size="size"
  >
    <el-icon v-if="!isFollowing"><Plus /></el-icon>
    <span>{{ isFollowing ? '已关注' : '关注' }}</span>
  </el-button>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { useSocialStore } from '@/stores/socialStore'

const props = defineProps({
  userId: {
    type: [Number, String],
    required: true
  },
  size: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['follow', 'unfollow'])

const userStore = useUserStore()
const socialStore = useSocialStore()

const isFollowing = ref(false)
const loading = ref(false)

const fetchStatus = async () => {
  if (!userStore.isLoggedIn) return
  const res = await socialStore.checkFollowStatus(props.userId)
  isFollowing.value = res.following
}

const handleFollow = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  
  loading.value = true
  try {
    const res = await socialStore.followUser(props.userId)
    isFollowing.value = res.following
    if (res.following) {
      ElMessage.success('关注成功')
      emit('follow', res)
    } else {
      ElMessage.success('已取消关注')
      emit('unfollow', res)
    }
  } catch (e) {
    ElMessage.error(e.error || '操作失败')
  } finally {
    loading.value = false
  }
}

watch(() => props.userId, () => {
  isFollowing.value = false
  fetchStatus()
})

onMounted(() => {
  fetchStatus()
})
</script>

<style scoped>
.follow-btn {
  transition: all 0.3s ease;
}

.follow-btn.is-following {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: rgba(255, 255, 255, 0.8) !important;
}

.follow-btn.is-following:hover {
  background: rgba(255, 100, 100, 0.2) !important;
  border-color: rgba(255, 100, 100, 0.4) !important;
  color: #ff6b6b !important;
}

.follow-btn.small {
  padding: 4px 12px;
  font-size: 12px;
}

.follow-btn.large {
  padding: 10px 24px;
  font-size: 15px;
}
</style>
