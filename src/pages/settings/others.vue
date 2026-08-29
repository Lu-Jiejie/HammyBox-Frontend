<script setup lang="ts">
import type { PublicPageConfig } from '@/api/public'
import type { OtherSettings } from '@/api/settings'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { getOtherSettings, getPageConfig, saveOtherSettings, savePageConfig } from '@/api/settings'
import InfoPopover from '@/components/InfoPopover.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Switch } from '@/components/shadcn/switch'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'
import { formatSyncTime } from '@/utils/syncTime'

const { t } = useI18n()
const store = useAppStore()
const { settingsSyncTimes } = storeToRefs(store)

definePage({
  meta: {
    title: '其他设置',
    auth: true,
  },
})

const loading = ref(true)
const refreshing = ref(false)
const settings = ref<OtherSettings>({
  telemetry: { enabled: true, fixed: false },
  randomImageAPI: { enabled: false, allowedDir: '', fixed: false },
  cloudflareApiToken: { CF_ZONE_ID: '', CF_EMAIL: '', CF_API_KEY: '', fixed: false },
  webDAV: { enabled: false, username: '', password: '', uploadChannel: '', channelName: '', internalToken: '', internalTokenId: '', fixed: false },
  publicBrowse: { enabled: false, allowedDir: '', fixed: false },
})

const telemetryOpen = ref(false)
const randomApiOpen = ref(false)
const cfTokenOpen = ref(false)
const webdavOpen = ref(false)
const publicBrowseOpen = ref(false)

async function loadSettings() {
  try {
    const res = await getOtherSettings()
    settings.value = res.data
    store.markSettingsSynced('others')
  }
  catch {
    toast.error(t('settings.others.messages.loadFailed'))
  }
  finally {
    loading.value = false
  }
}

// 手动从云端刷新（不展示全屏 loading，仅按钮转圈）
async function handleRefresh() {
  refreshing.value = true
  try {
    const res = await getOtherSettings()
    settings.value = res.data
    store.markSettingsSynced('others')
    toast.success(t('settings.others.messages.refreshed'))
  }
  catch {
    toast.error(t('settings.others.messages.refreshFailed'))
  }
  finally {
    refreshing.value = false
  }
}

async function handleSave() {
  try {
    await saveOtherSettings(settings.value)
    store.markSettingsSynced('others')
    toast.success(t('settings.others.messages.saved'))
    await loadSettings()
  }
  catch {
    toast.error(t('settings.others.messages.saveFailed'))
  }
}

// 构造公开页访问地址
function getBrowseUrl(slug: string): string {
  const { protocol, host } = window.location
  return `${protocol}//${host}/browse/${slug}`
}

async function copyBrowseUrl(slug: string) {
  try {
    await navigator.clipboard.writeText(getBrowseUrl(slug))
    toast.success(t('settings.others.messages.browseUrlCopied'))
  }
  catch {
    toast.error(t('settings.others.messages.copyFailed'))
  }
}

/* ─── 公开页管理（pub:* 配置存于 page config） ─── */

const pubPages = ref<Record<string, PublicPageConfig>>({})
const pubLoading = ref(false)

// 读取 page config 中所有 pub:* 项（管理端接口，带鉴权）
async function loadPubPages() {
  pubLoading.value = true
  try {
    const { data } = await getPageConfig()
    const pages: Record<string, PublicPageConfig> = {}
    for (const item of data.config) {
      if (!item.id?.startsWith('pub:'))
        continue
      try {
        const cfg = JSON.parse(item.value) as Partial<PublicPageConfig>
        if (cfg && typeof cfg === 'object') {
          pages[item.id.slice(4)] = {
            tags: Array.isArray(cfg.tags) ? cfg.tags : [],
            name: typeof cfg.name === 'string' ? cfg.name : '',
            description: typeof cfg.description === 'string' ? cfg.description : '',
            expireAt: typeof cfg.expireAt === 'number' ? cfg.expireAt : null,
          }
        }
      }
      catch {
        // 忽略无法解析的项
      }
    }
    pubPages.value = pages
  }
  catch {
    toast.error(t('settings.others.messages.loadPubFailed'))
  }
  finally {
    pubLoading.value = false
  }
}

// 合并保存 pub:* 配置（先 GET 完整 config 再 POST，避免清掉其他项）
async function persistPubPages(next: Record<string, PublicPageConfig>) {
  const { data } = await getPageConfig()
  const others = data.config.filter(item => !item.id?.startsWith('pub:'))
  const pubItems = Object.entries(next).map(([slug, cfg]) => ({
    id: `pub:${slug}`,
    value: JSON.stringify(cfg),
  }))
  await savePageConfig([...others, ...pubItems])
  pubPages.value = next
}

