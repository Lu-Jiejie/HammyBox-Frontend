<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import { expandNameTemplate, NAME_PLACEHOLDERS } from '@/utils/nameTemplate'

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
  uploadNameTemplate,
  namingTemplates,
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

// 内置预设对应的模板字符串（选中预设时同步显示在下方输入框）
const presetTemplateMap: Record<string, string> = {
  default: '{Timestamp}_{Name}{Ext}',
  index: '{Timestamp}{Ext}',
  origin: '{Origin}',
  short: '{Random:8}{Ext}',
}

// 静态配置：文件命名格式（内置预设，不含「自定义模板」选项）
const namingTypes = [
  { value: 'default', label: t('pages.upload.preferences.naming.default'), description: t('pages.upload.preferences.naming.defaultDesc') },
  { value: 'index', label: t('pages.upload.preferences.naming.index'), description: t('pages.upload.preferences.naming.indexDesc') },
  { value: 'origin', label: t('pages.upload.preferences.naming.origin'), description: t('pages.upload.preferences.naming.originDesc') },
  { value: 'short', label: t('pages.upload.preferences.naming.short'), description: t('pages.upload.preferences.naming.shortDesc') },
]

// 下拉选项 = 内置预设 + 用户保存的模板（value 使用 template:{id} 便于区分）
const namingOptions = computed(() => {
  const presets = namingTypes.map(type => ({
    value: type.value,
    label: type.label,
    description: type.description,
    template: presetTemplateMap[type.value],
  }))
  const userTemplates = namingTemplates.value.map(tpl => ({
    value: `template:${tpl.id}`,
    label: tpl.name,
    description: tpl.template,
    template: tpl.template,
  }))
  return [...presets, ...userTemplates]
})

// 当前选中的下拉值（内置预设值或 template:{id}）
const selectedNamingValue = computed<string>({
  get() {
    // 内置预设：直接返回预设值
    if (presetTemplateMap[uploadNameType.value])
      return uploadNameType.value
    // custom：尝试匹配用户保存的模板
    if (uploadNameType.value === 'custom') {
      const match = namingTemplates.value.find(tpl => tpl.template === uploadNameTemplate.value)
      return match ? `template:${match.id}` : 'custom'
    }
    return uploadNameType.value
  },
  set(value: string) {
    if (value.startsWith('template:')) {
      const tpl = namingTemplates.value.find(t => `template:${t.id}` === value)
      if (tpl) {
        uploadNameType.value = 'custom'
        uploadNameTemplate.value = tpl.template
      }
    }
    else if (presetTemplateMap[value]) {
      uploadNameType.value = value
      // 选中内置预设时同步显示对应的模板字符串
      uploadNameTemplate.value = presetTemplateMap[value]
    }
  },
})

// 选中的下拉项文案
const selectedNamingLabel = computed(() => {
  const opt = namingOptions.value.find(o => o.value === selectedNamingValue.value)
  return opt?.label || (uploadNameType.value === 'custom' ? t('pages.upload.preferences.naming.custom') : uploadNameType.value)
})

// 当前是否选中了某个已保存模板（供命名模板面板显示删除按钮）。
// 若用户手动修改了模板内容，与已保存模板不再匹配，视为「未选中该模板」，删除按钮隐藏。
const activeSavedTemplate = computed(() => {
  if (uploadNameType.value !== 'custom')
    return null
  return namingTemplates.value.find(tpl => tpl.template === uploadNameTemplate.value) ?? null
})

// 占位符快捷插入
function insertPlaceholder(token: string) {
  uploadNameTemplate.value += token
}

// 保存当前模板为具名模板（类似 tag 的自定义管理）
const newTemplateName = ref('')

function saveCurrentAsTemplate() {
  const name = newTemplateName.value.trim()
  if (!name || !uploadNameTemplate.value.trim())
    return
  // 表达式相同的模板只保留一个：已存在则覆盖其名称，避免出现重复项
  const existing = namingTemplates.value.find(tpl => tpl.template === uploadNameTemplate.value)
  if (existing) {
    existing.name = name
  }
  else {
    namingTemplates.value.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name,
      template: uploadNameTemplate.value,
    })
  }
  newTemplateName.value = ''
  // 保存后同步到云端（fire-and-forget，失败不阻塞）
  void store.syncNamingTemplatesToCloud().catch(() => {})
}

// 删除模板：先弹确认框，确认后再删除
const deleteDialogOpen = ref(false)
const deleteTemplateTarget = ref<{ id: string, name: string } | null>(null)

function requestDeleteTemplate(tpl: { id: string, name: string }) {
  deleteTemplateTarget.value = tpl
  deleteDialogOpen.value = true
}

function confirmDeleteTemplate() {
  const tpl = deleteTemplateTarget.value
  if (!tpl)
    return
  const idx = namingTemplates.value.findIndex(t => t.id === tpl.id)
  if (idx > -1)
    namingTemplates.value.splice(idx, 1)
  deleteTemplateTarget.value = null
  // 若当前模板正是被删模板，保留 uploadNameType/uploadNameTemplate 不变（用户可再选）
  // 同步到云端（fire-and-forget，失败不阻塞）
  void store.syncNamingTemplatesToCloud().catch(() => {})
}

