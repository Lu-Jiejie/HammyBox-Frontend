<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'
import FileDropzone from './components/FileDropzone.vue'
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
const showConfigPanel = ref(false)

const {
  uploadChannel,
  uploadChannelName,
  uploadFolder,
  uploadNameType,
  uploadTags,
  compressConfig,
} = storeToRefs(store)

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
    default: t('uploadPreferences.naming.default'),
    index: t('uploadPreferences.naming.index'),
    origin: t('uploadPreferences.naming.origin'),
    short: t('uploadPreferences.naming.short'),
  }
  return namingMap[uploadNameType.value] || uploadNameType.value
})

const channelNameDisplay = computed(() => {
  return uploadChannelName.value || t('uploadPreferences.channel.channelNameHint')
})
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl">
    <div class="mb-6">
      <div class="mb-2 flex gap-3 items-center">
        <h1 class="text-3xl font-bold">
          {{ t('upload.title') }}
        </h1>
      </div>
      <p class="text-muted-foreground">
        {{ t('upload.dragUploadText') }}
      </p>
    </div>

    <!-- 配置信息展示区 - 可折叠 -->
    <div class="mb-4 border rounded-lg bg-card/50 overflow-hidden backdrop-blur-sm">
      <button
        class="group px-4 py-3 text-left flex w-full transition-colors items-center justify-between hover:bg-accent/30"
        @click="showConfigPanel = !showConfigPanel"
      >
        <div class="flex flex-1 gap-2 min-w-0 items-center">
          <div class="i-lucide-layers text-muted-foreground shrink-0 transition-colors group-hover:text-foreground" style="width: 15px; height: 15px;" />
          <span class="text-sm font-medium">{{ t('upload.currentConfiguration') }}</span>
          <div class="text-xs text-muted-foreground/70 gap-2 min-w-0 hidden items-center sm:flex">
            <span class="truncate">{{ channelDisplayName }}</span>
            <span class="text-muted-foreground/40">·</span>
            <code class="font-mono px-1.5 py-0.5 rounded bg-muted/50 truncate">{{ uploadFolder || '/' }}</code>
          </div>
        </div>
        <div class="flex shrink-0 gap-1.5 items-center">
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 hover:bg-accent/50"
            @click.stop="showSettingsDialog = true"
          >
            <div class="i-lucide-settings-2" style="width: 14px; height: 14px;" />
          </Button>
          <div
            class="i-lucide-chevron-down text-muted-foreground shrink-0 transition-transform"
            :class="{ 'rotate-180': showConfigPanel }"
            style="width: 14px; height: 14px;"
          />
        </div>
      </button>

      <Transition
        enter-active-class="transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-[1000px] opacity-100"
        leave-active-class="transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]"
        leave-from-class="max-h-[1000px] opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div v-show="showConfigPanel" class="border-t bg-muted/20 overflow-hidden">
          <div class="p-4 gap-x-8 gap-y-4 grid grid-cols-1 lg:grid-cols-3 sm:grid-cols-2">
            <!-- 渠道类型 -->
            <div class="space-y-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-cloud text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.channel.type') }}</span>
              </div>
              <div class="text-sm text-foreground font-medium">
                {{ channelDisplayName }}
              </div>
            </div>

            <!-- 渠道名称 -->
            <div class="space-y-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-tag text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.channel.name') }}</span>
              </div>
              <div class="text-sm" :class="uploadChannelName ? 'font-medium text-foreground' : 'text-muted-foreground/60 italic'">
                {{ channelNameDisplay }}
              </div>
            </div>

            <!-- 上传目录 -->
            <div class="space-y-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-folder text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.channel.directory') }}</span>
              </div>
              <code class="text-sm text-foreground font-medium font-mono block">
                {{ uploadFolder || '/' }}
              </code>
            </div>

            <!-- 命名规则 -->
            <div class="space-y-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-file-text text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.naming.title') }}</span>
              </div>
              <div class="text-sm text-foreground font-medium">
                {{ namingDisplayName }}
              </div>
            </div>

            <!-- 转换为 WebP -->
            <div class="space-y-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-image text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.preprocessing.convertToWebp') }}</span>
              </div>
              <div class="flex gap-2 items-center">
                <div
                  class="rounded-full h-1.5 w-1.5"
                  :class="compressConfig.convertToWebp ? 'bg-green-500' : 'bg-muted-foreground/30'"
                />
                <span class="text-sm font-medium" :class="compressConfig.convertToWebp ? 'text-foreground' : 'text-muted-foreground/60'">
                  {{ compressConfig.convertToWebp ? t('upload.enabled') : t('upload.disabled') }}
                </span>
              </div>
            </div>

            <!-- 客户端压缩 -->
            <div class="space-y-2" :class="compressConfig.customerCompress ? 'sm:col-span-2 lg:col-span-3' : ''">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-package text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.preprocessing.clientCompress') }}</span>
              </div>
              <div class="flex flex-wrap gap-3 items-center">
                <div class="flex gap-2 items-center">
                  <div
                    class="rounded-full h-1.5 w-1.5"
                    :class="compressConfig.customerCompress ? 'bg-green-500' : 'bg-muted-foreground/30'"
                  />
                  <span class="text-sm font-medium" :class="compressConfig.customerCompress ? 'text-foreground' : 'text-muted-foreground/60'">
                    {{ compressConfig.customerCompress ? t('upload.enabled') : t('upload.disabled') }}
                  </span>
                </div>
                <template v-if="compressConfig.customerCompress">
                  <span class="text-muted-foreground/30">·</span>
                  <span class="text-xs text-muted-foreground/70">
                    {{ t('uploadPreferences.preprocessing.compressThreshold') }}: <span class="text-foreground font-semibold">{{ compressConfig.compressBar }} MB</span>
                  </span>
                  <span class="text-muted-foreground/30">·</span>
                  <span class="text-xs text-muted-foreground/70">
                    {{ t('uploadPreferences.preprocessing.expectedSize') }}: <span class="text-foreground font-semibold">{{ compressConfig.compressQuality }} MB</span>
                  </span>
                </template>
              </div>
            </div>

            <!-- 服务端压缩 (仅 Telegram) -->
            <div v-if="uploadChannel === 'telegram'" class="space-y-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-server text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.serverCompress.enable') }}</span>
              </div>
              <div class="flex gap-2 items-center">
                <div
                  class="rounded-full h-1.5 w-1.5"
                  :class="compressConfig.serverCompress ? 'bg-green-500' : 'bg-muted-foreground/30'"
                />
                <span class="text-sm font-medium" :class="compressConfig.serverCompress ? 'text-foreground' : 'text-muted-foreground/60'">
                  {{ compressConfig.serverCompress ? t('upload.enabled') : t('upload.disabled') }}
                </span>
              </div>
            </div>

            <!-- 标签 -->
            <div v-if="uploadTags.length > 0" class="space-y-2 lg:col-span-3 sm:col-span-2">
              <div class="flex gap-2 items-center">
                <div class="i-lucide-tags text-muted-foreground/60" style="width: 12px; height: 12px;" />
                <span class="text-xs text-muted-foreground/80 tracking-wide font-medium uppercase">{{ t('uploadPreferences.tags.title') }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <TagBadge
                  v-for="tag in uploadTags"
                  :key="tag"
                  :tag="tag"
                  :color="store.getTagColor(tag)"
                />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <FileDropzone />

    <UploadSettingsDialog v-model:open="showSettingsDialog" />
  </div>
</template>
