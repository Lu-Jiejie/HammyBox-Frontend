import axios from '@/utils/axios'

export interface QuotaConfig {
  enabled: boolean
  limitGB: number
  threshold: number
  usedMB?: number
}

export interface BaseChannel {
  id?: number
  name: string
  enabled: boolean
  fixed?: boolean
  quota?: QuotaConfig
}

export interface TelegramChannel extends BaseChannel {
  botToken: string
  chatId: string
  proxyUrl?: string
}

export interface CFR2Channel extends BaseChannel {
  publicUrl: string
}

export interface S3Channel extends BaseChannel {
  endpoint: string
  cdnDomain?: string
  bucketName: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  pathStyle: boolean
}

export interface DiscordChannel extends BaseChannel {
  botToken: string
  channelId: string
  proxyUrl?: string
  isNitro: boolean
}

export interface HuggingFaceChannel extends BaseChannel {
  repo: string
  token: string
  isPrivate: boolean
}

export interface WebDAVChannel extends BaseChannel {
  baseUrl: string
  username?: string
  password?: string
  publicUrl?: string
  headers?: Record<string, string>
  createDirectory: boolean
}

export interface ChannelSettings<T = BaseChannel> {
  loadBalance?: { enabled: boolean }
  channels: T[]
}

export interface UploadSettings {
  telegram: ChannelSettings<TelegramChannel>
  cfr2: ChannelSettings<CFR2Channel>
  s3: ChannelSettings<S3Channel>
  discord: ChannelSettings<DiscordChannel>
  huggingface: ChannelSettings<HuggingFaceChannel>
  webdav: ChannelSettings<WebDAVChannel>
}

export interface QuotaStatsResponse {
  success: boolean
  quotaStats?: Record<string, { usedMB: number, fileCount: number }>
  totalSizeMB?: number
  totalCount?: number
  lastUpdated?: number
  error?: string
}

export function getUploadSettings() {
  return axios.get<UploadSettings>('/manage/sysConfig/upload')
}

export function saveUploadSettings(settings: UploadSettings) {
  return axios.post('/manage/sysConfig/upload', settings)
}

export function getQuotaStats() {
  return axios.get<QuotaStatsResponse>('/manage/quota')
}

export function recalculateQuota() {
  return axios.post<QuotaStatsResponse>('/manage/quota')
}

export interface SecuritySettings {
  auth: {
    password: string
    _hasPassword?: boolean
    _clear?: boolean
  }
  upload: {
    moderate: {
      enabled: boolean
      channel: 'moderatecontent.com' | 'nsfwjs'
      moderateContentApiKey: string
      nsfwApiPath: string
    }
  }
  access: {
    sessionSecure: boolean
    sessionMaxAge: number
    refererCheck: {
      enabled: boolean
      allowedDomains: string[]
      allowEmptyReferer: boolean
    }
    whiteListMode: {
      enabled: boolean
    }
  }
}

export interface APIToken {
  id: string
  name: string
  owner: string
  permissions: string[]
  createdAt: string
  updatedAt: string
  token: string
  expiresAt: string | null
  autoDelete: boolean
}

export function getSecuritySettings() {
  return axios.get<SecuritySettings>('/manage/sysConfig/security')
}

export function saveSecuritySettings(settings: SecuritySettings) {
  return axios.post<{ message: string, credentialsChanged?: boolean, whiteListModeChanged?: boolean, cacheWarning?: string }>('/manage/sysConfig/security', settings)
}

export function getAPITokens() {
  return axios.get<{ tokens: APIToken[] }>('/manage/apiTokens')
}

export function createAPIToken(data: { name: string, permissions: string[], owner: string, expiresAt?: string | null, autoDelete?: boolean }) {
  return axios.post<APIToken>('/manage/apiTokens', data)
}

export function updateAPIToken(data: { tokenId: string, permissions: string[], expiresAt?: string | null, autoDelete?: boolean }) {
  return axios.put<{ success: boolean, message: string, tokenId: string }>('/manage/apiTokens', data)
}

export function deleteAPIToken(id: string) {
  return axios.delete<{ success: boolean, message: string }>(`/manage/apiTokens?id=${id}`)
}

export function purgeCacheAll() {
  return axios.post<{ success: boolean, message: string, total?: number, cleared?: number }>('/manage/cache/purge', { type: 'all' })
}

export interface OtherSettings {
  telemetry: {
    enabled: boolean
    fixed: boolean
  }
  randomImageAPI: {
    enabled: boolean
    allowedDir: string
    fixed: boolean
  }
  cloudflareApiToken: {
    CF_ZONE_ID: string
    CF_EMAIL: string
    CF_API_KEY: string
    fixed: boolean
  }
  webDAV: {
    enabled: boolean
    username: string
    password: string
    uploadChannel: string
    channelName: string
    internalToken: string
    internalTokenId: string
    fixed: boolean
  }
  publicBrowse: {
    enabled: boolean
    allowedDir: string
    fixed: boolean
  }
}

export function getOtherSettings() {
  return axios.get<OtherSettings>('/manage/sysConfig/others')
}

export function saveOtherSettings(settings: OtherSettings) {
  return axios.post('/manage/sysConfig/others', settings)
}

export interface SystemStatus {
  totalFiles: number
  lastUpdated: number
  channelStats: Record<string, number>
  accessStats: Record<string, number>
  uploadTrend: {
    labels: string[]
    total: number[]
    groupBy: {
      channel: { series: Array<{ name: string, data: number[] }> }
      channelName: { series: Array<{ name: string, data: number[] }> }
    }
  }
}

export function getSystemStatus() {
  return axios.get<SystemStatus>('/manage/list?action=info')
}

export function rebuildIndex() {
  return axios.post('/manage/list?action=rebuild')
}
