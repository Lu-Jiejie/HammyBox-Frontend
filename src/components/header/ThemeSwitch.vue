<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'
import { Button } from '@/components/shadcn/button' // 引入 shadcn 按钮

const mode = useColorMode({
  emitAuto: true,
})

const currentIcon = computed(() => {
  if (mode.value === 'auto')
    return 'i-lucide-monitor-cog'
  if (mode.value === 'dark')
    return 'i-lucide-moon-star'
  return 'i-lucide-sun'
})

function toggleTheme() {
  if (mode.value === 'light') {
    mode.value = 'dark'
  }
  else if (mode.value === 'dark') {
    mode.value = 'auto'
  }
  else {
    mode.value = 'light'
  }
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="text-muted-foreground shrink-0 size-8 cursor-pointer transition-colors hover:text-foreground"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <span class="size-5 block" :class="[currentIcon]" />
  </Button>
</template>
