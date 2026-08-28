import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { LocalStorageKey } from '@/types'

export interface UploadPresetConfig {
  uploadChannel: string
  uploadChannelName: string
  uploadFolder: string
  uploadNameType: string
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
    uploadTags.value = [...preset.config.uploadTags]
    Object.assign(compressConfig, preset.config.compressConfig)
  }

  function renamePreset(id: string, name: string) {
    const preset = uploadPresets.value.find(p => p.id === id)
    if (preset)
      preset.name = name
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
    customUrlSettings,
    adminUrlSettings,
    useDarkMode,
    fileViewMode,
    imageLoadMode,
    uploadPresets,

    // 导出操作方法
    getTagColor,
    getTagDisplayName,
    savePreset,
    deletePreset,
    applyPreset,
    renamePreset,
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
      'uploadTags',
      'userTags',
      'customUrlSettings',
      'adminUrlSettings',
      'useDarkMode',
      'fileViewMode',
      'imageLoadMode',
      'uploadPresets',
    ],
  },
})
