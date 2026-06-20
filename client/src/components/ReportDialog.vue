<template>
  <el-dialog
    v-model="visible"
    title="举报"
    width="520px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="visible" class="report-form">
      <div class="report-target">
        <div class="target-label">举报对象</div>
        <div class="target-info">{{ targetDescription }}</div>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="举报分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择举报分类" style="width: 100%;">
            <el-option
              v-for="cat in categories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="举报理由" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="4"
            placeholder="请详细描述违规情况"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="补充说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="补充更多信息（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <div class="report-tips">
        <el-icon><Warning /></el-icon>
        <span>请确保举报内容真实有效，恶意举报将受到处罚。</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitReport">
        提交举报
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { contentReportAPI } from '@/api'

const props = defineProps({
  modelValue: Boolean,
  targetType: {
    type: String,
    required: true
  },
  targetId: {
    type: [Number, String],
    required: true
  },
  targetDescription: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const categories = ref([])

const form = reactive({
  category: '',
  reason: '',
  description: ''
})

const rules = {
  category: [
    { required: true, message: '请选择举报分类', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请填写举报理由', trigger: 'blur' },
    { min: 10, message: '举报理由至少10个字符', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (val) {
    resetForm()
  }
})

const loadCategories = async () => {
  try {
    const res = await contentReportAPI.getCategories()
    categories.value = res.categories || []
  } catch (err) {
    console.error('加载举报分类失败', err)
  }
}

const resetForm = () => {
  form.category = ''
  form.reason = ''
  form.description = ''
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const handleClose = () => {
  visible.value = false
}

const submitReport = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (err) {
    return
  }

  try {
    submitting.value = true
    await contentReportAPI.createReport({
      target_type: props.targetType,
      target_id: parseInt(props.targetId),
      category: form.category,
      reason: form.reason,
      description: form.description
    })
    ElMessage.success('举报已提交，我们会尽快处理')
    emit('success')
    visible.value = false
  } catch (err) {
    ElMessage.error(err.error || '举报提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.report-form {
  padding: 0 8px;
}

.report-target {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.target-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.target-info {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.report-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.report-tips .el-icon {
  color: #f59e0b;
  font-size: 18px;
}
</style>
