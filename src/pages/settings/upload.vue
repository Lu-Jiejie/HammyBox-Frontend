<script setup lang="ts">
import type { BaseChannel, UploadSettings } from '@/api/settings'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  getQuotaStats,
  getUploadSettings,
  recalculateQuota,
  saveUploadSettings,
} from '@/api/settings'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/shadcn/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Progress } from '@/components/shadcn/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Switch } from '@/components/shadcn/switch'

definePage({
  meta: {
    title: '上传渠道配置',
    auth: true,
  },
})

const { t } = useI18n()

const loading = ref(false)
const quotaLoading = ref(false)
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const addChannelType = ref<keyof UploadSettings>('telegram')
const editChannelType = ref<keyof UploadSettings>('telegram')
const editChannelIndex = ref(-1)
const deleteChannelType = ref<keyof UploadSettings>('telegram')
const deleteChannelIndex = ref(-1)

const newChannel = ref<any>({
  name: '',
  enabled: true,
})

const editChannel = ref<any>({})

const settings = ref<UploadSettings>({
  telegram: { loadBalance: { enabled: false }, channels: [] },
  cfr2: { channels: [] },
  s3: { loadBalance: { enabled: false }, channels: [] },
  discord: { loadBalance: { enabled: false }, channels: [] },
  huggingface: { loadBalance: { enabled: false }, channels: [] },
  webdav: { loadBalance: { enabled: false }, channels: [] },
})

const quotaStats = ref<Record<string, { usedMB: number, fileCount: number }>>({})

const channels = [
  { value: 'telegram', label: t('settings.upload.channels.telegram'), icon: 'i-logos-telegram' },
  { value: 'cfr2', label: t('settings.upload.channels.cfr2'), icon: 'i-logos-cloudflare-icon' },
  { value: 's3', label: t('settings.upload.channels.s3'), icon: 'i-streamline-color-amazon-flat' },
  { value: 'discord', label: t('settings.upload.channels.discord'), icon: 'i-logos-discord-icon' },
  { value: 'huggingface', label: t('settings.upload.channels.huggingface'), icon: 'i-logos-hugging-face-icon' },
  { value: 'webdav', label: t('settings.upload.channels.webdav'), icon: 'i-streamline-color-database-server-1' },
]

const collapsedSections = ref<Record<string, boolean>>({})

function getChannelList(type: keyof UploadSettings) {
  return settings.value[type]?.channels || []
}

function hasLoadBalance(type: string) {
  return ['telegram', 's3', 'discord', 'huggingface', 'webdav'].includes(type)
}

function maskText(text?: string, showLength = 4) {
  if (!text)
    return '****'
  if (text.length <= showLength * 2)
    return '****'
  return `${text.slice(0, showLength)}****${text.slice(-showLength)}`
}

function getQuotaPercentage(channel: BaseChannel) {
  const usedMB = quotaStats.value[channel.name]?.usedMB || 0
  const usedGB = usedMB / 1024
  const limitGB = channel.quota?.limitGB || 10
  const percentage = (usedGB / limitGB) * 100
  return Math.min(100, Math.round(percentage * 10) / 10)
}

function getQuotaText(channel: BaseChannel) {
  const usedMB = quotaStats.value[channel.name]?.usedMB || 0

  // 格式化已使用大小
  let usedText: string
  if (usedMB < 1) {
    usedText = `${(usedMB * 1024).toFixed(0)} KB`
  }
  else if (usedMB < 1024) {
    usedText = `${usedMB.toFixed(2)} MB`
  }
  else {
    usedText = `${(usedMB / 1024).toFixed(2)} GB`
  }

  // 如果没有启用 quota，只显示已使用大小
  if (!channel.quota?.enabled) {
    return usedText
  }

  // 启用了 quota，显示 已使用 / 上限
  const limitGB = channel.quota.limitGB || 10
  const limitMB = limitGB * 1024

  let limitText: string
  if (limitMB < 1024) {
    limitText = `${limitMB.toFixed(0)} MB`
  }
  else {
    limitText = `${limitGB} GB`
  }

  return `${usedText} / ${limitText}`
}

function openAddDialog() {
  newChannel.value = { name: '', enabled: true }
  addChannelType.value = 'telegram'
  showAddDialog.value = true
}

