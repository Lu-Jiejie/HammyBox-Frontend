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

interface CombinedItem {
  name: string
  isFolder: boolean
  metadata?: FileItem['metadata']
  fileCount?: number
}

interface Props {
  items: CombinedItem[]
  selectedFiles: string[]
  isSelectAllPage: boolean
  buildFileUrl: (fileName: string) => string
  formatFileSize: (bytes?: number) => string
  formatDate: (dateString?: string) => string
}

interface Emits {
  (e: 'navigate-folder', folderName: string): void
  (e: 'toggle-selection', fileName: string): void
  (e: 'toggle-select-all'): void
  (e: 'copy-url', fileName: string): void
  (e: 'delete', fileName: string, isFolder: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

function isImage(file: CombinedItem): boolean {
  return file.metadata?.MimeType?.startsWith('image/') || false
}

function getPreviewUrl(file: CombinedItem): string {
  if (isImage(file)) {
    return props.buildFileUrl(file.name)
  }
  return ''
}
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <!-- Desktop Table Header - hidden on mobile -->
    <div class="text-sm font-medium px-4 py-2 bg-muted/50 gap-3 hidden md:grid md:grid-cols-[40px_60px_minmax(150px,1fr)_90px_80px] lg:grid-cols-[40px_60px_minmax(200px,1fr)_90px_100px_120px_90px_60px] items-center">
      <div class="flex items-center justify-center">
        <Checkbox
          :checked="isSelectAllPage"
          @click="emit('toggle-select-all')"
        />
      </div>
      <div class="text-xs">{{ t('files.preview') }}</div>
      <div>{{ t('files.fileName') }}</div>
      <div class="text-xs">{{ t('files.size') }}</div>
      <div class="text-xs hidden lg:block">{{ t('files.tags') }}</div>
      <div class="text-xs hidden lg:block">{{ t('files.uploadTime') }}</div>
      <div class="text-xs hidden lg:block">{{ t('files.channel') }}</div>
      <div class="text-xs text-right">
        {{ t('files.actions') }}
      </div>
    </div>

    <!-- Table Body -->
    <div v-auto-animate>
      <!-- Desktop Layout - hidden on mobile -->
      <div
        v-for="item in items"
        :key="item.name"
        class="px-4 py-3 border-t gap-3 hidden md:grid md:grid-cols-[40px_60px_minmax(150px,1fr)_90px_80px] lg:grid-cols-[40px_60px_minmax(200px,1fr)_90px_100px_120px_90px_60px] items-center hover:bg-muted/30"
      >
        <!-- Checkbox Column -->
        <div class="flex items-center justify-center">
          <Checkbox
            v-if="!item.isFolder"
            :checked="selectedFiles.includes(item.name)"
            @click="emit('toggle-selection', item.name)"
          />
        </div>

        <!-- Preview/Thumbnail Column -->
        <div class="flex items-center justify-center">
          <div class="rounded bg-muted flex h-12 w-12 items-center justify-center overflow-hidden shrink-0">
            <img
              v-if="!item.isFolder && isImage(item)"
              :src="getPreviewUrl(item)"
              :alt="item.name"
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <div
              v-else-if="item.isFolder"
              class="i-lucide-folder text-muted-foreground"
              style="width: 20px; height: 20px;"
            />
            <div
              v-else
              class="i-lucide-file text-muted-foreground"
              style="width: 20px; height: 20px;"
            />
          </div>
        </div>

        <!-- File Name Column -->
        <button
          class="text-left text-sm min-w-0 truncate hover:underline"
          @click="item.isFolder ? emit('navigate-folder', item.name) : undefined"
        >
          {{ item.isFolder ? item.name : item.metadata?.FileName || item.name }}
        </button>

        <!-- Size Column -->
        <div class="text-xs text-muted-foreground">
          {{ item.isFolder ? '-' : formatFileSize(item.metadata?.FileSize) }}
        </div>

        <!-- Tags Column - hidden on md, shown on lg+ -->
        <div class="text-xs text-muted-foreground truncate hidden lg:block">
          {{ item.isFolder ? '-' : (item.metadata?.Tags?.join(', ') || '-') }}
        </div>

        <!-- Upload Time Column - hidden on md, shown on lg+ -->
        <div class="text-xs text-muted-foreground truncate hidden lg:block">
          {{ item.isFolder ? '-' : formatDate(item.metadata?.UploadTime) }}
        </div>

        <!-- Channel Column - hidden on md, shown on lg+ -->
        <div class="text-xs text-muted-foreground truncate hidden lg:block">
          {{ item.isFolder ? '-' : (item.metadata?.ChannelName || item.metadata?.Channel || '-') }}
        </div>

        <!-- Actions Column -->
        <div class="flex justify-end">
          <DropdownMenu v-if="!item.isFolder">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="p-0 h-7 w-7" type="button">
                <div class="i-lucide-more-horizontal" style="width: 16px; height: 16px;" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click.prevent="emit('copy-url', item.name)">
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

      <!-- Mobile Layout - shown only on mobile -->
      <div
        v-for="item in items"
        :key="`mobile-${item.name}`"
        class="px-3 py-3 border-t flex gap-3 md:hidden hover:bg-muted/30"
      >
        <!-- Left: Checkbox + Thumbnail -->
        <div class="flex flex-col gap-2 items-center shrink-0">
          <Checkbox
            v-if="!item.isFolder"
            :checked="selectedFiles.includes(item.name)"
            @click="emit('toggle-selection', item.name)"
          />
          <div v-else class="h-5" />

          <div class="rounded bg-muted flex h-16 w-16 items-center justify-center overflow-hidden">
            <img
              v-if="!item.isFolder && isImage(item)"
              :src="getPreviewUrl(item)"
              :alt="item.name"
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <div
              v-else-if="item.isFolder"
              class="i-lucide-folder text-muted-foreground"
              style="width: 24px; height: 24px;"
            />
            <div
              v-else
              class="i-lucide-file text-muted-foreground"
              style="width: 24px; height: 24px;"
            />
          </div>
        </div>

        <!-- Right: File Info + Actions -->
        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <button
            class="text-left text-sm font-medium truncate hover:underline"
            @click="item.isFolder ? emit('navigate-folder', item.name) : undefined"
          >
            {{ item.isFolder ? item.name : item.metadata?.FileName || item.name }}
          </button>

          <div v-if="!item.isFolder" class="text-xs text-muted-foreground space-y-0.5">
            <div>{{ formatFileSize(item.metadata?.FileSize) }}</div>
            <div v-if="item.metadata?.Tags && item.metadata.Tags.length > 0" class="truncate">
              {{ item.metadata.Tags.join(', ') }}
            </div>
          </div>

          <!-- Actions for mobile -->
          <div class="mt-1">
            <DropdownMenu v-if="!item.isFolder">
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="sm" class="h-8 px-2" type="button">
                  <div class="i-lucide-more-horizontal mr-1" style="width: 14px; height: 14px;" />
                  {{ t('files.actions') }}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem @click.prevent="emit('copy-url', item.name)">
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
  </div>
</template>
