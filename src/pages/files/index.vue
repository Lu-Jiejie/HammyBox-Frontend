<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useClipboard } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getFileList } from '@/api/files'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FolderTreeSelector from '@/components/FolderTreeSelector.vue'
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
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/shadcn/menubar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'
import FileCardView from './components/FileCardView.vue'
import FileIcon from './components/FileIcon.vue'
import FileListView from './components/FileListView.vue'
import { useFileDialogs } from './composables/useFileDialogs'
import { useFileOperations } from './composables/useFileOperations'
import { useFileSelection } from './composables/useFileSelection'

definePage({
  meta: {
    title: 'files.title',
  },
})

const { t } = useI18n()
const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()
const store = useAppStore()
const { copy } = useClipboard()

const builtInTags = ['whitelist', 'blocked', 'nsfw', 'shared']

const fileOperations = useFileOperations(queryClient, t, toast)
const dialogs = useFileDialogs()

// View mode - persisted in app store
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
const currentDir = ref((route.query.dir as string) || '')

// Sort
const sortBy = ref<'date' | 'name'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const foldersFirst = ref(true)

// Search and filters
const filterQuery = ref('')
const globalSearchQuery = ref('')
const showGlobalSearchDialog = ref(false)
const filters = ref<{
  channel?: string
  channelName?: string
  fileType?: string
  accessStatus?: string
}>({})

// Detail panel
const showDetailPanel = ref(false)
const detailFile = ref<FileItem | null>(null)

// Delete confirmation
const showDeleteDialog = ref(false)
const deleteTarget = ref<{ name: string, isFolder: boolean } | null>(null)

function showFileDetail(file: FileItem) {
  detailFile.value = file
  showDetailPanel.value = true
}

const sortedTags = computed(() => {
  if (!detailFile.value?.metadata?.Tags)
    return []
  const tags = detailFile.value.metadata.Tags
  const builtin = tags.filter(tag => builtInTags.includes(tag))
  const custom = tags.filter(tag => !builtInTags.includes(tag))
  return [...builtin, ...custom]
})

// Image load mode
const imageLoadMode = ref<'none' | 'lite' | 'full'>('full')