// 到期状态显示
function pubExpireText(cfg: PublicPageConfig): string {
  if (!cfg.expireAt)
    return t('settings.others.sections.publicPages.permanent')
  const now = Date.now()
  if (now >= cfg.expireAt)
    return t('settings.others.sections.publicPages.expired')
  const days = Math.ceil((cfg.expireAt - now) / (24 * 60 * 60 * 1000))
  const date = new Date(cfg.expireAt).toLocaleDateString()
  return t('settings.others.sections.publicPages.expiresIn', { days, date })
}

// 编辑对话框状态
const pubDialogOpen = ref(false)
const pubSaving = ref(false)
// 删除确认：pubDeleteTarget 控制确认框开关，pubDeleteSlug 保存真正要删除的 slug
// （AlertDialogAction 点击时会先关闭对话框触发 update:open(false)，若直接用
//  pubDeleteTarget 做短路判断，处理器执行时目标已被清空，deletePubPage 不会被调用）
const pubDeleteTarget = ref(false)
const pubDeleteSlug = ref<string | null>(null)
// pubOriginalSlug 记录打开编辑对话框时的原始 slug（与输入框 v-model 解耦）
const pubEditingSlug = ref('') // 输入框绑定的 slug（新建为空）
const pubOriginalSlug = ref('') // 编辑前的原始 slug（新建为空）
const pubForm = ref<PublicPageConfig>({ tags: [], name: '', description: '', expireAt: null })
const pubExpireForever = ref(true)
const pubExpireDate = ref('') // yyyy-MM-ddTHH:mm 本地格式

function openPubCreate() {
  pubEditingSlug.value = ''
  pubOriginalSlug.value = ''
  pubForm.value = { tags: [], name: '', description: '', expireAt: null }
  pubExpireForever.value = true
  pubExpireDate.value = ''
  pubDialogOpen.value = true
}

function openPubEdit(slug: string) {
  pubEditingSlug.value = slug
  pubOriginalSlug.value = slug
  const src = pubPages.value[slug]
  // 深拷贝 tags，避免编辑对话框内增删标签污染 pubPages 原始数据（取消编辑也不回退）
  pubForm.value = {
    ...src,
    tags: [...(src?.tags || [])],
  }
  pubExpireForever.value = !pubForm.value.expireAt
  pubExpireDate.value = pubForm.value.expireAt
    ? new Date(pubForm.value.expireAt).toISOString().slice(0, 16)
    : ''
  pubDialogOpen.value = true
}

// 请求删除（确认框点击时调用，读取独立的 pubDeleteSlug，避免关闭时序问题）
function requestDeletePub() {
  if (pubDeleteSlug.value) {
    void deletePubPage(pubDeleteSlug.value)
  }
}

async function deletePubPage(slug: string) {
  try {
    const next = { ...pubPages.value }
    delete next[slug]
    await persistPubPages(next)
    toast.success(t('settings.others.messages.pubDeleted'))
  }
  catch {
    toast.error(t('settings.others.messages.pubSaveFailed'))
  }
  finally {
    pubDeleteSlug.value = null
    pubDeleteTarget.value = false
  }
}

async function savePubPage() {
  const slug = pubEditingSlug.value.trim()
  if (!slug) {
    toast.error(t('settings.others.messages.pubSlugRequired'))
    return
  }
  // slug 会拼进 URL 路径与 page config key，限制为字母数字、中划线、下划线
  if (!/^[\w-]+$/.test(slug)) {
    toast.error(t('settings.others.messages.pubSlugInvalid'))
    return
  }
  if (pubForm.value.tags.length === 0) {
    toast.error(t('settings.others.messages.pubTagsRequired'))
    return
  }
  try {
    pubSaving.value = true
    const cfg: PublicPageConfig = {
      tags: pubForm.value.tags,
      name: pubForm.value.name.trim(),
      description: pubForm.value.description.trim(),
      expireAt: pubExpireForever.value ? null : new Date(pubExpireDate.value).getTime(),
    }
    if (!pubExpireForever.value && !Number.isFinite(cfg.expireAt!)) {
      toast.error(t('settings.others.messages.pubExpireInvalid'))
      return
    }
    const next = { ...pubPages.value }
    // 用编辑前的原始 slug 删除旧 key（输入框值可能与原始 key 不同：trim、大小写、用户改过 slug）
    if (pubOriginalSlug.value && pubOriginalSlug.value !== slug) {
      delete next[pubOriginalSlug.value]
    }
    next[slug] = cfg
    await persistPubPages(next)
    pubDialogOpen.value = false
    toast.success(t('settings.others.messages.pubSaved'))
  }
  catch {
    toast.error(t('settings.others.messages.pubSaveFailed'))
  }
  finally {
    pubSaving.value = false
  }
}

