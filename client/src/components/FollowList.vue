<template>
  <div class="follow-list">
    <div v-if="loading" class="loading">
      <el-skeleton v-for="i in 3" :key="i" :rows="2" animated />
    </div>
    
    <div v-else-if="users.length === 0" class="empty">
      <el-empty :description="emptyText" />
    </div>
    
    <div v-else class="users-grid">
      <UserCard
        v-for="user in users"
        :key="user.id"
        :user="user"
        @follow="onFollow"
        @unfollow="onUnfollow"
      />
    </div>
    
    <div v-if="hasMore && !loading" class="load-more">
      <el-button @click="loadMore" :loading="loadingMore">
        加载更多
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSocialStore } from '@/stores/socialStore'
import UserCard from './UserCard.vue'

const props = defineProps({
  userId: {
    type: [Number, String],
    default: null
  },
  type: {
    type: String,
    required: true,
    validator: (v) => ['followers', 'following'].includes(v)
  },
  isMe: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['follow', 'unfollow'])

const socialStore = useSocialStore()

const users = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const limit = 20
const total = ref(0)

const hasMore = computed(() => users.value.length < total.value)

const emptyText = computed(() => {
  if (props.type === 'followers') {
    return props.isMe ? '还没有粉丝，快去发布更多精彩内容吧~' : '暂无粉丝'
  }
  return props.isMe ? '还没有关注任何人' : '暂无关注'
})

const fetchData = async (reset = false) => {
  if (reset) {
    page.value = 1
    users.value = []
    total.value = 0
  }
  
  const isLoadingMore = page.value > 1
  if (isLoadingMore) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  
  try {
    let res
    if (props.isMe) {
      res = props.type === 'followers' 
        ? await socialStore.fetchMyFollowers({ page: page.value, limit })
        : await socialStore.fetchMyFollowing({ page: page.value, limit })
    } else {
      res = props.type === 'followers'
        ? await socialStore.fetchUserFollowers(props.userId, { page: page.value, limit })
        : await socialStore.fetchUserFollowing(props.userId, { page: page.value, limit })
    }
    
    users.value = [...users.value, ...res.list]
    total.value = res.total
  } finally {
    if (isLoadingMore) {
      loadingMore.value = false
    } else {
      loading.value = false
    }
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return
  page.value++
  await fetchData()
}

const onFollow = (res) => {
  emit('follow', res)
}

const onUnfollow = (res) => {
  emit('unfollow', res)
}

watch(() => [props.userId, props.type, props.isMe], () => {
  fetchData(true)
}, { immediate: true })
</script>

<style scoped>
.follow-list {
  width: 100%;
}

.users-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  padding: 60px 0;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