// Build query params
const queryParams = computed(() => ({
  folder: currentDir.value,
  start: (currentPage.value - 1) * pageSize.value,
  count: pageSize.value,
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
  staleTime: 30000,
})

// Computed data
const directories = computed(() => {
  console.log(fileListData.value)
  const folders = fileListData.value?.folders || []
  return folders.map((folderPath) => {
    const cleanPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath
    const parts = cleanPath.split('/')
    const displayName = parts[parts.length - 1]
    return {
      name: cleanPath,
      displayName,
      fileCount: 0,
    }
  })
})
const files = computed(() => fileListData.value?.files || [])
const totalCount = computed(() => fileListData.value?.totalCount || 0)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// Combined and sorted items with filter
const allItems = computed<CombinedItem[]>(() => {
  let items: CombinedItem[] = [
    ...directories.value.map(dir => ({ ...dir, isFolder: true as const })),
    ...files.value.map(file => ({ ...file, isFolder: false as const })),
  ]

  // Frontend filter
  if (filterQuery.value) {
    const query = filterQuery.value.toLowerCase()
    items = items.filter((item) => {
      const fileName = item.isFolder
        ? (item.displayName || item.name).toLowerCase()
        : (item.metadata?.FileName || item.name).toLowerCase()
      return fileName.includes(query)
    })
  }

  // Collator for proper sorting (numbers, letters, Chinese)
  const collator = new Intl.Collator(['zh-CN', 'en'], { numeric: true, sensitivity: 'base' })

  // Sort
  if (foldersFirst.value) {
    // Separate folders and files
    const folders = items.filter(item => item.isFolder)
    const files = items.filter(item => !item.isFolder)

    // Sort each group
    const sortFn = sortBy.value === 'name'
      ? (a: CombinedItem, b: CombinedItem) => {
          const nameA = a.isFolder ? (a.displayName || a.name) : (a.metadata?.FileName || a.name)
          const nameB = b.isFolder ? (b.displayName || b.name) : (b.metadata?.FileName || b.name)
          return sortOrder.value === 'asc' ? collator.compare(nameA, nameB) : collator.compare(nameB, nameA)
        }
      : (a: CombinedItem, b: CombinedItem) => {
          const timeA = a.metadata?.TimeStamp || 0
          const timeB = b.metadata?.TimeStamp || 0
          return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA
        }

    folders.sort(sortFn)
    files.sort(sortFn)

    items = [...folders, ...files]
  }
  else {
    // Sort all items together
    if (sortBy.value === 'name') {
      items.sort((a, b) => {
        const nameA = a.isFolder ? (a.displayName || a.name) : (a.metadata?.FileName || a.name)
        const nameB = b.isFolder ? (b.displayName || b.name) : (b.metadata?.FileName || b.name)
        return sortOrder.value === 'asc' ? collator.compare(nameA, nameB) : collator.compare(nameB, nameA)
      })
    }
    else {
      items.sort((a, b) => {
        const timeA = a.metadata?.TimeStamp || 0
        const timeB = b.metadata?.TimeStamp || 0
        return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA
      })
    }
  }

  return items
})

// Check if any search or filter is active
const hasSearchOrFilter = computed(() => {
  return !!(
    filterQuery.value
    || filters.value.channel
    || filters.value.channelName
    || filters.value.fileType
    || filters.value.accessStatus
  )
})

// Selection
const { selectedFiles, isSelectAllPage, selectedCount, toggleSelectAll, toggleFileSelection } = useFileSelection(allItems)

// Directory navigation
function navigateToFolder(folderName: string) {
  // folderName 现在是完整路径（不含尾部斜杠），直接使用
  currentDir.value = folderName
  currentPage.value = 1
  selectedFiles.value = []
  router.push({ query: { ...route.query, dir: folderName || undefined } })
}

function navigateToPath(path: string) {
  currentDir.value = path
  currentPage.value = 1
  selectedFiles.value = []
  router.push({ query: { ...route.query, dir: path || undefined } })
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
  deleteTarget.value = { name: fileName, isFolder }
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value)
    return

  try {
    await fileOperations.handleDelete(deleteTarget.value.name, deleteTarget.value.isFolder)
    showDeleteDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.deleteFailed'))
  }
}

async function handleBatchDelete() {
  if (selectedCount.value === 0)
    return

  deleteTarget.value = { name: `${selectedCount.value} 个文件`, isFolder: false }
  showDeleteDialog.value = true
}

async function confirmBatchDelete() {
  if (selectedCount.value === 0)
    return

  try {
    await fileOperations.handleBatchDelete(selectedFiles.value)
    selectedFiles.value = []
    showDeleteDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.batchDeleteFailed'))
  }
}

function clearFilter() {
  filterQuery.value = ''
}

async function handleGlobalSearch() {
  if (!globalSearchQuery.value.trim()) {
    return
  }

  try {
    const response = await getFileList({
      search: globalSearchQuery.value,
      start: 0,
      count: 100,
    })
    // TODO: 显示全局搜索结果（可以用另一个对话框或跳转到搜索结果页）
    console.log('Global search results:', response.data)
    toast.success(t('files.globalSearch.resultsCount', { count: response.data.files?.length || 0 }))
    showGlobalSearchDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.globalSearch.failed'))
  }
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
  await copy(url)
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

function formatDate(timestamp?: number): string {
  if (!timestamp)
    return '-'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

async function handleCreateFolder() {
  dialogs.showCreateFolderDialog.value = true
}

async function confirmCreateFolder() {
  if (!dialogs.newFolderName || !dialogs.newFolderName.value.trim()) {
    dialogs.showCreateFolderDialog.value = false
    dialogs.newFolderName.value = ''
    return
  }

  try {
    const folderName = dialogs.newFolderName.value.trim()
    const baseDir = currentDir.value.endsWith('/') ? currentDir.value.slice(0, -1) : currentDir.value
    const targetPath = baseDir ? `${baseDir}/${folderName}` : folderName
    await fileOperations.handleCreateFolder(targetPath)
    dialogs.showCreateFolderDialog.value = false
    dialogs.newFolderName.value = ''
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('files.createFolderFailed'))
  }
}

function handleRename(fileName: string, isFolder: boolean) {
  dialogs.renameTarget.value = { name: fileName, isFolder }
  dialogs.newName.value = isFolder ? fileName.split('/').pop() || '' : files.value.find(f => f.name === fileName)?.metadata?.FileName || ''
  dialogs.showRenameDialog.value = true
}

async function confirmRename() {
  if (!dialogs.newName.value.trim())
    return

  try {
    const target = dialogs.renameTarget.value
    const folder = target.name.split('/').slice(0, -1).join('/')
    const newFileId = folder ? `${folder}/${dialogs.newName.value.trim()}` : dialogs.newName.value.trim()
    await fileOperations.handleRename(target.name, newFileId, target.isFolder)
    dialogs.showRenameDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || '重命名失败')
  }
}

