<script setup lang="ts">
import type { SidebarProps } from '@/components/shadcn/sidebar'
import {
  CloudUpload,
  FileText,
  FolderOpen,
  Key,
  Settings,
  Tags,
} from '@lucide/vue'
import { computed } from 'vue'
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

// 侧边栏导航数据 - 使用 computed 使其响应路由变化
const data = computed(() => ({
  navMain: [
    {
      title: '上传',
      url: '/upload',
      icon: CloudUpload,
      isActive: route.path === '/upload',
    },
    {
      title: '文件管理',
      url: '/files',
      icon: FolderOpen,
      isActive: route.path.startsWith('/files'),
    },
    {
      title: '标签管理',
      url: '/tags',
      icon: Tags,
      isActive: route.path === '/tags',
    },
    {
      title: 'API Tokens',
      url: '/api-tokens',
      icon: Key,
      isActive: route.path === '/api-tokens',
    },
    {
      title: '系统设置',
      url: '/settings',
      icon: Settings,
      isActive: route.path.startsWith('/settings'),
      items: [
        {
          title: '安全设置',
          url: '/settings/security',
        },
        {
          title: '上传渠道',
          url: '/settings/upload',
        },
        {
          title: '页面配置',
          url: '/settings/page',
        },
        {
          title: '其他设置',
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
        <h1 class="font-serif text-2xl font-medium tracking-tight whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 pointer-events-none">
          Hammy Box
        </h1>
        <span class="font-serif text-2xl font-medium absolute inset-0 px-2.5 py-3 opacity-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-100 pointer-events-none">
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
