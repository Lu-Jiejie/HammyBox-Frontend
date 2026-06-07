<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import HeaderActions from '@/components/header/HeaderActions.vue'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/shadcn/sidebar'
</script>

<template>
  <SidebarProvider>
    <AppSidebar />

    <SidebarInset>
      <header class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b flex shrink-0 gap-2 h-14 transition-[width,height] ease-linear items-center">
        <div class="px-4 flex w-full items-center justify-between">
          <div class="flex gap-1 items-center">
            <SidebarTrigger class="-ml-1" />
          </div>

          <HeaderActions />
        </div>
      </header>

      <div class="p-4 grow">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
