<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog'
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
const dialogRef = ref(null)

onClickOutside(dialogRef, () => {
  showLogoutDialog.value = false
})

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

  <AlertDialog v-model:open="showLogoutDialog">
    <AlertDialogContent ref="dialogRef">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('auth.logout.confirm') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('auth.logout.description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="confirmLogout">
          {{ t('common.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
