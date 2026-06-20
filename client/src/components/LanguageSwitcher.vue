<template>
  <el-dropdown @command="handleCommand" trigger="click">
    <span class="language-switcher">
      <span class="globe-icon">🌍</span>
      <span class="current-language">{{ currentLabel }}</span>
      <el-icon class="arrow-icon"><ArrowDown /></el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="opt in localeOptions"
          :key="opt.value"
          :command="opt.value"
          :class="{ active: opt.value === currentLocale }"
        >
          <span class="flag-icon" v-if="opt.value === 'zh_cn'">🇨🇳</span>
          <span class="flag-icon" v-else>🇺🇸</span>
          {{ opt.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useI18nStore, LOCALE_LABELS } from '@/stores/i18nStore'
import { ArrowDown } from '@element-plus/icons-vue'

const i18nStore = useI18nStore()

const currentLocale = computed(() => i18nStore.currentLocale)
const currentLabel = computed(() => LOCALE_LABELS[currentLocale.value] || currentLocale.value)
const localeOptions = computed(() => i18nStore.localeOptions)

const handleCommand = (locale) => {
  if (locale !== currentLocale.value) {
    i18nStore.setLocale(locale)
  }
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: inherit;
  font-size: 14px;
}

.language-switcher:hover {
  background: rgba(255, 255, 255, 0.08);
}

.globe-icon {
  font-size: 16px;
}

.arrow-icon {
  font-size: 12px;
  opacity: 0.6;
}

.flag-icon {
  margin-right: 6px;
  font-size: 16px;
}

:deep(.el-dropdown-menu__item.active) {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
</style>
