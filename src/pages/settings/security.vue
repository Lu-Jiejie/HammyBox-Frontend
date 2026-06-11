<script setup lang="ts">
import type { APIToken, SecuritySettings } from '@/api/settings'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {

  createAPIToken,
  deleteAPIToken,
  getAPITokens,
  getSecuritySettings,
  purgeCacheAll,
  saveSecuritySettings,
  updateAPIToken,
} from '@/api/settings'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select'
import { Switch } from '@/components/shadcn/switch'

definePage({
  meta: {
    title: '安全设置',
    auth: true,
  },
})

const { t } = useI18n()

const loading = ref(true)
const settings = ref<SecuritySettings>({
  auth: { password: '' },
  upload: { moderate: { enabled: false, channel: 'moderatecontent.com', moderateContentApiKey: '', nsfwApiPath: '' } },
  access: {
    sessionSecure: false,
    sessionMaxAge: 14,
    refererCheck: { enabled: false, allowedDomains: [], allowEmptyReferer: true },
    whiteListMode: { enabled: false },
  },
})

const showPasswordConfirm = ref(false)
const clearPassword = ref(false)
const passwordConfirm = ref('')
const originalPassword = ref('')
const refererDomainsInput = ref('')

const tokens = ref<APIToken[]>([])
const showTokenDialog = ref(false)
const showTokenResultDialog = ref(false)
const showEditTokenDialog = ref(false)
const showDeleteTokenDialog = ref(false)
const deleteTokenId = ref('')
const purgingCache = ref(false)

interface NewToken {
  name: string
  permissions: string[]
  neverExpire: boolean
  expirationValue: number
  expirationUnit: string
  autoDelete: boolean
}

const newToken = ref<NewToken>({
  name: '',
  permissions: [],
  neverExpire: true,
  expirationValue: 1,
  expirationUnit: 'd',
  autoDelete: false,
})

const editingToken = ref<NewToken & { id: string }>({
  id: '',
  name: '',
  permissions: [],
  neverExpire: true,
  expirationValue: 1,
  expirationUnit: 'd',
  autoDelete: false,
})

const createdTokenValue = ref('')

const authOpen = ref(true)
const refererOpen = ref(false)
const whitelistOpen = ref(false)
const sessionOpen = ref(false)
const tokenOpen = ref(false)

function handlePasswordInput() {
  showPasswordConfirm.value = settings.value.auth.password !== originalPassword.value
}

function handleClearPassword() {
  if (clearPassword.value) {
    settings.value.auth.password = ''
    showPasswordConfirm.value = false
  }
}

function computeExpiresAt(value: number, unit: string): string {
  const now = new Date()
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, M: 2592000000, Y: 31536000000 }
  return new Date(now.getTime() + value * (multipliers[unit] || 86400000)).toISOString()
}

async function handleCreateToken() {
  if (!newToken.value.name || newToken.value.permissions.length === 0) {
    toast.error(t('settings.security.messages.nameAndPermissionsRequired'))
    return
  }

  try {
    const data: any = {
      name: newToken.value.name,
      permissions: newToken.value.permissions,
      owner: 'admin',
    }

    if (!newToken.value.neverExpire) {
      data.expiresAt = computeExpiresAt(newToken.value.expirationValue, newToken.value.expirationUnit)
      data.autoDelete = newToken.value.autoDelete
    }

    const res = await createAPIToken(data)
    createdTokenValue.value = res.data.token
    showTokenDialog.value = false
    showTokenResultDialog.value = true
    await loadTokens()
    toast.success(t('settings.security.messages.tokenCreated'))
  }
  catch {
    toast.error(t('settings.security.messages.tokenCreateFailed'))
  }
}

async function handleUpdateToken() {
  if (editingToken.value.permissions.length === 0) {
    toast.error(t('settings.security.messages.permissionsRequired'))
    return
  }

  try {
    const data: any = {
      tokenId: editingToken.value.id,
      permissions: editingToken.value.permissions,
    }

    if (!editingToken.value.neverExpire) {
      data.expiresAt = computeExpiresAt(editingToken.value.expirationValue, editingToken.value.expirationUnit)
      data.autoDelete = editingToken.value.autoDelete
    }
    else {
      data.expiresAt = null
    }

    await updateAPIToken(data)
    showEditTokenDialog.value = false
    await loadTokens()
    toast.success(t('settings.security.messages.tokenUpdated'))
  }
  catch {
    toast.error(t('settings.security.messages.tokenUpdateFailed'))
  }
}

