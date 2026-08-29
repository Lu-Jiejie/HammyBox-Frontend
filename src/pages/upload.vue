<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/shadcn/button'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'
import FileDropzone from './components/FileDropzone.vue'
import UploadPresets from './components/UploadPresets.vue'
import UploadSettingsDialog from './components/UploadSettingsDialog.vue'

definePage({
  meta: {
    title: '文件上传',
    auth: true,
  },
})

const { t } = useI18n()
const store = useAppStore()
const showSettingsDialog = ref(false)
const syncingCloud = ref(false)

// 一键从云端同步上传设置（预设 + 标签 + 命名模板），仿照设置页的刷新行为
async function handleRefreshFromCloud() {
  syncingCloud.value = true
  try {
    const results = await Promise.allSettled([
      store.fetchPresetsFromCloud(),
      store.fetchUserTagsFromCloud(),
      store.fetchNamingTemplatesFromCloud(),
    ])
    const synced = results.filter(r => r.status === 'fulfilled' && r.value === true).length
    if (synced > 0)
      toast.success(t('pages.upload.messages.cloudSynced'))
    else
      toast.info(t('pages.upload.messages.cloudEmpty'))
  }
  catch {
    toast.error(t('pages.upload.messages.cloudSyncFailed'))
  }
  finally {
    syncingCloud.value = false
  }
}

const {
  uploadChannel,
  uploadChannelName,
  uploadFolder,
  uploadNameType,
  uploadTags,
} = storeToRefs(store)

const compressConfig = store.compressConfig

const channelDisplayName = computed(() => {
  const channelMap: Record<string, string> = {
    telegram: 'Telegram',
    cfr2: 'Cloudflare R2',
    s3: 'S3',
    discord: 'Discord',
    huggingface: 'HuggingFace',
    webdav: 'WebDAV',
  }
  return channelMap[uploadChannel.value] || uploadChannel.value
})

const namingDisplayName = computed(() => {
  const namingMap: Record<string, string> = {
    default: t('pages.upload.preferences.naming.default'),
    index: t('pages.upload.preferences.naming.index'),
    origin: t('pages.upload.preferences.naming.origin'),
    short: t('pages.upload.preferences.naming.short'),
    custom: t('pages.upload.preferences.naming.custom'),
  }
  return namingMap[uploadNameType.value] || uploadNameType.value
})

const channelNameDisplay = computed(() => {
  return uploadChannelName.value || t('pages.upload.preferences.channel.autoSelect')
})

const builtInTags = ['whitelist', 'blocked', 'nsfw', 'shared']

