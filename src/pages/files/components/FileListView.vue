<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import FileIcon from './FileIcon.vue'

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
  formatDate: (dateString?: string) => string
  imageLoadMode: 'none' | 'lite' | 'full'
}

interface Emits {
  (e: 'navigateFolder', folderName: string): void
  (e: 'toggleSelection', fileName: string): void
  (e: 'copyUrl', fileName: string): void
  (e: 'delete', fileName: string, isFolder: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

function shouldShowPreview(item: CombinedItem): boolean {
  if (props.imageLoadMode === 'none')
    return false
  if (props.imageLoadMode === 'lite') {
    const sizeInMB = (item.metadata?.FileSizeBytes || 0) / (1024 * 1024)
    return sizeInMB <= 5
  }
  return true
}
</script>

<template>
  <div class="overflow-hidden">
    <div v-auto-animate>
      <div
        v-for="item in items"
        :key="item.name"
        class="px-4 py-3 border-b gap-3 hidden transition-colors items-center hover:bg-muted/30 md:grid lg:grid-cols-[32px_32px_minmax(200px,1fr)_90px_100px_60px_40px] md:grid-cols-[32px_32px_minmax(150px,1fr)_90px_60px_40px] xl:grid-cols-[32px_32px_minmax(200px,1fr)_90px_100px_120px_90px_40px]"
      >
        <div class="flex items-center">
          <Checkbox
            v-if="!item.isFolder"
            :model-value="selectedFiles.includes(item.name)"
            @click="() => emit('toggleSelection', item.name)"
          />
        </div>

        <FileIcon
          :item="item"
          :preview-url="buildFileUrl(item.name)"
          :show-preview="shouldShowPreview(item)"
          :size="28"
        />

        <button
          class="text-sm text-left min-w-0 truncate hover:underline"
          @click="item.isFolder ? emit('navigateFolder', item.name) : undefined"
        >
          {{ item.isFolder ? (item.displayName || item.name) : (item.metadata?.FileName || item.name) }}
        </button>

        <div class="text-xs text-muted-foreground">
          {{ item.isFolder ? '-' : formatFileSize(item.metadata?.FileSizeBytes) }}
        </div>

        <div class="text-xs text-muted-foreground hidden truncate lg:block">
          {{ item.isFolder ? '-' : (item.metadata?.Tags?.join(', ') || '-') }}
        </div>

        <div class="text-xs text-muted-foreground hidden truncate xl:block">
          {{ item.isFolder ? '-' : formatDate(item.metadata?.UploadTime) }}
        </div>

        <div class="text-xs text-muted-foreground hidden truncate xl:block">
          {{ item.isFolder ? '-' : (item.metadata?.ChannelName || item.metadata?.Channel || '-') }}
        </div>

        <div class="flex justify-end">
          <DropdownMenu v-if="!item.isFolder">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="p-0 h-7 w-7" type="button">
                <div class="i-lucide-more-horizontal" style="width: 15px; height: 15px;" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click.prevent="emit('copyUrl', item.name)">
                <div class="i-lucide-copy mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.copyUrl') }}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-destructive" @click.prevent="emit('delete', item.name, false)">
                <div class="i-lucide-trash-2 mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.delete') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        v-for="item in items"
        :key="`mobile-${item.name}`"
        class="px-3 py-3 border-b gap-3 grid grid-cols-[32px_32px_1fr_40px] transition-colors items-center hover:bg-muted/30 md:hidden"
      >
        <div class="flex items-center">
          <Checkbox
            v-if="!item.isFolder"
            :model-value="selectedFiles.includes(item.name)"
            @click="() => emit('toggleSelection', item.name)"
          />
        </div>

        <FileIcon
          :item="item"
          :preview-url="buildFileUrl(item.name)"
          :show-preview="shouldShowPreview(item)"
          :size="28"
        />

        <div class="min-w-0 flex flex-col gap-0.5">
          <button
            class="text-sm font-medium text-left truncate hover:underline"
            @click="item.isFolder ? emit('navigateFolder', item.name) : undefined"
          >
            {{ item.isFolder ? (item.displayName || item.name) : (item.metadata?.FileName || item.name) }}
          </button>
          <div class="text-xs text-muted-foreground">
            {{ item.isFolder ? '-' : formatFileSize(item.metadata?.FileSize) }}
          </div>
        </div>

        <div class="flex justify-end">
          <DropdownMenu v-if="!item.isFolder">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="p-0 h-7 w-7" type="button">
                <div class="i-lucide-more-horizontal" style="width: 15px; height: 15px;" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click.prevent="emit('copyUrl', item.name)">
                <div class="i-lucide-copy mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.copyUrl') }}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-destructive" @click.prevent="emit('delete', item.name, false)">
                <div class="i-lucide-trash-2 mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.delete') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>