// 模板展开实时预览（使用示例文件名；内置预设也展示对应模板的展开结果）
const namingPreview = computed(() => {
  return expandNameTemplate(uploadNameTemplate.value, { fileName: 'photo1.png', fileExt: 'png' })
})

// 手动修改模板输入框时，若当前是内置预设，自动切换到自定义模式
// （下拉选中预设时由 setter 同步 uploadNameTemplate，不会误触发）
watch(uploadNameTemplate, (val) => {
  if (uploadNameType.value !== 'custom' && val !== presetTemplateMap[uploadNameType.value])
    uploadNameType.value = 'custom'
})

// 内置预设模式下，模板输入框始终显示对应的模板字符串（含初始状态）
watch(uploadNameType, (type) => {
  if (presetTemplateMap[type] && uploadNameTemplate.value !== presetTemplateMap[type])
    uploadNameTemplate.value = presetTemplateMap[type]
}, { immediate: true })

// 占位符说明列表（供按钮展示）
const namePlaceholders = NAME_PLACEHOLDERS

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
          <Select v-model="selectedNamingValue">
            <SelectTrigger id="namingType">
              <SelectValue :placeholder="t('pages.upload.preferences.naming.title')">
                {{ selectedNamingLabel }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="type in namingOptions"
                :key="type.value"
                :value="type.value"
                class="gap-2"
              >
                <div class="flex flex-col gap-1 min-w-0">
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

          <!-- 命名模板配置（内置预设与自定义共用：选内置时同步显示对应模板字符串） -->
          <div class="mt-2 p-3 border rounded-lg bg-muted/20 space-y-3">
            <div class="flex gap-1.5 items-center justify-between">
              <div class="flex gap-1.5 min-w-0 items-center">
                <Label class="text-sm font-medium">
                  {{ t('pages.upload.preferences.naming.template') }}
                </Label>
                <InfoPopover :content="t('pages.upload.preferences.naming.templateTooltip')" />
              </div>
              <!-- 当前选中了某个已保存模板时才显示删除按钮；用户手动修改模板后不再匹配，自动隐藏 -->
              <button
                v-if="activeSavedTemplate"
                class="text-muted-foreground/40 p-1 rounded flex shrink-0 transition-colors items-center hover:text-destructive"
                :aria-label="`${t('pages.upload.preferences.naming.deleteTemplateTitle')}: ${activeSavedTemplate.name}`"
                @click="requestDeleteTemplate(activeSavedTemplate)"
              >
                <div class="i-lucide-trash-2" style="width: 13px; height: 13px;" />
              </button>
            </div>
            <div class="flex gap-2">
              <Input
                v-model="uploadNameTemplate"
                :placeholder="t('pages.upload.preferences.naming.templatePlaceholder')"
                class="text-xs font-mono flex-1"
              />
            </div>

            <!-- 占位符快捷按钮 -->
            <div class="flex flex-wrap gap-1.5">
              <Button
                v-for="ph in namePlaceholders"
                :key="ph.token"
                variant="outline"
                size="sm"
                class="text-xs font-mono px-2 h-7"
                @click="insertPlaceholder(ph.token)"
              >
                {{ ph.token }}
              </Button>
            </div>

            <!-- 实时预览（窄屏下标签与文件名分行展示，文件名可自动断行） -->
            <div v-if="namingPreview" class="text-xs text-muted-foreground space-y-1">
              <span>{{ t('pages.upload.preferences.naming.preview') }}:</span>
              <code class="font-mono px-1.5 py-0.5 rounded bg-muted/60 block break-all">{{ namingPreview }}</code>
            </div>

            <!-- 保存当前模板为具名模板（按钮高度与输入框统一） -->
            <div class="pt-1 border-t flex gap-2">
              <Input
                v-model="newTemplateName"
                :placeholder="t('pages.upload.preferences.naming.templateNamePlaceholder')"
                class="text-xs flex-1"
                @keyup.enter="saveCurrentAsTemplate"
              />
              <Button variant="outline" class="shrink-0 h-9" @click="saveCurrentAsTemplate">
                <div class="i-lucide-save mr-1.5" style="width: 13px; height: 13px;" />
                {{ t('pages.upload.preferences.naming.saveAsTemplate') }}
              </Button>
            </div>
          </div>
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

  <!-- 删除命名模板确认框 -->
  <ConfirmDialog
    v-model:open="deleteDialogOpen"
    :title="t('pages.upload.preferences.naming.deleteTemplateTitle')"
    :description="deleteTemplateTarget ? t('pages.upload.preferences.naming.deleteTemplateConfirm', { name: deleteTemplateTarget.name }) : ''"
    :confirm-text="t('pages.upload.preferences.naming.deleteTemplateConfirmText')"
    @confirm="confirmDeleteTemplate"
  />
</template>