function handleEditTags(fileName: string) {
  const file = files.value.find(f => f.name === fileName)
  dialogs.editTagsTarget.value = fileName
  dialogs.editingTags.value = file?.metadata?.Tags ? [...file.metadata.Tags] : []
  dialogs.showEditTagsDialog.value = true
}

const availableTagsForEdit = computed(() => {
  const file = files.value.find(f => f.name === dialogs.editTagsTarget.value)
  const fileTags = file?.metadata?.Tags || []
  const allTags = new Set([...builtInTags, ...store.userTags, ...fileTags])
  return Array.from(allTags).sort((a, b) => {
    const aIndex = builtInTags.indexOf(a)
    const bIndex = builtInTags.indexOf(b)
    if (aIndex !== -1 && bIndex !== -1)
      return aIndex - bIndex
    if (aIndex !== -1)
      return -1
    if (bIndex !== -1)
      return 1
    return a.localeCompare(b)
  })
})

function toggleEditTag(tag: string) {
  const index = dialogs.editingTags.value.indexOf(tag)
  if (index > -1) {
    dialogs.editingTags.value.splice(index, 1)
  }
  else {
    if (tag === 'blocked' && dialogs.editingTags.value.includes('whitelist')) {
      dialogs.editingTags.value.splice(dialogs.editingTags.value.indexOf('whitelist'), 1)
    }
    else if (tag === 'whitelist' && dialogs.editingTags.value.includes('blocked')) {
      dialogs.editingTags.value.splice(dialogs.editingTags.value.indexOf('blocked'), 1)
    }
    dialogs.editingTags.value.push(tag)
  }
}

function removeEditTag(tag: string) {
  const index = dialogs.editingTags.value.indexOf(tag)
  if (index > -1) {
    dialogs.editingTags.value.splice(index, 1)
  }
}

function addNewTagToEdit() {
  const tag = dialogs.newTagInput.value.trim().toLowerCase()
  if (!tag || dialogs.editingTags.value.includes(tag))
    return

  if (!builtInTags.includes(tag) && !store.userTags.includes(tag)) {
    store.userTags.push(tag)
  }

  dialogs.editingTags.value.push(tag)
  dialogs.newTagInput.value = ''
}

function removeUserTag(tag: string) {
  const index = store.userTags.indexOf(tag)
  if (index > -1) {
    store.userTags.splice(index, 1)
  }
  const selectedIndex = dialogs.editingTags.value.indexOf(tag)
  if (selectedIndex > -1) {
    dialogs.editingTags.value.splice(selectedIndex, 1)
  }
}

async function confirmEditTags() {
  if (!dialogs.editTagsTarget.value)
    return

  try {
    await fileOperations.handleUpdateTags(dialogs.editTagsTarget.value, dialogs.editingTags.value)
    dialogs.showEditTagsDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.message || error?.response?.data?.error || '标签更新失败')
  }
}

function handleMove(fileName: string, isFolder: boolean) {
  dialogs.moveTargets.value = [{ name: fileName, isFolder }]
  const folder = fileName.split('/').slice(0, -1).join('/')
  dialogs.moveDestination.value = folder
  dialogs.showMoveDialog.value = true
}

