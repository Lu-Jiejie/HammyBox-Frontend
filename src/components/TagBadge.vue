<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'

interface Props {
  tag: string
  color: string
  showDelete?: boolean
  clickable?: boolean
  deleteIcon?: 'x' | 'trash'
}

interface Emits {
  (e: 'delete'): void
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  showDelete: false,
  clickable: false,
  deleteIcon: 'x',
})

const emit = defineEmits<Emits>()

const { locale } = useI18n()
const store = useAppStore()

// 获取标签显示名称
const displayName = computed(() => store.getTagDisplayName(props.tag, locale.value))

// 根据颜色生成深色和浅色版本
const colorStyles = computed(() => {
  // 预定义颜色映射
  const colorMap: Record<string, { border: string, bg: string, text: string }> = {
    red: { border: 'border-red-600', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
    green: { border: 'border-green-600', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
    orange: { border: 'border-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400' },
    blue: { border: 'border-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400' },
    purple: { border: 'border-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400' },
    pink: { border: 'border-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-400' },
    yellow: { border: 'border-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400' },
    indigo: { border: 'border-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400' },
    cyan: { border: 'border-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400' },
    teal: { border: 'border-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400' },
  }

  return colorMap[props.color] || colorMap.blue
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<template>
  <div
    :class="[colorStyles.border, colorStyles.bg, colorStyles.text, clickable && 'cursor-pointer']"
    class="text-sm px-2 py-0.5 border rounded-lg inline-flex gap-1.5 items-center"
    @click="handleClick"
  >
    <div class="i-lucide-tag" style="width: 14px; height: 14px;" />
    <span class="font-medium">{{ displayName }}</span>
    <button
      v-if="showDelete"
      class="ml-1 transition-opacity hover:opacity-70"
      @click.stop="emit('delete')"
    >
      <div v-if="deleteIcon === 'x'" class="i-lucide-x" style="width: 14px; height: 14px;" />
      <div v-else class="i-lucide-trash-2" style="width: 14px; height: 14px;" />
    </button>
  </div>
</template>
