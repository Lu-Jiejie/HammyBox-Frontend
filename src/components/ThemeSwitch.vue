<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/shadcn/button' // 引入 shadcn 按钮

// 1. 挂载标准的三态色彩管理
const mode = useColorMode({
  emitAuto: true,
})

// 2. 根据当前模式，动态计算按钮里应该显示什么 UnoCSS 图标
const currentIcon = computed(() => {
  if (mode.value === 'auto')
    return 'i-lucide-monitor-cog'
  if (mode.value === 'dark')
    return 'i-lucide-moon-star'
  return 'i-lucide-sun'
})

// 3. 核心点击逻辑：在 light -> dark -> auto 之间循环洗牌切换
function toggleTheme() {
  if (mode.value === 'light') {
    mode.value = 'dark'
  }
  else if (mode.value === 'dark') {
    mode.value = 'auto'
  }
  else {
    mode.value = 'light'
  }
}

// 4. 水合闪烁防御
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <div v-if="!isMounted" class="shrink-0 size-8" />

  <Button
    v-else
    variant="ghost"
    size="icon"
    class="text-muted-foreground shrink-0 size-8 cursor-pointer transition-colors hover:text-foreground"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <span class="size-[1.2rem] block" :class="[currentIcon]" />
  </Button>
</template>