function handleBatchMove() {
  dialogs.moveTargets.value = selectedFiles.value.map(name => ({
    name,
    isFolder: false,
  }))
  const firstFile = selectedFiles.value[0]
  const folder = firstFile ? firstFile.split('/').slice(0, -1).join('/') : currentDir.value
  dialogs.moveDestination.value = folder
  dialogs.showMoveDialog.value = true
}

async function confirmMove() {
  if (dialogs.moveTargets.value.length === 0)
    return

  try {
    await fileOperations.handleMove(dialogs.moveTargets.value, dialogs.moveDestination.value)
    dialogs.showMoveDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || '移动失败')
  }
}

// Folder jump
const showFolderJumpPopover = ref(false)
const folderJumpTarget = ref(currentDir.value)

watch(showFolderJumpPopover, (isOpen) => {
  if (isOpen) {
    folderJumpTarget.value = currentDir.value
  }
  else if (folderJumpTarget.value !== currentDir.value) {
    navigateToPath(folderJumpTarget.value)
  }
})

watch(currentDir, (newDir) => {
  if (!showFolderJumpPopover.value) {
    folderJumpTarget.value = newDir
  }
})

watch(() => route.query.dir, (newDir) => {
  const targetDir = (newDir as string) || ''
  if (targetDir !== currentDir.value) {
    currentDir.value = targetDir
    currentPage.value = 1
    selectedFiles.value = []
  }
})

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
  <div class="mx-auto p-3 flex flex-col h-full max-w-7xl md:p-6">
    <!-- Header -->
    <div class="mb-4">
      <h1 class="text-3xl font-bold mb-2">
        {{ t('files.title') }}
      </h1>
      <p class="text-muted-foreground">
        {{ t('files.description') }}
      </p>
    </div>

    <!-- Three-Layer Toolbar -->
    <div class="mb-4 border rounded-lg bg-card/50 overflow-hidden backdrop-blur-sm">
      <!-- Layer 1: Navigation -->
      <div class="px-3 py-2 border-b bg-muted/10 flex gap-2 min-h-[40px] items-center">
        <button
          class="px-1.5 py-1 rounded-md flex gap-1.5 transition-colors items-center hover:bg-accent/50"
          @click="navigateToPath('')"
        >
          <div class="i-lucide-home text-muted-foreground" style="width: 15px; height: 15px;" />
        </button>
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <div class="i-lucide-chevron-right text-muted-foreground/40" style="width: 13px; height: 13px;" />
          <button
            class="text-sm font-medium px-1.5 py-1 rounded-md transition-colors hover:bg-accent/50"
            @click="navigateToPath(breadcrumbs.slice(0, index + 1).join('/'))"
          >
            {{ crumb }}
          </button>
        </template>
        <div class="i-lucide-chevron-right text-muted-foreground/40 ml-auto" style="width: 13px; height: 13px;" />
        <Popover v-model:open="showFolderJumpPopover">
          <PopoverTrigger as-child>
            <Button variant="ghost" size="sm" class="px-2 h-7">
              <div class="i-lucide-folder-tree mr-1.5" style="width: 14px; height: 14px;" />
              跳转
            </Button>
          </PopoverTrigger>
          <PopoverContent class="p-3 w-80" align="end">
            <div class="space-y-2">
              <div class="text-sm font-medium">
                选择文件夹
              </div>
              <FolderTreeSelector v-model="folderJumpTarget" inline />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <!-- Layer 2: Filter & Tools -->
      <div class="px-3 py-2.5 border-b flex gap-2 items-center">
        <div class="flex-1 relative">
          <div class="i-lucide-search text-muted-foreground/60 left-3 top-1/2 absolute -translate-y-1/2" style="width: 15px; height: 15px;" />
          <Input
            v-model="filterQuery"
            :placeholder="t('files.filterPlaceholder')"
            class="pl-9 pr-9 border-muted-foreground/20 bg-background/50 focus-visible:border-muted-foreground/40"
          />
          <button
            v-if="filterQuery"
            class="text-muted-foreground/60 transition-colors right-3 top-1/2 absolute hover:text-foreground -translate-y-1/2"
            @click="clearFilter"
          >
            <div class="i-lucide-x" style="width: 15px; height: 15px;" />
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="text-muted-foreground h-8 w-8 hover:text-foreground">
              <div v-if="sortBy === 'date'" :class="sortOrder === 'asc' ? 'i-lucide-arrow-down-0-1' : 'i-lucide-arrow-down-1-0'" style="width: 16px; height: 16px;" />
              <div v-else :class="sortOrder === 'asc' ? 'i-lucide-arrow-down-a-z' : 'i-lucide-arrow-down-z-a'" style="width: 16px; height: 16px;" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="toggleSort('date')">
              <div v-if="sortBy === 'date'" :class="sortOrder === 'asc' ? 'i-lucide-arrow-up-1-0' : 'i-lucide-arrow-down-1-0'" class="mr-2" style="width: 14px; height: 14px;" />
              <div v-else class="i-lucide-calendar mr-2" style="width: 14px; height: 14px;" />
              {{ t('files.sortByDate') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="toggleSort('name')">
              <div v-if="sortBy === 'name'" :class="sortOrder === 'asc' ? 'i-lucide-arrow-up-a-z' : 'i-lucide-arrow-down-z-a'" class="mr-2" style="width: 14px; height: 14px;" />
              <div v-else class="i-lucide-text mr-2" style="width: 14px; height: 14px;" />
              {{ t('files.sortByName') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="text-muted-foreground h-8 w-8 relative hover:text-foreground">
              <div class="i-lucide-filter" style="width: 16px; height: 16px;" />
              <div v-if="hasSearchOrFilter" class="rounded-full bg-primary h-1.5 w-1.5 right-1 top-1 absolute" />
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
      </div>

      <!-- Layer 3: Selection & Tools -->
      <div class="px-3 py-2 flex gap-2 items-center">
        <Menubar class="p-0 border-0 bg-transparent h-8 shadow-none">
          <MenubarMenu>
            <MenubarTrigger class="px-2 py-0 h-8">
              {{ t('files.menubar.selection') }}
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem @click="toggleSelectAll">
                <div :class="isSelectAllPage ? 'i-lucide-check-square' : 'i-lucide-square'" class="mr-2" style="width: 14px; height: 14px;" />
                {{ isSelectAllPage ? t('files.menubar.deselectAll') : t('files.menubar.selectAll') }}
              </MenubarItem>
              <MenubarItem v-if="selectedCount > 0" @click="selectedFiles = []">
                <div class="i-lucide-x mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.clearSelection') }}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem :disabled="selectedCount === 0" @click="copyUrl(selectedFiles[0])">
                <div class="i-lucide-copy mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.copyUrl') }}
              </MenubarItem>
              <MenubarItem :disabled="selectedCount === 0" @click="handleBatchMove">
                <div class="i-lucide-folder-input mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.moveTo') }}
              </MenubarItem>
              <MenubarItem :disabled="selectedCount === 0" @click="handleBatchDelete">
                <div class="i-lucide-trash-2 text-destructive mr-2" style="width: 14px; height: 14px;" />
                <span class="text-destructive">{{ t('files.delete') }}</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger class="px-2 py-0 h-8">
              {{ t('files.menubar.view') }}
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem @click="viewMode = viewMode === 'card' ? 'list' : 'card'">
                <div v-if="viewMode === 'card'" class="i-lucide-list mr-2" style="width: 14px; height: 14px;" />
                <div v-else class="i-lucide-grid-2x2 mr-2" style="width: 14px; height: 14px;" />
                {{ viewMode === 'card' ? t('files.listView') : t('files.cardView') }}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="foldersFirst = !foldersFirst">
                <div class="i-lucide-folder-up mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.foldersFirst') }}
                <div v-if="foldersFirst" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="imageLoadMode = 'none'">
                <div class="i-lucide-image-off mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.imageMode.none') }}
                <div v-if="imageLoadMode === 'none'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
              <MenubarItem @click="imageLoadMode = 'lite'">
                <div class="i-lucide-gauge mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.imageMode.lite') }}
                <div v-if="imageLoadMode === 'lite'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
              <MenubarItem @click="imageLoadMode = 'full'">
                <div class="i-lucide-images mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.imageMode.full') }}
                <div v-if="imageLoadMode === 'full'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger class="px-2 py-0 h-8">
              {{ t('files.menubar.tools') }}
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem @click="showGlobalSearchDialog = true">
                <div class="i-lucide-globe mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.menubar.globalSearch') }}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="handleCreateFolder">
                <div class="i-lucide-folder-plus mr-2" style="width: 14px; height: 14px;" />
                {{ t('files.newFolder') }}
              </MenubarItem>
              <MenubarItem :disabled="isFetching" @click="handleRefresh">
                <div class="i-lucide-refresh-cw mr-2" :class="{ 'animate-spin': isFetching }" style="width: 14px; height: 14px;" />
                {{ t('files.refresh') }}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <div class="text-xs text-muted-foreground ml-auto flex gap-1.5 items-center">
          <span class="font-mono">
            <span class="text-foreground font-semibold px-1 rounded bg-primary/10 inline-flex min-w-[2ch] items-center justify-center">{{ selectedCount }}</span>
            /
            <span class="text-foreground font-medium px-1 rounded bg-muted inline-flex min-w-[2ch] items-center justify-center">{{ totalCount }}</span>
          </span>
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
        :format-date="formatDate"
        @navigate-folder="navigateToFolder"
        @toggle-selection="toggleFileSelection"
        @copy-url="copyUrl"
        @delete="handleDelete"
        @show-detail="showFileDetail"
        @rename="handleRename"
        @edit-tags="handleEditTags"
        @move="handleMove"
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
        @show-detail="showFileDetail"
        @rename="handleRename"
        @edit-tags="handleEditTags"
        @move="handleMove"
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
    <Dialog v-model:open="dialogs.showCreateFolderDialog.value">
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
              v-model="dialogs.newFolderName.value"
              :placeholder="t('files.folderNamePlaceholder')"
              @keyup.enter="confirmCreateFolder"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="() => dialogs.showCreateFolderDialog.value = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="confirmCreateFolder">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Rename Dialog -->
    <Dialog v-model:open="dialogs.showRenameDialog.value">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名</DialogTitle>
        </DialogHeader>
        <div class="py-4 space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">新名称</label>
            <Input
              v-model="dialogs.newName.value"
              placeholder="输入新名称..."
              @keyup.enter="confirmRename"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="() => dialogs.showRenameDialog.value = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="confirmRename">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Tags Dialog -->
    <Dialog v-model:open="dialogs.showEditTagsDialog.value">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑标签</DialogTitle>
        </DialogHeader>
        <div class="py-4 space-y-4">
          <div v-if="dialogs.editingTags.value.length > 0" class="p-3 border rounded-lg bg-muted/30">
            <div class="flex flex-wrap gap-2">
              <TagBadge
                v-for="tag in dialogs.editingTags.value"
                :key="tag"
                :tag="tag"
                :color="store.getTagColor(tag)"
                show-delete
                @delete="removeEditTag(tag)"
              />
            </div>
          </div>
          <div v-else class="p-3 text-center border rounded-lg bg-muted/30">
            <span class="text-sm text-muted-foreground">未选择标签</span>
          </div>

          <div class="flex gap-2">
            <Input
              v-model="dialogs.newTagInput.value"
              placeholder="添加新标签"
              @keyup.enter="addNewTagToEdit"
            />
            <Button variant="outline" size="icon" @click="addNewTagToEdit">
              <div class="i-lucide-plus" />
            </Button>
          </div>

          <div class="space-y-2">
            <label class="text-xs text-muted-foreground">备选标签</label>
            <div class="p-3 border rounded-lg bg-background min-h-[80px]">
              <div class="flex flex-wrap gap-2">
                <TagBadge
                  v-for="tag in availableTagsForEdit.filter(t => !dialogs.editingTags.value.includes(t))"
                  :key="tag"
                  :tag="tag"
                  :color="store.getTagColor(tag)"
                  :show-delete="!builtInTags.includes(tag)"
                  delete-icon="trash"
                  clickable
                  @click="toggleEditTag(tag)"
                  @delete="removeUserTag(tag)"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="() => dialogs.showEditTagsDialog.value = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="confirmEditTags">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Move Dialog -->
    <Dialog v-model:open="dialogs.showMoveDialog.value">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>移动到</DialogTitle>
          <DialogDescription>
            选择目标文件夹
          </DialogDescription>
        </DialogHeader>
        <div class="py-4 space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">目标路径</label>
            <FolderTreeSelector v-model="dialogs.moveDestination.value" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="() => dialogs.showMoveDialog.value = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="confirmMove">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:open="showDeleteDialog"
      title="确认删除"
      @confirm="selectedCount > 0 ? confirmBatchDelete() : confirmDelete()"
    >
      <span v-if="deleteTarget?.isFolder">
        确定要删除文件夹 "<strong>{{ deleteTarget.name }}</strong>" 及其所有内容吗？此操作不可恢复。
      </span>
      <span v-else-if="selectedCount > 0">
        确定要删除选中的 <strong>{{ selectedCount }}</strong> 个文件吗？此操作不可恢复。
      </span>
      <span v-else>
        确定要删除文件 "<strong>{{ deleteTarget?.name }}</strong>" 吗？此操作不可恢复。
      </span>
    </ConfirmDialog>

    <!-- Global Search Dialog -->
    <Dialog v-model:open="showGlobalSearchDialog">
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
              v-model="dialogs.newFolderName.value"
              :placeholder="t('files.folderNamePlaceholder')"
              @keyup.enter="confirmCreateFolder"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="() => dialogs.showCreateFolderDialog.value = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="confirmCreateFolder">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Global Search Dialog -->
    <Dialog v-model:open="showGlobalSearchDialog">
      <DialogContent class="max-w-md w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>{{ t('files.globalSearch.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('files.globalSearch.description') }}
          </DialogDescription>
        </DialogHeader>
        <div class="py-4 space-y-4">
          <div class="space-y-2">
            <label for="global-search" class="text-sm font-medium">{{ t('files.globalSearch.keyword') }}</label>
            <Input
              id="global-search"
              v-model="globalSearchQuery"
              :placeholder="t('files.globalSearch.placeholder')"
              @keyup.enter="handleGlobalSearch"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showGlobalSearchDialog = false">
            {{ t('common.cancel') }}
          </Button>
          <Button @click="handleGlobalSearch">
            {{ t('files.globalSearch.search') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Detail Panel Dialog -->
    <Dialog v-model:open="showDetailPanel">
      <DialogContent class="max-w-md w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>{{ t('files.fileDetail') }}</DialogTitle>
        </DialogHeader>
        <div v-if="detailFile" class="py-4 flex flex-col gap-4">
          <div class="p-6 border rounded-lg bg-muted/20 flex items-center justify-center">
            <FileIcon :item="{ name: detailFile.name, isFolder: false, metadata: detailFile.metadata }" :preview-url="buildFileUrl(detailFile.name)" :show-preview="true" :size="80" />
          </div>

          <div class="space-y-3">
            <div>
              <div class="text-xs text-muted-foreground font-medium mb-1.5">
                {{ t('files.fileName') }}
              </div>
              <div class="text-sm break-all">
                {{ detailFile.metadata?.FileName || detailFile.name }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground font-medium mb-1.5">
                {{ t('files.size') }}
              </div>
              <div class="text-sm">
                {{ formatFileSize(detailFile.metadata?.FileSizeBytes) }}
              </div>
            </div>
            <div v-if="sortedTags.length > 0">
              <div class="text-xs text-muted-foreground font-medium mb-1.5">
                {{ t('files.tags') }}
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
            <div v-if="detailFile.metadata?.TimeStamp">
              <div class="text-xs text-muted-foreground font-medium mb-1.5">
                {{ t('files.uploadTime') }}
              </div>
              <div class="text-sm">
                {{ formatDate(detailFile.metadata.TimeStamp) }}
              </div>
            </div>
            <div v-if="detailFile.metadata?.ChannelName || detailFile.metadata?.Channel">
              <div class="text-xs text-muted-foreground font-medium mb-1.5">
                {{ t('files.channel') }}
              </div>
              <div class="text-sm">
                {{ detailFile.metadata?.ChannelName || detailFile.metadata?.Channel }}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
