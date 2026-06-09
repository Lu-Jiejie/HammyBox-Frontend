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

defineProps<Props>()
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
  return [...builtInTags, ...userTags.value]
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
}

function toggleTag(tagName: string) {
  const index = uploadTags.value.indexOf(tagName)
  if (index > -1) {
    uploadTags.value.splice(index, 1)
  }
  else {
    uploadTags.value.push(tagName)
  }
}

function removeSelectedTag(tagName: string) {
  const index = uploadTags.value.indexOf(tagName)
  if (index > -1) {
    uploadTags.value.splice(index, 1)
  }
}

// 压缩配置的响应式引用
const compressConfig = computed(() => store.compressConfig)

// 用于 Slider 的本地数组（Slider 需要数组格式）
const compressBarArray = computed({
  get: () => [store.compressConfig.compressBar],
  set: (val) => { store.compressConfig.compressBar = val[0] },
})

const compressQualityArray = computed({
  get: () => [store.compressConfig.compressQuality],
  set: (val) => { store.compressConfig.compressQuality = val[0] },
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

// 静态配置：文件命名方式
const namingTypes = [
  { value: 'default', label: t('uploadPreferences.naming.default'), description: '时间戳+随机数_原文件名' },
  { value: 'index', label: t('uploadPreferences.naming.index'), description: '时间戳+随机数.扩展名' },
  { value: 'origin', label: t('uploadPreferences.naming.origin'), description: '保留原文件名' },
  { value: 'short', label: t('uploadPreferences.naming.short'), description: '8位随机短链' },
]

// uploadFolder 的特殊处理：移除前导斜杠（后端使用空字符串表示根目录）
watch(uploadFolder, (newValue) => {
  if (newValue && newValue.startsWith('/')) {
    uploadFolder.value = newValue.slice(1)
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="max-h-[80vh] max-w-2xl w-[calc(100vw-2rem)] overflow-y-auto sm:w-full">
      <DialogHeader>
        <DialogTitle>{{ t('uploadPreferences.title') }}</DialogTitle>
        <DialogDescription class="text-xs">
          {{ t('uploadPreferences.subtitle') }}
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 space-y-6">
        <!-- 渠道配置组 -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="uploadChannel">{{ t('uploadPreferences.channel.type') }}</Label>
            <Select v-model="uploadChannel">
              <SelectTrigger id="uploadChannel">
                <SelectValue :placeholder="t('uploadPreferences.channel.type')" />
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
              <Label for="channelName">{{ t('uploadPreferences.channel.name') }}</Label>
              <InfoPopover :content="t('uploadPreferences.channel.nameTooltip')" />
            </div>
            <Input
              id="channelName"
              v-model="uploadChannelName"
              :placeholder="t('uploadPreferences.channel.autoSelect')"
            />
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="border-t" />

        <!-- 上传路径组 -->
        <div class="space-y-2">
          <Label for="uploadFolder">{{ t('uploadPreferences.channel.directory') }}</Label>
          <FolderTreeSelector v-model="uploadFolder" />
          <p class="text-xs text-muted-foreground">
            {{ t('uploadPreferences.channel.directoryPlaceholder') }}
          </p>
        </div>

        <!-- 分隔线 -->
        <div class="border-t" />

        <!-- 文件命名组 -->
        <div class="space-y-2">
          <Label for="namingType">{{ t('uploadPreferences.naming.title') }}</Label>
          <Select v-model="uploadNameType">
            <SelectTrigger id="namingType">
              <SelectValue :placeholder="t('uploadPreferences.naming.title')">
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
            <Label>{{ t('uploadPreferences.tags.title') }}</Label>
            <p class="text-xs text-muted-foreground">
              {{ t('uploadPreferences.tags.description') }}
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
              <span class="text-sm text-muted-foreground">{{ t('uploadPreferences.tags.noSelectedTags') }}</span>
            </div>
          </div>

          <!-- 添加新标签 -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <Input
                v-model="newTagInput"
                :placeholder="t('uploadPreferences.tags.inputPlaceholder')"
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
            <Label class="text-xs text-muted-foreground">{{ t('uploadPreferences.tags.availableTags') }}</Label>
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
                {{ t('uploadPreferences.preprocessing.convertToWebp') }}
              </Label>
              <InfoPopover :content="t('uploadPreferences.preprocessing.convertToWebpTooltip')" />
            </div>
            <Switch id="convertToWebp" v-model:checked="compressConfig.convertToWebp" />
          </div>

          <div class="p-3 border rounded-lg bg-card flex gap-3 items-center justify-between">
            <div class="flex gap-1.5 min-w-0 items-center">
              <Label for="customerCompress" class="font-medium cursor-pointer">
                {{ t('uploadPreferences.preprocessing.clientCompress') }}
              </Label>
            </div>
            <Switch id="customerCompress" v-model:checked="compressConfig.customerCompress" />
          </div>

          <div v-if="compressConfig.customerCompress" class="space-y-4">
            <div class="space-y-2">
              <div class="flex gap-1.5 items-center justify-between">
                <div class="flex gap-1.5 items-center">
                  <Label for="compressBar">{{ t('uploadPreferences.preprocessing.compressThreshold') }}</Label>
                  <InfoPopover :content="t('uploadPreferences.preprocessing.compressThresholdTooltip')" />
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
                  <Label for="compressQuality">{{ t('uploadPreferences.preprocessing.expectedSize') }}</Label>
                  <InfoPopover :content="t('uploadPreferences.preprocessing.expectedSizeTooltip')" />
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
                {{ t('uploadPreferences.serverCompress.enable') }}
              </Label>
              <InfoPopover :content="t('uploadPreferences.serverCompress.tooltip')" />
            </div>
            <Switch id="serverCompress" v-model:checked="compressConfig.serverCompress" />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
