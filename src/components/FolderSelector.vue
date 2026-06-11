<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFolderTree } from '@/api/files'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'

interface FolderItem {
  path: string
  name: string
  depth: number
  timeStamp?: number
}

interface Props {
  modelValue?: string
  open?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const queryClient = useQueryClient()

const folders = ref<FolderItem[]>([])
const isLoading = ref(false)
const error = ref(false)
const loaded = ref(false)

// 使用特殊值 "__root__" 代表根目录（空字符串），因为 SelectItem 不接受空字符串
const ROOT_VALUE = '__root__'

const selectedFolder = computed({
  get: () => {
    const value = props.modelValue || ''
    return value === '' ? ROOT_VALUE : value
  },
  set: (value: string) => {
    const actualValue = value === ROOT_VALUE ? '' : value
    emit('update:modelValue', actualValue)
  },
})

async function loadFolders() {
  if (loaded.value)
    return

  isLoading.value = true
  error.value = false
  try {
    const response = await getFolderTree('flat')
    folders.value = response.data.folders || []
    loaded.value = true
  }
  catch (err) {
    console.error('Failed to load folders:', err)
    error.value = true
  }
  finally {
    isLoading.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen && !loaded.value) {
    loadFolders()
  }
}, { immediate: true })

watch(() => queryClient.getQueryState(['folderTree'])?.isInvalidated, (isInvalidated) => {
  if (isInvalidated) {
    loaded.value = false
    if (props.open) {
      loadFolders()
    }
  }
})

function getFolderDisplayName(folder: FolderItem): string {
  const indent = '  '.repeat(folder.depth)
  return `${indent}${folder.name}`
}

function getFolderValue(folder: FolderItem): string {
  return folder.path === '' ? ROOT_VALUE : folder.path
}
</script>

<template>
  <Select v-model="selectedFolder">
    <SelectTrigger>
      <SelectValue :placeholder="isLoading ? t('components.folderSelector.loading') : error ? t('components.folderSelector.error') : t('components.folderSelector.selectFolder')" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="folder in folders"
        :key="folder.path || '__root__'"
        :value="getFolderValue(folder)"
      >
        {{ getFolderDisplayName(folder) }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
