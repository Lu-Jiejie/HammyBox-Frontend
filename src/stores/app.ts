import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { getPageConfig, savePageConfig } from '@/api/settings'
import { LocalStorageKey } from '@/types'
import { DEFAULT_NAME_TEMPLATE } from '@/utils/nameTemplate'

/** page 配置中保存上传预设列表的 config id */
const PRESETS_CONFIG_ID = 'uploadPresets'

/** page 配置中保存用户自定义标签库的 config id */
const USER_TAGS_CONFIG_ID = 'userTags'

/** page 配置中保存用户自定义命名模板的 config id */
const NAMING_TEMPLATES_CONFIG_ID = 'namingTemplates'

/** 用户保存的文件命名模板 */
export interface NamingTemplate {
  id: string
  name: string
  template: string
}

export interface UploadPresetConfig {
  uploadChannel: string
  uploadChannelName: string
  uploadFolder: string
  uploadNameType: string
  uploadNameTemplate: string
  uploadTags: string[]
  compressConfig: {
    customerCompress: boolean
    compressQuality: number
    compressBar: number
    serverCompress: boolean
    convertToWebp: boolean
  }
}

export interface UploadPreset {
  id: string
  name: string
  config: UploadPresetConfig
}

export const useAppStore = defineStore('app', () => {
  /* ─── 1. State (响应式状态) ─── */
  // 会话状态标记（不存储密码，实际认证通过 HttpOnly Cookie，且不参与本地持久化）
  const loggedIn = ref(false)

  const compressConfig = reactive({
    customerCompress: false,
    compressQuality: 4,
    compressBar: 5,
    serverCompress: false,
    convertToWebp: false,
  })

  // 上传配置
  const uploadChannel = ref('telegram')
  const uploadChannelName = ref<string>('')
  const uploadFolder = ref('')
  const uploadNameType = ref('default')
  const uploadTags = ref<string[]>([])

  // 用户自定义的标签列表（持久化）
  const userTags = ref<string[]>([])

  // 当前选中的文件命名模板（custom 模式下的模板内容，持久化）
  const uploadNameTemplate = ref(DEFAULT_NAME_TEMPLATE)

  // 用户保存的命名模板列表（持久化 + 云端同步）
  const namingTemplates = ref<NamingTemplate[]>([])

  // 根据字符串生成唯一颜色
  function getTagColor(tagName: string): string {
    // 内置标签的颜色
    const builtInColors: Record<string, string> = {
      blocked: 'red',
      whitelist: 'green',
      nsfw: 'orange',
      shared: 'purple',
    }

    if (builtInColors[tagName]) {
      return builtInColors[tagName]
    }

    // 可用颜色列表（排除内置标签已用的）
    const colors = ['blue', 'pink', 'yellow', 'indigo', 'cyan', 'teal']

    // 使用简单的哈希算法生成颜色索引
    let hash = 0
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // 获取标签显示名称
  function getTagDisplayName(tagName: string, locale: string): string {
    const displayNames: Record<string, Record<string, string>> = {
      blocked: { 'zh-CN': '黑名单', 'en-US': 'BLOCKED' },
      whitelist: { 'zh-CN': '白名单', 'en-US': 'WHITELIST' },
      nsfw: { 'zh-CN': '敏感内容', 'en-US': 'NSFW' },
      shared: { 'zh-CN': '共享', 'en-US': 'SHARED' },
    }

    return displayNames[tagName]?.[locale] || tagName
  }

  const customUrlSettings = reactive({
    useCustomUrl: 'false',
    customUrlPrefix: '',
  })

  const adminUrlSettings = reactive({
    useCustomUrl: 'false',
    customUrlPrefix: '',
  })

  // 深色模式状态
  const useDarkMode = ref<boolean | null>(null)

  // 文件视图模式偏好
  const fileViewMode = ref<'card' | 'list'>('list')
  const imageLoadMode = ref<'none' | 'lite' | 'full'>('full')

  // 上传预设组
  const uploadPresets = ref<UploadPreset[]>([])

  function savePreset(name: string) {
    const preset: UploadPreset = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name,
      config: {
        uploadChannel: uploadChannel.value,
        uploadChannelName: uploadChannelName.value,
        uploadFolder: uploadFolder.value,
        uploadNameType: uploadNameType.value,
        uploadNameTemplate: uploadNameTemplate.value,
        uploadTags: [...uploadTags.value],
        compressConfig: { ...compressConfig },
      },
    }
    uploadPresets.value.push(preset)
  }

  function deletePreset(id: string) {
    const idx = uploadPresets.value.findIndex(p => p.id === id)
    if (idx !== -1)
      uploadPresets.value.splice(idx, 1)
  }

  function applyPreset(id: string) {
    const preset = uploadPresets.value.find(p => p.id === id)
    if (!preset)
      return
    uploadChannel.value = preset.config.uploadChannel
    uploadChannelName.value = preset.config.uploadChannelName
    uploadFolder.value = preset.config.uploadFolder
    uploadNameType.value = preset.config.uploadNameType
    uploadNameTemplate.value = preset.config.uploadNameTemplate || DEFAULT_NAME_TEMPLATE
    uploadTags.value = [...preset.config.uploadTags]
    Object.assign(compressConfig, preset.config.compressConfig)
  }

  function renamePreset(id: string, name: string) {
    const preset = uploadPresets.value.find(p => p.id === id)
    if (preset)
      preset.name = name
  }

  /* ─── 上传预设云端同步（复用 page 配置接口，不新增后端接口）─── */

  // 上次与云端同步的时间（本地持久化显示用）
  const lastSyncTime = ref<string>('')

  // 各设置页最近一次与云端同步（成功加载/保存）的时间
  const settingsSyncTimes = reactive<Record<string, string>>({})

  // 各设置页最近一次成功加载的配置快照（本地持久化，用于首次进入自动加载、之后手动刷新）
  const settingsCache = ref<Record<string, unknown>>({})

  /**
   * 记录某设置页的同步时间（成功从云端加载或保存后调用）
   * @param page 设置页标识（upload/security/others/page）
   */
  function markSettingsSynced(page: string): void {
    settingsSyncTimes[page] = new Date().toISOString()
  }

  /**
   * 缓存某设置页的配置快照（深拷贝，避免与页面内 settings 共享引用）
   * @param page 设置页标识（upload/security/others/page）
   * @param data 设置数据
   */
  function cacheSettings(page: string, data: unknown): void {
    settingsCache.value[page] = JSON.parse(JSON.stringify(data))
  }

  /**
   * 读取云端 page 配置中的 uploadPresets 项，覆盖本地预设列表。
   * 返回是否找到云端预设。
   */
  async function fetchPresetsFromCloud(): Promise<boolean> {
    try {
      const { data } = await getPageConfig()
      const presetsItem = data?.config?.find(item => item.id === PRESETS_CONFIG_ID)
      if (!presetsItem) {
        return false
      }
      const parsed = JSON.parse(presetsItem.value)
      if (Array.isArray(parsed)) {
        uploadPresets.value = parsed as UploadPreset[]
        lastSyncTime.value = new Date().toISOString()
        return true
      }
      return false
    }
    catch {
      throw new Error('获取云端预设失败')
    }
  }

  /**
   * 将本地预设列表同步到云端。
   * page 配置是整体覆盖的，因此先 GET 全量配置，替换/新增 uploadPresets 项后整体 POST，
   * 避免清掉 page 配置中的其他项。
   */
  async function syncPresetsToCloud(): Promise<void> {
    let existing: Array<{ id: string, value: string }> = []
    try {
      const { data } = await getPageConfig()
      existing = data?.config || []
    }
    catch {
      // 读取失败时视为无既有配置（保持仅上传预设），仍允许保存
    }

    const merged = existing.filter(item => item.id !== PRESETS_CONFIG_ID)
    merged.push({
      id: PRESETS_CONFIG_ID,
      value: JSON.stringify(uploadPresets.value),
    })

    await savePageConfig(merged)
    lastSyncTime.value = new Date().toISOString()
  }

  /**
   * 从云端加载用户自定义标签库，覆盖本地 userTags。
   * 返回是否找到云端标签。
   */
  async function fetchUserTagsFromCloud(): Promise<boolean> {
    try {
      const { data } = await getPageConfig()
      const item = data?.config?.find(item => item.id === USER_TAGS_CONFIG_ID)
      if (!item) {
        return false
      }
      const parsed = JSON.parse(item.value)
      if (Array.isArray(parsed)) {
        userTags.value = parsed as string[]
        return true
      }
      return false
    }
    catch {
      throw new Error('获取云端标签失败')
    }
  }

  /**
   * 将本地 userTags 同步到云端（先 GET 合并，避免清掉其他 page 配置项）。
   */
  async function syncUserTagsToCloud(): Promise<void> {
    let existing: Array<{ id: string, value: string }> = []
    try {
      const { data } = await getPageConfig()
      existing = data?.config || []
    }
    catch {
      // 读取失败时视为无既有配置，仍允许保存
    }

    const merged = existing.filter(item => item.id !== USER_TAGS_CONFIG_ID)
    merged.push({
      id: USER_TAGS_CONFIG_ID,
      value: JSON.stringify(userTags.value),
    })

    await savePageConfig(merged)
  }

  /**
   * 从云端加载用户自定义命名模板，覆盖本地 namingTemplates。
   * 返回是否找到云端模板。
   */
  async function fetchNamingTemplatesFromCloud(): Promise<boolean> {
    try {
      const { data } = await getPageConfig()
      const item = data?.config?.find(item => item.id === NAMING_TEMPLATES_CONFIG_ID)
      if (!item) {
        return false
      }
      const parsed = JSON.parse(item.value)
      if (Array.isArray(parsed)) {
        namingTemplates.value = parsed as NamingTemplate[]
        return true
      }
      return false
    }
    catch {
      throw new Error('获取云端命名模板失败')
    }
  }

  /**
   * 将本地 namingTemplates 同步到云端（先 GET 合并，避免清掉其他 page 配置项）。
   */
  async function syncNamingTemplatesToCloud(): Promise<void> {
    let existing: Array<{ id: string, value: string }> = []
    try {
      const { data } = await getPageConfig()
      existing = data?.config || []
    }
    catch {
      // 读取失败时视为无既有配置，仍允许保存
    }

    const merged = existing.filter(item => item.id !== NAMING_TEMPLATES_CONFIG_ID)
    merged.push({
      id: NAMING_TEMPLATES_CONFIG_ID,
      value: JSON.stringify(namingTemplates.value),
    })

    await savePageConfig(merged)
  }

  /* ─── 4. Actions (异步数据请求) ─── */

  return {
    // 导出状态与 Getters
    loggedIn,
    compressConfig,
    uploadChannel,
    uploadChannelName,
    uploadFolder,
    uploadNameType,
    uploadTags,
    userTags,
    uploadNameTemplate,
    namingTemplates,
    customUrlSettings,
    adminUrlSettings,
    useDarkMode,
    fileViewMode,
    imageLoadMode,
    uploadPresets,
    lastSyncTime,
    settingsSyncTimes,
    settingsCache,

    // 导出操作方法
    getTagColor,
    getTagDisplayName,
    savePreset,
    deletePreset,
    applyPreset,
    renamePreset,
    fetchPresetsFromCloud,
    syncPresetsToCloud,
    fetchUserTagsFromCloud,
    syncUserTagsToCloud,
    fetchNamingTemplatesFromCloud,
    syncNamingTemplatesToCloud,
    markSettingsSynced,
    cacheSettings,
  }
}, {
  /* ─── 5. 高级持久化白名单配置 ─── */
  persist: {
    key: LocalStorageKey.APP_STORE,
    // 严格对齐你之前的白名单：不包含 adminLoggedIn、userLoggedIn，防止刷新网页时登录凭证伪造泄露
    pick: [
      'compressConfig',
      'uploadChannel',
      'uploadChannelName',
      'uploadFolder',
      'uploadNameType',
      'uploadNameTemplate',
      'namingTemplates',
      'uploadTags',
      'userTags',
      'customUrlSettings',
      'adminUrlSettings',
      'useDarkMode',
      'fileViewMode',
      'imageLoadMode',
      'uploadPresets',
      'lastSyncTime',
      'settingsSyncTimes',
      'settingsCache',
    ],
  },
})
