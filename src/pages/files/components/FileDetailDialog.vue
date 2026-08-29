<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import TagBadge from '@/components/TagBadge.vue'
import FileIcon from '@/pages/files/components/FileIcon.vue'
import { useAppStore } from '@/stores'

interface Props {
  open: boolean
  file: FileItem | null
  buildFileUrl: (fileName: string) => string
  formatFileSize: (bytes?: number) => string
  formatDate: (timestamp?: number) => string
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const store = useAppStore()

const builtInTags = ['whitelist', 'blocked', 'nsfw', 'shared']

const sortedTags = computed(() => {
  if (!props.file?.metadata?.Tags)
    return []
  const tags = props.file.metadata.Tags
  const builtin = tags.filter(tag => builtInTags.includes(tag))
  const custom = tags.filter(tag => !builtInTags.includes(tag))
  return [...builtin, ...custom]
})

const isImage = computed(() => {
  return props.file?.metadata?.FileType?.startsWith('image/')
})

const shouldShowPreviewInDetail = computed(() => {
  if (!isImage.value)
    return false
  if (store.imageLoadMode === 'full')
    return true
  if (store.imageLoadMode === 'lite') {
    const sizeInMB = (props.file?.metadata?.FileSizeBytes || 0) / (1024 * 1024)
    return sizeInMB <= 5
  }
  return false
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md w-[calc(100vw-2rem)] sm:w-full">
      <DialogHeader>
        <DialogTitle>{{ t('pages.files.detail.title') }}</DialogTitle>
      </DialogHeader>
      <div v-if="file" class="py-4 flex flex-col gap-4">
        <div class="p-6 border rounded-lg bg-muted/20 flex items-center justify-center">
          <img
            v-if="shouldShowPreviewInDetail"
            :src="buildFileUrl(file.name)"
            :alt="file.name"
            class="rounded h-auto w-full"
          >
          <FileIcon
            v-else
            :item="{ name: file.name, isFolder: false, metadata: file.metadata }"
            :preview-url="buildFileUrl(file.name)"
            :show-preview="false"
            :size="80"
          />
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.fileName') }}
            </div>
            <div class="text-sm break-all">
              {{ file.metadata?.FileName || file.name }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.fileUrl') }}
            </div>
            <a
              :href="buildFileUrl(file.name)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-primary break-all hover:underline"
            >
              {{ buildFileUrl(file.name) }}
            </a>
          </div>
          <div>
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.size') }}
            </div>
            <div class="text-sm">
              {{ formatFileSize(file.metadata?.FileSizeBytes) }}
            </div>
          </div>
          <div v-if="file.metadata?.Channel">
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.channelType') }}
            </div>
            <div class="text-sm">
              {{ file.metadata.Channel }}
            </div>
          </div>
          <div v-if="file.metadata?.ChannelName">
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.channel') }}
            </div>
            <div class="text-sm">
              {{ file.metadata.ChannelName }}
            </div>
          </div>
          <div v-if="sortedTags.length > 0">
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.tagsLabel') }}
            </div>
            <div class="flex flex-wrap gap-2">
              <TagBadge
                v-for="tag in sortedTags"
                :key="tag"
                :tag="tag"
                :color="store.getTagColor(tag)"
              />
            </div>
          </div>
          <div v-if="file.metadata?.TimeStamp">
            <div class="text-xs text-muted-foreground font-medium mb-1.5">
              {{ t('pages.files.detail.uploadTime') }}
            </div>
            <div class="text-sm">
              {{ formatDate(file.metadata.TimeStamp) }}
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
