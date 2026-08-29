<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/shadcn/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'
import FileIcon from './FileIcon.vue'
import FileMenuItems from './FileMenuItems.vue'

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const store = useAppStore()

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
  imageLoadMode: 'none' | 'lite' | 'full'
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

function shouldShowPreview(item: CombinedItem): boolean {
  if (props.imageLoadMode === 'none')
    return false
  if (props.imageLoadMode === 'lite') {
    const sizeInMB = (item.metadata?.FileSizeBytes || 0) / (1024 * 1024)
    return sizeInMB <= 5
  }
  return true
}

const builtInTags = ['whitelist', 'blocked', 'nsfw', 'shared']

function getPriorityTag(tags?: string[]): string | undefined {
  if (!tags || tags.length === 0)
    return undefined
  for (const tag of builtInTags) {
    if (tags.includes(tag))
      return tag
  }
  return tags[0]
}
</script>

<template>
  <div class="overflow-hidden">
    <div v-auto-animate>
      <ContextMenu v-for="item in items" :key="item.name">
        <ContextMenuTrigger as-child>
          <div
            class="px-4 py-3 border-b gap-2 hidden transition-colors items-center hover:bg-muted/30 md:grid lg:grid-cols-[28px_28px_minmax(150px,2fr)_90px_minmax(80px,1fr)_40px] md:grid-cols-[28px_28px_minmax(120px,1fr)_90px_40px] xl:grid-cols-[28px_28px_minmax(150px,2fr)_90px_minmax(80px,1fr)_140px_90px_40px]"
            @dblclick="item.isFolder ? emit('navigateFolder', item.name) : emit('showDetail', { name: item.name, metadata: item.metadata })"
          >
            <div @dblclick.stop>
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
            >
              {{ item.isFolder ? (item.displayName || item.name) : (item.metadata?.FileName || item.name) }}
            </button>

            <div class="text-xs text-muted-foreground">
              {{ item.isFolder ? '' : formatFileSize(item.metadata?.FileSizeBytes) }}
            </div>

            <div class="text-xs text-muted-foreground hidden truncate lg:block">
              <TagBadge
                v-if="!item.isFolder && getPriorityTag(item.metadata?.Tags)"
                :tag="getPriorityTag(item.metadata?.Tags)!"
                :color="store.getTagColor(getPriorityTag(item.metadata?.Tags)!)"
              />
            </div>

            <div class="text-xs text-muted-foreground hidden truncate xl:block">
              {{ item.isFolder || !item.metadata?.TimeStamp ? '' : $d(item.metadata.TimeStamp, 'short') }}
            </div>

            <div class="text-xs text-muted-foreground hidden truncate xl:block">
              {{ item.isFolder ? '' : (item.metadata?.Channel || '-') }}
            </div>

            <div class="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="sm" class="text-muted-foreground p-0 h-7 w-7 hover:text-foreground" type="button">
                    <div class="i-lucide-more-horizontal" style="width: 15px; height: 15px;" />
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
          <ContextMenuItem v-if="!item.isFolder" @click="emit('showDetail', { name: item.name, metadata: item.metadata })">
            <div class="i-lucide-info mr-2" style="width: 14px; height: 14px;" />
            {{ t('pages.files.actions.detail') }}
          </ContextMenuItem>
          <ContextMenuItem v-if="!item.isFolder" @click="emit('copyUrl', item.name)">
            <div class="i-lucide-copy mr-2" style="width: 14px; height: 14px;" />
            {{ t('pages.files.actions.copyUrl') }}
          </ContextMenuItem>
          <ContextMenuSeparator v-if="!item.isFolder" />
          <ContextMenuItem @click="emit('rename', item.name, item.isFolder)">
            <div class="i-lucide-pencil mr-2" style="width: 14px; height: 14px;" />
            {{ t('pages.files.actions.rename') }}
          </ContextMenuItem>
          <ContextMenuItem v-if="!item.isFolder" @click="emit('editTags', item.name)">
            <div class="i-lucide-tags mr-2" style="width: 14px; height: 14px;" />
            {{ t('pages.files.actions.editTags') }}
          </ContextMenuItem>
          <ContextMenuItem @click="emit('move', item.name, item.isFolder)">
            <div class="i-lucide-folder-input mr-2" style="width: 14px; height: 14px;" />
            {{ t('pages.files.actions.move') }}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem class="text-destructive" @click="emit('delete', item.name, item.isFolder)">
            <div class="i-lucide-trash-2 mr-2" style="width: 14px; height: 14px;" />
            {{ t('pages.files.actions.delete') }}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ContextMenu v-for="item in items" :key="`mobile-${item.name}`">
        <ContextMenuTrigger as-child>
          <div
            class="px-3 py-3 border-b gap-3 grid grid-cols-[28px_28px_1fr_40px] transition-colors items-center hover:bg-muted/30 md:hidden"
            @dblclick="item.isFolder ? emit('navigateFolder', item.name) : emit('showDetail', { name: item.name, metadata: item.metadata })"
          >
            <div class="flex items-center" @dblclick.stop>
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

            <div class="flex flex-col gap-0.5 min-w-0">
              <button
                class="text-sm font-medium text-left truncate hover:underline"
                @dblclick="item.isFolder ? emit('navigateFolder', item.name) : emit('showDetail', { name: item.name, metadata: item.metadata })"
              >
                {{ item.isFolder ? (item.displayName || item.name) : (item.metadata?.FileName || item.name) }}
              </button>
              <div v-if="!item.isFolder" class="text-xs text-muted-foreground">
                {{ formatFileSize(item.metadata?.FileSizeBytes) }}
              </div>
            </div>

            <div class="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="sm" class="text-muted-foreground p-0 h-7 w-7 hover:text-foreground" type="button">
                    <div class="i-lucide-more-horizontal" style="width: 15px; height: 15px;" />
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
  </div>
</template>