const sortedUploadTags = computed(() => {
  const builtin = uploadTags.value.filter(tag => builtInTags.includes(tag))
  const custom = uploadTags.value.filter(tag => !builtInTags.includes(tag))
  return [...builtin, ...custom]
})
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl">
    <div class="mb-6">
      <div class="mb-2 flex gap-3 items-center">
        <h1 class="text-3xl font-bold">
          {{ t('pages.upload.title') }}
        </h1>
      </div>
      <p class="text-muted-foreground">
        {{ t('pages.upload.dragText') }}
      </p>
    </div>

    <!-- 配置信息展示区 - 始终展开 -->
    <div class="mb-5 border rounded-lg bg-card/50 overflow-hidden backdrop-blur-sm">
      <div class="px-4 py-3 border-b bg-muted/20 flex w-full items-center justify-between">
        <div class="flex flex-1 gap-2 min-w-0 items-center">
          <div class="i-lucide-layers text-muted-foreground shrink-0" style="width: 15px; height: 15px;" />
          <span class="text-sm font-medium">{{ t('pages.upload.preferences.currentConfiguration') }}</span>
          <div class="text-xs text-muted-foreground/70 gap-2 min-w-0 hidden items-center sm:flex">
            <span class="truncate">{{ channelDisplayName }}</span>
            <span class="text-muted-foreground/40">·</span>
            <code class="font-mono px-1.5 py-0.5 rounded bg-muted/50 truncate">{{ uploadFolder || '/' }}</code>
          </div>
        </div>
        <div class="flex shrink-0 gap-1.5 items-center">
          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground/70 px-2 gap-1.5 h-7 hover:text-foreground hover:bg-accent/50"
            :disabled="syncingCloud"
            @click="handleRefreshFromCloud"
          >
            <div :class="syncingCloud ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-refresh-cw'" style="width: 14px; height: 14px;" />
            <span class="text-xs">{{ syncingCloud ? t('pages.upload.messages.cloudSyncing') : t('pages.upload.preferences.refreshFromCloud') }}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 hover:bg-accent/50"
            @click="showSettingsDialog = true"
          >
            <div class="i-lucide-settings-2" style="width: 14px; height: 14px;" />
          </Button>
        </div>
      </div>

      <div class="bg-muted/20">
        <div class="p-4 gap-x-8 gap-y-4 grid grid-cols-1 lg:grid-cols-3 sm:grid-cols-2">
          <!-- 渠道类型 -->
          <div class="space-y-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-cloud text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.channel.type') }}</span>
            </div>
            <div class="text-sm text-foreground font-medium">
              {{ channelDisplayName }}
            </div>
          </div>

          <!-- 渠道名称 -->
          <div class="space-y-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-tag text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.channel.name') }}</span>
            </div>
            <div class="text-sm" :class="uploadChannelName ? 'font-medium text-foreground' : 'text-muted-foreground/60 italic'">
              {{ channelNameDisplay }}
            </div>
          </div>

          <!-- 上传目录 -->
          <div class="space-y-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-folder text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.channel.directory') }}</span>
            </div>
            <code class="text-sm text-foreground font-medium font-mono block">
              {{ uploadFolder || '/' }}
            </code>
          </div>

          <!-- 命名规则 -->
          <div class="space-y-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-file-text text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.naming.title') }}</span>
            </div>
            <div class="text-sm text-foreground font-medium">
              {{ namingDisplayName }}
            </div>
          </div>

          <!-- 转换为 WebP -->
          <div class="space-y-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-image text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.preprocessing.convertToWebp') }}</span>
            </div>
            <div class="flex gap-2 items-center">
              <div
                class="rounded-full h-1.5 w-1.5"
                :class="compressConfig.convertToWebp ? 'bg-green-500' : 'bg-muted-foreground/30'"
              />
              <span class="text-sm font-medium" :class="compressConfig.convertToWebp ? 'text-foreground' : 'text-muted-foreground/60'">
                {{ compressConfig.convertToWebp ? t('pages.upload.preferences.enabled') : t('pages.upload.preferences.disabled') }}
              </span>
            </div>
          </div>

          <!-- 客户端压缩 -->
          <div class="space-y-2" :class="compressConfig.customerCompress ? 'sm:col-span-2 lg:col-span-3' : ''">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-package text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">
                {{ t('pages.upload.preferences.preprocessing.compress') }}
              </span>
            </div>
            <div class="flex flex-wrap gap-3 items-center">
              <div class="flex gap-2 items-center">
                <div
                  class="rounded-full h-1.5 w-1.5"
                  :class="compressConfig.customerCompress ? 'bg-green-500' : 'bg-muted-foreground/30'"
                />
                <span class="text-sm font-medium" :class="compressConfig.customerCompress ? 'text-foreground' : 'text-muted-foreground/60'">
                  {{ compressConfig.customerCompress ? t('pages.upload.preferences.enabled') : t('pages.upload.preferences.disabled') }}
                </span>
              </div>
              <template v-if="compressConfig.customerCompress">
                <span class="text-muted-foreground/30">·</span>
                <span class="text-xs text-muted-foreground/70">
                  {{ t('pages.upload.preferences.preprocessing.compressThreshold') }}: <span class="text-foreground font-semibold">{{ compressConfig.compressBar }} MB</span>
                </span>
                <span class="text-muted-foreground/30">·</span>
                <span class="text-xs text-muted-foreground/70">
                  {{ t('pages.upload.preferences.preprocessing.expectedSize') }}: <span class="text-foreground font-semibold">{{ compressConfig.compressQuality }} MB</span>
                </span>
              </template>
            </div>
          </div>

          <!-- 服务端压缩 (仅 Telegram) -->
          <div v-if="uploadChannel === 'telegram'" class="space-y-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-server text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.serverCompress.enable') }}</span>
            </div>
            <div class="flex gap-2 items-center">
              <div
                class="rounded-full h-1.5 w-1.5"
                :class="compressConfig.serverCompress ? 'bg-green-500' : 'bg-muted-foreground/30'"
              />
              <span class="text-sm font-medium" :class="compressConfig.serverCompress ? 'text-foreground' : 'text-muted-foreground/60'">
                {{ compressConfig.serverCompress ? t('pages.upload.preferences.enabled') : t('pages.upload.preferences.disabled') }}
              </span>
            </div>
          </div>

          <!-- 标签 -->
          <div v-if="sortedUploadTags.length > 0" class="space-y-2 lg:col-span-3 sm:col-span-2">
            <div class="flex gap-2 items-center">
              <div class="i-lucide-tags text-muted-foreground/60" style="width: 12px; height: 12px;" />
              <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('pages.upload.preferences.tags.title') }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <TagBadge
                v-for="tag in sortedUploadTags"
                :key="tag"
                :tag="tag"
                :color="store.getTagColor(tag)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <UploadPresets />

    <FileDropzone />

    <UploadSettingsDialog v-model:open="showSettingsDialog" />
  </div>
</template>
