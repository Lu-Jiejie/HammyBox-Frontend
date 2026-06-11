<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Fuse from 'fuse.js'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getFileList } from '@/api/files'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FolderTreeSelector from '@/components/FolderTreeSelector.vue'
import InputDialog from '@/components/InputDialog.vue'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import Input from '@/components/shadcn/input/Input.vue'
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
import { useAppStore } from '@/stores'
import EditTagsDialog from './components/EditTagsDialog.vue'
import FileCardView from './components/FileCardView.vue'
import FileDetailDialog from './components/FileDetailDialog.vue'
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

const fileOperations = useFileOperations(queryClient, t, toast)
const dialogs = useFileDialogs()

// View mode - persisted in app store
const viewMode = computed({
  get: () => store.fileViewMode || 'list',
  set: (value: 'card' | 'list') => {
    store.fileViewMode = value
  },
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(25)

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

// Image load mode
const imageLoadMode = computed({
  get: () => store.imageLoadMode || 'full',
  set: (value: 'none' | 'lite' | 'full') => {
    store.imageLoadMode = value
  },
})

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
  // console.log(fileListData.value)
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
    ...files.value.map((file) => {
      // Build searchable text for tags (include display labels)
      const tagsSearchText = (file.metadata?.Tags || []).map((tag) => {
        if (tag === 'blocked')
          return `blocked ${t('pages.files.detail.tags.blocked') || '黑名单'}`
        if (tag === 'whitelist')
          return `whitelist ${t('pages.files.detail.tags.whitelist') || '白名单'}`
        return tag
      }).join(' ')

      return {
        ...file,
        isFolder: false as const,
        _searchChannelType: file.metadata?.Channel || '',
        _searchChannelName: file.metadata?.ChannelName || '',
        _searchTags: tagsSearchText,
      }
    }),
  ]

  // Frontend filter with Fuse.js
  if (filterQuery.value) {
    const fuse = new Fuse(items, {
      keys: [
        { name: 'name', weight: 0.2 },
        { name: 'displayName', weight: 0.2 },
        { name: 'metadata.FileName', weight: 0.3 },
        { name: 'metadata.Tags', weight: 0.1 },
        { name: '_searchTags', weight: 0.15 },
        { name: '_searchChannelType', weight: 0.1 },
        { name: '_searchChannelName', weight: 0.15 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true,
    })

    const searchTerms = filterQuery.value.trim().split(/\s+/).filter(Boolean)
    const fuseQuery = searchTerms.map(term => `'${term}`).join(' ')
    items = fuse.search(fuseQuery).map(result => result.item)
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
  toast.success(t('pages.files.toolbar.refreshed'))
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
    toast.error(error?.response?.data?.error || t('pages.files.actions.deleteFailed'))
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
    toast.error(error?.response?.data?.error || t('pages.files.actions.batchDeleteFailed'))
  }
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
    toast.success(t('pages.files.globalSearch.resultsCount', { count: response.data.files?.length || 0 }))
    showGlobalSearchDialog.value = false
  }
  catch (error: any) {
    toast.error(error?.response?.data?.error || t('pages.files.globalSearch.failed'))
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
  try {
    await navigator.clipboard.writeText(url)
    toast.success(t('pages.files.actions.copySuccess'))
  }
  catch (error) {
    console.error('[copyUrl] Error:', error)
    toast.error('复制失败')
  }
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
    toast.error(error?.response?.data?.error || t('pages.files.folder.createFailed'))
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
  if (file) {
    dialogs.editTagsTarget.value = fileName
    dialogs.editTagsFile.value = file
    dialogs.showEditTagsDialog.value = true
  }
}

async function confirmEditTags(tags: string[]) {
  if (!dialogs.editTagsTarget.value)
    return

  try {
    await fileOperations.handleUpdateTags(dialogs.editTagsTarget.value, tags)
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
    toast.error(error?.response?.data?.error || t('pages.files.actions.moveFailed'))
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
  _searchChannelType?: string
  _searchChannelName?: string
  _searchTags?: string
}
</script>

<template>
  <div class="mx-auto p-3 flex flex-col h-full max-w-7xl md:p-6">
    <!-- Header -->
    <div class="mb-4">
      <h1 class="text-3xl font-bold mb-2">
        {{ t('pages.files.title') }}
      </h1>
      <p class="text-muted-foreground">
        {{ t('pages.files.description') }}
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
              {{ t('pages.files.toolbar.browse') }}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="p-3 w-80" align="end">
            <FolderTreeSelector v-model="folderJumpTarget" inline />
          </PopoverContent>
        </Popover>
      </div>

      <!-- Layer 2: Filter & Tools -->
      <div class="px-3 py-2.5 border-b flex gap-2 items-center">
        <div class="flex-1 relative">
          <div class="i-lucide-search text-muted-foreground/60 left-3 top-1/2 absolute -translate-y-1/2" style="width: 15px; height: 15px;" />
          <Input
            v-model="filterQuery"
            :placeholder="t('pages.files.toolbar.filterPlaceholder')"
            class="pl-9 pr-9 border-muted-foreground/20 bg-background/50 focus-visible:border-muted-foreground/40"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8 hover:text-foreground">
              <div v-if="sortBy === 'date'" :class="sortOrder === 'asc' ? 'i-lucide-arrow-down-0-1' : 'i-lucide-arrow-down-1-0'" style="width: 16px; height: 16px;" />
              <div v-else :class="sortOrder === 'asc' ? 'i-lucide-arrow-down-a-z' : 'i-lucide-arrow-down-z-a'" style="width: 16px; height: 16px;" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="toggleSort('date')">
              <div v-if="sortBy === 'date'" :class="sortOrder === 'asc' ? 'i-lucide-arrow-up-1-0' : 'i-lucide-arrow-down-1-0'" class="mr-2" style="width: 14px; height: 14px;" />
              <div v-else class="i-lucide-calendar mr-2" style="width: 14px; height: 14px;" />
              {{ t('pages.files.sort.byDate') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="toggleSort('name')">
              <div v-if="sortBy === 'name'" :class="sortOrder === 'asc' ? 'i-lucide-arrow-up-a-z' : 'i-lucide-arrow-down-z-a'" class="mr-2" style="width: 14px; height: 14px;" />
              <div v-else class="i-lucide-text mr-2" style="width: 14px; height: 14px;" />
              {{ t('pages.files.sort.byName') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8 relative hover:text-foreground">
              <div class="i-lucide-filter" style="width: 16px; height: 16px;" />
              <div v-if="hasSearchOrFilter" class="rounded-full bg-primary h-1.5 w-1.5 right-1 top-1 absolute" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <div class="p-2">
              <div class="text-xs text-muted-foreground font-medium mb-2">
                {{ t('pages.files.filter.options') }}
              </div>
              <Button v-if="hasSearchOrFilter" variant="ghost" size="sm" class="w-full" @click="clearFilters">
                {{ t('pages.files.filter.clear') }}
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
              {{ t('pages.files.select.title') }}
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem @click="toggleSelectAll">
                <div :class="isSelectAllPage ? 'i-lucide-check-square' : 'i-lucide-square'" class="mr-2" style="width: 14px; height: 14px;" />
                {{ isSelectAllPage ? t('pages.files.select.deselectAll') : t('pages.files.select.selectAll') }}
              </MenubarItem>
              <MenubarItem v-if="selectedCount > 0" @click="selectedFiles = []">
                <div class="i-lucide-x mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.select.clear') }}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem :disabled="selectedCount === 0" @click="copyUrl(selectedFiles[0])">
                <div class="i-lucide-copy mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.actions.copyUrl') }}
              </MenubarItem>
              <MenubarItem :disabled="selectedCount === 0" @click="handleBatchMove">
                <div class="i-lucide-folder-input mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.actions.move') }}
              </MenubarItem>
              <MenubarItem :disabled="selectedCount === 0" @click="handleBatchDelete">
                <div class="i-lucide-trash-2 text-destructive mr-2" style="width: 14px; height: 14px;" />
                <span class="text-destructive">{{ t('common.actions.delete') }}</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger class="px-2 py-0 h-8">
              {{ t('pages.files.view.title') }}
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled @click="viewMode = viewMode === 'card' ? 'list' : 'card'">
                <div v-if="viewMode === 'card'" class="i-lucide-list mr-2" style="width: 14px; height: 14px;" />
                <div v-else class="i-lucide-grid-2x2 mr-2" style="width: 14px; height: 14px;" />
                {{ viewMode === 'card' ? t('pages.files.view.list') : t('pages.files.view.card') }}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="imageLoadMode = 'none'">
                <div class="i-lucide-image-off mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.view.imageMode.none') }}
                <div v-if="imageLoadMode === 'none'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
              <MenubarItem @click="imageLoadMode = 'lite'">
                <div class="i-lucide-gauge mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.view.imageMode.lite') }}
                <div v-if="imageLoadMode === 'lite'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
              <MenubarItem @click="imageLoadMode = 'full'">
                <div class="i-lucide-images mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.view.imageMode.full') }}
                <div v-if="imageLoadMode === 'full'" class="i-lucide-check ml-auto" style="width: 14px; height: 14px;" />
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger class="px-2 py-0 h-8">
              {{ t('pages.files.tools.title') }}
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled @click="showGlobalSearchDialog = true">
                <div class="i-lucide-globe mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.search.global') }}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem @click="handleCreateFolder">
                <div class="i-lucide-folder-plus mr-2" style="width: 14px; height: 14px;" />
                {{ t('pages.files.folder.new') }}
              </MenubarItem>
              <MenubarItem :disabled="isFetching" @click="handleRefresh">
                <div class="i-lucide-refresh-cw mr-2" :class="{ 'animate-spin': isFetching }" style="width: 14px; height: 14px;" />
                {{ t('pages.files.toolbar.refresh') }}
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
          {{ hasSearchOrFilter ? t('pages.files.noMatchingFiles') : t('pages.files.emptyState') }}
        </p>
        <p class="text-sm text-muted-foreground/70 mt-2">
          {{ hasSearchOrFilter ? t('pages.files.adjustSearchHint') : t('pages.files.uploadHint') }}
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
    <InputDialog
      v-model:open="dialogs.showCreateFolderDialog.value"
      v-model="dialogs.newFolderName.value"
      :title="t('pages.files.folder.new')"
      :description="t('pages.files.folder.newDescription')"
      :label="t('pages.files.folder.name')"
      :placeholder="t('pages.files.folder.namePlaceholder')"
      @confirm="confirmCreateFolder"
    />

    <!-- Rename Dialog -->
    <InputDialog
      v-model:open="dialogs.showRenameDialog.value"
      v-model="dialogs.newName.value"
      title="重命名"
      label="新名称"
      placeholder="输入新名称..."
      @confirm="confirmRename"
    />

    <!-- Edit Tags Dialog -->
    <EditTagsDialog
      v-model:open="dialogs.showEditTagsDialog.value"
      :file="dialogs.editTagsFile.value"
      @confirm="confirmEditTags"
    />

    <!-- Move Dialog -->
    <ConfirmDialog
      v-model:open="dialogs.showMoveDialog.value"
      :title="t('pages.files.move.title')"
      :description="t('pages.files.move.description')"
      @confirm="confirmMove"
    >
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('pages.files.move.targetPath') }}</label>
        <FolderTreeSelector v-model="dialogs.moveDestination.value" />
      </div>
    </ConfirmDialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:open="showDeleteDialog"
      :title="t('pages.files.actions.confirmDeletion')"
      @confirm="selectedCount > 0 ? confirmBatchDelete() : confirmDelete()"
    >
      <span v-if="deleteTarget?.isFolder" v-html="t('pages.files.actions.deleteFolderConfirm', { name: deleteTarget.name })" />
      <span v-else-if="selectedCount > 0" v-html="t('pages.files.actions.deleteFilesConfirm', { count: selectedCount })" />
      <span v-else v-html="t('pages.files.actions.deleteFileConfirm', { name: deleteTarget?.name })" />
    </ConfirmDialog>

    <!-- Global Search Dialog -->
    <InputDialog
      v-model:open="showGlobalSearchDialog"
      v-model="globalSearchQuery"
      :title="t('pages.files.search.title')"
      :description="t('pages.files.search.description')"
      :label="t('pages.files.search.keyword')"
      :placeholder="t('pages.files.search.placeholder')"
      @confirm="handleGlobalSearch"
    />

    <!-- Detail Panel Dialog -->
    <FileDetailDialog
      v-model:open="showDetailPanel"
      :file="detailFile"
      :build-file-url="buildFileUrl"
      :format-file-size="formatFileSize"
      :format-date="formatDate"
    />
  </div>
</template>
