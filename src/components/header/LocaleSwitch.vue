<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/shadcn/button'
import { locale, toggleLocale } from '@/modules/i18n'

const currentIcon = computed(() => {
  if (locale.value === 'zh-CN')
    return 'i-uil-letter-chinese-a'
  return 'i-uil-letter-english-a'
})
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="text-muted-foreground shrink-0 size-8 cursor-pointer transition-colors hover:text-foreground"
    aria-label="Toggle locale"
    @click="toggleLocale"
  >
    <span class="size-[1.2rem] block" :class="[currentIcon]" />
  </Button>
</template>
