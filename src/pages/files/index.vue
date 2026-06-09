<script setup lang="ts">
import type { FileItem, FileListParams } from '@/api/files'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { batchDelete, createFolder, deleteFile, getFileList } from '@/api/files'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { Input } from '@/components/shadcn/input'
import { useAppStore } from '@/stores'
import FileCardView from './components/FileCardView.vue'
import FileListView from './components/FileListView.vue'

definePage({
  meta: {
    title: 'files.title',
  },
})

const { t } = useI18n()
const queryClient = useQueryClient()

// View mode - persisted in app store
const store = useAppStore()
const viewMode = computed({
  get: () => store.fileViewMode || 'card',
  set: (value: 'card' | 'list') => {
    store.fileViewMode = value
  },
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(50)

// Directory navigation
const currentDir = ref('')

// Search and filters
const searchQuery = ref('')
const filters = ref<{
  channel?: string
  channelName?: string
  fileType?: string
  accessStatus?: string
}>({})

// Sort
const sortBy = ref<'date' | 'name'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Selection
const selectedFiles = ref<string[]>([])
const isSelectAllPage = ref(false)

// Computed query params
const queryParams = computed<FileListParams>(() => {
  const params: FileListParams = {
    folder: currentDir.value,
    start: (currentPage.value - 1) * pageSize.value,
    count: pageSize.value,
  }

  if (searchQuery.value) {
    params.search = searchQuery.value
    params.recursive = true
  }

  if (filters.value.channel)
    params.channel = filters.value.channel
  if (filters.value.channelName)
    params.channelName = filters.value.channelName
  if (filters.value.fileType)
    params.fileType = filters.value.fileType
  if (filters.value.accessStatus)
    params.accessStatus = filters.value.accessStatus

  return params
})

// Fetch file list
const { data: fileListData, isLoading, isFetching, refetch } = useQuery({
  queryKey: ['fileList', queryParams],
  queryFn: async () => {
    const response = await getFileList(queryParams.value)
    return response.data
  },
})

// Computed data
const directories = computed(() => fileListData.value?.directories || [])
const files = computed(() => fileListData.value?.files || [])
const totalCount = computed(() => fileListData.value?.totalCount || 0)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// Combined and sorted items
const allItems = computed<CombinedItem[]>(() => {
  const items: CombinedItem[] = [
    ...directories.value.map(dir => ({ ...dir, isFolder: true as const })),
    ...files.value.map(file => ({ ...file, isFolder: false as const })),
  ]

  // Sort
  if (sortBy.value === 'name') {
    items.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()
      return sortOrder.value === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    })
  }
  else {
    items.sort((a, b) => {
      const timeA = a.metadata?.UploadTime ? new Date(a.metadata.UploadTime).getTime() : 0
      const timeB = b.metadata?.UploadTime ? new Date(b.metadata.UploadTime).getTime() : 0
      return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA
    })
  }

  return items
})

// Check if any search or filter is active
const hasSearchOrFilter = computed(() => {
  return !!(
    searchQuery.value
    || filters.value.channel
    || filters.value.channelName
    || filters.value.fileType
    || filters.value.accessStatus
  )
})

// Selection helpers
const selectedCount = computed(() => selectedFiles.value.length)

function toggleSelectAll() {
  if (isSelectAllPage.value) {
    selectedFiles.value = []
    isSelectAllPage.value = false
  }
  else {
    selectedFiles.value = allItems.value
      .filter(item => !item.isFolder)
      .map(item => item.name)
    isSelectAllPage.value = true
  }
}

function toggleFileSelection(fileName: string) {
  const index = selectedFiles.value.indexOf(fileName)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  }
  else {
    selectedFiles.value.push(fileName)
  }
  updateSelectAllState()
}

function updateSelectAllState() {
  const selectableFiles = allItems.value.filter(item => !item.isFolder)
  const selectedOnPage = selectableFiles.filter(item => selectedFiles.value.includes(item.name))
  isSelectAllPage.value = selectableFiles.length > 0 && selectedOnPage.length === selectableFiles.length
}

watch(allItems, () => {
  updateSelectAllState()
})

// Directory navigation
function navigateToFolder(folderName: string) {
  currentDir.value = currentDir.value ? `${currentDir.value}/${folderName}` : folderName
  currentPage.value = 1
  selectedFiles.value = []
}

function navigateToPath(path: string) {
  currentDir.value = path
  currentPage.value = 1
  selectedFiles.value = []
}

const breadcrumbs = computed(() => {
  if (!currentDir.value)
    return []
  return currentDir.value.split('/').filter(Boolean)
})

// File operations
function handleRefresh() {
  refetch()
  toast.success(t('files.refreshed'))
}

async function handleDelete(fileName: string, isFolder: boolean) {
  try {
    await deleteFile(fileName, isFolder)
    toast.success(t('files.deleteSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.deleteFailed'))
  }
}

