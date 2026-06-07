<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Toaster } from '@/components/shadcn/sonner'
import AdminLayout from '@/layout/AdminLayout.vue'
import DefaultLayout from '@/layout/DefaultLayout.vue'

const route = useRoute()
const layouts = {
  admin: AdminLayout,
  default: DefaultLayout,
}

const currentLayout = computed(() => {
  if (route.path.startsWith('/admin') && route.path !== '/admin/login') {
    return layouts.admin
  }
  return layouts.default
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
