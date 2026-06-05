<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Button } from '@/components/shadcn/button'
import { cn } from '@/utils/shadcn'
import { useSidebar } from './utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7', props.class)"
    @click="toggleSidebar"
  >
    <!-- <PanelLeft /> -->
    <div class="i-lucide-panel-left text-muted-foreground size-[1.2rem] block transition-colors hover:text-foreground" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