async function handleDeleteToken() {
  try {
    await deleteAPIToken(deleteTokenId.value)
    await loadTokens()
    toast.success(t('settings.security.messages.tokenDeleted'))
  }
  catch {
    toast.error(t('settings.security.messages.tokenDeleteFailed'))
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(createdTokenValue.value)
    toast.success(t('settings.security.messages.tokenCopied'))
  }
  catch {
    toast.error(t('settings.security.messages.copyFailed'))
  }
}

function editToken(token: APIToken) {
  const hasExpiration = token.expiresAt !== null
  editingToken.value = {
    id: token.id,
    name: token.name,
    permissions: [...token.permissions],
    neverExpire: !hasExpiration,
    expirationValue: 1,
    expirationUnit: 'd',
    autoDelete: token.autoDelete || false,
  }
  showEditTokenDialog.value = true
}

function getTokenStatus(expiresAt: string | null) {
  if (!expiresAt)
    return { status: 'active', label: t('settings.security.sections.token.status.active') }
  const now = Date.now()
  const expires = new Date(expiresAt).getTime()
  return expires > now ? { status: 'active', label: t('settings.security.sections.token.status.active') } : { status: 'expired', label: t('settings.security.sections.token.status.expired') }
}

function getPermissionLabel(perm: string) {
  const labels: Record<string, string> = {
    upload: t('settings.security.sections.token.permissions.upload'),
    delete: t('settings.security.sections.token.permissions.delete'),
    list: t('settings.security.sections.token.permissions.list'),
    manage: t('settings.security.sections.token.permissions.manage'),
  }
  return labels[perm] || perm
}

async function handlePurgeCache() {
  purgingCache.value = true
  try {
    const res = await purgeCacheAll()
    toast.success(t('settings.security.messages.cachePurged', { count: res.data.cleared || 0 }))
  }
  catch {
    toast.error(t('settings.security.messages.cachePurgeFailed'))
  }
  finally {
    purgingCache.value = false
  }
}

async function loadSettings() {
  try {
    const res = await getSecuritySettings()
    settings.value = res.data
    originalPassword.value = ''
    refererDomainsInput.value = res.data.access.refererCheck.allowedDomains.join(', ')
  }
  catch {
    toast.error(t('settings.security.messages.loadFailed'))
  }
  finally {
    loading.value = false
  }
}

async function loadTokens() {
  try {
    const res = await getAPITokens()
    tokens.value = res.data.tokens
  }
  catch {
    toast.error(t('settings.security.messages.loadTokensFailed'))
  }
}

async function handleSave() {
  if (showPasswordConfirm.value && settings.value.auth.password !== passwordConfirm.value) {
    toast.error(t('settings.security.messages.passwordMismatch'))
    return
  }

  if (settings.value.access.sessionMaxAge < 1) {
    toast.error(t('settings.security.messages.sessionMaxAgeInvalid'))
    return
  }

  const payload = JSON.parse(JSON.stringify(settings.value))
  payload.access.refererCheck.allowedDomains = refererDomainsInput.value.split(',').map(d => d.trim()).filter(Boolean)

  if (clearPassword.value) {
    payload.auth._clear = true
    payload.auth.password = ''
  }

  try {
    const res = await saveSecuritySettings(payload)
    toast.success(t('settings.security.messages.saved'))

    if (res.data.credentialsChanged) {
      toast.warning(t('settings.security.messages.passwordChanged'))
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
      return
    }

    if (res.data.whiteListModeChanged && res.data.cacheWarning) {
      toast.warning(res.data.cacheWarning)
    }

    await loadSettings()
    showPasswordConfirm.value = false
    clearPassword.value = false
    passwordConfirm.value = ''
  }
  catch {
    toast.error(t('settings.security.messages.loadFailed'))
  }
}

loadSettings()
loadTokens()
</script>

