<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/shadcn/sidebar'
import { useAuth } from '@/composables/useAuth'

const { t } = useI18n()
const router = useRouter()
const { logout } = useAuth()
const showLogoutDialog = ref(false)

async function confirmLogout() {
  try {
    await logout()
    toast.success(t('auth.logout.success'))
    router.push('/login')
  }
  catch {
    toast.error('Logout failed')
  }
}
</script>

<template>
  <SidebarMenu class="overflow-x-hidden">
    <SidebarMenuItem class="overflow-x-hidden">
      <SidebarMenuButton :tooltip="t('actions.logout')" class="!overflow-x-hidden" @click="showLogoutDialog = true">
        <LogOut />
        <span class="whitespace-nowrap overflow-hidden transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 !text-clip">{{ t('actions.logout') }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>

  <ConfirmDialog
    v-model:open="showLogoutDialog"
    :title="t('auth.logout.confirm')"
    :description="t('auth.logout.description')"
    :cancel-text="t('common.cancel')"
    :confirm-text="t('common.confirm')"
    @confirm="confirmLogout"
  />
</template>
