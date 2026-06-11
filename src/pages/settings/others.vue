<script setup lang="ts">
import type { OtherSettings } from '@/api/settings'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { getOtherSettings, saveOtherSettings } from '@/api/settings'
import InfoPopover from '@/components/InfoPopover.vue'
import { Button } from '@/components/shadcn/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Switch } from '@/components/shadcn/switch'

const { t } = useI18n()

definePage({
  meta: {
    title: '其他设置',
    auth: true,
  },
})

const loading = ref(true)
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
  }
  catch {
    toast.error(t('settings.others.messages.loadFailed'))
  }
  finally {
    loading.value = false
  }
}

async function handleSave() {
  try {
    await saveOtherSettings(settings.value)
    toast.success(t('settings.others.messages.saved'))
    await loadSettings()
  }
  catch {
    toast.error(t('settings.others.messages.saveFailed'))
  }
}

loadSettings()
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        {{ t('settings.others.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.others.description') }}
      </p>
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

      <!-- 公开浏览 -->
      <Collapsible v-model:open="publicBrowseOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-eye" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.others.sections.publicBrowse.title') }}</span>
              <InfoPopover :content="t('settings.others.sections.publicBrowse.hint')" />
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': publicBrowseOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <div>
                <Label>{{ t('settings.others.sections.publicBrowse.enable') }}</Label>
                <p class="text-xs text-muted-foreground">
                  {{ t('settings.others.sections.publicBrowse.description') }}
                </p>
              </div>
              <Switch v-model:checked="settings.publicBrowse.enabled" :disabled="settings.publicBrowse.fixed" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.others.sections.publicBrowse.allowedDir') }}</Label>
              <Input v-model="settings.publicBrowse.allowedDir" :placeholder="t('settings.others.sections.publicBrowse.allowedDirPlaceholder')" :disabled="settings.publicBrowse.fixed" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <div class="flex justify-end">
        <Button @click="handleSave">
          {{ t('settings.others.actions.save') }}
        </Button>
      </div>
    </div>
  </div>
</template>
