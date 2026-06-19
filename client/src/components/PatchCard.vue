<template>
  <div class="card patch-card" @click="$emit('click', patch)">
    <div class="patch-image">🎛️</div>
    <div class="patch-title">{{ patch.title }}</div>
    <div class="patch-desc">{{ patch.description }}</div>
    <div class="patch-tags" v-if="patchTags.length > 0">
      <span class="tag" v-for="tag in patchTags" :key="tag">#{{ tag }}</span>
    </div>
    <div class="patch-meta">
      <div class="patch-author" @click.stop="$emit('viewUser', patch.user_id)">
        <el-avatar :size="20" :src="patch.avatar">
          {{ patch.username?.charAt(0).toUpperCase() }}
        </el-avatar>
        <span class="author-name">{{ patch.username }}</span>
        <CreatorBadge
          v-if="patch.is_creator_verified"
          :verified="true"
          size="small"
        />
      </div>
      <FollowButton 
        v-if="showActions"
        :user-id="patch.user_id" 
        size="small"
        @click.stop
      />
    </div>
    <div class="patch-stats-row">
      <div class="patch-stats">
        <span><el-icon><Star /></el-icon> {{ patch.likes_count || patch.real_likes || 0 }}</span>
        <span><el-icon><View /></el-icon> {{ patch.views_count || 0 }}</span>
      </div>
    </div>
    <div class="patch-actions" v-if="showActions">
      <el-button 
        size="small" 
        :type="patch.is_liked ? 'warning' : 'default'"
        @click.stop="$emit('toggleLike', patch.id)"
      >
        <el-icon><Star :fill="patch.is_liked ? '#ffd700' : 'none'" /></el-icon>
        {{ patch.is_liked ? '已点赞' : '点赞' }}
      </el-button>
      <el-button 
        size="small" 
        :type="patch.is_favorited ? 'success' : 'default'"
        @click.stop="$emit('toggleFavorite', patch.id)"
      >
        <el-icon><Collection :fill="patch.is_favorited ? '#67c23a' : 'none'" /></el-icon>
        {{ patch.is_favorited ? '已收藏' : '收藏' }}
      </el-button>
      <el-button 
        size="small" 
        type="primary"
        @click.stop="$emit('addToCompare', patch.id)"
      >
        <el-icon><SetUp /></el-icon>
        对比
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { SetUp } from '@element-plus/icons-vue'
import FollowButton from './FollowButton.vue'
import CreatorBadge from './CreatorBadge.vue'

const props = defineProps({
  patch: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: true
  }
})

defineEmits(['click', 'toggleLike', 'toggleFavorite', 'addToCompare', 'viewUser'])

const patchTags = computed(() => {
  try {
    return JSON.parse(props.patch.tags) || []
  } catch {
    return []
  }
})
</script>
