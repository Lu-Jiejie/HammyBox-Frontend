<script setup lang="ts">
import Button from '@/components/shadcn/button/Button.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { changeLocale } from '@/modules/i18n'

const localeOptions = [
  { value: 'zh-CN', label: '简体中文', icon: 'i-twemoji-flag-china' },
  { value: 'en-US', label: 'English', icon: 'i-twemoji-flag-united-states' },
] as const
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative !hover:bg-accent"
      >
        <div class="i-ri-translate-2 einset-0 m-auto size-5 absolute" />
        <span class="sr-only">Toggle language</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="item in localeOptions"
        :key="item.value"
        @click="changeLocale(item.value)"
      >
        <div :class="item.icon" />
        {{ item.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
