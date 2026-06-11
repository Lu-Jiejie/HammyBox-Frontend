<script setup lang="ts">
import type { SidebarProps } from '@/components/shadcn/sidebar'
import {
  Activity,
  CloudUpload,
  FolderOpen,
  Settings,
} from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import NavMain from '@/components/nav/NavMain.vue'
import NavUser from '@/components/nav/NavUser.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/shadcn/sidebar'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const route = useRoute()
const { t } = useI18n()

// 侧边栏导航数据 - 使用 computed 使其响应路由变化
const data = computed(() => ({
  navMain: [
    {
      title: t('sidebar.upload'),
      url: '/upload',
      icon: CloudUpload,
      isActive: route.path === '/upload',
    },
    {
      title: t('sidebar.files'),
      url: '/files',
      icon: FolderOpen,
      isActive: route.path.startsWith('/files'),
    },
    {
      title: t('sidebar.systemStatus'),
      url: '/status',
      icon: Activity,
      isActive: route.path === '/status',
    },
    {
      title: t('sidebar.settings'),
      url: '/settings',
      icon: Settings,
      isActive: route.path.startsWith('/settings') && route.path !== '/settings/status',
      items: [
        {
          title: t('sidebar.security'),
          url: '/settings/security',
        },
        {
          title: t('sidebar.uploadChannels'),
          url: '/settings/upload',
        },
        {
          title: t('sidebar.pageConfig'),
          url: '/settings/page',
        },
        {
          title: t('sidebar.others'),
          url: '/settings/others',
        },
      ],
    },
  ],
}))
</script>

<template>
  <Sidebar v-bind="props" class="!overflow-x-hidden">
    <SidebarHeader>
      <div class="px-2.5 py-3 select-none relative">
        <h1 class="text-2xl tracking-tight font-medium font-serif pointer-events-none whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
          Hammy Box
        </h1>
        <span class="text-2xl font-medium font-serif px-2.5 py-3 opacity-0 pointer-events-none transition-opacity duration-200 inset-0 absolute group-data-[collapsible=icon]:opacity-100">
          H
        </span>
      </div>
    </SidebarHeader>
    <SidebarContent class="!overflow-x-hidden">
      <NavMain :items="data.navMain" />
    </SidebarContent>
    <SidebarFooter class="!overflow-x-hidden">
      <NavUser />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
