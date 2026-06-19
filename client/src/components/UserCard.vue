<template>
  <div class="user-card">
    <div class="user-info" @click="goToProfile">
      <el-avatar :size="48" :src="user.avatar" class="avatar">
        {{ user.username?.charAt(0).toUpperCase() }}
      </el-avatar>
      <div class="user-details">
        <div class="username-row">
          <span class="username">{{ user.username }}</span>
          <span v-if="user.is_following_back" class="follow-badge">互相关注</span>
        </div>
        <p v-if="user.bio" class="bio">{{ user.bio }}</p>
        <div class="stats">
          <span class="stat"><strong>{{ user.followers_count || 0 }}</strong> 粉丝</span>
          <span class="stat"><strong>{{ user.following_count || 0 }}</strong> 关注</span>
        </div>
      </div>
    </div>
    <FollowButton 
      v-if="showFollowButton"
      :user-id="user.id" 
      size="small"
      @follow="handleFollow"
      @unfollow="handleUnfollow"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import FollowButton from './FollowButton.vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  showFollowButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['follow', 'unfollow'])

const router = useRouter()

const goToProfile = () => {
  router.push(`/users/${props.user.id}`)
}

const handleFollow = (res) => {
  emit('follow', res)
}

const handleUnfollow = (res) => {
  emit('unfollow', res)
}
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.user-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 215, 0, 0.2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.username-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.username {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.follow-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  border-radius: 4px;
}

.bio {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.stat strong {
  color: rgba(255, 255, 255, 0.8);
  margin-right: 2px;
}
</style>
