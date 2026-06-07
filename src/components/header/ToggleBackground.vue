<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from '@/components/shadcn/button/Button.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { useBackground } from '@/composables/useBackground'

const { t } = useI18n()

const {
  enabled,
  currentImage,
  toggle,
  next,
} = useBackground()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="cursor-pointer relative !hover:bg-accent"
      >
        <div class="i-carbon-image m-auto size-5 ease-in-out inset-0 absolute !transition-400" :class="enabled ? 'scale-100' : 'scale-0'" />
        <div class="i-carbon-image-reference m-auto size-5 ease-in-out inset-0 absolute !transition-400" :class="enabled ? 'scale-0' : 'scale-100'" />
        <span class="sr-only">Toggle background</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-64">
      <DropdownMenuItem @click="toggle">
        <div :class="enabled ? 'i-carbon-view-off' : 'i-carbon-view'" />
        {{ enabled ? t('background.disable') : t('background.enable') }}
      </DropdownMenuItem>

      <template v-if="enabled && currentImage?.copyright">
        <DropdownMenuSeparator />
        <DropdownMenuLabel class="text-muted-foreground text-xs font-normal leading-relaxed whitespace-normal">
          {{ currentImage.copyright }}
        </DropdownMenuLabel>
        <div class="p-1">
          <Button
            variant="ghost"
            size="sm"
            class="w-full"
            @click="next"
          >
            {{ t('background.refresh') }}
          </Button>
        </div>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
