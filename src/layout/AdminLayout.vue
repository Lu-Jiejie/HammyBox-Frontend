<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import HeaderActions from '@/components/HeaderActions.vue'
// 引入你的右上角组件
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn/breadcrumb'
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
          <div class="flex gap-2 items-center">
            <SidebarTrigger class="cursor-pointer -ml-1" />
            <div class="mx-2 bg-border shrink-0 h-4 w-[1px]" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem class="hidden md:block">
                  <BreadcrumbLink href="#">
                    后台管理
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator class="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>当前工作区</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <HeaderActions />
        </div>
      </header>

      <main class="p-4 pt-4 flex flex-1 flex-col gap-4 overflow-y-scroll">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
