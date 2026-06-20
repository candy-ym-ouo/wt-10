<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? '✏️ 编辑文章' : '📝 写文章' }}</h1>
      <p class="page-subtitle">{{ isEdit ? '修改你的专栏文章' : '分享你的知识和经验' }}</p>
    </div>

    <div class="edit-layout">
      <div class="editor-section">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="0">
          <el-form-item prop="title">
            <el-input
              v-model="form.title"
              placeholder="请输入文章标题"
              size="large"
              maxlength="100"
              show-word-limit
              class="title-input"
            />
          </el-form-item>

          <el-form-item prop="summary">
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="2"
              placeholder="文章摘要，简要概括文章内容"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="封面图" prop="cover_image">
            <el-input v-model="form.cover_image" placeholder="封面图片 URL" />
            <div class="cover-preview" v-if="form.cover_image">
              <img :src="form.cover_image" alt="封面预览" />
            </div>
          </el-form-item>

          <el-form-item label="标签">
            <el-select
              v-model="form.tags"
              multiple
              filterable
              allow-create
              placeholder="添加标签，按回车确认"
              style="width: 100%"
            >
              <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
            </el-select>
          </el-form-item>

          <el-form-item label="引用模块">
            <div class="module-ref-controls">
              <el-select
                v-model="selectedModule"
                filterable
                placeholder="选择要引用的模块"
                style="width: 300px"
                @change="addModuleRef"
              >
                <el-option
                  v-for="mod in moduleList"
                  :key="mod.id"
                  :label="mod.name"
                  :value="mod.id"
                />
              </el-select>
              <span class="hint">已添加 {{ form.module_refs.length }} 个模块</span>
            </div>
            <div v-if="form.module_refs.length > 0" class="module-refs-editor">
              <div
                v-for="(ref, index) in form.module_refs"
                :key="ref.module_id || ref.id"
                class="module-ref-item"
              >
                <span class="module-ref-name">{{ getModuleName(ref.module_id || ref.id) }}</span>
                <el-input
                  v-model="ref.note"
                  placeholder="添加备注说明（可选）"
                  size="small"
                  style="flex: 1"
                />
                <el-button
                  type="danger"
                  text
                  size="small"
                  @click="removeModuleRef(index)"
                >
                  移除
                </el-button>
              </div>
            </div>
          </el-form-item>

          <el-form-item prop="content">
            <div class="editor-toolbar">
              <span class="toolbar-label">正文内容</span>
              <div class="editor-tabs">
                <span
                  class="tab"
                  :class="{ active: editorTab === 'write' }"
                  @click="editorTab = 'write'"
                >
                  编写
                </span>
                <span
                  class="tab"
                  :class="{ active: editorTab === 'preview' }"
                  @click="editorTab = 'preview'"
                >
                  预览
                </span>
              </div>
            </div>
            <div class="editor-container">
              <el-input
                v-if="editorTab === 'write'"
                v-model="form.content"
                type="textarea"
                :rows="20"
                placeholder="支持 Markdown 格式，开始写作吧..."
                class="content-editor"
                resize="vertical"
              />
              <div v-else class="content-preview" v-html="renderMarkdown(form.content)">
              </div>
            </div>
          </el-form-item>

          <el-form-item>
            <div class="form-actions">
              <el-button @click="goBack">取消</el-button>
              <el-button type="info" @click="saveDraft">保存草稿</el-button>
              <el-button type="primary" @click="submitArticle" :loading="submitting">
                {{ isEdit ? '更新文章' : '发布文章' }}
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useArticleStore } from '@/stores/articleStore'
import { moduleAPI } from '@/api'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()

const formRef = ref(null)
const submitting = ref(false)
const editorTab = ref('write')
const moduleList = ref([])
const selectedModule = ref(null)

const isEdit = computed(() => !!route.params.id)

const form = reactive({
  title: '',
  summary: '',
  content: '',
  cover_image: '',
  tags: [],
  module_refs: [],
  is_public: true
})

const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在 5 到 100 个字符之间', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入文章内容', trigger: 'blur' },
    { min: 50, message: '文章内容至少 50 个字符', trigger: 'blur' }
  ]
}

