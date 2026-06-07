<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import {
  Dropzone,
  DropzoneArea,
  DropzoneDescription,
  DropzoneFileList,
  DropzoneFileListItem,
  DropzoneMessage,
  DropzoneRemoveFile,
  DropzoneTrigger,
  useDropzoneUpload,
} from '@/components/shadcn/dropzone'

const createdUrls = new Set<string>()

const dropzone = useDropzoneUpload({
  onDropFile: async (file: File) => {
    await new Promise(resolve => setTimeout(resolve, 800))
    const url = URL.createObjectURL(file)
    createdUrls.add(url)
    return {
      status: 'success' as const,
      result: url,
    }
  },
  onRemoveFile: async (id: string) => {
    const file = dropzone.fileStatuses.value.find(f => f.id === id)
    if (file?.result && typeof file.result === 'string' && createdUrls.has(file.result)) {
      URL.revokeObjectURL(file.result)
      createdUrls.delete(file.result)
    }
  },
  validation: {
    accept: ['image/png', 'image/jpeg', 'image/jpg'],
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 4,
  },
})

// Clean up blob URLs on unmount
onBeforeUnmount(() => {
  for (const url of createdUrls) {
    URL.revokeObjectURL(url)
  }
  createdUrls.clear()
})
</script>

<template>
  <div class="mx-auto max-w-lg w-full">
    <Dropzone v-bind="dropzone" class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <DropzoneDescription class="text-sm">
          Select up to 4 images (max 5MB)
        </DropzoneDescription>
        <DropzoneMessage class="text-sm" />
      </div>

      <DropzoneArea>
        <DropzoneTrigger
          class="p-6 text-center border-2 border-muted-foreground/25 rounded-lg border-dashed flex flex-col gap-3 transition-colors items-center hover:border-muted-foreground/50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="text-muted-foreground"
          >
            <path d="M12 13v8" />
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="m8 17 4-4 4 4" />
          </svg>
          <div class="text-sm">
            <p class="font-medium">
              Upload images
            </p>
            <p class="text-muted-foreground">
              Click or drag and drop
            </p>
          </div>
        </DropzoneTrigger>
      </DropzoneArea>

      <div class="mt-4 rounded-md overflow-clip">
        <DropzoneFileList
          v-if="dropzone.fileStatuses.value.length > 0"
          class="pr-1 gap-1.5 grid grid-cols-4 max-h-48 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-muted-foreground/20 [&::-webkit-scrollbar]:w-2"
        >
          <DropzoneFileListItem
            v-for="file in dropzone.fileStatuses.value" :key="file.id" :file="file"
            class="group rounded bg-secondary shadow-sm relative overflow-hidden"
          >
            <div class="relative">
              <div v-if="file.status === 'pending'" class="bg-black/20 aspect-square animate-pulse" />
              <img
                v-if="file.status === 'success'" :src="file.result" :alt="`uploaded-${file.fileName}`"
                class="w-full aspect-square object-cover"
              >
              <DropzoneRemoveFile variant="ghost" size="sm" class="p-0.5 bg-black/50 opacity-0 cursor-pointer transition-opacity right-0.5 top-0.5 absolute hover:bg-black/70 focus-visible:opacity-100 focus-within:opacity-100 focus:opacity-100 group-hover:opacity-100 sm:opacity-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="text-white"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </DropzoneRemoveFile>
            </div>
            <div class="p-1">
              <p class="text-xs leading-tight truncate">
                {{ file.fileName }}
              </p>
            </div>
          </DropzoneFileListItem>
        </DropzoneFileList>
      </div>
    </Dropzone>
  </div>
</template>
