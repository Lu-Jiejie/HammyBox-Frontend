<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import Hint from '@/components/Hint.vue'
import InfoPopover from '@/components/InfoPopover.vue'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import {
  Dropzone,
  DropzoneArea,
  DropzoneFileList,
  DropzoneFileListItem,
  DropzoneMessage,
  DropzoneRemoveFile,
  DropzoneTrigger,
  InfiniteProgress,
  useDropzoneUpload,
} from '@/components/shadcn/dropzone'
import { useAppStore } from '@/stores'
import { uploadWithRouting } from '@/utils/upload'

const { t } = useI18n()
const store = useAppStore()

// 直接就近从 Pinia 中吸取全局状态，消除组件 Props 层层传递
const {
  uploadChannel,
  uploadChannelName,
  uploadFolder,
  uploadNameType,
  uploadTags,
} = storeToRefs(store)

interface UploadResponse {
  success: boolean
  data: {
    src: string
    fileId: string
  }
}

const createdUrls = new Set<string>()

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function getFilePreviewUrl(file: File): string {
  if (isImageFile(file)) {
    const url = URL.createObjectURL(file)
    createdUrls.add(url)
    return url
  }
  return ''
}

// 构建完整的文件 URL
function buildFileUrl(src: string): string {
  return `${window.location.protocol}//${window.location.host}${src}`
}

// 复制不同格式的链接
async function copyInFormat(url: string, fileName: string, format: 'url' | 'markdown' | 'html' | 'bbcode') {
  let textToCopy = ''
  switch (format) {
    case 'url':
      textToCopy = url
      break
    case 'markdown':
      textToCopy = `![${fileName}](${url})`
      break
    case 'html':
      textToCopy = `<img src="${url}" alt="${fileName}" />`
      break
    case 'bbcode':
      textToCopy = `[img]${url}[/img]`
      break
  }
  navigator.clipboard.writeText(textToCopy)
  toast.success(t('pages.upload.messages.copyUrlSuccess'))
}

// 不可重试的错误码列表（渠道配置问题、IP封禁等）
const NON_RETRYABLE_ERROR_CODES = [
  'CHANNEL_NOT_AVAILABLE',
  'TELEGRAM_CHANNEL_NOT_AVAILABLE',
  'DISCORD_CHANNEL_NOT_AVAILABLE',
  'DISCORD_CHANNEL_MISCONFIGURED',
  'HUGGINGFACE_CHANNEL_NOT_AVAILABLE',
  'HUGGINGFACE_CHANNEL_MISCONFIGURED',
  'S3_CHANNEL_NOT_AVAILABLE',
  'R2_CHANNEL_NOT_AVAILABLE',
  'WEBDAV_CHANNEL_NOT_AVAILABLE',
  'WEBDAV_CHANNEL_MISCONFIGURED',
  'WEBDAV_CHUNK_NOT_SUPPORTED',
  'IP_BLOCKED',
  'R2_NOT_CONFIGURED',
]

// 提取后端错误信息
function extractBackendError(error: any): { message: string, code?: string, isRetryable: boolean } {
  console.log('[extractBackendError] 原始错误对象:', error)
  let errorMessage = t('pages.upload.messages.uploadFailed')
  let errorCode: string | undefined

  if (error?.response?.data) {
    const data = error.response.data
    console.log('[extractBackendError] error.response.data:', data)
    // 后端统一错误格式：{ success: false, error: "...", code: "..." }
    if (typeof data === 'string') {
      errorMessage = data
    }
    else if (data.error) {
      errorMessage = data.error
      errorCode = data.code
    }
    else if (data.message) {
      errorMessage = data.message
    }
  }
  else if (error?.message) {
    errorMessage = error.message
  }

  console.log('[extractBackendError] 提取结果 - message:', errorMessage, 'code:', errorCode)

  // 判断是否可重试
  const isRetryable = !errorCode || !NON_RETRYABLE_ERROR_CODES.includes(errorCode)

  console.log('[extractBackendError] 是否可重试:', isRetryable)

  return { message: errorMessage, code: errorCode, isRetryable }
}

