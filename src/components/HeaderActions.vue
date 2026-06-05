<script setup lang="ts">
import { Button } from '@/components/shadcn/button'
import ThemeSwitch from '@/components/ThemeSwitch.vue' // 引入刚刚做好的主题切换
</script>

<template>
  <div class="flex shrink-0 flex-row gap-2 items-center">
    <Button variant="ghost" size="icon" as-child class="size-8">
      <a href="https://github.com/你的用户名/你的项目" target="_blank" rel="noreferrer" class="flex items-center justify-center">
        <span class="i-lucide-github text-muted-foreground size-[1.2rem] block transition-colors hover:text-foreground" />
        <span class="sr-only">GitHub</span>
      </a>
    </Button>

    <div class="header-sperator" />

    <ThemeSwitch />
  </div>
</template>