/* ─── 公开页 tag 选择器（与上传偏好一致：内置标签 + 用户标签库 + 云端同步） ─── */

const builtInTags = ['whitelist', 'blocked', 'nsfw', 'shared']
const newTagInput = ref('')

// 备选标签 = 内置标签 + 用户自定义标签（与上传偏好共享同一 userTags）
const availableTags = computed(() => {
  const allTags = new Set([...builtInTags, ...store.userTags])
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

// 切换选中（供备选标签点击）
function togglePubTag(tag: string) {
  const idx = pubForm.value.tags.indexOf(tag)
  if (idx > -1) {
    pubForm.value.tags.splice(idx, 1)
  }
  else {
    pubForm.value.tags.push(tag)
  }
}

// 移除已选标签
function removePubTag(tag: string) {
  const idx = pubForm.value.tags.indexOf(tag)
  if (idx > -1)
    pubForm.value.tags.splice(idx, 1)
}

// 添加自定义备选标签（写入共享 userTags 并同步云端）
async function addPubNewTag() {
  const tag = newTagInput.value.trim().toLowerCase()
  if (!tag || builtInTags.includes(tag) || store.userTags.includes(tag)) {
    newTagInput.value = ''
    return
  }
  store.userTags.push(tag)
  newTagInput.value = ''
  try {
    await store.syncUserTagsToCloud()
  }
  catch {
    // 本地已生效，云端同步失败不阻塞
    toast.error(t('settings.others.messages.userTagsSyncFailed'))
  }
}

// 删除自定义备选标签（并同步云端）
async function removePubUserTag(tag: string) {
  const idx = store.userTags.indexOf(tag)
  if (idx > -1) {
    store.userTags.splice(idx, 1)
  }
  // 若该标签已选中，也从选中中移除
  removePubTag(tag)
  try {
    await store.syncUserTagsToCloud()
  }
  catch {
    toast.error(t('settings.others.messages.userTagsSyncFailed'))
  }
}

loadSettings()
loadPubPages()
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold">
          {{ t('settings.others.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.others.description') }}
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap gap-x-3 gap-y-1 items-center sm:flex-col sm:gap-y-1.5 sm:items-end">
        <Button size="sm" variant="outline" :disabled="refreshing" @click="handleRefresh">
          <div :class="refreshing ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-refresh-cw'" style="width: 14px; height: 14px;" />
          {{ refreshing ? t('settings.common.refreshing') : t('settings.common.refresh') }}
        </Button>
        <span v-if="settingsSyncTimes.others" class="text-[11px] text-muted-foreground/60 tabular-nums">
          {{ t('settings.common.lastSync') }}: {{ formatSyncTime(settingsSyncTimes.others) }}
        </span>
        <span v-else class="text-[11px] text-muted-foreground/40">
          {{ t('settings.common.neverSynced') }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="flex min-h-[400px] items-center justify-center">
      <div class="i-lucide-loader-circle text-4xl text-muted-foreground animate-spin" />
    </div>

    <div v-else class="space-y-4">
      <!-- 遥测 -->
      <Collapsible v-model:open="telemetryOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-activity" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.others.sections.telemetry.title') }}</span>
              <InfoPopover :content="t('settings.others.sections.telemetry.hint')" />
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': telemetryOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <div>
                <Label>{{ t('settings.others.sections.telemetry.enable') }}</Label>
                <p class="text-xs text-muted-foreground">
                  {{ t('settings.others.sections.telemetry.description') }}
                </p>
              </div>
              <Switch v-model:checked="settings.telemetry.enabled" :disabled="settings.telemetry.fixed" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- 随机图 API -->
      <Collapsible v-model:open="randomApiOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-shuffle" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.others.sections.randomImageApi.title') }}</span>
              <InfoPopover :content="t('settings.others.sections.randomImageApi.hint')" />
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': randomApiOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <Label>{{ t('settings.others.sections.randomImageApi.enable') }}</Label>
              <Switch v-model:checked="settings.randomImageAPI.enabled" :disabled="settings.randomImageAPI.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.randomImageApi.allowedDir') }}</Label>
              <Input v-model="settings.randomImageAPI.allowedDir" :placeholder="t('settings.others.sections.randomImageApi.allowedDirPlaceholder')" :disabled="settings.randomImageAPI.fixed" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- Cloudflare API Token -->
      <Collapsible v-model:open="cfTokenOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-cloud" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.others.sections.cloudflare.title') }}</span>
              <InfoPopover :content="t('settings.others.sections.cloudflare.hint')" />
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': cfTokenOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.cloudflare.zoneId') }}</Label>
              <Input v-model="settings.cloudflareApiToken.CF_ZONE_ID" :disabled="settings.cloudflareApiToken.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.cloudflare.email') }}</Label>
              <Input v-model="settings.cloudflareApiToken.CF_EMAIL" type="email" :disabled="settings.cloudflareApiToken.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.cloudflare.apiKey') }}</Label>
              <Input v-model="settings.cloudflareApiToken.CF_API_KEY" type="password" :disabled="settings.cloudflareApiToken.fixed" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- WebDAV -->
      <Collapsible v-model:open="webdavOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-hard-drive" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.others.sections.webdav.title') }}</span>
              <InfoPopover :content="t('settings.others.sections.webdav.hint')" />
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': webdavOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <Label>{{ t('settings.others.sections.webdav.enable') }}</Label>
              <Switch v-model:checked="settings.webDAV.enabled" :disabled="settings.webDAV.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.webdav.username') }}</Label>
              <Input v-model="settings.webDAV.username" :disabled="settings.webDAV.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.webdav.password') }}</Label>
              <Input v-model="settings.webDAV.password" type="password" :disabled="settings.webDAV.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.webdav.uploadChannel') }}</Label>
              <Input v-model="settings.webDAV.uploadChannel" :placeholder="t('settings.others.sections.webdav.uploadChannelPlaceholder')" :disabled="settings.webDAV.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.webdav.channelName') }}</Label>
              <Input v-model="settings.webDAV.channelName" :disabled="settings.webDAV.fixed" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- 公开页（tag 驱动的公开分享） -->
      <Collapsible v-model:open="publicBrowseOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-eye" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.others.sections.publicPages.title') }}</span>
              <InfoPopover :content="t('settings.others.sections.publicPages.hint')" />
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': publicBrowseOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <p class="text-xs text-muted-foreground">
              {{ t('settings.others.sections.publicPages.description') }}
            </p>

            <div v-if="pubLoading" class="py-6 flex justify-center">
              <div class="i-lucide-loader-circle text-2xl text-muted-foreground animate-spin" />
            </div>

            <div v-else-if="Object.keys(pubPages).length === 0" class="py-8 text-center flex flex-col gap-2 items-center justify-center">
              <div class="i-lucide-eye-off text-3xl text-muted-foreground/40" />
              <p class="text-sm text-muted-foreground">
                {{ t('settings.others.sections.publicPages.empty') }}
              </p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(cfg, slug) in pubPages"
                :key="slug"
                class="p-3 border rounded-lg flex flex-wrap gap-2 items-center justify-between"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap gap-2 items-center">
                    <a
                      :href="getBrowseUrl(slug)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary font-medium truncate hover:underline"
                    >
                      /browse/{{ slug }}
                    </a>
                    <Badge variant="secondary" class="text-xs">
                      {{ cfg.name || slug }}
                    </Badge>
                  </div>
                  <div class="mt-1 flex flex-wrap gap-1.5 items-center">
                    <span class="text-[11px] text-muted-foreground/70 tabular-nums">
                      {{ pubExpireText(cfg) }}
                    </span>
                    <Badge v-for="tag in cfg.tags" :key="tag" variant="outline" class="text-[10px]">
                      #{{ tag }}
                    </Badge>
                  </div>
                </div>
                <div class="flex shrink-0 gap-1.5 items-center">
                  <Button size="sm" variant="outline" @click="copyBrowseUrl(slug)">
                    <div class="i-lucide-link" style="width: 13px; height: 13px;" />
                  </Button>
                  <Button size="sm" variant="outline" @click="openPubEdit(slug)">
                    <div class="i-lucide-pencil" style="width: 13px; height: 13px;" />
                  </Button>
                  <Button size="sm" variant="outline" class="text-destructive hover:text-destructive" @click="pubDeleteSlug = slug; pubDeleteTarget = true">
                    <div class="i-lucide-trash-2" style="width: 13px; height: 13px;" />
                  </Button>
                </div>
              </div>
            </div>

            <Button size="sm" variant="outline" @click="openPubCreate">
              <div class="i-lucide-plus" style="width: 14px; height: 14px;" />
              {{ t('settings.others.sections.publicPages.create') }}
            </Button>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- 公开页编辑对话框 -->
      <Dialog v-model:open="pubDialogOpen">
        <DialogContent class="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {{ pubEditingSlug ? `${t('settings.others.sections.publicPages.edit')} /browse/${pubEditingSlug}` : t('settings.others.sections.publicPages.create') }}
            </DialogTitle>
          </DialogHeader>
          <div class="py-1 space-y-4">
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.publicPages.slug') }}</Label>
              <div class="flex gap-1.5 items-center">
                <span class="text-sm text-muted-foreground shrink-0">/browse/</span>
                <Input v-model="pubEditingSlug" :placeholder="t('settings.others.sections.publicPages.slugPlaceholder')" />
              </div>
            </div>

            <!-- 标签配置组（与上传偏好一致：TagBadge 多选 + 内置标签 + 备选标签） -->
            <div class="space-y-3">
              <div>
                <Label>{{ t('settings.others.sections.publicPages.tags') }}</Label>
                <p class="text-[11px] text-muted-foreground mt-0.5">
                  {{ t('settings.others.sections.publicPages.tagsHint') }}
                </p>
              </div>

              <!-- 已选择的标签 -->
              <div v-if="pubForm.tags.length > 0" class="p-3 border rounded-lg bg-muted/30">
                <div class="flex flex-wrap gap-2">
                  <TagBadge
                    v-for="tag in pubForm.tags"
                    :key="tag"
                    :tag="tag"
                    :color="store.getTagColor(tag)"
                    show-delete
                    @delete="removePubTag(tag)"
                  />
                </div>
              </div>
              <div v-else class="p-3 text-center border rounded-lg bg-muted/30">
                <span class="text-sm text-muted-foreground">{{ t('settings.others.sections.publicPages.noSelectedTags') }}</span>
              </div>

              <!-- 添加新标签（写入共享标签库并同步云端） -->
              <div class="flex gap-2">
                <Input
                  v-model="newTagInput"
                  :placeholder="t('settings.others.sections.publicPages.inputPlaceholder')"
                  class="flex-1"
                  @keyup.enter="addPubNewTag"
                />
                <Button variant="outline" size="icon" @click="addPubNewTag">
                  <div class="i-lucide-plus" />
                </Button>
              </div>

              <!-- 备选标签（内置 + 用户标签库，点击切换） -->
              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground">{{ t('settings.others.sections.publicPages.availableTags') }}</Label>
                <div class="p-3 border rounded-lg bg-background max-h-[160px] min-h-[80px] overflow-y-auto">
                  <div class="flex flex-wrap gap-2">
                    <TagBadge
                      v-for="tag in availableTags"
                      :key="tag"
                      :tag="tag"
                      :color="store.getTagColor(tag)"
                      :show-delete="!builtInTags.includes(tag)"
                      delete-icon="trash"
                      clickable
                      @click="togglePubTag(tag)"
                      @delete="removePubUserTag(tag)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.publicPages.name') }}</Label>
              <Input v-model="pubForm.name" :placeholder="t('settings.others.sections.publicPages.namePlaceholder')" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.publicPages.descriptionLabel') }}</Label>
              <Input v-model="pubForm.description" :placeholder="t('settings.others.sections.publicPages.descriptionPlaceholder')" />
            </div>
            <div class="pt-1 flex gap-3 items-center justify-between">
              <Label>{{ t('settings.others.sections.publicPages.forever') }}</Label>
              <Switch v-model:checked="pubExpireForever" />
            </div>
            <div v-if="!pubExpireForever" class="space-y-2">
              <Label>{{ t('settings.others.sections.publicPages.expireAt') }}</Label>
              <Input v-model="pubExpireDate" type="datetime-local" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="pubDialogOpen = false">
              {{ t('settings.others.actions.cancel') }}
            </Button>
            <Button :disabled="pubSaving" @click="savePubPage">
              {{ t('settings.others.actions.save') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 公开页删除确认 -->
      <AlertDialog :open="pubDeleteTarget" @update:open="(open: boolean) => { if (!open) pubDeleteTarget = false }">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{ t('settings.others.messages.confirmDeletePubTitle') }}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{ t('settings.others.messages.confirmDeletePub', { name: pubDeleteSlug ? (pubPages[pubDeleteSlug]?.name || pubDeleteSlug) : '' }) }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel @click="pubDeleteSlug = null; pubDeleteTarget = false">
              {{ t('settings.others.actions.cancel') }}
            </AlertDialogCancel>
            <AlertDialogAction class="text-white bg-destructive hover:bg-destructive/90" @click="requestDeletePub">
              {{ t('settings.others.actions.delete') }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div class="flex justify-end">
        <Button @click="handleSave">
          {{ t('settings.others.actions.save') }}
        </Button>
      </div>
    </div>
  </div>
</template>
