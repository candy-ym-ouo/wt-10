<template>
  <span
    v-if="verified"
    class="creator-badge"
    :class="{ 'badge-small': size === 'small', 'badge-large': size === 'large' }"
    :title="title"
    @click="handleClick"
  >
    <el-icon :size="iconSize"><Medal /></el-icon>
    <span v-if="showText" class="badge-text">创作者认证</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { Medal } from '@element-plus/icons-vue'

const props = defineProps({
  verified: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'default'
  },
  showText: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: String,
    default: ''
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const iconSize = computed(() => {
  if (props.size === 'small') return 14
  if (props.size === 'large') return 24
  return 18
})

const title = computed(() => {
  if (props.verifiedAt) {
    return `创作者认证 · ${new Date(props.verifiedAt).toLocaleDateString('zh-CN')} 认证`
  }
  return '创作者认证'
})

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.creator-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: #1a1a2e;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
  user-select: none;
  transition: all 0.3s ease;
}

.creator-badge .el-icon {
  color: #1a1a2e;
}

.badge-text {
  line-height: 1;
}

.badge-small {
  padding: 1px 6px;
  font-size: 11px;
}

.badge-large {
  padding: 4px 12px;
  font-size: 14px;
}

.creator-badge[clickable="true"] {
  cursor: pointer;
}

.creator-badge[clickable="true"]:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}
</style>
