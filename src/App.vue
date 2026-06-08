<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Toaster } from '@/components/shadcn/sonner'
import AppShell from '@/layout/AppShell.vue'
import Header from '@/layout/Header.vue'

const route = useRoute()

const currentLayout = computed(() => {
  // 登录页只显示 header，其他页面使用完整应用外壳（header + sidebar）
  if (route.path === '/login') {
    return Header
  }
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
    <component :is="currentLayout">
      <router-view />
    </component>
  </div>
</template>
