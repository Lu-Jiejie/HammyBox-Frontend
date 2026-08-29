<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Toaster } from '@/components/shadcn/sonner'
import AppShell from '@/layout/AppShell.vue'
import Header from '@/layout/Header.vue'

const route = useRoute()

// 不需要应用外壳（header + sidebar）的页面路径前缀
function isBarePath(path: string): boolean {
  return (
    path === '/login'
    || path === '/blocked'
    || path === '/browse'
    || path.startsWith('/browse/')
  )
}

const currentLayout = computed(() => {
  // 首次挂载时 route 还是初始路由（START_LOCATION，meta 未填充）。
  // 此时用浏览器当前 URL 判断布局，避免 /browse/* 这类 layout:false 页面
  // 刷新时首帧先渲染出带侧边栏的 AppShell（一闪而过）。
  if (route.matched.length === 0) {
    return isBarePath(window.location.pathname) ? Header : AppShell
  }
  // 登录页、blocked、404 等不需要布局的页面
  if (route.path === '/login' || route.path === '/blocked' || route.meta.layout === false) {
    return Header
  }
  // 其他页面使用完整应用外壳（header + sidebar）
  return AppShell
})
</script>

<template>
  <Toaster
    position="top-center"
    :toast-options="{
      classes: {
        success: '!border-emerald-600/50 !text-emerald-600 dark:(!border-emerald-400/50 !text-emerald-400)',
        error: '!border-red-400/50 !text-red-400',
        warning: '!border-amber-600/50  !text-amber-600 dark:(!border-amber-400/50 !text-amber-400)',
      },
    }"
  />
  <div>
    <component :is="currentLayout" v-if="currentLayout">
      <router-view />
    </component>
    <router-view v-else />
  </div>
</template>
