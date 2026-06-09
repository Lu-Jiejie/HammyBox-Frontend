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
  <Sidebar v-bind="props">
    <SidebarHeader>
      <div class="text-sidebar-accent-foreground px-3 py-2 flex gap-2 items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
        <div class="text-sidebar-primary-foreground rounded-lg bg-sidebar-primary flex size-8 aspect-square items-center justify-center shrink-0">
          <FileText class="size-4" />
        </div>
        <div class="text-sm leading-tight text-left flex-1 grid min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:w-0">
          <span class="font-semibold truncate">Hammy Box</span>
          <span class="text-xs truncate">文件存储管理</span>
        </div>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <NavMain :items="data.navMain" />
    </SidebarContent>
    <SidebarFooter>
      <NavUser />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
