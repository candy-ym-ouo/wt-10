<template>
  <div class="open-platform-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">🔐 API 开放平台</h1>
        <p class="page-subtitle">通过 API 密钥访问平台数据，构建你的应用程序</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="platform-tabs">
      <el-tab-pane label="概览" name="overview">
        <div class="overview-section">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
                <el-icon><Key /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ store.myKeys.length }}</div>
                <div class="stat-label">API 密钥</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ store.callStats?.summary?.count || 0 }}</div>
                <div class="stat-label">近7日调用</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ successRate }}%</div>
                <div class="stat-label">成功率</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ store.callStats?.summary?.avg_response_time?.toFixed(0) || 0 }}ms</div>
                <div class="stat-label">平均响应</div>
              </div>
            </div>
          </div>

          <div class="quick-start-card">
            <h3>🚀 快速开始</h3>
            <div class="quick-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">
                  <strong>创建 API 密钥</strong>
                  <span>在"API 密钥"标签页创建你的第一个密钥</span>
                </div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">
                  <strong>生成访问令牌</strong>
                  <span>使用 API Key + Secret 获取 Bearer Token</span>
                </div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">
                  <strong>调用 API</strong>
                  <span>在请求头中携带 Token 或 API Key 即可访问接口</span>
                </div>
              </div>
            </div>
            <div class="code-block">
              <div class="code-title">示例：使用 API Key 调用</div>
              <pre><code>curl -H "X-API-Key: pk_xxxxxxxxxxxxxxxxxxxxxxxx" \
  https://your-domain.com/api/modules</code></pre>
            </div>
            <div class="code-block">
              <div class="code-title">示例：使用 Bearer Token 调用</div>
              <pre><code>curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://your-domain.com/api/patches</code></pre>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="API 密钥" name="keys">
        <div class="keys-section">
          <div class="section-header">
            <h3>我的 API 密钥</h3>
            <el-button type="primary" @click="openCreateKeyDialog">
              <el-icon><Plus /></el-icon>
              创建新密钥
            </el-button>
          </div>

          <div v-if="store.myKeys.length === 0" class="empty-state">
            <el-empty description="还没有 API 密钥，点击上方按钮创建第一个">
              <el-button type="primary" @click="openCreateKeyDialog">创建密钥</el-button>
            </el-empty>
          </div>

          <div v-else class="keys-list">
            <div v-for="key in store.myKeys" :key="key.id" class="key-card">
              <div class="key-header">
                <div class="key-name-section">
                  <h4>{{ key.name }}</h4>
                  <el-tag :type="getStatusTagType(key.status)" size="small">
                    {{ getStatusText(key.status) }}
                  </el-tag>
                  <el-tag v-if="key.expires_at" type="info" size="small">
                    到期：{{ formatDate(key.expires_at) }}
                  </el-tag>
                </div>
                <div class="key-actions">
                  <el-button size="small" @click="editKey(key)">编辑</el-button>
                  <el-button size="small" @click="openTokenDialog(key)">
                    <el-icon><Key /></el-icon>
                    生成令牌
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteKey(key)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
              <div class="key-body">
                <div class="key-row">
                  <span class="key-label">API Key</span>
                  <div class="key-value-wrap">
                    <code>{{ key.api_key }}</code>
                    <el-button size="small" text @click="copyText(key.api_key)">
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div class="key-row">
                  <span class="key-label">API Secret</span>
                  <div class="key-value-wrap">
                    <code>{{ showSecret[key.id] ? key.api_secret_plain || key.masked_secret : key.masked_secret }}</code>
                    <el-button size="small" text @click="showSecret[key.id] = !showSecret[key.id]">
                      <el-icon>{{ showSecret[key.id] ? 'View' : 'Hide' }}</el-icon>
                    </el-button>
                    <el-button v-if="key.api_secret_plain" size="small" text @click="copyText(key.api_secret_plain)">
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div class="key-row">
                  <span class="key-label">权限范围</span>
                  <div class="scopes-list">
                    <el-tag 
                      v-for="scope in getScopeDetails(key.scopes)" 
                      :key="scope.scope" 
                      size="small"
                      class="scope-tag"
                    >
                      {{ scope.name }}
                    </el-tag>
                  </div>
                </div>
                <div class="key-row key-meta">
                  <div class="meta-item">
                    <el-icon><Odometer /></el-icon>
                    <span>限流：{{ key.rate_limit_per_min }}/分 · {{ key.rate_limit_per_hour }}/时 · {{ key.rate_limit_per_day }}/日</span>
                  </div>
                  <div class="meta-item">
                    <el-icon><Histogram /></el-icon>
                    <span>总调用：{{ key.total_calls }} 次</span>
                  </div>
                  <div class="meta-item">
                    <el-icon><Clock /></el-icon>
                    <span>最近使用：{{ key.last_used_at ? formatDate(key.last_used_at) : '从未' }}</span>
                  </div>
                  <div class="meta-item">
                    <el-icon><Calendar /></el-icon>
                    <span>创建：{{ formatDate(key.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="调用记录" name="logs">
        <div class="logs-section">
          <div class="filter-bar">
            <el-select v-model="logFilters.api_key_id" placeholder="选择密钥" clearable class="filter-item" @change="fetchLogs">
              <el-option label="全部密钥" value="" />
              <el-option v-for="k in store.myKeys" :key="k.id" :label="k.name" :value="k.id" />
            </el-select>
            <el-input v-model="logFilters.endpoint" placeholder="搜索端点" clearable class="filter-item" @keyup.enter="fetchLogs" />
            <el-select v-model="logFilters.status_code" placeholder="状态码" clearable class="filter-item" @change="fetchLogs">
              <el-option label="成功 (2xx)" value="200" />
              <el-option label="客户端错误 (4xx)" value="400" />
              <el-option label="服务器错误 (5xx)" value="500" />
            </el-select>
            <el-button type="primary" @click="fetchLogs">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </div>

          <div class="table-card">
            <el-table :data="store.callLogs" v-loading="logsLoading" stripe>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="api_key_name" label="密钥" width="150">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.api_key_name || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="请求" min-width="300">
                <template #default="{ row }">
                  <div class="request-info">
                    <el-tag :type="getMethodTagType(row.method)" size="small">{{ row.method }}</el-tag>
                    <code class="endpoint">{{ row.endpoint }}</code>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="status_code" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusCodeTag(row.status_code)" size="small">
                    {{ row.status_code || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="response_time_ms" label="耗时" width="100">
                <template #default="{ row }">
                  {{ row.response_time_ms }}ms
                </template>
              </el-table-column>
              <el-table-column prop="ip_address" label="IP" width="140" />
              <el-table-column prop="created_at" label="时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
            <div v-if="store.callLogsPagination" class="pagination-wrap">
              <el-pagination
                v-model:current-page="logFilters.page"
                v-model:page-size="logFilters.page_size"
                :total="store.callLogsPagination.total"
                :page-sizes="[20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="fetchLogs"
                @current-change="fetchLogs"
              />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="权限范围" name="scopes">
        <div class="scopes-section">
          <h3>支持的权限范围</h3>
          <p class="section-desc">创建 API 密钥时选择需要的权限范围，遵循最小权限原则</p>
          
          <div v-for="(scopes, category) in store.scopeCategories" :key="category" class="scope-category">
            <h4>{{ getCategoryName(category) }}</h4>
            <div class="scope-grid">
              <div v-for="scope in scopes" :key="scope.scope" class="scope-card">
                <div class="scope-header">
                  <el-tag type="primary" size="small">{{ scope.scope }}</el-tag>
                  <strong>{{ scope.name }}</strong>
                </div>
                <p class="scope-desc">{{ scope.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="keyDialogVisible" :title="isEditKey ? '编辑 API 密钥' : '创建 API 密钥'" width="600px">
      <el-form :model="keyForm" :rules="keyFormRules" ref="keyFormRef" label-width="100px">
        <el-form-item label="密钥名称" prop="name">
          <el-input v-model="keyForm.name" placeholder="给密钥起个便于识别的名称" />
        </el-form-item>
        <el-form-item label="权限范围" prop="scopes">
          <el-tree-select
            v-model="keyForm.scopes"
            :data="scopeTreeData"
            multiple
            show-checkbox
            check-strictly
            render-after-expand
            placeholder="选择需要的权限范围"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="限流配置">
          <div class="rate-limit-inputs">
            <el-input-number v-model="keyForm.rate_limit_per_min" :min="1" :max="10000" size="small" />
            <span class="rate-limit-label">/分钟</span>
            <el-input-number v-model="keyForm.rate_limit_per_hour" :min="1" :max="100000" size="small" />
            <span class="rate-limit-label">/小时</span>
            <el-input-number v-model="keyForm.rate_limit_per_day" :min="1" :max="1000000" size="small" />
            <span class="rate-limit-label">/天</span>
          </div>
        </el-form-item>
        <el-form-item v-if="!isEditKey" label="有效期">
          <el-select v-model="keyForm.expires_days" placeholder="选择有效期" style="width: 100%">
            <el-option label="永久有效" :value="null" />
            <el-option label="30 天" :value="30" />
            <el-option label="90 天" :value="90" />
            <el-option label="180 天" :value="180" />
            <el-option label="365 天" :value="365" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isEditKey" label="状态">
          <el-switch
            v-model="keyForm.status"
            active-value="active"
            inactive-value="inactive"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="keyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitKeyForm">{{ isEditKey ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="tokenDialogVisible" title="生成访问令牌" width="500px">
      <el-form :model="tokenForm" label-width="120px">
        <el-alert
          v-if="store.currentToken"
          type="success"
          :closable="false"
          class="token-alert"
        >
          <div class="token-result">
            <div class="token-row">
              <span>访问令牌：</span>
              <div class="token-value-wrap">
                <code class="token-value">{{ store.currentToken.access_token }}</code>
                <el-button size="small" text @click="copyText(store.currentToken.access_token)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="token-row">
              <span>有效期：</span>
              <strong>{{ store.currentToken.expires_in }} 秒</strong>
            </div>
            <div class="token-row">
              <span>权限：</span>
              <el-tag v-for="s in store.currentToken.scopes" :key="s" size="small" style="margin-right: 4px">{{ s }}</el-tag>
            </div>
          </div>
        </el-alert>
        <el-form-item v-if="selectedKey" label="密钥">
          <el-tag>{{ selectedKey.name }}</el-tag>
        </el-form-item>
        <el-form-item label="API Secret">
          <el-input v-model="tokenForm.api_secret" type="password" show-password placeholder="请输入 API Secret" />
        </el-form-item>
        <el-form-item label="令牌有效期">
          <el-select v-model="tokenForm.expires_in" style="width: 100%">
            <el-option label="1 小时" :value="3600" />
            <el-option label="6 小时" :value="21600" />
            <el-option label="24 小时" :value="86400" />
            <el-option label="7 天" :value="604800" />
          </el-select>
        </el-form-item>
        <el-form-item label="自定义权限">
          <el-tree-select
            v-model="tokenForm.scopes"
            :data="scopeTreeData"
            multiple
            show-checkbox
            check-strictly
            render-after-expand
            placeholder="留空则使用密钥的全部权限"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeTokenDialog">关闭</el-button>
        <el-button type="primary" @click="generateToken">生成令牌</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="secretDialogVisible" title="密钥已创建" width="500px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="请妥善保管以下信息"
        description="API Secret 只会显示一次，请立即保存，丢失后无法找回"
      />
      <div class="secret-display" v-if="store.lastCreatedKey">
        <div class="secret-row">
          <span class="secret-label">API Key</span>
          <div class="secret-value-wrap">
            <code>{{ store.lastCreatedKey.api_key }}</code>
            <el-button text @click="copyText(store.lastCreatedKey.api_key)">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </div>
        </div>
        <div class="secret-row">
          <span class="secret-label">API Secret</span>
          <div class="secret-value-wrap">
            <code class="secret-highlight">{{ store.lastCreatedKey.api_secret_plain }}</code>
            <el-button text type="primary" @click="copyText(store.lastCreatedKey.api_secret_plain)">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="closeSecretDialog">我已保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Key, Connection, CircleCheck, Timer, Plus, Delete, CopyDocument,
  Search, Odometer, Histogram, Clock, Calendar, View, Hide
} from '@element-plus/icons-vue'
import { useOpenPlatformStore } from '@/stores/openPlatformStore'

const router = useRouter()
const store = useOpenPlatformStore()

const activeTab = ref('overview')
const logsLoading = ref(false)
const showSecret = reactive({})

const keyDialogVisible = ref(false)
const isEditKey = ref(false)
const editingKeyId = ref(null)
const keyFormRef = ref(null)
const keyForm = reactive({
  name: '',
  scopes: [],
  rate_limit_per_min: 60,
  rate_limit_per_hour: 1000,
  rate_limit_per_day: 10000,
  expires_days: null,
  status: 'active'
})
const keyFormRules = {
  name: [{ required: true, message: '请输入密钥名称', trigger: 'blur' }],
  scopes: [{ required: true, message: '请选择至少一个权限范围', type: 'array', trigger: 'change' }]
}

const tokenDialogVisible = ref(false)
const selectedKey = ref(null)
const tokenForm = reactive({
  api_key: '',
  api_secret: '',
  scopes: [],
  expires_in: 3600
})

const secretDialogVisible = ref(false)

const logFilters = reactive({
  page: 1,
  page_size: 20,
  api_key_id: '',
  status_code: '',
  endpoint: ''
})

const successRate = computed(() => {
  const summary = store.callStats?.summary
  if (!summary || !summary.count) return 0
  return ((summary.success_count / summary.count) * 100).toFixed(1)
})

const scopeTreeData = computed(() => {
  const categories = store.scopeCategories || {}
  return Object.entries(categories).map(([cat, scopes]) => ({
    value: cat,
    label: getCategoryName(cat),
    children: scopes.map(s => ({
      value: s.scope,
      label: `${s.name} (${s.scope})`
    }))
  }))
})

const getCategoryName = (cat) => {
  const names = {
    modules: '模块相关',
    patches: 'Patch 相关',
    articles: '专栏相关',
    users: '用户相关',
    collections: '专题相关',
    challenge: '挑战赛',
    downloads: '下载中心',
    products: '商品相关',
    activities: '活动相关',
    social: '社交相关',
    stats: '统计数据'
  }
  return names[cat] || cat
}

const getStatusTagType = (status) => {
  return { active: 'success', inactive: 'info', banned: 'danger' }[status] || 'info'
}

const getStatusText = (status) => {
  return { active: '正常', inactive: '停用', banned: '已封禁' }[status] || status
}

const getScopeDetails = (scopes) => {
  return (scopes || []).map(s => {
    const found = store.scopes.find(x => x.scope === s)
    return found || { scope: s, name: s }
  })
}

const getMethodTagType = (method) => {
  return { GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger' }[method] || 'info'
}

const getStatusCodeTag = (code) => {
  if (!code) return 'info'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warning'
  return 'danger'
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

const fetchAllData = async () => {
  await Promise.all([
    store.fetchScopes(),
    store.fetchMyKeys(),
    store.fetchCallStats({ days: 7 })
  ])
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    await store.fetchMyCallLogs(logFilters)
  } finally {
    logsLoading.value = false
  }
}

const openCreateKeyDialog = () => {
  isEditKey.value = false
  editingKeyId.value = null
  keyForm.name = ''
  keyForm.scopes = []
  keyForm.rate_limit_per_min = 60
  keyForm.rate_limit_per_hour = 1000
  keyForm.rate_limit_per_day = 10000
  keyForm.expires_days = null
  keyForm.status = 'active'
  keyDialogVisible.value = true
}

const editKey = (key) => {
  isEditKey.value = true
  editingKeyId.value = key.id
  keyForm.name = key.name
  keyForm.scopes = [...(key.scopes || [])]
  keyForm.rate_limit_per_min = key.rate_limit_per_min
  keyForm.rate_limit_per_hour = key.rate_limit_per_hour
  keyForm.rate_limit_per_day = key.rate_limit_per_day
  keyForm.expires_days = null
  keyForm.status = key.status
  keyDialogVisible.value = true
}

const submitKeyForm = async () => {
  await keyFormRef.value?.validate()
  try {
    if (isEditKey.value) {
      await store.updateKey(editingKeyId.value, { ...keyForm })
      ElMessage.success('密钥已更新')
    } else {
      await store.createKey({ ...keyForm })
      ElMessage.success('密钥创建成功')
      secretDialogVisible.value = true
    }
    keyDialogVisible.value = false
  } catch (e) {
    ElMessage.error(e?.error || '操作失败')
  }
}

const deleteKey = async (key) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除密钥 "${key.name}" 吗？删除后将无法恢复，使用该密钥的程序将无法访问 API。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await store.deleteKey(key.id)
    ElMessage.success('密钥已删除')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.error || '删除失败')
  }
}

const openTokenDialog = (key) => {
  selectedKey.value = key
  tokenForm.api_key = key.api_key
  tokenForm.api_secret = ''
  tokenForm.scopes = []
  tokenForm.expires_in = 3600
  store.clearCurrentToken()
  tokenDialogVisible.value = true
}

const generateToken = async () => {
  try {
    await store.generateToken({ ...tokenForm })
    ElMessage.success('令牌生成成功')
  } catch (e) {
    ElMessage.error(e?.error || '生成失败')
  }
}

const closeTokenDialog = () => {
  tokenDialogVisible.value = false
  store.clearCurrentToken()
}

const closeSecretDialog = () => {
  secretDialogVisible.value = false
  store.clearLastCreatedKey()
}

onMounted(() => {
  fetchAllData()
  fetchLogs()
})
</script>

<style scoped>
.open-platform-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: 1.5rem;
}

.page-header {
  background: linear-gradient(135deg, var(--primary-color), #9333ea);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  color: white;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
}

.page-subtitle {
  margin: 0;
  opacity: 0.9;
}

.platform-tabs {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.quick-start-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.quick-start-card h3 {
  margin: 0 0 1rem 0;
}

.quick-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  display: flex;
  flex-direction: column;
}

.step-content strong {
  color: var(--text-primary);
}

.step-content span {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.code-block {
  background: #1e1e2e;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.code-title {
  color: #a8b3cf;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.code-block pre {
  margin: 0;
  color: #cdd6f4;
  font-size: 0.85rem;
  overflow-x: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
}

.keys-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.key-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-color);
}

.key-name-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.key-name-section h4 {
  margin: 0;
}

.key-actions {
  display: flex;
  gap: 0.5rem;
}

.key-body {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.key-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.key-label {
  width: 100px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding-top: 4px;
}

.key-value-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.key-value-wrap code {
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  word-break: break-all;
  flex: 1;
}

.scopes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.scope-tag {
  margin: 0;
}

.key-meta {
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.filter-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-item {
  min-width: 180px;
}

.empty-state {
  padding: 3rem 0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.request-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.endpoint {
  font-size: 0.85rem;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.section-desc {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.scope-category {
  margin-bottom: 1.5rem;
}

.scope-category h4 {
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary-color);
  display: inline-block;
}

.scope-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.scope-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
}

.scope-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.scope-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.rate-limit-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rate-limit-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.token-alert {
  margin-bottom: 1rem;
}

.token-result {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.token-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.token-value-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.token-value {
  flex: 1;
  word-break: break-all;
  background: rgba(0,0,0,0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

.secret-display {
  margin-top: 1rem;
}

.secret-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.secret-row:last-child {
  border-bottom: none;
}

.secret-label {
  width: 100px;
  flex-shrink: 0;
  color: var(--text-secondary);
  padding-top: 4px;
}

.secret-value-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.secret-value-wrap code {
  flex: 1;
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  word-break: break-all;
}

.secret-highlight {
  background: #fef3c7 !important;
  color: #92400e;
}
</style>
