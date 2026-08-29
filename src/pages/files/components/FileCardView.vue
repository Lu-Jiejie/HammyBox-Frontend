<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/shadcn/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import FileMenuItems from './FileMenuItems.vue'

interface CombinedItem {
  name: string
  displayName?: string
  isFolder: boolean
  metadata?: FileItem['metadata']
  fileCount?: number
}

interface Props {
  items: CombinedItem[]
  selectedFiles: string[]
  buildFileUrl: (fileName: string) => string
  formatFileSize: (bytes?: number) => string
  formatDate: (timestamp?: number) => string
}

interface Emits {
  (e: 'navigateFolder', folderName: string): void
  (e: 'toggleSelection', fileName: string): void
  (e: 'copyUrl', fileName: string): void
  (e: 'delete', fileName: string, isFolder: boolean): void
  (e: 'showDetail', file: FileItem): void
  (e: 'rename', fileName: string, isFolder: boolean): void
  (e: 'editTags', fileName: string): void
  (e: 'move', fileName: string, isFolder: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function isImage(file: CombinedItem): boolean {
  return file.metadata?.MimeType?.startsWith('image/') || file.metadata?.FileType?.startsWith('image/') || false
}

function getPreviewUrl(file: CombinedItem): string {
  if (isImage(file)) {
    return props.buildFileUrl(file.name)
  }
  return ''
}
</script>

<template>
  <div v-auto-animate class="gap-4 grid grid-cols-2 lg:grid-cols-5 md:grid-cols-4 sm:grid-cols-3 xl:grid-cols-6">
    <ContextMenu v-for="item in items" :key="item.name">
      <ContextMenuTrigger as-child>
        <div
          class="group p-3 border rounded-lg flex flex-col gap-2 cursor-pointer transition-shadow relative hover:shadow-md"
          @dblclick="item.isFolder ? emit('navigateFolder', item.name) : emit('showDetail', { name: item.name, metadata: item.metadata })"
        >
          <!-- Selection checkbox for files -->
          <div v-if="!item.isFolder" class="left-2 top-2 absolute z-10" @click.stop @dblclick.stop>
            <Checkbox
              :checked="selectedFiles.includes(item.name)"
              @update:checked="emit('toggleSelection', item.name)"
            />
          </div>

          <!-- Preview -->
          <div class="rounded bg-muted flex aspect-square items-center justify-center overflow-hidden">
            <img
              v-if="!item.isFolder && isImage(item)"
              :src="getPreviewUrl(item)"
              :alt="item.name"
              class="h-full w-full object-cover"
            >
            <div
              v-else-if="item.isFolder"
              class="i-lucide-folder text-muted-foreground"
              style="width: 48px; height: 48px;"
            />
            <div
              v-else
              class="i-lucide-file text-muted-foreground"
              style="width: 48px; height: 48px;"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ item.isFolder ? (item.displayName || item.name) : (item.metadata?.FileName || item.name) }}
            </p>
            <p v-if="!item.isFolder" class="text-xs text-muted-foreground">
              {{ formatFileSize(item.metadata?.FileSizeBytes) }}
            </p>
          </div>

          <!-- Actions -->
          <div v-if="!item.isFolder" class="opacity-0 transition-opacity group-hover:opacity-100" @click.stop>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="sm" class="p-0 h-7 w-7" type="button">
                  <div class="i-lucide-more-horizontal" style="width: 16px; height: 16px;" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <FileMenuItems
                  :item="item"
                  as="dropdown"
                  @copy-url="emit('copyUrl', $event)"
                  @delete="emit('delete', $event, item.isFolder)"
                  @show-detail="emit('showDetail', $event)"
                  @rename="emit('rename', $event, item.isFolder)"
                  @edit-tags="emit('editTags', $event)"
                  @move="emit('move', $event, item.isFolder)"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div v-else class="opacity-0 transition-opacity group-hover:opacity-100" @click.stop>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="sm" class="p-0 h-7 w-7" type="button">
                  <div class="i-lucide-more-horizontal" style="width: 16px; height: 16px;" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <FileMenuItems
                  :item="item"
                  as="dropdown"
                  @copy-url="emit('copyUrl', $event)"
                  @delete="emit('delete', $event, item.isFolder)"
                  @show-detail="emit('showDetail', $event)"
                  @rename="emit('rename', $event, item.isFolder)"
                  @edit-tags="emit('editTags', $event)"
                  @move="emit('move', $event, item.isFolder)"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <FileMenuItems
          :item="item"
          as="context"
          @copy-url="emit('copyUrl', $event)"
          @delete="emit('delete', $event, item.isFolder)"
          @show-detail="emit('showDetail', $event)"
          @rename="emit('rename', $event, item.isFolder)"
          @edit-tags="emit('editTags', $event)"
          @move="emit('move', $event, item.isFolder)"
        />
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>