async function handleBatchDelete() {
  if (selectedCount.value === 0)
    return

  const fileIds = selectedFiles.value

  try {
    await batchDelete(fileIds)
    toast.success(t('files.batchDeleteSuccess'))
    selectedFiles.value = []
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.batchDeleteFailed'))
  }
}

function handleSearch() {
  currentPage.value = 1
  selectedFiles.value = []
}

function clearSearch() {
  searchQuery.value = ''
  currentPage.value = 1
}

function clearFilters() {
  filters.value = {}
  currentPage.value = 1
}

function toggleSort(field: 'date' | 'name') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = field
    sortOrder.value = field === 'date' ? 'desc' : 'asc'
  }
}

function buildFileUrl(fileName: string): string {
  const cleanSrc = fileName.startsWith('/file/') ? fileName.replace('/file/', '') : fileName
  // 对文件名进行 URL 编码，但保留路径分隔符 /
  const encodedSrc = cleanSrc.split('/').map(part => encodeURIComponent(part)).join('/')
  return `${window.location.protocol}//${window.location.host}/api/file/${encodedSrc}`
}

async function copyUrl(fileName: string) {
  const url = buildFileUrl(fileName)
  await navigator.clipboard.writeText(url)
  toast.success(t('files.copySuccess'))
}

function formatFileSize(bytes?: number): string {
  if (!bytes || typeof bytes !== 'number')
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

function formatDate(dateString?: string): string {
  if (!dateString)
    return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}

async function handleCreateFolder() {
  showCreateFolderDialog.value = true
}

// Create folder dialog
const showCreateFolderDialog = ref(false)
const newFolderName = ref('')

async function confirmCreateFolder() {
  if (!newFolderName.value || !newFolderName.value.trim()) {
    showCreateFolderDialog.value = false
    newFolderName.value = ''
    return
  }

  try {
    // 构建完整的文件夹路径
    const folderName = newFolderName.value.trim()
    const targetPath = currentDir.value ? `${currentDir.value}/${folderName}` : folderName

    await createFolder(targetPath, false)

    toast.success(t('files.createFolderSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    showCreateFolderDialog.value = false
    newFolderName.value = ''
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.createFolderFailed'))
  }
}

// Type definition for combined items
interface CombinedItem {
  name: string
  isFolder: boolean
  metadata?: FileItem['metadata']
  fileCount?: number
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="pb-4 border-b flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ t('files.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ t('files.description') }}
        </p>
      </div>

      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="handleCreateFolder">
          <div class="i-lucide-folder-plus mr-2" style="width: 14px; height: 14px;" />
          {{ t('files.newFolder') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="isFetching" @click="handleRefresh">
          <div class="i-lucide-refresh-cw mr-2" :class="{ 'animate-spin': isFetching }" style="width: 14px; height: 14px;" />
          {{ t('files.refresh') }}
        </Button>
        <Button variant="outline" size="sm" @click="viewMode = viewMode === 'card' ? 'list' : 'card'">
          <div v-if="viewMode === 'card'" class="i-lucide-list mr-2" style="width: 14px; height: 14px;" />
          <div v-else class="i-lucide-grid-2x2 mr-2" style="width: 14px; height: 14px;" />
          {{ viewMode === 'card' ? t('files.listView') : t('files.cardView') }}
        </Button>
      </div>
    </div>

    <!-- Breadcrumb Navigation -->
    <div class="text-sm py-3 flex gap-2 items-center">
      <button class="hover:underline" @click="navigateToPath('')">
        <div class="i-lucide-home" style="width: 16px; height: 16px;" />
      </button>
      <template v-for="(crumb, index) in breadcrumbs" :key="index">
        <div class="i-lucide-chevron-right text-muted-foreground" style="width: 14px; height: 14px;" />
        <button
          class="hover:underline"
          @click="navigateToPath(breadcrumbs.slice(0, index + 1).join('/'))"
        >
          {{ crumb }}
        </button>
      </template>
      <div v-if="totalCount > 0" class="text-xs text-muted-foreground ml-auto">
        {{ t('files.totalFiles', { count: totalCount }) }}
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="py-4 flex flex-col gap-3 sm:flex-row">
      <div class="flex-1 relative">
        <Input
          v-model="searchQuery"
          :placeholder="t('files.searchPlaceholder')"
          class="pr-8"
          @keyup.enter="handleSearch"
        />
        <button
          v-if="searchQuery"
          class="right-2 top-1/2 absolute -translate-y-1/2"
          @click="clearSearch"
        >
          <div class="i-lucide-x text-muted-foreground" style="width: 16px; height: 16px;" />
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="default">
            <div class="i-lucide-filter mr-2" style="width: 14px; height: 14px;" />
            {{ t('files.filter') }}
            <div v-if="hasSearchOrFilter" class="ml-2 rounded-full bg-primary h-2 w-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <div class="p-2">
            <div class="text-xs text-muted-foreground font-medium mb-2">
              {{ t('files.filterOptions') }}
            </div>
            <Button v-if="hasSearchOrFilter" variant="ghost" size="sm" class="w-full" @click="clearFilters">
              {{ t('files.clearFilters') }}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="default">
            <div class="i-lucide-arrow-up-down mr-2" style="width: 14px; height: 14px;" />
            {{ t('files.sort') }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="toggleSort('date')">
            <div class="i-lucide-calendar mr-2" style="width: 14px; height: 14px;" />
            {{ t('files.sortByDate') }}
            <div v-if="sortBy === 'date'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
          </DropdownMenuItem>
          <DropdownMenuItem @click="toggleSort('name')">
            <div class="i-lucide-text mr-2" style="width: 14px; height: 14px;" />
            {{ t('files.sortByName') }}
            <div v-if="sortBy === 'name'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Toolbar - Always visible to prevent layout shift -->
    <div class="py-3 border-b flex gap-3 items-center h-[60px]">
      <!-- Selection info and actions - only show when files are selected -->
      <template v-if="selectedCount > 0">
        <span class="text-sm font-medium">{{ t('files.selectedCount', { count: selectedCount }) }}</span>
        <Button variant="ghost" size="sm" @click="selectedFiles = []">
          {{ t('files.clearSelection') }}
        </Button>
        <div class="ml-auto flex gap-2">
          <Button variant="destructive" size="sm" @click="handleBatchDelete">
            <div class="i-lucide-trash-2 mr-2" style="width: 14px; height: 14px;" />
            {{ t('files.delete') }}
          </Button>
        </div>
      </template>
      <!-- Placeholder when nothing selected - can add other tools here -->
      <div v-else class="text-sm text-muted-foreground">
        {{ t('files.selectFilesToPerformActions') }}
      </div>
    </div>

    <!-- File List -->
    <div class="flex-1 overflow-auto relative">
      <!-- Loading State -->
      <div v-if="isLoading" class="py-12 flex items-center justify-center">
        <div class="i-lucide-loader-circle text-muted-foreground animate-spin" style="width: 32px; height: 32px;" />
      </div>

      <!-- Empty State -->
      <div v-else-if="allItems.length === 0" class="py-12 text-center flex flex-col items-center justify-center">
        <div class="i-lucide-folder-open text-muted-foreground mb-4" style="width: 48px; height: 48px;" />
        <p class="text-lg font-medium">
          {{ hasSearchOrFilter ? t('files.noMatchingFiles') : t('files.noFiles') }}
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          {{ hasSearchOrFilter ? t('files.adjustSearchHint') : t('files.uploadHint') }}
        </p>
      </div>

      <!-- Card View -->
      <FileCardView
        v-else-if="viewMode === 'card'"
        :items="allItems"
        :selected-files="selectedFiles"
        :build-file-url="buildFileUrl"
        :format-file-size="formatFileSize"
        @navigate-folder="navigateToFolder"
        @toggle-selection="toggleFileSelection"
        @copy-url="copyUrl"
        @delete="handleDelete"
      />

      <!-- List View -->
      <FileListView
        v-else
        :items="allItems"
        :selected-files="selectedFiles"
        :is-select-all-page="isSelectAllPage"
        :build-file-url="buildFileUrl"
        :format-file-size="formatFileSize"
        :format-date="formatDate"
        @navigate-folder="navigateToFolder"
        @toggle-selection="toggleFileSelection"
        @toggle-select-all="toggleSelectAll"
        @copy-url="copyUrl"
        @delete="handleDelete"
      />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pt-4 border-t flex gap-2 items-center justify-center">
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        <div class="i-lucide-chevron-left" style="width: 16px; height: 16px;" />
      </Button>
      <span class="text-sm">
        {{ t('files.pageInfo', { current: currentPage, total: totalPages }) }}
      </span>
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage >= totalPages"
        @click="currentPage++"
      >
        <div class="i-lucide-chevron-right" style="width: 16px; height: 16px;" />
      </Button>
    </div>

    <!-- Create Folder Dialog -->
    <Dialog v-model:open="showCreateFolderDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('files.newFolder') }}</DialogTitle>
          <DialogDescription>
            {{ t('files.newFolderDescription') }}
          </DialogDescription>
        </DialogHeader>
        <div class="py-4 space-y-4">
          <div class="space-y-2">
            <label for="folder-name" class="text-sm font-medium">{{ t('files.folderName') }}</label>
            <Input
              id="folder-name"
              v-model="newFolderName"
              :placeholder="t('files.folderNamePlaceholder')"
              @keyup.enter="confirmCreateFolder"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreateFolderDialog = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="confirmCreateFolder">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
