<script setup lang="ts">
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'

interface Props {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  variant?: 'default' | 'error'
}

withDefaults(defineProps<Props>(), {
  side: 'top',
  align: 'center',
  variant: 'default',
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <slot>
        <button
          type="button"
          :class="[
            'transition-colors flex-shrink-0',
            variant === 'error'
              ? 'i-lucide-alert-circle text-destructive hover:text-destructive/80'
              : 'i-lucide-info text-muted-foreground hover:text-foreground',
          ]"
          style="width: 14px; height: 14px;"
          aria-label="More info"
        />
      </slot>
    </PopoverTrigger>
    <PopoverContent
      :side="side"
      :align="align"
      :align-offset="0"
      :side-offset="8"
      :collision-padding="16"
      :class="[
        'text-xs max-w-[min(320px,calc(100vw-2rem))] break-words',
        variant === 'error' ? 'text-destructive' : '',
      ]"
    >
      {{ content }}
    </PopoverContent>
  </Popover>
</template>
