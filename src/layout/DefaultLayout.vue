<script setup lang="ts">
import BackgroundImage from '@/components/BackgroundImage.vue'
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
  <div class="text-foreground flex flex-col min-h-screen w-full">
    <BackgroundImage />
    <header class="border-b bg-background flex shrink-0 gap-2 h-14 transition-[height] ease-linear items-center">
      <div class="px-4 flex w-full items-center justify-between">
        <div class="flex gap-2 items-center" />

        <HeaderActions />
      </div>
    </header>

    <div class="p-4 grow">
      <slot />
    </div>
  </div>
</template>
