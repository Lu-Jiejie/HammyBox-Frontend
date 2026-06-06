<script setup lang="ts">
import HeaderActions from '@/components/header/HeaderActions.vue'
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from '@/components/shadcn/breadcrumb'
</script>

<template>
  <div class="text-foreground bg-background flex flex-col min-h-screen w-full transition-colors ease-linear">
    <header class="border-b flex shrink-0 gap-2 h-16 transition-[height] ease-linear items-center">
      <div class="px-4 flex w-full items-center justify-between">
        <div class="flex gap-2 items-center">
          <!-- <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="/">
                  图床前台
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>当前视图</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb> -->
        </div>

        <HeaderActions />
      </div>
    </header>

    <div class="p-4 pt-4 flex flex-1 flex-col gap-4 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