const dropzone = useDropzoneUpload<UploadResponse, string>({
  onDropFile: async (file: File) => {
    console.log(`[FileDropzone] 开始上传文件: ${file.name}`)
    const uploadParams: Record<string, any> = {
      uploadChannel: uploadChannel.value || 'telegram',
      uploadNameType: uploadNameType.value || 'default',
      uploadFolder: uploadFolder.value || '',
    }

    if (uploadChannelName.value)
      uploadParams.channelName = uploadChannelName.value

    if (uploadTags.value && uploadTags.value.length > 0)
      uploadParams.tags = uploadTags.value.join(',')

    // 手动实现重试逻辑以支持不可重试的错误
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`[FileDropzone] 尝试 ${attempt + 1}/${maxRetries}`)
      try {
        const { data: result, processedSize } = await uploadWithRouting<UploadResponse>(
          file,
          uploadParams,
          store.compressConfig,
        )
        console.log(`[FileDropzone] 上传成功`)
        return { status: 'success' as const, result, processedSize }
      }
      catch (error: any) {
        console.log(`[FileDropzone] 上传失败，开始分析错误...`, error)
        const { message: errorMessage, code: errorCode, isRetryable } = extractBackendError(error)
        console.log(`[FileDropzone] 错误信息: ${errorMessage}, 错误码: ${errorCode}, 可重试: ${isRetryable}`)

        // 如果是不可重试的错误，立即返回错误，不再尝试
        if (!isRetryable) {
          console.log(`[FileDropzone] 不可重试错误，立即停止`)
          return { status: 'error' as const, error: errorMessage }
        }

        // 如果是可重试的错误
        if (attempt < maxRetries - 1) {
          // 还有重试机会，等待后重试
          console.log(`[FileDropzone] 可重试错误，2秒后重试...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        else {
          // 已经是最后一次尝试，返回错误
          console.log(`[FileDropzone] 已达最大重试次数`)
          return { status: 'error' as const, error: errorMessage }
        }
      }
    }

    // 理论上不会到这里，但为了类型安全
    return { status: 'error' as const, error: t('pages.upload.messages.uploadFailed') }
  },
  onRemoveFile: async (id: string) => {
    const file = dropzone.fileStatuses.value.find(f => f.id === id)
    if (file?.result?.data.src && createdUrls.has(file.result.data.src))
      createdUrls.delete(file.result.data.src)
  },
  onFileUploaded: (result: UploadResponse) => {
    toast.success(t('pages.upload.messages.uploadSuccess'))
    if (result.data.src)
      createdUrls.add(result.data.src)
  },
  onFileUploadError: (error: string) => {
    // 直接显示传入的错误信息（已经在 onDropFile 中提取过）
    toast.error(error || t('pages.upload.messages.uploadFailed'))
  },
  validation: {
    maxFiles: 10,
  },
  maxRetryCount: 3,
  autoRetry: false, // 禁用自动重试，改为在 onDropFile 中手动控制
})

// 统计任务状态
const taskStats = computed(() => {
  const files = dropzone.fileStatuses.value
  return {
    total: files.length,
    success: files.filter(f => f.status === 'success').length,
    failed: files.filter(f => f.status === 'error').length,
    uploading: files.filter(f => f.status === 'pending').length,
  }
})

async function copyAllUrls() {
  const urls = dropzone.fileStatuses.value
    .filter(f => f.status === 'success' && (f.result?.data?.src))
    .map(f => buildFileUrl(f.result!.data!.src))
    .join('\n')
  if (urls) {
    navigator.clipboard.writeText(urls)
    toast.success(t('pages.upload.messages.copyAllSuccess'))
  }
}

function clearAll() {
  dropzone.fileStatuses.value.forEach(f => dropzone.onRemoveFile(f.id))
}

function clearSuccess() {
  dropzone.fileStatuses.value.filter(f => f.status === 'success').forEach(f => dropzone.onRemoveFile(f.id))
}

function retryAllFailed() {
  dropzone.fileStatuses.value.filter(f => f.status === 'error').forEach((f) => {
    if (dropzone.canRetry(f.id))
      dropzone.onRetry(f.id)
  })
}

// 自定义单个文件重试
async function retryFile(fileId: string) {
  const file = dropzone.fileStatuses.value.find(f => f.id === fileId)
  if (!file)
    return

  // 重置状态为上传中
  file.status = 'pending'
  file.error = undefined

  try {
    const uploadParams: Record<string, any> = {
      uploadChannel: uploadChannel.value || 'telegram',
      uploadNameType: uploadNameType.value || 'default',
      uploadFolder: uploadFolder.value || '',
    }

    if (uploadChannelName.value)
      uploadParams.channelName = uploadChannelName.value

    const result = await uploadWithRouting<UploadResponse>(
      file.file,
      uploadParams,
      store.compressConfig,
    )

    file.status = 'success'
    file.result = result
    toast.success(t('pages.upload.messages.uploadSuccess'))
  }
  catch (error: any) {
    const { message: errorMessage } = extractBackendError(error)

    file.status = 'error'
    file.error = errorMessage
    toast.error(errorMessage)
  }
}

onBeforeUnmount(() => {
  createdUrls.forEach((url) => {
    if (url.startsWith('blob:'))
      URL.revokeObjectURL(url)
  })
  createdUrls.clear()
})
</script>

<template>
  <Dropzone v-bind="dropzone">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <DropzoneMessage class="text-sm" />
    </div>

    <DropzoneArea>
      <DropzoneTrigger
        class="p-12 text-center border-muted-foreground/25 border-dashed bg-transparent flex flex-col gap-4 items-center hover:border-muted-foreground/40 hover:bg-muted/30"
      >
        <div class="i-lucide-cloud-upload text-muted-foreground" style="width: 48px; height: 48px;" />
        <div class="text-sm">
          <p class="text-lg font-medium">
            {{ t('pages.upload.selectFiles') }}
          </p>
          <p class="text-muted-foreground mt-1">
            {{ t('pages.upload.dragText') }}
          </p>
        </div>
      </DropzoneTrigger>
    </DropzoneArea>

    <div v-if="dropzone.fileStatuses.value.length > 0" class="mt-5 space-y-5">
      <!-- 统计和操作按钮栏 -->
      <div class="p-3 border rounded-sm bg-card flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
        <!-- 左侧：任务统计 -->
        <div class="text-sm flex flex-wrap gap-3 sm:gap-4">
          <div class="flex gap-1.5 items-center">
            <div class="i-lucide-list-todo text-muted-foreground" style="width: 16px; height: 16px;" />
            <span class="font-medium">{{ taskStats.total }}</span>
          </div>
          <div class="flex gap-1.5 items-center">
            <div class="i-lucide-circle-check text-green-600" style="width: 16px; height: 16px;" />
            <span class="text-green-600 font-medium">{{ taskStats.success }}</span>
          </div>
          <div class="flex gap-1.5 items-center">
            <div class="i-lucide-circle-x text-destructive" style="width: 16px; height: 16px;" />
            <span class="text-destructive font-medium">{{ taskStats.failed }}</span>
          </div>
          <div class="flex gap-1.5 items-center">
            <div class="i-lucide-loader-circle text-blue-600" style="width: 16px; height: 16px;" />
            <span class="text-blue-600 font-medium">{{ taskStats.uploading }}</span>
          </div>
        </div>

        <!-- 右侧：操作按钮 -->
        <div class="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
          <Hint :content="t('pages.upload.actions.copyAll')">
            <Button variant="outline" size="sm" class="flex-1 sm:flex-none" @click="copyAllUrls">
              {{ t('pages.upload.actions.copyAll') }}
            </Button>
          </Hint>
          <Hint :content="t('pages.upload.actions.retryFailed')">
            <Button variant="outline" size="sm" class="flex-1 sm:flex-none" :disabled="taskStats.failed === 0" @click="retryAllFailed">
              {{ t('pages.upload.actions.retryFailed') }}
            </Button>
          </Hint>

          <!-- 清空列表下拉菜单 -->
          <Hint :content="t('pages.upload.actions.clearList')" :as-child="false">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="destructive" size="sm" class="flex-1 sm:flex-none">
                  {{ t('pages.upload.actions.clearList') }}
                  <div class="i-lucide-chevron-down ml-1" style="width: 14px; height: 14px;" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="clearSuccess">
                  {{ t('pages.upload.actions.clearSuccess') }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="clearAll">
                  {{ t('pages.upload.actions.clearAll') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Hint>
        </div>
      </div>

      <DropzoneFileList v-auto-animate class="space-y-4">
        <DropzoneFileListItem
          v-for="file in dropzone.fileStatuses.value"
          :key="file.id"
          :file="file"
          class="mb--2 p-3 border rounded-sm"
        >
          <div class="flex gap-3">
            <!-- 左侧预览图，高度跟随整个 item -->
            <div class="rounded bg-muted flex shrink-0 h-14 aspect-ratio-square items-center self-stretch justify-center overflow-hidden">
              <img
                v-if="isImageFile(file.file)"
                :src="getFilePreviewUrl(file.file)"
                :alt="file.fileName"
                class="h-full w-full object-cover"
              >
              <div v-else class="i-lucide-file text-muted-foreground" style="width: 24px; height: 24px;" />
            </div>

            <!-- 中间内容区 -->
            <div class="flex flex-1 flex-col min-w-0 justify-between">
              <!-- 第一行：文件名 + 操作按钮 -->
              <div class="flex gap-2 items-start justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">
                    {{ file.fileName }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ ((file.processedSize || file.file.size) / (1024 * 1024)).toFixed(2) }} MB
                    <span v-if="file.processedSize && file.processedSize < file.file.size" class="text-green-600">
                      ({{ t('pages.upload.compressed') }})
                    </span>
                  </p>
                </div>

                <!-- 右侧操作按钮栏 -->
                <div class="flex shrink-0 gap-1">
                  <!-- 错误信息按钮 (仅失败时显示) -->
                  <InfoPopover
                    v-if="file.status === 'error'"
                    :content="file.error || t('pages.upload.messages.uploadFailed')"
                    side="left"
                    align="start"
                    variant="error"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive p-1 h-7 w-7 hover:text-destructive"
                    >
                      <div class="i-lucide-alert-circle" style="width: 16px; height: 16px;" />
                    </Button>
                  </InfoPopover>

                  <!-- 复制按钮 (仅成功时显示) -->
                  <DropdownMenu v-if="file.status === 'success' && (file.result?.data?.src)">
                    <DropdownMenuTrigger as-child>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="p-1 h-7 w-7"
                      >
                        <div class="i-lucide-copy" style="width: 14px; height: 14px;" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="copyInFormat(buildFileUrl(file.result.data.src), file.fileName, 'url')">
                        {{ t('pages.upload.copyFormats.url') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="copyInFormat(buildFileUrl(file.result.data.src), file.fileName, 'markdown')">
                        {{ t('pages.upload.copyFormats.markdown') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="copyInFormat(buildFileUrl(file.result.data.src), file.fileName, 'html')">
                        {{ t('pages.upload.copyFormats.html') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="copyInFormat(buildFileUrl(file.result.data.src), file.fileName, 'bbcode')">
                        {{ t('pages.upload.copyFormats.bbcode') }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- 重试按钮 (仅失败时显示) -->
                  <Hint v-if="file.status === 'error'" :content="t('pages.upload.actions.retryFailed')">
                    <Button variant="ghost" size="sm" class="p-1 h-7 w-7" @click="retryFile(file.id)">
                      <div class="i-lucide-refresh-cw" style="width: 14px; height: 14px;" />
                    </Button>
                  </Hint>

                  <!-- 删除按钮 (始终显示) -->
                  <DropzoneRemoveFile variant="ghost" size="sm" class="p-1 h-7 w-7">
                    <div class="i-lucide-trash-2" style="width: 14px; height: 14px;" />
                  </DropzoneRemoveFile>
                </div>
              </div>

              <!-- 进度条 -->
              <InfiniteProgress :status="file.status" />

              <!-- 成功后的链接输入框
              <div v-if="file.status === 'success' && (file.result?.data?.src)" class="flex gap-2">
                <input
                  :value="buildFileUrl(file.result.data.src)"
                  readonly
                  class="text-xs px-2 py-1 border rounded bg-muted/50 flex-1 truncate"
                >
              </div> -->
            </div>
          </div>
        </DropzoneFileListItem>
      </DropzoneFileList>
    </div>
  </Dropzone>
</template>
