<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { useI18n } from 'vue-i18n'
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/shadcn/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/shadcn/dropdown-menu'

interface CombinedItem {
  name: string
  displayName?: string
  isFolder: boolean
  metadata?: FileItem['metadata']
  fileCount?: number
}

interface Props {
  item: CombinedItem
  as?: 'dropdown' | 'context'
}

interface Emits {
  (e: 'copyUrl', fileName: string): void
  (e: 'delete', fileName: string, isFolder: boolean): void
  (e: 'showDetail', file: FileItem): void
  (e: 'rename', fileName: string, isFolder: boolean): void
  (e: 'editTags', fileName: string): void
  (e: 'move', fileName: string, isFolder: boolean): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <template v-if="as === 'dropdown'">
    <DropdownMenuItem v-if="!item.isFolder" @click.prevent="emit('showDetail', { name: item.name, metadata: item.metadata })">
      <div class="i-lucide-info mr-2" style="width: 14px; height: 14px;" />
      {{ t('pages.files.actions.detail') }}
    </DropdownMenuItem>
    <DropdownMenuItem v-if="!item.isFolder" @click.prevent="emit('copyUrl', item.name)">
      <div class="i-lucide-copy mr-2" style="width: 14px; height: 14px;" />
      {{ t('pages.files.actions.copyUrl') }}
    </DropdownMenuItem>
    <DropdownMenuSeparator v-if="!item.isFolder" />
    <DropdownMenuItem @click.prevent="emit('rename', item.name, item.isFolder)">
      <div class="i-lucide-pencil mr-2" style="width: 14px; height: 14px;" />
      {{ t('pages.files.actions.rename') }}
    </DropdownMenuItem>
    <DropdownMenuItem v-if="!item.isFolder" @click.prevent="emit('editTags', item.name)">
      <div class="i-lucide-tags mr-2" style="width: 14px; height: 14px;" />
      {{ t('pages.files.actions.editTags') }}
    </DropdownMenuItem>
    <DropdownMenuItem @click.prevent="emit('move', item.name, item.isFolder)">
      <div class="i-lucide-folder-input mr-2" style="width: 14px; height: 14px;" />
      {{ t('pages.files.actions.move') }}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem class="text-destructive" @click.prevent="emit('delete', item.name, item.isFolder)">
      <div class="i-lucide-trash-2 mr-2" style="width: 14px; height: 14px;" />
      {{ t('pages.files.actions.delete') }}
    </DropdownMenuItem>
  </template>
  <template v-else>
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
  </template>
</template>
