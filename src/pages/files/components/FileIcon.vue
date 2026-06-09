<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { computed, ref } from 'vue'
import { getFileIcon } from '@/utils/getFileIcon'

interface Props {
  item: {
    name: string
    displayName?: string
    isFolder: boolean
    metadata?: FileItem['metadata']
  }
  previewUrl?: string
  showPreview?: boolean
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  showPreview: true,
})

const loaded = ref(false)

const isImage = computed(() => {
  return props.item.metadata?.MimeType?.startsWith('image/') || props.item.metadata?.FileType?.startsWith('image/') || false
})

const iconClass = computed(() => {
  const fileName = props.item.metadata?.FileName || props.item.name
  return getFileIcon(fileName, props.item.isFolder)
})
</script>

<template>
  <div class="flex items-center justify-center">
    <template v-if="!item.isFolder && isImage && showPreview && previewUrl">
      <div v-if="!loaded" :class="iconClass" class="brightness-65 contrast-200 saturate-200 filter" :style="{ width: `${size}px`, height: `${size}px` }" />
      <img
        :src="previewUrl"
        :alt="item.name"
        class="rounded object-cover"
        :class="{ 'opacity-0 absolute': !loaded }"
        :style="{ width: `${size}px`, height: `${size}px` }"
        loading="lazy"
        @load="loaded = true"
      >
    </template>
    <div v-else :class="iconClass" class="brightness-65 contrast-200 saturate-200 filter" :style="{ width: `${size}px`, height: `${size}px` }" />
  </div>
</template>
