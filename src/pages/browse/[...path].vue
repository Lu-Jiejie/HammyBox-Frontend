<script setup lang="ts">
import type { PublicFileItem, PublicPageConfig } from '@/api/public'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { getPublicFileList, getPublicPageConfigs } from '@/api/public'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { Input } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import FileIcon from '@/pages/files/components/FileIcon.vue'

definePage({
  meta: {
    layout: false,
  },
})

const { t } = useI18n()
const route = useRoute()

/* ─── slug 解析（/browse/photo → 'photo'，仅支持单段 slug） ─── */

const slug = computed<string>(() => {
  const p = route.params.path
  if (!p)
    return ''
  const segs = (Array.isArray(p) ? p : [p]).filter(Boolean)
  // 只支持单段 slug，多段视为不存在
  return segs.length === 1 ? segs[0] : '__invalid__'
})

/* ─── 状态 ─── */

const loading = ref(true)
// 页面状态：notfound=无此配置 / expired=已到期 / ok=正常加载
const pageError = ref<'notfound' | 'expired' | 'network' | null>(null)
const config = ref<PublicPageConfig | null>(null)
const files = ref<PublicFileItem[]>([])
const totalCount = ref(0)
const loadedCount = ref(0)
const pageSize = 200

const search = ref('')
const type = ref<'all' | 'image' | 'video' | 'audio' | 'other'>('all')
const refreshing = ref(false)

// 视图模式：网格 / 列表（仅本页状态；公开页面向访客，无需跨页记忆）
const viewMode = ref<'grid' | 'list'>('grid')

// 排序（前端对已加载列表排序；默认最新在前）
const sortBy = ref<'date' | 'name'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')

function toggleSort(field: 'date' | 'name') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = field
    sortOrder.value = field === 'date' ? 'desc' : 'asc'
  }
}

// 中文/数字友好的名称比较器
const collator = new Intl.Collator(['zh-CN', 'en'], { numeric: true, sensitivity: 'base' })

const sortedFiles = computed(() => {
  const list = [...files.value]
  if (sortBy.value === 'name') {
    list.sort((a, b) => {
      const nameA = displayName(a.name)
      const nameB = displayName(b.name)
      return sortOrder.value === 'asc'
        ? collator.compare(nameA, nameB)
        : collator.compare(nameB, nameA)
    })
  }
  else {
    list.sort((a, b) => {
      const timeA = a.metadata?.TimeStamp || 0
      const timeB = b.metadata?.TimeStamp || 0
      return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA
    })
  }
  return list
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

/* ─── 到期状态 ─── */

const expireInfo = computed<{ expired: boolean, text: string } | null>(() => {
  if (!config.value)
    return null
  const expireAt = config.value.expireAt
  if (!expireAt)
    return { expired: false, text: t('pages.browse.permanent') }
  const now = Date.now()
  if (now >= expireAt) {
    return { expired: true, text: t('pages.browse.expired') }
  }
  const diffMs = expireAt - now
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  const dateText = new Date(expireAt).toLocaleDateString()
  if (days <= 1) {
    const hours = Math.ceil(diffMs / (60 * 60 * 1000))
    return { expired: false, text: t('pages.browse.expiresInHours', { hours }) }
  }
  return { expired: false, text: t('pages.browse.expiresInDays', { days, date: dateText }) }
})

/* ─── 文件类型判定（前端展示用扩展名，后端按 type 过滤） ─── */

const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif']
const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv', 'avi', '3gp', 'mpeg', 'mpg', 'flv', 'wmv', 'ts', 'rmvb']

function getExt(name: string): string {
  return (name.split('.').pop() || '').toLowerCase()
}

function isImageFile(name: string): boolean {
  return imageExts.includes(getExt(name))
}

function isVideoFile(name: string): boolean {
  return videoExts.includes(getExt(name))
}

/* ─── 数据加载 ─── */

async function loadData(reset = true) {
  if (reset) {
    loading.value = true
    loadedCount.value = 0
  }
  pageError.value = null
  try {
    const { data } = await getPublicFileList({
      tags: config.value?.tags || [],
      // 按标签收录必须跨全部子目录（tag 打在文件上，可能位于任意深度的目录）
      recursive: true,
      search: search.value.trim() || undefined,
      type: type.value === 'all' ? undefined : type.value,
      start: reset ? 0 : loadedCount.value,
      count: pageSize,
    })
    files.value = reset ? data.files : [...files.value, ...data.files]
    totalCount.value = data.totalCount
    loadedCount.value += data.files.length
  }
  catch (err: any) {
    const status = err?.response?.status
    if (status === 403) {
      pageError.value = 'notfound'
    }
    else {
      pageError.value = 'network'
    }
    if (reset) {
      files.value = []
      totalCount.value = 0
    }
  }
  finally {
    loading.value = false
    refreshing.value = false
  }
}

// 手动刷新（保留当前筛选）
function handleRefresh() {
  refreshing.value = true
  loadData(true)
}

// slug 变化时重新加载配置
watch(slug, () => {
  init()
})

// 类型筛选变化
watch(type, () => {
  if (config.value)
    loadData(true)
})

// 搜索防抖
watch(search, () => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (config.value)
      loadData(true)
  }, 400)
})