const commonTags = ['教程', '测评', '心得', '技巧', '入门', '进阶', '音色设计', '现场演出', '模块推荐']

const renderMarkdown = (content) => {
  if (!content) return '<p style="color: #999;">预览内容将在这里显示...</p>'
  try {
    return marked.parse(content)
  } catch {
    return content.replace(/\n/g, '<br>')
  }
}

const getModuleName = (moduleId) => {
  const mod = moduleList.value.find(m => m.id === moduleId)
  return mod ? mod.name : `模块 #${moduleId}`
}

const addModuleRef = (moduleId) => {
  if (!moduleId) return
  const exists = form.module_refs.some(ref => (ref.module_id || ref.id) === moduleId)
  if (exists) {
    ElMessage.warning('该模块已添加')
    selectedModule.value = null
    return
  }
  form.module_refs.push({ module_id: moduleId, note: '' })
  selectedModule.value = null
}

const removeModuleRef = (index) => {
  form.module_refs.splice(index, 1)
}

onMounted(async () => {
  try {
    const res = await moduleAPI.getModules({ limit: 100 })
    moduleList.value = res.list || []
  } catch (e) {
    console.error('加载模块列表失败', e)
  }

  if (isEdit.value) {
    loadArticle()
  }
})

const loadArticle = async () => {
  try {
    const res = await articleStore.fetchArticleDetail(route.params.id)
    form.title = res.title
    form.summary = res.summary || ''
    form.content = res.content
    form.cover_image = res.cover_image || ''
    try {
      form.tags = JSON.parse(res.tags) || []
    } catch {
      form.tags = []
    }
    form.module_refs = res.module_refs?.map(r => ({
      module_id: r.module_id,
      note: r.note || ''
    })) || []
    form.is_public = res.is_public === 1
  } catch (e) {
    ElMessage.error('加载文章失败')
    router.push('/articles')
  }
}

const goBack = () => {
  router.back()
}

const saveDraft = async () => {
  if (!form.title) {
    ElMessage.warning('请输入文章标题')
    return
  }
  try {
    if (isEdit.value) {
      await articleStore.updateArticle(route.params.id, {
        ...form,
        is_public: false
      })
      ElMessage.success('草稿已保存')
    } else {
      const res = await articleStore.createArticle({
        ...form,
        is_public: false
      })
      ElMessage.success('草稿已保存')
      router.push(`/articles/edit/${res.id}`)
    }
  } catch (e) {
    ElMessage.error(e.error || '保存失败')
  }
}

const submitArticle = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      await articleStore.updateArticle(route.params.id, form)
      ElMessage.success('文章已更新，等待审核')
    } else {
      await articleStore.createArticle(form)
      ElMessage.success('文章已发布，等待审核')
    }
    router.push('/articles')
  } catch (e) {
    ElMessage.error(e.error || '发布失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.edit-layout {
  max-width: 900px;
  margin: 0 auto;
}

.title-input :deep(.el-input__inner) {
  font-size: 1.25rem;
  font-weight: 600;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.toolbar-label {
  font-weight: 600;
  color: var(--text-primary);
}

.editor-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: 8px;
}

.tab {
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

.editor-container {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
}

.content-editor :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  min-height: 400px;
}

.content-preview {
  padding: 20px;
  min-height: 400px;
  line-height: 1.8;
  color: var(--text-primary);
}

.content-preview :deep(h1),
.content-preview :deep(h2),
.content-preview :deep(h3) {
  margin-top: 24px;
  margin-bottom: 12px;
}

.content-preview :deep(p) {
  margin-bottom: 16px;
}

.content-preview :deep(code) {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.content-preview :deep(pre) {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.content-preview :deep(blockquote) {
  border-left: 4px solid var(--primary-color);
  margin: 16px 0;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.05);
  color: var(--text-secondary);
}

.cover-preview {
  margin-top: 12px;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.cover-preview img {
  width: 100%;
  display: block;
}

.module-ref-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.hint {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.module-refs-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-ref-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.module-ref-name {
  font-weight: 500;
  color: var(--text-primary);
  min-width: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
</style>
