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

// Sort
const sortBy = ref<'date' | 'name'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Search and filters
const searchQuery = ref('')
const filters = ref<{
  channel?: string
  channelName?: string
  fileType?: string
  accessStatus?: string
}>({})

// Selection
const selectedFiles = ref<string[]>([])
const isSelectAllPage = ref(false)

// Image load mode
const imageLoadMode = ref<'none' | 'lite' | 'full'>('full')

// Build query params
const queryParams = computed(() => ({
  folder: currentDir.value,
  start: (currentPage.value - 1) * pageSize.value,
  count: pageSize.value,
  search: searchQuery.value || undefined,
  channel: filters.value.channel || undefined,
  channelName: filters.value.channelName || undefined,
  fileType: filters.value.fileType || undefined,
  accessStatus: filters.value.accessStatus || undefined,
}))

// Fetch file list
const { data: fileListData, isLoading, isFetching, refetch } = useQuery({
  queryKey: ['fileList', queryParams],
  queryFn: async () => {
    const response = await getFileList(queryParams.value)
    return response.data
  },
})

// Computed data
const directories = computed(() => {
  console.log(fileListData.value)
  const folders = fileListData.value?.folders || []
  // 后端返回的是完整路径字符串数组，如 "test/" 或 "parent/child/"
  // 需要提取最后一个文件夹名称作为显示名称
  return folders.map((folderPath) => {
    // 移除尾部斜杠
    const cleanPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath
    // 提取最后一段作为文件夹名称
    const parts = cleanPath.split('/')
    const displayName = parts[parts.length - 1]

    return {
      name: cleanPath, // 保存完整路径（不含尾部斜杠）用于导航
      displayName, // 显示名称（仅最后一段）
      fileCount: 0,
    }
  })
})
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
    const newSelection = allItems.value
      .filter(item => !item.isFolder)
      .map(item => item.name)
    selectedFiles.value = [...newSelection]
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
  // folderName 现在是完整路径（不含尾部斜杠），直接使用
  currentDir.value = folderName
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
  if (!bytes || bytes === 0)
    return '0 B'
  if (typeof bytes !== 'number')
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
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

// Create folder dialog
const showCreateFolderDialog = ref(false)
const newFolderName = ref('')

async function handleCreateFolder() {
  showCreateFolderDialog.value = true
}

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
  displayName?: string
  isFolder: boolean
  metadata?: FileItem['metadata']
  fileCount?: number
}
</script>

