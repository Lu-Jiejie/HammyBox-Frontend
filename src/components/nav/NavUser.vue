<script setup lang="ts">
import {
  ChevronsUpDown,
  LogOut,
  User,
} from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/shadcn/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/shadcn/sidebar'
import { useAuth } from '@/composables/useAuth'
import { useAppStore } from '@/stores'

const { t } = useI18n()
const router = useRouter()
const store = useAppStore()
const { logout } = useAuth()
const { isMobile } = useSidebar()

// 用户信息 - 单用户系统
const user = {
  name: 'Admin',
  email: 'admin@hammybox.local',
  avatar: '', // 无头像，使用 fallback
}

async function handleLogout() {
  try {
    await logout()
    toast.success(t('auth.logout.success'))
    router.push('/login')
  }
  catch (error) {
    toast.error('Logout failed')
  }
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
          >
            <Avatar class="rounded-lg h-8 w-8">
              <AvatarImage :src="user.avatar" :alt="user.name" />
              <AvatarFallback class="rounded-lg">
                <User class="size-4" />
              </AvatarFallback>
            </Avatar>
            <div class="text-sm leading-tight text-left flex-1 grid">
              <span class="font-medium truncate">{{ user.name }}</span>
              <span class="text-xs text-muted-foreground truncate">{{ user.email }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="rounded-lg min-w-56 w-(--reka-dropdown-menu-trigger-width)"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="font-normal p-0">
            <div class="text-sm px-1 py-1.5 text-left flex gap-2 items-center">
              <Avatar class="rounded-lg h-8 w-8">
                <AvatarImage :src="user.avatar" :alt="user.name" />
                <AvatarFallback class="rounded-lg">
                  <User class="size-4" />
                </AvatarFallback>
              </Avatar>
              <div class="text-sm leading-tight text-left flex-1 grid">
                <span class="font-semibold truncate">{{ user.name }}</span>
                <span class="text-xs text-muted-foreground truncate">{{ user.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout">
            <LogOut />
            {{ t('actions.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