function openEditDialog(type: keyof UploadSettings, index: number) {
  editChannelType.value = type
  editChannelIndex.value = index
  editChannel.value = JSON.parse(JSON.stringify(settings.value[type].channels[index]))

  // 确保 quota 对象存在（兼容旧数据）
  if (['cfr2', 's3', 'webdav'].includes(type) && !editChannel.value.quota) {
    editChannel.value.quota = { enabled: false, limitGB: 10, threshold: 95 }
  }

  showEditDialog.value = true
}

function getDefaultChannel(type: keyof UploadSettings) {
  const base = { name: '', enabled: true }
  switch (type) {
    case 'telegram':
      return { ...base, botToken: '', chatId: '', proxyUrl: '' }
    case 'cfr2':
      return { ...base, publicUrl: '', quota: { enabled: false, limitGB: 10, threshold: 95 } }
    case 's3':
      return { ...base, endpoint: '', bucketName: '', region: 'auto', accessKeyId: '', secretAccessKey: '', pathStyle: false, cdnDomain: '', quota: { enabled: false, limitGB: 10, threshold: 95 } }
    case 'discord':
      return { ...base, botToken: '', channelId: '', proxyUrl: '', isNitro: false }
    case 'huggingface':
      return { ...base, repo: '', token: '', isPrivate: false }
    case 'webdav':
      return { ...base, baseUrl: '', username: '', password: '', publicUrl: '', createDirectory: true, quota: { enabled: false, limitGB: 10, threshold: 95 } }
    default:
      return base
  }
}

function handleChannelTypeChange() {
  const base = { name: newChannel.value.name, enabled: newChannel.value.enabled }
  newChannel.value = { ...base, ...getDefaultChannel(addChannelType.value) }
}

async function handleAddChannel() {
  if (!newChannel.value.name?.trim()) {
    toast.error(t('settings.upload.messages.nameRequired'))
    return
  }

  settings.value[addChannelType.value].channels.push({ ...newChannel.value })
  showAddDialog.value = false
  await handleSaveSettings()
}

async function handleEditChannel() {
  if (!editChannel.value.name?.trim()) {
    toast.error(t('settings.upload.messages.nameRequired'))
    return
  }

  settings.value[editChannelType.value].channels[editChannelIndex.value] = { ...editChannel.value }
  showEditDialog.value = false
  await handleSaveSettings()
}

async function handleDeleteChannel(type: keyof UploadSettings, index: number) {
  const channel = settings.value[type].channels[index]
  if (channel.fixed) {
    toast.error(t('settings.upload.messages.cannotDeleteFixed'))
    return
  }

  deleteChannelType.value = type
  deleteChannelIndex.value = index
  showDeleteDialog.value = true
}

async function confirmDelete() {
  settings.value[deleteChannelType.value].channels.splice(deleteChannelIndex.value, 1)
  await handleSaveSettings()
}

async function loadSettings() {
  loading.value = true
  try {
    const { data } = await getUploadSettings()
    settings.value = data
    await loadQuotaStats()
  }
  catch (error) {
    toast.error(String(error))
  }
  finally {
    loading.value = false
  }
}

async function loadQuotaStats() {
  try {
    const { data } = await getQuotaStats()
    if (data.success && data.quotaStats) {
      quotaStats.value = data.quotaStats
    }
  }
  catch (error) {
    console.error('Failed to load quota stats:', error)
  }
}

async function handleSaveSettings() {
  try {
    await saveUploadSettings(settings.value)
    toast.success(t('settings.upload.messages.saved'))
  }
  catch (error) {
    toast.error(String(error))
  }
}

