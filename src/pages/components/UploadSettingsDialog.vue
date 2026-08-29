<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FolderTreeSelector from '@/components/FolderTreeSelector.vue'
import InfoPopover from '@/components/InfoPopover.vue'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Slider } from '@/components/shadcn/slider'
import { Switch } from '@/components/shadcn/switch'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'

interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const store = useAppStore()

// 直接使用 storeToRefs 获取响应式引用，实现实时双向绑定
const {
  uploadChannel,
  uploadChannelName,
  uploadFolder,
  uploadNameType,
  uploadTags,
  userTags,
} = storeToRefs(store)

// 内置标签
const builtInTags = ['blocked', 'whitelist', 'nsfw', 'shared']

// 合并内置标签和用户标签
const availableTags = computed(() => {
  const allTags = [...builtInTags, ...userTags.value]
  return allTags.sort((a, b) => {
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

// 新标签输入
const newTagInput = ref('')

function addNewTag() {
  const tag = newTagInput.value.trim().toLowerCase()
  if (!tag) {
    return
  }

  // 检查是否与内置标签重名
  if (builtInTags.includes(tag)) {
    return
  }

  // 检查是否已存在
  if (userTags.value.includes(tag)) {
    return
  }

  userTags.value.push(tag)
  newTagInput.value = ''
  // 同步到云端（fire-and-forget，失败不阻塞）
  void store.syncUserTagsToCloud().catch(() => {})
}

function removeUserTag(tag: string) {
  const index = userTags.value.indexOf(tag)
  if (index > -1) {
    userTags.value.splice(index, 1)
  }
  // 如果该标签已被选中，也从选中列表中移除
  const selectedIndex = uploadTags.value.indexOf(tag)
  if (selectedIndex > -1) {
    uploadTags.value.splice(selectedIndex, 1)
  }
  // 同步到云端（fire-and-forget，失败不阻塞）
  void store.syncUserTagsToCloud().catch(() => {})
}

function toggleTag(tagName: string) {
  const index = uploadTags.value.indexOf(tagName)
  if (index > -1) {
    uploadTags.value.splice(index, 1)
  }
  else {
    // blocked 和 whitelist 互斥
    if (tagName === 'blocked' && uploadTags.value.includes('whitelist')) {
      uploadTags.value.splice(uploadTags.value.indexOf('whitelist'), 1)
    }
    else if (tagName === 'whitelist' && uploadTags.value.includes('blocked')) {
      uploadTags.value.splice(uploadTags.value.indexOf('blocked'), 1)
    }
    uploadTags.value.push(tagName)
  }
}

function removeSelectedTag(tagName: string) {
  const index = uploadTags.value.indexOf(tagName)
  if (index > -1) {
    uploadTags.value.splice(index, 1)
  }
}

const compressConfig = store.compressConfig

const convertToWebp = computed({
  get: () => compressConfig.convertToWebp,
  set: (val) => { compressConfig.convertToWebp = val },
})
const customerCompress = computed({
  get: () => compressConfig.customerCompress,
  set: (val) => { compressConfig.customerCompress = val },
})
const serverCompress = computed({
  get: () => compressConfig.serverCompress,
  set: (val) => { compressConfig.serverCompress = val },
})
const compressBar = computed({
  get: () => compressConfig.compressBar,
  set: (val) => { compressConfig.compressBar = val },
})
const compressQuality = computed({
  get: () => compressConfig.compressQuality,
  set: (val) => { compressConfig.compressQuality = val },
})

// 当 threshold 变小时，自动调整 quality
watch(() => compressConfig.compressBar, (newBar) => {
  if (compressConfig.compressQuality > newBar) {
    compressConfig.compressQuality = newBar
  }
})

// 用于 Slider 的本地数组（Slider 需要数组格式）
const compressBarArray = computed({
  get: () => [compressBar.value],
  set: (val) => { compressBar.value = val[0] },
})

const compressQualityArray = computed({
  get: () => [compressQuality.value],
  set: (val) => { compressQuality.value = val[0] },
})

// 静态配置：可用渠道列表
const channels = [
  { value: 'telegram', label: 'Telegram', icon: 'i-logos-telegram' },
  { value: 'cfr2', label: 'Cloudflare R2', icon: 'i-logos-cloudflare-icon' },
  { value: 's3', label: 'S3', icon: 'i-streamline-color-amazon-flat' },
  { value: 'discord', label: 'Discord', icon: 'i-logos-discord-icon' },
  { value: 'huggingface', label: 'HuggingFace', icon: 'i-logos-hugging-face-icon' },
  { value: 'webdav', label: 'WebDAV', icon: 'i-streamline-color-database-server-1' },
]

// 静态配置：存储路径格式
const namingTypes = [
  { value: 'default', label: t('pages.upload.preferences.naming.default'), description: '时间戳前缀 + 原始文件名' },
  { value: 'index', label: t('pages.upload.preferences.naming.index'), description: '纯时间戳作为文件名' },
  { value: 'origin', label: t('pages.upload.preferences.naming.origin'), description: '保留原始文件名' },
  { value: 'short', label: t('pages.upload.preferences.naming.short'), description: '随机短字符串路径' },
]

// uploadFolder 的特殊处理：移除前导斜杠（后端使用空字符串表示根目录）
watch(uploadFolder, (newValue) => {
  if (newValue && newValue.startsWith('/')) {
    uploadFolder.value = newValue.slice(1)
  }
})

// 打开对话框时从云端拉取共享标签库（与公开页/其他端保持一致）
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    void store.fetchUserTagsFromCloud().catch(() => {})
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="max-h-[80vh] max-w-2xl w-[calc(100vw-2rem)] overflow-y-auto sm:w-full">
      <DialogHeader>
        <DialogTitle>{{ t('pages.upload.preferences.title') }}</DialogTitle>
        <DialogDescription class="text-xs">
          {{ t('pages.upload.preferences.subtitle') }}
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 space-y-6">
        <!-- 渠道配置组 -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="uploadChannel">{{ t('pages.upload.preferences.channel.type') }}</Label>
            <Select v-model="uploadChannel">
              <SelectTrigger id="uploadChannel">
                <SelectValue :placeholder="t('pages.upload.preferences.channel.type')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="channel in channels"
                  :key="channel.value"
                  :value="channel.value"
                >
                  <span class="flex gap-2 items-center">
                    <div :class="`${channel.icon} w-5`" />
                    <span>{{ channel.label }}</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <div class="flex gap-1.5 items-center">
              <Label for="channelName">{{ t('pages.upload.preferences.channel.name') }}</Label>
              <InfoPopover :content="t('pages.upload.preferences.channel.nameTooltip')" />
            </div>
            <Input
              id="channelName"
              v-model="uploadChannelName"
              :placeholder="t('pages.upload.preferences.channel.autoSelect')"
            />
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="border-t" />

        <!-- 上传路径组 -->
        <div class="space-y-2">
          <Label for="uploadFolder">{{ t('pages.upload.preferences.channel.directory') }}</Label>
          <FolderTreeSelector v-model="uploadFolder" />
          <p class="text-xs text-muted-foreground">
            {{ t('pages.upload.preferences.channel.directoryPlaceholder') }}
          </p>
        </div>

        <!-- 分隔线 -->
        <div class="border-t" />

        <!-- 文件命名组 -->
        <div class="space-y-2">
          <Label for="namingType">{{ t('pages.upload.preferences.naming.title') }}</Label>
          <Select v-model="uploadNameType">
            <SelectTrigger id="namingType">
              <SelectValue :placeholder="t('pages.upload.preferences.naming.title')">
                {{ namingTypes.find(type => type.value === uploadNameType)?.label }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="type in namingTypes"
                :key="type.value"
                :value="type.value"
              >
                <div class="flex flex-col gap-1">
                  <div class="font-medium">
                    {{ type.label }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {{ type.description }}
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 分隔线 -->
        <div class="border-t" />

        <!-- 标签配置组 -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>{{ t('pages.upload.preferences.tags.title') }}</Label>
            <p class="text-xs text-muted-foreground">
              {{ t('pages.upload.preferences.tags.description') }}
            </p>
          </div>

          <!-- 已选择的标签 -->
          <div class="space-y-2">
            <div v-if="uploadTags.length > 0" class="p-3 border rounded-lg bg-muted/30">
              <div class="flex flex-wrap gap-2">
                <TagBadge
                  v-for="tag in uploadTags"
                  :key="tag"
                  :tag="tag"
                  :color="store.getTagColor(tag)"
                  show-delete
                  @delete="removeSelectedTag(tag)"
                />
              </div>
            </div>
            <div v-else class="p-3 text-center border rounded-lg bg-muted/30">
              <span class="text-sm text-muted-foreground">{{ t('pages.upload.preferences.tags.noSelectedTags') }}</span>
            </div>
          </div>

          <!-- 添加新标签 -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <Input
                v-model="newTagInput"
                :placeholder="t('pages.upload.preferences.tags.inputPlaceholder')"
                class="flex-1"
                @keyup.enter="addNewTag"
              />
              <Button variant="outline" size="icon" @click="addNewTag">
                <div class="i-lucide-plus" />
              </Button>
            </div>
          </div>

          <!-- 备选标签 -->
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">{{ t('pages.upload.preferences.tags.availableTags') }}</Label>
            <div class="p-3 border rounded-lg bg-background min-h-[80px]">
              <div class="flex flex-wrap gap-2">
                <TagBadge
                  v-for="tag in availableTags.filter(t => !uploadTags.includes(t))"
                  :key="tag"
                  :tag="tag"
                  :color="store.getTagColor(tag)"
                  :show-delete="!builtInTags.includes(tag)"
                  delete-icon="trash"
                  clickable
                  @click="toggleTag(tag)"
                  @delete="removeUserTag(tag)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="border-t" />

        <!-- 客户端预处理组 -->
        <div class="space-y-4">
          <div class="p-3 border rounded-lg bg-card flex gap-3 items-center justify-between">
            <div class="flex gap-1.5 min-w-0 items-center">
              <Label for="convertToWebp" class="font-medium cursor-pointer">
                {{ t('pages.upload.preferences.preprocessing.convertToWebp') }}
              </Label>
              <InfoPopover :content="t('pages.upload.preferences.preprocessing.convertToWebpTooltip')" />
            </div>
            <Switch id="convertToWebp" v-model="convertToWebp" />
          </div>

          <div class="p-3 border rounded-lg bg-card flex gap-3 items-center justify-between">
            <div class="flex gap-1.5 min-w-0 items-center">
              <Label for="customerCompress" class="font-medium cursor-pointer">
                {{ t('pages.upload.preferences.preprocessing.compress') }}
              </Label>
            </div>
            <Switch id="customerCompress" v-model="customerCompress" />
          </div>

          <div v-if="customerCompress" class="space-y-4">
            <div class="space-y-2">
              <div class="flex gap-1.5 items-center justify-between">
                <div class="flex gap-1.5 items-center">
                  <Label for="compressBar">{{ t('pages.upload.preferences.preprocessing.compressThreshold') }}</Label>
                  <InfoPopover :content="t('pages.upload.preferences.preprocessing.compressThresholdTooltip')" />
                </div>
                <span class="text-sm font-medium">{{ compressBarArray[0] }} MB</span>
              </div>
              <Slider
                id="compressBar"
                v-model="compressBarArray"
                :min="1"
                :max="20"
                :step="1"
              />
            </div>

            <div class="space-y-2">
              <div class="flex gap-1.5 items-center justify-between">
                <div class="flex gap-1.5 items-center">
                  <Label for="compressQuality">{{ t('pages.upload.preferences.preprocessing.expectedSize') }}</Label>
                  <InfoPopover :content="t('pages.upload.preferences.preprocessing.expectedSizeTooltip')" />
                </div>
                <span class="text-sm font-medium">{{ compressQualityArray[0] }} MB</span>
              </div>
              <Slider
                id="compressQuality"
                v-model="compressQualityArray"
                :min="0.5"
                :max="compressBarArray[0]"
                :step="0.5"
              />
            </div>
          </div>
        </div>

        <!-- 分隔线 (仅在 Telegram 时显示) -->
        <div v-if="uploadChannel === 'telegram'" class="border-t" />

        <!-- 服务端压缩组 (仅 Telegram) -->
        <div v-if="uploadChannel === 'telegram'" class="space-y-4">
          <div class="p-3 border rounded-lg bg-card flex gap-3 items-center justify-between">
            <div class="flex gap-1.5 min-w-0 items-center">
              <Label for="serverCompress" class="font-medium cursor-pointer">
                {{ t('pages.upload.preferences.serverCompress.enable') }}
              </Label>
              <InfoPopover :content="t('pages.upload.preferences.serverCompress.tooltip')" />
            </div>
            <Switch id="serverCompress" v-model="serverCompress" />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