<template>
  <div class="mx-auto p-6 flex flex-col h-full max-w-7xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">
        {{ t('files.title') }}
      </h1>
      <p class="text-muted-foreground">
        {{ t('files.description') }}
      </p>
    </div>

    <!-- Navigation & Search Section -->
    <div class="mb-4 border rounded-lg bg-card/50 overflow-hidden backdrop-blur-sm">
      <!-- Breadcrumb Navigation -->
      <div class="px-4 py-3 border-b bg-muted/10 flex gap-2 items-center">
        <button
          class="px-2 py-1 rounded-md flex gap-1.5 transition-colors items-center hover:bg-accent/50"
          @click="navigateToPath('')"
        >
          <div class="i-lucide-home text-muted-foreground" style="width: 15px; height: 15px;" />
        </button>
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <div class="i-lucide-chevron-right text-muted-foreground/40" style="width: 13px; height: 13px;" />
          <button
            class="text-sm font-medium px-2 py-1 rounded-md transition-colors hover:bg-accent/50"
            @click="navigateToPath(breadcrumbs.slice(0, index + 1).join('/'))"
          >
            {{ crumb }}
          </button>
        </template>
        <div v-if="totalCount > 0" class="text-xs text-muted-foreground/70 ml-auto">
          共 <span class="text-foreground font-semibold">{{ totalCount }}</span> 项
        </div>
      </div>

      <!-- Search and Controls -->
      <div class="p-4 flex gap-2 items-center">
        <div class="flex-1 relative">
          <div class="i-lucide-search text-muted-foreground/60 left-3 top-1/2 absolute -translate-y-1/2" style="width: 15px; height: 15px;" />
          <Input
            v-model="searchQuery"
            :placeholder="t('files.searchPlaceholder')"
            class="pl-9 pr-9 border-muted-foreground/20 bg-background/50 focus-visible:border-muted-foreground/40"
            @keyup.enter="handleSearch"
          />
          <button
            v-if="searchQuery"
            class="text-muted-foreground/60 transition-colors right-3 top-1/2 absolute hover:text-foreground -translate-y-1/2"
            @click="clearSearch"
          >
            <div class="i-lucide-x" style="width: 15px; height: 15px;" />
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="default" class="relative hover:bg-accent/50">
              <div class="i-lucide-filter" style="width: 15px; height: 15px;" />
              <span class="ml-2 hidden sm:inline">{{ t('files.filter') }}</span>
              <div v-if="hasSearchOrFilter" class="ml-2 rounded-full bg-primary h-1.5 w-1.5" />
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
            <Button variant="ghost" size="default" class="hover:bg-accent/50">
              <div class="i-lucide-arrow-up-down" style="width: 15px; height: 15px;" />
              <span class="ml-2 hidden sm:inline">{{ t('files.sort') }}</span>
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
    </div>

    <!-- Toolbar -->
    <div class="mb-4 border rounded-lg bg-card/50 overflow-hidden backdrop-blur-sm">
      <div class="px-4 py-3 flex gap-3 min-h-[52px] items-center">
        <!-- Left side - Selection info -->
        <template v-if="selectedCount > 0">
          <div class="flex gap-2 items-center">
            <span class="text-sm">
              已选择 <span class="text-destructive font-semibold">{{ selectedCount }}</span> 项
            </span>
            <Button variant="ghost" size="sm" class="p-0 h-7 w-7 hover:bg-accent/50" @click="selectedFiles = []">
              <div class="i-lucide-x" style="width: 15px; height: 15px;" />
            </Button>
            <Button variant="ghost" size="sm" class="text-destructive px-3 h-7 hover:text-destructive hover:bg-destructive/10" @click="handleBatchDelete">
              <div class="i-lucide-trash-2 mr-1.5" style="width: 14px; height: 14px;" />
              删除
            </Button>
          </div>
        </template>

        <!-- Right side - Action buttons -->
        <div class="ml-auto flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="gap-1.5 h-8 hover:bg-accent/50">
                <div class="i-lucide-image" style="width: 15px; height: 15px;" />
                <span class="hidden sm:inline">
                  {{ imageLoadMode === 'none' ? '无图' : imageLoadMode === 'lite' ? '省流' : '全量' }}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="imageLoadMode = 'none'">
                <div class="i-lucide-image-off mr-2" style="width: 14px; height: 14px;" />
                无图模式
                <div v-if="imageLoadMode === 'none'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </DropdownMenuItem>
              <DropdownMenuItem @click="imageLoadMode = 'lite'">
                <div class="i-lucide-gauge mr-2" style="width: 14px; height: 14px;" />
                省流模式
                <div v-if="imageLoadMode === 'lite'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </DropdownMenuItem>
              <DropdownMenuItem @click="imageLoadMode = 'full'">
                <div class="i-lucide-images mr-2" style="width: 14px; height: 14px;" />
                全量加载
                <div v-if="imageLoadMode === 'full'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" class="gap-1.5 h-8 hover:bg-accent/50" @click="toggleSelectAll">
            <div class="i-lucide-check-square" style="width: 15px; height: 15px;" />
            <span class="hidden sm:inline">{{ isSelectAllPage ? '取消全选' : '全选' }}</span>
          </Button>
          <Button variant="ghost" size="sm" class="gap-1.5 h-8 hover:bg-accent/50" @click="handleCreateFolder">
            <div class="i-lucide-folder-plus" style="width: 15px; height: 15px;" />
            <span class="hidden sm:inline">{{ t('files.newFolder') }}</span>
          </Button>
          <Button variant="ghost" size="sm" class="gap-1.5 h-8 hover:bg-accent/50" :disabled="isFetching" @click="handleRefresh">
            <div class="i-lucide-refresh-cw" :class="{ 'animate-spin': isFetching }" style="width: 15px; height: 15px;" />
            <span class="hidden sm:inline">{{ t('files.refresh') }}</span>
          </Button>
          <Button variant="ghost" size="sm" class="gap-1.5 h-8 hover:bg-accent/50" @click="viewMode = viewMode === 'card' ? 'list' : 'card'">
            <div v-if="viewMode === 'card'" class="i-lucide-list" style="width: 15px; height: 15px;" />
            <div v-else class="i-lucide-grid-2x2" style="width: 15px; height: 15px;" />
            <span class="hidden sm:inline">{{ viewMode === 'card' ? t('files.listView') : t('files.cardView') }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- File List -->
    <div class="border rounded-lg bg-card/50 flex-1 relative overflow-auto backdrop-blur-sm">
      <!-- Loading State -->
      <div v-if="isLoading" class="py-12 flex items-center justify-center">
        <div class="i-lucide-loader-circle text-muted-foreground animate-spin" style="width: 32px; height: 32px;" />
      </div>

      <!-- Empty State -->
      <div v-else-if="allItems.length === 0" class="py-12 text-center flex flex-col items-center justify-center">
        <div class="i-lucide-folder-open text-muted-foreground/40 mb-4" style="width: 48px; height: 48px;" />
        <p class="text-lg font-semibold">
          {{ hasSearchOrFilter ? t('files.noMatchingFiles') : t('files.noFiles') }}
        </p>
        <p class="text-sm text-muted-foreground/70 mt-2">
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
        :build-file-url="buildFileUrl"
        :format-file-size="formatFileSize"
        :format-date="formatDate"
        :image-load-mode="imageLoadMode"
        @navigate-folder="navigateToFolder"
        @toggle-selection="toggleFileSelection"
        @copy-url="copyUrl"
        @delete="handleDelete"
      />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4 border rounded-lg bg-card/50 backdrop-blur-sm">
      <div class="px-4 py-3 flex gap-2 items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          class="p-0 h-8 w-8 hover:bg-accent/50"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <div class="i-lucide-chevron-left" style="width: 15px; height: 15px;" />
        </Button>
        <span class="text-sm font-medium">
          第 <span class="text-foreground">{{ currentPage }}</span> / {{ totalPages }} 页
        </span>
        <Button
          variant="ghost"
          size="sm"
          class="p-0 h-8 w-8 hover:bg-accent/50"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          <div class="i-lucide-chevron-right" style="width: 15px; height: 15px;" />
        </Button>
      </div>
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
