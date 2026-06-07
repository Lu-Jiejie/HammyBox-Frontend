<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { nextTick } from 'vue'
import Button from '@/components/shadcn/button/Button.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'

const mode = useColorMode()

// 用 View Transitions 给整页一次柔和的颜色 crossfade。
// shadcn 主题切换走的是 CSS 变量（--background 等），变量变化不会触发普通 transition，
// 所以改用整页快照淡入淡出；不支持的浏览器自动退化为瞬切。
function setTheme(value: typeof mode.value) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => unknown
  }

  if (!doc.startViewTransition) {
    mode.value = value
    return
  }

  doc.startViewTransition(async () => {
    mode.value = value
    await nextTick()
  })
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative !hover:bg-accent"
      >
        <div class="i-lucide-sun m-auto size-5 rotate-0 scale-100 ease-in-out inset-0 absolute dark:(scale-0 -rotate-90) !transition-300" />
        <div class="i-lucide-moon-star m-auto size-5 rotate-90 scale-0 ease-in-out inset-0 absolute dark:(rotate-0 scale-100) !transition-300" />
        <span class="sr-only">Toggle theme</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="setTheme('light')">
        <div i-lucide-sun />
        Light
      </DropdownMenuItem>
      <DropdownMenuItem @click="setTheme('dark')">
        <div i-lucide-moon-star />
        Dark
      </DropdownMenuItem>
      <DropdownMenuItem @click="setTheme('auto')">
        <div i-lucide-monitor-cog />
        System
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