// 加载更多
function handleLoadMore() {
  loadData(false)
}

/* ─── 初始化：读取公开页配置 ─── */

async function init() {
  loading.value = true
  pageError.value = null
  config.value = null
  files.value = []
  search.value = ''
  type.value = 'all'
  try {
    const configs = await getPublicPageConfigs()
    const cfg = configs[slug.value]
    if (!cfg) {
      pageError.value = 'notfound'
      return
    }
    if (cfg.tags.length === 0) {
      // 无标签规则视为无效配置
      pageError.value = 'notfound'
      return
    }
    config.value = cfg
    if (cfg.expireAt && Date.now() >= cfg.expireAt) {
      pageError.value = 'expired'
      return
    }
    await loadData(true)
  }
  catch {
    pageError.value = 'network'
  }
  finally {
    loading.value = false
  }
}

/* ─── 展示辅助 ─── */

function displayName(name: string): string {
  return name.split('/').pop() || name
}

function buildFileUrl(name: string): string {
  const cleanSrc = name.startsWith('/file/') ? name.replace('/file/', '') : name
  const encodedSrc = cleanSrc.split('/').map(part => encodeURIComponent(part)).join('/')
  return `${window.location.protocol}//${window.location.host}/api/file/${encodedSrc}`
}

function formatFileSize(size?: number | string): string {
  // 公开接口返回的 FileSize 是 MB 字符串（如 "12.34"），先转为字节
  let bytes = 0
  if (typeof size === 'number') {
    bytes = Number.isFinite(size) ? size : 0
  }
  else if (typeof size === 'string' && size.trim() !== '') {
    const mb = Number.parseFloat(size)
    if (Number.isFinite(mb) && mb > 0)
      bytes = Math.round(mb * 1024 * 1024)
  }
  if (!bytes || bytes <= 0)
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`
}

function formatDate(timestamp?: number): string {
  if (!timestamp || Number.isNaN(new Date(timestamp).getTime()))
    return '-'
  return new Date(timestamp).toLocaleString()
}

async function copyUrl(fileName: string) {
  try {
    await navigator.clipboard.writeText(buildFileUrl(fileName))
    toast.success(t('pages.browse.copySuccess'))
  }
  catch {
    toast.error(t('pages.browse.copyFailed'))
  }
}

/* ─── Lightbox 预览 ─── */

const previewIndex = ref(-1)

const imageFiles = computed(() => sortedFiles.value.filter(f => isImageFile(f.name)))

function openFile(file: PublicFileItem) {
  if (!file) {
    return
  }
  // 图片 → Lightbox；视频/其他 → 新窗口打开（播放或下载）
  if (!isImageFile(file.name)) {
    window.open(buildFileUrl(file.name), '_blank', 'noopener')
    return
  }
  previewIndex.value = imageFiles.value.findIndex(item => item.name === file.name)
}

function closePreview() {
  previewIndex.value = -1
}

function prevImage() {
  if (previewIndex.value > 0)
    previewIndex.value--
}

function nextImage() {
  if (previewIndex.value < imageFiles.value.length - 1)
    previewIndex.value++
}

const currentPreview = computed(() => {
  if (previewIndex.value < 0)
    return null
  return imageFiles.value[previewIndex.value] || null
})

/* ─── 首次加载 ─── */

init()
</script>

<template>
  <div class="mx-auto p-4 max-w-6xl space-y-5 sm:p-6">
    <!-- 标题与到期状态 -->
    <div v-if="config" class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold">
          {{ config.name || slug }}
        </h1>
        <p v-if="config.description" class="text-sm text-muted-foreground mt-1">
          {{ config.description }}
        </p>
        <div v-if="expireInfo" class="mt-2 flex gap-2 items-center">
          <Badge :variant="expireInfo.expired ? 'destructive' : 'secondary'" class="text-xs">
            {{ expireInfo.text }}
          </Badge>
        </div>
      </div>
      <Button size="sm" variant="outline" :disabled="refreshing" class="shrink-0" @click="handleRefresh">
        <div :class="refreshing ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-refresh-cw'" style="width: 14px; height: 14px;" />
        {{ refreshing ? t('pages.browse.refreshing') : t('pages.browse.refresh') }}
      </Button>
    </div>

    <!-- 工具栏 -->
    <div v-if="config" class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div class="grow relative">
        <div class="i-lucide-search text-muted-foreground/50 left-3 top-1/2 absolute -translate-y-1/2" style="width: 15px; height: 15px;" />
        <Input
          v-model="search"
          class="pl-9"
          :placeholder="t('pages.browse.searchPlaceholder')"
        />
      </div>
      <div class="flex flex-wrap gap-2 items-center sm:shrink-0">
        <Select v-model="type" class="flex-1 sm:flex-none">
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue :placeholder="t('pages.browse.allTypes')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {{ t('pages.browse.allTypes') }}
            </SelectItem>
            <SelectItem value="image">
              {{ t('pages.browse.typeImage') }}
            </SelectItem>
            <SelectItem value="video">
              {{ t('pages.browse.typeVideo') }}
            </SelectItem>
            <SelectItem value="audio">
              {{ t('pages.browse.typeAudio') }}
            </SelectItem>
            <SelectItem value="other">
              {{ t('pages.browse.typeOther') }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- 排序 -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon" class="shrink-0" :title="t('pages.browse.sort.title')">
              <div
                v-if="sortBy === 'date'"
                :class="sortOrder === 'asc' ? 'i-lucide-arrow-down-0-1' : 'i-lucide-arrow-down-1-0'"
                style="width: 15px; height: 15px;"
              />
              <div
                v-else
                :class="sortOrder === 'asc' ? 'i-lucide-arrow-down-a-z' : 'i-lucide-arrow-down-z-a'"
                style="width: 15px; height: 15px;"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="toggleSort('date')">
              <div
                v-if="sortBy === 'date'"
                :class="sortOrder === 'asc' ? 'i-lucide-arrow-up-1-0' : 'i-lucide-arrow-down-1-0'"
                class="mr-2"
                style="width: 14px; height: 14px;"
              />
              <div v-else class="i-lucide-calendar mr-2" style="width: 14px; height: 14px;" />
              {{ t('pages.browse.sort.byDate') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="toggleSort('name')">
              <div
                v-if="sortBy === 'name'"
                :class="sortOrder === 'asc' ? 'i-lucide-arrow-up-a-z' : 'i-lucide-arrow-down-z-a'"
                class="mr-2"
                style="width: 14px; height: 14px;"
              />
              <div v-else class="i-lucide-text mr-2" style="width: 14px; height: 14px;" />
              {{ t('pages.browse.sort.byName') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- 视图切换 -->
        <div class="border rounded-lg flex shrink-0">
          <Button
            variant="ghost"
            size="icon"
            class="rounded-r-none"
            :class="viewMode === 'grid' ? 'bg-muted/60 text-foreground' : 'text-muted-foreground'"
            :title="t('pages.browse.view.grid')"
            @click="viewMode = 'grid'"
          >
            <div class="i-lucide-grid-2x2" style="width: 15px; height: 15px;" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="border-l rounded-l-none"
            :class="viewMode === 'list' ? 'bg-muted/60 text-foreground' : 'text-muted-foreground'"
            :title="t('pages.browse.view.list')"
            @click="viewMode = 'list'"
          >
            <div class="i-lucide-list" style="width: 15px; height: 15px;" />
          </Button>
        </div>
      </div>
    </div>

    <!-- 状态区 -->
    <div v-if="loading && loadedCount === 0" class="flex min-h-[300px] items-center justify-center">
      <div class="i-lucide-loader-circle text-4xl text-muted-foreground animate-spin" />
    </div>

    <div v-else-if="pageError === 'notfound'" class="text-center flex flex-col gap-2 min-h-[300px] items-center justify-center">
      <div class="i-lucide-circle-x text-5xl text-muted-foreground/40" />
      <p class="text-lg font-medium">
        {{ t('pages.browse.notFoundTitle') }}
      </p>
      <p class="text-sm text-muted-foreground max-w-md">
        {{ t('pages.browse.notFoundDescription') }}
      </p>
    </div>

    <div v-else-if="pageError === 'expired'" class="text-center flex flex-col gap-2 min-h-[300px] items-center justify-center">
      <div class="i-lucide-clock text-5xl text-muted-foreground/40" />
      <p class="text-lg font-medium">
        {{ t('pages.browse.expiredTitle') }}
      </p>
      <p class="text-sm text-muted-foreground max-w-md">
        {{ t('pages.browse.expiredDescription') }}
      </p>
    </div>

    <div v-else-if="pageError === 'network'" class="text-center flex flex-col gap-3 min-h-[300px] items-center justify-center">
      <div class="i-lucide-wifi-off text-5xl text-muted-foreground/40" />
      <p class="text-lg font-medium">
        {{ t('pages.browse.networkError') }}
      </p>
      <Button variant="outline" size="sm" @click="handleRefresh">
        {{ t('pages.browse.retry') }}
      </Button>
    </div>

    <div
      v-else-if="config && files.length === 0"
      class="text-center flex flex-col gap-2 min-h-[300px] items-center justify-center"
    >
      <div class="i-lucide-folder-open text-5xl text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        {{ t('pages.browse.empty') }}
      </p>
    </div>

    <!-- 文件网格/列表 -->
    <template v-else-if="config">
      <!-- 网格视图（双击打开） -->
      <div v-if="viewMode === 'grid' && files.length > 0" class="gap-3 grid grid-cols-2 lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-3">
        <button
          v-for="file in sortedFiles"
          :key="file.name"
          class="group border rounded-lg bg-muted/20 aspect-square transition-colors relative overflow-hidden hover:bg-muted/40"
          :title="t('pages.browse.doubleClickHint')"
          @dblclick="openFile(file)"
        >
          <!-- 图片缩略图 -->
          <img
            v-if="isImageFile(file.name)"
            :src="buildFileUrl(file.name)"
            :alt="displayName(file.name)"
            class="h-full w-full transition-transform object-cover group-hover:scale-105"
            loading="lazy"
          >
          <!-- 视频/其他 -->
          <div v-else class="flex flex-col gap-1 h-full w-full items-center justify-center">
            <FileIcon
              :item="{ name: file.name, isFolder: false, metadata: file.metadata }"
              :show-preview="false"
              :size="36"
            />
            <span v-if="isVideoFile(file.name)" class="text-[10px] text-muted-foreground">
              {{ t('pages.browse.video') }}
            </span>
          </div>

          <!-- 右上角复制直链 -->
          <div
            class="p-1.5 rounded-md bg-background/80 opacity-0 transition-opacity right-1.5 top-1.5 absolute backdrop-blur group-hover:opacity-100 hover:!opacity-100"
            @click.stop="copyUrl(file.name)"
          >
            <div class="i-lucide-link text-foreground/70" style="width: 14px; height: 14px;" />
          </div>

          <!-- 底部信息 -->
          <div class="px-2 pb-1.5 pt-5 inset-x-0 bottom-0 absolute from-black/60 to-transparent bg-gradient-to-t">
            <div class="text-[11px] text-white/95 text-left truncate">
              {{ displayName(file.name) }}
            </div>
            <div class="text-[10px] text-white/60 text-left">
              {{ formatFileSize(file.metadata?.FileSize) }}
            </div>
          </div>
        </button>
      </div>

      <!-- 列表视图（双击打开，仿文件管理页列表，仅只读） -->
      <div v-else-if="viewMode === 'list' && files.length > 0" class="border rounded-lg overflow-hidden">
        <div
          class="text-[11px] text-muted-foreground/70 tracking-wide px-3 py-2 border-b gap-2 hidden uppercase items-center md:grid lg:grid-cols-[32px_minmax(150px,1fr)_100px_150px_40px] md:grid-cols-[24px_minmax(120px,1fr)_90px_32px]"
        >
          <div />
          <div>{{ t('pages.browse.colName') }}</div>
          <div class="hidden md:block">
            {{ t('pages.browse.colSize') }}
          </div>
          <div class="hidden lg:block">
            {{ t('pages.browse.colDate') }}
          </div>
          <div />
        </div>
        <div>
          <div
            v-for="file in sortedFiles"
            :key="file.name"
            class="px-3 py-2 border-b gap-2 grid grid-cols-[24px_minmax(0,1fr)_32px] transition-colors items-center last:border-b-0 hover:bg-muted/30 lg:grid-cols-[32px_minmax(150px,1fr)_100px_150px_40px] md:grid-cols-[24px_minmax(120px,1fr)_90px_32px]"
            :title="t('pages.browse.doubleClickHint')"
            @dblclick="openFile(file)"
          >
            <FileIcon
              :item="{ name: file.name, isFolder: false, metadata: file.metadata }"
              :show-preview="isImageFile(file.name)"
              :preview-url="buildFileUrl(file.name)"
              :size="24"
            />
            <button
              class="text-sm text-left min-w-0 truncate hover:underline"
              :title="t('pages.browse.doubleClickHint')"
              @dblclick="openFile(file)"
            >
              {{ displayName(file.name) }}
            </button>
            <div class="text-sm text-muted-foreground hidden tabular-nums md:block">
              {{ formatFileSize(file.metadata?.FileSize) }}
            </div>
            <div class="text-sm text-muted-foreground hidden tabular-nums lg:block">
              {{ formatDate(file.metadata?.TimeStamp) }}
            </div>
            <div class="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                class="text-muted-foreground h-7 w-7 hover:text-foreground"
                :title="t('pages.browse.copyLink')"
                @click="copyUrl(file.name)"
              >
                <div class="i-lucide-link" style="width: 14px; height: 14px;" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="loadedCount < totalCount" class="py-4 flex justify-center">
        <Button variant="outline" :disabled="loading" @click="handleLoadMore">
          <div v-if="loading" class="i-lucide-loader-circle mr-2 animate-spin" style="width: 14px; height: 14px;" />
          {{ loading ? t('pages.browse.loadingMore') : t('pages.browse.loadMore') }}
        </Button>
      </div>
    </template>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="currentPreview"
        class="p-4 bg-black/90 flex items-center inset-0 justify-center fixed z-50"
        @click.self="closePreview"
      >
        <button
          class="text-white/80 p-2 rounded-full transition-colors right-4 top-4 absolute hover:bg-white/10"
          @click="closePreview"
        >
          <div class="i-lucide-x" style="width: 22px; height: 22px;" />
        </button>

        <button
          v-if="previewIndex > 0"
          class="text-white/80 p-2 rounded-full transition-colors left-3 top-1/2 absolute hover:bg-white/10 -translate-y-1/2"
          @click="prevImage"
        >
          <div class="i-lucide-chevron-left" style="width: 28px; height: 28px;" />
        </button>

        <div class="flex flex-col gap-3 max-h-full max-w-full items-center">
          <img
            :src="buildFileUrl(currentPreview.name)"
            :alt="displayName(currentPreview.name)"
            class="rounded max-h-[78vh] max-w-full object-contain"
          >
          <div class="text-white/90 flex flex-col gap-1 items-center">
            <div class="text-sm max-w-[80vw] truncate">
              {{ displayName(currentPreview.name) }}
            </div>
            <div class="text-xs text-white/60">
              {{ formatFileSize(currentPreview.metadata?.FileSize) }} · {{ formatDate(currentPreview.metadata?.TimeStamp) }}
            </div>
          </div>
        </div>

        <button
          v-if="previewIndex < imageFiles.length - 1"
          class="text-white/80 p-2 rounded-full transition-colors right-3 top-1/2 absolute hover:bg-white/10 -translate-y-1/2"
          @click="nextImage"
        >
          <div class="i-lucide-chevron-right" style="width: 28px; height: 28px;" />
        </button>
      </div>
    </Teleport>
  </div>
</template>
