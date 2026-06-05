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
  <component :is="currentLayout">
    <router-view />
  </component>
  <Toaster />
</template>