async function handleRefreshQuota() {
  quotaLoading.value = true
  try {
    const { data } = await recalculateQuota()
    if (data.success && data.quotaStats) {
      quotaStats.value = data.quotaStats
      toast.success(t('settings.upload.messages.quotaRefreshed'))
    }
  }
  catch (error) {
    toast.error(String(error))
  }
  finally {
    quotaLoading.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        {{ t('settings.upload.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.upload.description') }}
      </p>
    </div>

    <div v-if="loading" class="flex min-h-[400px] items-center justify-center">
      <div class="i-lucide-loader-circle text-4xl text-muted-foreground animate-spin" />
    </div>

    <div v-else class="space-y-6">
      <div class="flex gap-2">
        <Button size="sm" variant="outline" :disabled="quotaLoading" @click="handleRefreshQuota">
          <div :class="quotaLoading ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-refresh-cw'" style="width: 14px; height: 14px;" />
          {{ t('settings.upload.actions.refreshQuota') }}
        </Button>
        <Button size="sm" @click="openAddDialog">
          <div class="i-lucide-plus" style="width: 14px; height: 14px;" />
          {{ t('settings.upload.actions.addChannel') }}
        </Button>
      </div>

      <div v-for="channelType in channels" :key="channelType.value">
        <Collapsible v-model:open="collapsedSections[channelType.value]" :default-open="getChannelList(channelType.value as keyof UploadSettings).length > 0">
          <div class="border rounded-lg overflow-hidden">
            <CollapsibleTrigger class="px-4 py-3 border-b bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
              <div class="flex gap-3 items-center">
                <div :class="channelType.icon" style="width: 18px; height: 18px;" />
                <span class="font-semibold">{{ channelType.label }}</span>
                <Badge variant="secondary" class="text-xs">
                  {{ getChannelList(channelType.value as keyof UploadSettings).length }}
                </Badge>
              </div>
              <div class="flex gap-3 items-center">
                <div v-if="hasLoadBalance(channelType.value)" class="flex gap-2 items-center" @click.stop>
                  <span class="text-xs text-muted-foreground">{{ t('settings.upload.loadBalance') }}</span>
                  <Switch
                    :model-value="settings[channelType.value as keyof UploadSettings].loadBalance?.enabled"
                    @update:model-value="(val) => {
                      if (settings[channelType.value as keyof UploadSettings].loadBalance) {
                        settings[channelType.value as keyof UploadSettings].loadBalance!.enabled = val
                        handleSaveSettings()
                      }
                    }"
                  />
                </div>
                <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': collapsedSections[channelType.value] }" style="width: 16px; height: 16px;" />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div v-if="getChannelList(channelType.value as keyof UploadSettings).length > 0" class="p-4 gap-4 grid lg:grid-cols-3 md:grid-cols-2">
                <div
                  v-for="(channel, index) in getChannelList(channelType.value as keyof UploadSettings)"
                  :key="index"
                  class="p-2 border rounded-lg transition-all relative hover:border-primary/50 hover:shadow-md"
                  :class="{ 'opacity-50': !channel.enabled }"
                >
                  <div class="mb-3 p-1 pb-0 flex items-center justify-between">
                    <div class="flex gap-2 items-center">
                      <span class="text-sm font-medium">{{ channel.name }}</span>
                      <Badge v-if="channel.fixed" variant="outline" class="text-xs">
                        ENV
                      </Badge>
                    </div>
                    <Switch v-model="channel.enabled" @update:model-value="handleSaveSettings" />
                  </div>

                  <div class="text-xs text-muted-foreground p-1 pb-3 pt-0 space-y-2">
                    <template v-if="channelType.value === 'telegram'">
                      <div class="flex gap-2 items-center">
                        <div class="i-lucide-bot" style="width: 12px; height: 12px;" />
                        <span class="truncate">Bot: {{ maskText((channel as any).botToken) }}</span>
                      </div>
                    </template>
                    <template v-else-if="channelType.value === 'cfr2'">
                      <div class="flex gap-2 items-center">
                        <div class="i-lucide-link" style="width: 12px; height: 12px;" />
                        <span class="truncate">{{ (channel as any).publicUrl || '未设置' }}</span>
                      </div>
                    </template>
                    <template v-else-if="channelType.value === 's3'">
                      <div class="flex gap-2 items-center">
                        <div class="i-lucide-database" style="width: 12px; height: 12px;" />
                        <span class="truncate">{{ (channel as any).bucketName }}</span>
                      </div>
                    </template>
                    <template v-else-if="channelType.value === 'discord'">
                      <div class="flex gap-2 items-center">
                        <div class="i-lucide-bot" style="width: 12px; height: 12px;" />
                        <span class="truncate">Bot: {{ maskText((channel as any).botToken) }}</span>
                      </div>
                      <Badge v-if="(channel as any).isNitro" variant="secondary" class="text-xs">
                        Nitro
                      </Badge>
                    </template>
                    <template v-else-if="channelType.value === 'huggingface'">
                      <div class="flex gap-2 items-center">
                        <div class="i-lucide-package" style="width: 12px; height: 12px;" />
                        <span class="truncate">{{ (channel as any).repo }}</span>
                      </div>
                    </template>
                    <template v-else-if="channelType.value === 'webdav'">
                      <div class="flex gap-2 items-center">
                        <div class="i-lucide-folder" style="width: 12px; height: 12px;" />
                        <span class="truncate">{{ (channel as any).baseUrl }}</span>
                      </div>
                    </template>
                  </div>

                  <!-- 容量显示：启用 quota 时显示进度条，否则只显示已使用大小 -->
                  <div v-if="channel.quota?.enabled || quotaStats[channel.name]" class="mt-3 pt-3 border-t space-y-2">
                    <Progress v-if="channel.quota?.enabled" :model-value="getQuotaPercentage(channel)" class="h-1.5" />
                    <span class="text-xs text-muted-foreground">{{ getQuotaText(channel) }}</span>
                  </div>

                  <div class="pt-1 border-t flex gap-2">
                    <Button variant="ghost" size="sm" class="flex-1 h-7" @click="openEditDialog(channelType.value as keyof UploadSettings, index)">
                      {{ t('settings.upload.actions.edit') }}
                    </Button>
                    <Button variant="ghost" size="sm" class="text-destructive flex-1 h-7 hover:text-destructive" :disabled="channel.fixed" @click="handleDeleteChannel(channelType.value as keyof UploadSettings, index)">
                      {{ t('settings.upload.actions.delete') }}
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      <Dialog v-model:open="showAddDialog">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('settings.upload.dialog.add.title') }}</DialogTitle>
            <DialogDescription>{{ t('settings.upload.dialog.add.description') }}</DialogDescription>
          </DialogHeader>

          <div class="space-y-4">
            <div class="space-y-2">
              <Label>{{ t('settings.upload.fields.channelType') }}</Label>
              <Select v-model="addChannelType" @update:model-value="handleChannelTypeChange">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="ch in channels" :key="ch.value" :value="ch.value">
                    <div class="flex gap-2 items-center">
                      <div :class="ch.icon" style="width: 16px; height: 16px;" />
                      {{ ch.label }}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div v-if="addChannelType !== 'cfr2'" class="space-y-2">
              <Label>{{ t('settings.upload.fields.channelName') }} <span class="text-destructive">*</span></Label>
              <Input v-model="newChannel.name" :placeholder="t('settings.upload.fields.namePlaceholder')" />
            </div>

            <template v-if="addChannelType === 'telegram'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.botToken') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.botToken" type="password" :placeholder="t('settings.upload.fields.botTokenPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.chatId') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.chatId" type="password" :placeholder="t('settings.upload.fields.chatIdPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.proxyUrl') }}</Label>
                <Input v-model="newChannel.proxyUrl" :placeholder="t('settings.upload.fields.proxyPlaceholder')" />
              </div>
            </template>

            <template v-else-if="addChannelType === 'cfr2'">
              <div class="text-sm text-muted-foreground p-3 rounded-md bg-muted/50">
                {{ t('settings.upload.hints.cfr2EnvOnly') }}
              </div>

              <div class="pt-2 space-y-3">
                <div class="flex gap-2 items-center">
                  <Switch v-model="newChannel.quota.enabled" />
                  <Label>{{ t('settings.upload.fields.enableQuota') }}</Label>
                </div>

                <div v-if="newChannel.quota?.enabled" class="pl-8 space-y-3">
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaLimit') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="newChannel.quota.limitGB" type="number" min="1" class="flex-1" />
                      <span class="text-sm text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaThreshold') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="newChannel.quota.threshold" type="number" min="1" max="100" class="flex-1" />
                      <span class="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="addChannelType === 's3'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.endpoint') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.endpoint" :placeholder="t('settings.upload.fields.endpointPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.cdnDomain') }}</Label>
                <Input v-model="newChannel.cdnDomain" :placeholder="t('settings.upload.fields.cdnPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.bucketName') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.bucketName" :placeholder="t('settings.upload.fields.bucketPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.region') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.region" :placeholder="t('settings.upload.fields.regionPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.accessKeyId') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.accessKeyId" type="password" :placeholder="t('settings.upload.fields.accessKeyPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.secretAccessKey') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.secretAccessKey" type="password" :placeholder="t('settings.upload.fields.secretKeyPlaceholder')" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="newChannel.pathStyle" />
                <Label>{{ t('settings.upload.fields.pathStyle') }}</Label>
              </div>

              <div class="pt-2 space-y-3">
                <div class="flex gap-2 items-center">
                  <Switch v-model="newChannel.quota.enabled" />
                  <Label>{{ t('settings.upload.fields.enableQuota') }}</Label>
                </div>

                <div v-if="newChannel.quota?.enabled" class="pl-8 space-y-3">
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaLimit') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="newChannel.quota.limitGB" type="number" min="1" class="flex-1" />
                      <span class="text-sm text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaThreshold') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="newChannel.quota.threshold" type="number" min="1" max="100" class="flex-1" />
                      <span class="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="addChannelType === 'discord'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.botToken') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.botToken" type="password" :placeholder="t('settings.upload.fields.botTokenPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.channelId') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.channelId" type="password" :placeholder="t('settings.upload.fields.channelIdPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.proxyUrl') }}</Label>
                <Input v-model="newChannel.proxyUrl" :placeholder="t('settings.upload.fields.proxyPlaceholder')" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="newChannel.isNitro" />
                <Label>{{ t('settings.upload.fields.isNitro') }}</Label>
              </div>
            </template>

            <template v-else-if="addChannelType === 'huggingface'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.repo') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.repo" :placeholder="t('settings.upload.fields.repoPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.token') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.token" type="password" :placeholder="t('settings.upload.fields.tokenPlaceholder')" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="newChannel.isPrivate" />
                <Label>{{ t('settings.upload.fields.isPrivate') }}</Label>
              </div>
            </template>

            <template v-else-if="addChannelType === 'webdav'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.baseUrl') }} <span class="text-destructive">*</span></Label>
                <Input v-model="newChannel.baseUrl" :placeholder="t('settings.upload.fields.baseUrlPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.username') }}</Label>
                <Input v-model="newChannel.username" :placeholder="t('settings.upload.fields.usernamePlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.password') }}</Label>
                <Input v-model="newChannel.password" type="password" :placeholder="t('settings.upload.fields.passwordPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.publicAccessUrl') }}</Label>
                <Input v-model="newChannel.publicUrl" :placeholder="t('settings.upload.fields.publicAccessPlaceholder')" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="newChannel.createDirectory" />
                <Label>{{ t('settings.upload.fields.createDirectory') }}</Label>
              </div>

              <div class="pt-2 space-y-3">
                <div class="flex gap-2 items-center">
                  <Switch v-model="newChannel.quota.enabled" />
                  <Label>{{ t('settings.upload.fields.enableQuota') }}</Label>
                </div>

                <div v-if="newChannel.quota?.enabled" class="pl-8 space-y-3">
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaLimit') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="newChannel.quota.limitGB" type="number" min="1" class="flex-1" />
                      <span class="text-sm text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaThreshold') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="newChannel.quota.threshold" type="number" min="1" max="100" class="flex-1" />
                      <span class="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <DialogFooter>
            <Button variant="outline" @click="showAddDialog = false">
              {{ t('common.actions.cancel') }}
            </Button>
            <Button v-if="addChannelType !== 'cfr2'" @click="handleAddChannel">
              {{ t('common.actions.confirm') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="showEditDialog">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('settings.upload.dialog.edit.title') }}</DialogTitle>
            <DialogDescription>{{ t('settings.upload.dialog.edit.description') }}</DialogDescription>
          </DialogHeader>

          <div class="space-y-4">
            <div class="space-y-2">
              <Label>{{ t('settings.upload.fields.channelName') }} <span class="text-destructive">*</span></Label>
              <Input v-model="editChannel.name" :placeholder="t('settings.upload.fields.namePlaceholder')" :disabled="editChannel.fixed" />
            </div>

            <template v-if="editChannelType === 'telegram'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.botToken') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.botToken" type="password" :placeholder="t('settings.upload.fields.botTokenPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.chatId') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.chatId" type="password" :placeholder="t('settings.upload.fields.chatIdPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.proxyUrl') }}</Label>
                <Input v-model="editChannel.proxyUrl" :placeholder="t('settings.upload.fields.proxyPlaceholder')" />
              </div>
            </template>

            <template v-else-if="editChannelType === 'cfr2'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.publicUrl') }}</Label>
                <Input v-model="editChannel.publicUrl" :placeholder="t('settings.upload.fields.publicUrlPlaceholder')" />
              </div>

              <div class="pt-2 space-y-3">
                <div class="flex gap-2 items-center">
                  <Switch v-model="editChannel.quota.enabled" />
                  <Label>{{ t('settings.upload.fields.enableQuota') }}</Label>
                </div>

                <div v-if="editChannel.quota?.enabled" class="pl-8 space-y-3">
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaLimit') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="editChannel.quota.limitGB" type="number" min="1" class="flex-1" />
                      <span class="text-sm text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaThreshold') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="editChannel.quota.threshold" type="number" min="1" max="100" class="flex-1" />
                      <span class="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="editChannelType === 's3'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.endpoint') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.endpoint" :placeholder="t('settings.upload.fields.endpointPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.cdnDomain') }}</Label>
                <Input v-model="editChannel.cdnDomain" :placeholder="t('settings.upload.fields.cdnPlaceholder')" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.bucketName') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.bucketName" :placeholder="t('settings.upload.fields.bucketPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.region') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.region" :placeholder="t('settings.upload.fields.regionPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.accessKeyId') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.accessKeyId" type="password" :placeholder="t('settings.upload.fields.accessKeyPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.secretAccessKey') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.secretAccessKey" type="password" :placeholder="t('settings.upload.fields.secretKeyPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="editChannel.pathStyle" :disabled="editChannel.fixed" />
                <Label>{{ t('settings.upload.fields.pathStyle') }}</Label>
              </div>

              <div class="pt-2 space-y-3">
                <div class="flex gap-2 items-center">
                  <Switch v-model="editChannel.quota.enabled" />
                  <Label>{{ t('settings.upload.fields.enableQuota') }}</Label>
                </div>

                <div v-if="editChannel.quota?.enabled" class="pl-8 space-y-3">
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaLimit') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="editChannel.quota.limitGB" type="number" min="1" class="flex-1" />
                      <span class="text-sm text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaThreshold') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="editChannel.quota.threshold" type="number" min="1" max="100" class="flex-1" />
                      <span class="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="editChannelType === 'discord'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.botToken') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.botToken" type="password" :placeholder="t('settings.upload.fields.botTokenPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.channelId') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.channelId" type="password" :placeholder="t('settings.upload.fields.channelIdPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.proxyUrl') }}</Label>
                <Input v-model="editChannel.proxyUrl" :placeholder="t('settings.upload.fields.proxyPlaceholder')" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="editChannel.isNitro" />
                <Label>{{ t('settings.upload.fields.isNitro') }}</Label>
              </div>
            </template>

            <template v-else-if="editChannelType === 'huggingface'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.repo') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.repo" :placeholder="t('settings.upload.fields.repoPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.token') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.token" type="password" :placeholder="t('settings.upload.fields.tokenPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="editChannel.isPrivate" />
                <Label>{{ t('settings.upload.fields.isPrivate') }}</Label>
              </div>
            </template>

            <template v-else-if="editChannelType === 'webdav'">
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.baseUrl') }} <span class="text-destructive">*</span></Label>
                <Input v-model="editChannel.baseUrl" :placeholder="t('settings.upload.fields.baseUrlPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.username') }}</Label>
                <Input v-model="editChannel.username" :placeholder="t('settings.upload.fields.usernamePlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.password') }}</Label>
                <Input v-model="editChannel.password" type="password" :placeholder="t('settings.upload.fields.passwordPlaceholder')" :disabled="editChannel.fixed" />
              </div>
              <div class="space-y-2">
                <Label>{{ t('settings.upload.fields.publicAccessUrl') }}</Label>
                <Input v-model="editChannel.publicUrl" :placeholder="t('settings.upload.fields.publicAccessPlaceholder')" />
              </div>
              <div class="flex gap-2 items-center">
                <Switch v-model="editChannel.createDirectory" />
                <Label>{{ t('settings.upload.fields.createDirectory') }}</Label>
              </div>

              <div class="pt-2 space-y-3">
                <div class="flex gap-2 items-center">
                  <Switch v-model="editChannel.quota.enabled" />
                  <Label>{{ t('settings.upload.fields.enableQuota') }}</Label>
                </div>

                <div v-if="editChannel.quota?.enabled" class="pl-8 space-y-3">
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaLimit') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="editChannel.quota.limitGB" type="number" min="1" class="flex-1" />
                      <span class="text-sm text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('settings.upload.fields.quotaThreshold') }}</Label>
                    <div class="flex gap-2 items-center">
                      <Input v-model.number="editChannel.quota.threshold" type="number" min="1" max="100" class="flex-1" />
                      <span class="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <DialogFooter>
            <Button variant="outline" @click="showEditDialog = false">
              {{ t('common.actions.cancel') }}
            </Button>
            <Button @click="handleEditChannel">
              {{ t('common.actions.save') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        v-model:open="showDeleteDialog"
        :title="t('settings.upload.dialog.delete.title')"
        :description="t('settings.upload.dialog.delete.description')"
        :confirm-text="t('common.actions.delete')"
        @confirm="confirmDelete"
      />
    </div>
  </div>
</template>