<template>
  <div class="mx-auto p-6 max-w-6xl space-y-8">
    <div>
      <h1 class="text-2xl font-semibold">
        {{ t('settings.security.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.security.description') }}
      </p>
    </div>

    <div v-if="loading" class="flex min-h-[500px] items-center justify-center">
      <div class="i-lucide-loader-circle text-5xl text-muted-foreground/40 animate-spin" />
    </div>

    <div v-else class="space-y-5">
      <!-- 认证管理 -->
      <Collapsible v-model:open="authOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-shield" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.security.sections.auth.title') }}</span>
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': authOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="space-y-2">
              <Label>{{ t('settings.security.sections.auth.password') }}</Label>
              <div class="flex gap-2">
                <Input
                  v-model="settings.auth.password"
                  type="password"
                  :placeholder="settings.auth._hasPassword ? t('settings.security.sections.auth.passwordPlaceholder') : ''"
                  :disabled="clearPassword"
                  @input="handlePasswordInput"
                />
                <Button v-if="settings.auth._hasPassword" variant="outline" @click="clearPassword = !clearPassword; handleClearPassword()">
                  {{ clearPassword ? t('settings.security.sections.auth.cancelClear') : t('settings.security.sections.auth.clearPassword') }}
                </Button>
              </div>
            </div>
            <div v-if="showPasswordConfirm" class="space-y-2">
              <Label>{{ t('settings.security.sections.auth.confirmPassword') }}</Label>
              <Input v-model="passwordConfirm" type="password" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- Referer 防盗链 -->
      <Collapsible v-model:open="refererOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-link" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.security.sections.referer.title') }}</span>
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': refererOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <Label>{{ t('settings.security.sections.referer.enable') }}</Label>
              <Switch v-model:checked="settings.access.refererCheck.enabled" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.security.sections.referer.allowedDomains') }}</Label>
              <Input v-model="refererDomainsInput" :placeholder="t('settings.security.sections.referer.domainsPlaceholder')" />
            </div>
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <Label>{{ t('settings.security.sections.referer.allowEmpty') }}</Label>
              <Switch v-model:checked="settings.access.refererCheck.allowEmptyReferer" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- 白名单模式 -->
      <Collapsible v-model:open="whitelistOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-filter" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.security.sections.whitelist.title') }}</span>
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': whitelistOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <div>
                <Label>{{ t('settings.security.sections.whitelist.enable') }}</Label>
                <p class="text-xs text-muted-foreground">
                  {{ t('settings.security.sections.whitelist.description') }}
                </p>
              </div>
              <Switch v-model:checked="settings.access.whiteListMode.enabled" />
            </div>
            <div class="p-3 border rounded-lg bg-muted/20 space-y-3">
              <p class="text-xs text-muted-foreground">
                {{ t('settings.security.sections.whitelist.cacheWarning') }}
              </p>
              <Button size="sm" variant="outline" :disabled="purgingCache" @click="handlePurgeCache">
                <div :class="purgingCache ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-trash-2'" class="mr-2" style="width: 14px; height: 14px;" />
                {{ t('settings.security.sections.whitelist.purgeCache') }}
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- 会话策略 -->
      <Collapsible v-model:open="sessionOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-clock" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.security.sections.session.title') }}</span>
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': sessionOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <div class="p-3 border rounded-lg flex items-center justify-between">
              <div>
                <Label>{{ t('settings.security.sections.session.secure') }}</Label>
                <p class="text-xs text-muted-foreground">
                  {{ t('settings.security.sections.session.secureDescription') }}
                </p>
              </div>
              <Switch v-model:checked="settings.access.sessionSecure" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('settings.security.sections.session.maxAge') }}</Label>
              <Input v-model.number="settings.access.sessionMaxAge" type="number" min="1" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <!-- API Token 管理 -->
      <Collapsible v-model:open="tokenOpen">
        <div class="border rounded-lg overflow-hidden">
          <CollapsibleTrigger class="px-4 py-3 bg-muted/30 flex w-full transition-colors items-center justify-between hover:bg-muted/50">
            <div class="flex gap-3 items-center">
              <div class="i-lucide-key" style="width: 18px; height: 18px;" />
              <span class="font-semibold">{{ t('settings.security.sections.token.title') }}</span>
              <Badge variant="secondary" class="text-xs">
                {{ tokens.length }}
              </Badge>
            </div>
            <div class="i-lucide-chevron-down transition-transform" :class="{ 'rotate-180': tokenOpen }" style="width: 16px; height: 16px;" />
          </CollapsibleTrigger>
          <CollapsibleContent class="p-4 space-y-4">
            <Button @click="showTokenDialog = true">
              <div class="i-lucide-plus mr-2" style="width: 14px; height: 14px;" />
              {{ t('settings.security.sections.token.create') }}
            </Button>

            <div v-if="tokens.length > 0" class="border rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="text-sm w-full">
                  <thead class="bg-muted/50">
                    <tr>
                      <th class="font-medium p-3 text-left">
                        {{ t('settings.security.sections.token.table.name') }}
                      </th>
                      <th class="font-medium p-3 text-left">
                        {{ t('settings.security.sections.token.table.token') }}
                      </th>
                      <th class="font-medium p-3 text-left">
                        {{ t('settings.security.sections.token.table.permissions') }}
                      </th>
                      <th class="font-medium p-3 text-left">
                        {{ t('settings.security.sections.token.table.status') }}
                      </th>
                      <th class="font-medium p-3 text-left">
                        {{ t('settings.security.sections.token.table.createdAt') }}
                      </th>
                      <th class="font-medium p-3 text-right">
                        {{ t('settings.security.sections.token.table.actions') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="token in tokens" :key="token.id" class="border-t hover:bg-muted/30">
                      <td class="p-3">
                        {{ token.name }}
                      </td>
                      <td class="p-3">
                        <code class="text-xs px-2 py-1 rounded bg-muted">{{ token.token.slice(0, 15) }}...</code>
                      </td>
                      <td class="p-3">
                        <div class="flex flex-wrap gap-1">
                          <Badge v-for="perm in token.permissions" :key="perm" variant="secondary" class="text-xs">
                            {{ getPermissionLabel(perm) }}
                          </Badge>
                        </div>
                      </td>
                      <td class="p-3">
                        <Badge :variant="getTokenStatus(token.expiresAt).status === 'active' ? 'default' : 'destructive'" class="text-xs">
                          {{ getTokenStatus(token.expiresAt).label }}
                        </Badge>
                      </td>
                      <td class="text-muted-foreground p-3">
                        {{ $d(new Date(token.createdAt), 'short') }}
                      </td>
                      <td class="p-3 text-right space-x-2">
                        <Button variant="ghost" size="sm" @click="editToken(token)">
                          {{ t('settings.upload.actions.edit') }}
                        </Button>
                        <Button variant="ghost" size="sm" @click="deleteTokenId = token.id; showDeleteTokenDialog = true">
                          {{ t('settings.upload.actions.delete') }}
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p v-else class="text-sm text-muted-foreground py-4 text-center">
              {{ t('settings.security.sections.token.empty') }}
            </p>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <div class="flex justify-end">
        <Button @click="handleSave">
          {{ t('common.actions.save') }}
        </Button>
      </div>
    </div>

    <!-- 创建 Token 对话框 -->
    <Dialog v-model:open="showTokenDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('settings.security.sections.token.dialog.create.title') }}</DialogTitle>
          <DialogDescription>{{ t('settings.security.sections.token.dialog.create.description') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>{{ t('settings.security.sections.token.fields.name') }}</Label>
            <Input v-model="newToken.name" :placeholder="t('settings.security.sections.token.fields.namePlaceholder')" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('settings.security.sections.token.fields.permissions') }}</Label>
            <div class="space-y-2">
              <label class="flex gap-2 items-center">
                <input v-model="newToken.permissions" type="checkbox" value="upload">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.upload') }}</span>
              </label>
              <label class="flex gap-2 items-center">
                <input v-model="newToken.permissions" type="checkbox" value="delete">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.delete') }}</span>
              </label>
              <label class="flex gap-2 items-center">
                <input v-model="newToken.permissions" type="checkbox" value="list">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.list') }}</span>
              </label>
              <label class="flex gap-2 items-center">
                <input v-model="newToken.permissions" type="checkbox" value="manage">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.manage') }}</span>
              </label>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <Label>{{ t('settings.security.sections.token.fields.neverExpire') }}</Label>
            <Switch v-model:checked="newToken.neverExpire" />
          </div>
          <div v-if="!newToken.neverExpire" class="space-y-2">
            <Label>{{ t('settings.security.sections.token.fields.expiration') }}</Label>
            <div class="flex gap-2">
              <Input v-model.number="newToken.expirationValue" type="number" min="1" class="flex-1" />
              <Select v-model="newToken.expirationUnit" class="w-24">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="d">
                    {{ t('settings.security.sections.token.fields.units.day') }}
                  </SelectItem>
                  <SelectItem value="M">
                    {{ t('settings.security.sections.token.fields.units.month') }}
                  </SelectItem>
                  <SelectItem value="Y">
                    {{ t('settings.security.sections.token.fields.units.year') }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div v-if="!newToken.neverExpire" class="flex items-center justify-between">
            <Label>{{ t('settings.security.sections.token.fields.autoDelete') }}</Label>
            <Switch v-model:checked="newToken.autoDelete" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showTokenDialog = false">
            {{ t('common.actions.cancel') }}
          </Button>
          <Button @click="handleCreateToken">
            {{ t('common.actions.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Token 创建成功对话框 -->
    <Dialog v-model:open="showTokenResultDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('settings.security.sections.token.dialog.result.title') }}</DialogTitle>
          <DialogDescription class="text-warning">
            {{ t('settings.security.sections.token.dialog.result.warning') }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>{{ t('settings.security.sections.token.dialog.result.fullToken') }}</Label>
            <div class="flex gap-2">
              <Input :value="createdTokenValue" readonly class="text-xs font-mono" />
              <Button @click="copyToken">
                {{ t('common.actions.copy') }}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button @click="showTokenResultDialog = false">
            {{ t('settings.security.sections.token.dialog.result.saved') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 编辑 Token 对话框 -->
    <Dialog v-model:open="showEditTokenDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('settings.security.sections.token.dialog.edit.title') }}</DialogTitle>
          <DialogDescription>{{ t('settings.security.sections.token.dialog.edit.description') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>{{ t('settings.security.sections.token.fields.name') }}</Label>
            <Input :value="editingToken.name" disabled />
          </div>
          <div class="space-y-2">
            <Label>{{ t('settings.security.sections.token.fields.permissions') }}</Label>
            <div class="space-y-2">
              <label class="flex gap-2 items-center">
                <input v-model="editingToken.permissions" type="checkbox" value="upload">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.upload') }}</span>
              </label>
              <label class="flex gap-2 items-center">
                <input v-model="editingToken.permissions" type="checkbox" value="delete">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.delete') }}</span>
              </label>
              <label class="flex gap-2 items-center">
                <input v-model="editingToken.permissions" type="checkbox" value="list">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.list') }}</span>
              </label>
              <label class="flex gap-2 items-center">
                <input v-model="editingToken.permissions" type="checkbox" value="manage">
                <span class="text-sm">{{ t('settings.security.sections.token.permissions.manage') }}</span>
              </label>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <Label>{{ t('settings.security.sections.token.fields.neverExpire') }}</Label>
            <Switch v-model:checked="editingToken.neverExpire" />
          </div>
          <div v-if="!editingToken.neverExpire" class="space-y-2">
            <Label>{{ t('settings.security.sections.token.fields.expiration') }}</Label>
            <div class="flex gap-2">
              <Input v-model.number="editingToken.expirationValue" type="number" min="1" class="flex-1" />
              <Select v-model="editingToken.expirationUnit" class="w-24">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="d">
                    {{ t('settings.security.sections.token.fields.units.day') }}
                  </SelectItem>
                  <SelectItem value="M">
                    {{ t('settings.security.sections.token.fields.units.month') }}
                  </SelectItem>
                  <SelectItem value="Y">
                    {{ t('settings.security.sections.token.fields.units.year') }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div v-if="!editingToken.neverExpire" class="flex items-center justify-between">
            <Label>{{ t('settings.security.sections.token.fields.autoDelete') }}</Label>
            <Switch v-model:checked="editingToken.autoDelete" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditTokenDialog = false">
            {{ t('common.actions.cancel') }}
          </Button>
          <Button @click="handleUpdateToken">
            {{ t('common.actions.save') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:open="showDeleteTokenDialog"
      :title="t('settings.security.sections.token.dialog.delete.title')"
      :description="t('settings.security.sections.token.dialog.delete.description')"
      @confirm="handleDeleteToken"
    />
  </div>
</template>
