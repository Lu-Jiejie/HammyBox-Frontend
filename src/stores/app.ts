import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { LocalStorageKey } from '@/types'
import axios from '@/utils/axios'

export const useAppStore = defineStore('app', () => {
  /* ─── 1. State (响应式状态) ─── */
  const userConfig = ref<any>(null)
  const bingWallPapers = ref<Array<{ url: string }>>([])

  // 会话状态标记（不存储密码，实际认证通过 HttpOnly Cookie，且不参与本地持久化）
  const loggedIn = ref(false)

  const uploadMethod = ref('default')
  const uploadCopyUrlForm = ref('')

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
      'blocked': 'red',
      'whitelist': 'green',
      'nsfw': 'orange',
      'shared': 'purple',
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
      'blocked': { 'zh-CN': '黑名单', 'en-US': 'BLOCKED' },
      'whitelist': { 'zh-CN': '白名单', 'en-US': 'WHITELIST' },
      'nsfw': { 'zh-CN': '敏感内容', 'en-US': 'NSFW' },
      'shared': { 'zh-CN': '共享', 'en-US': 'SHARED' },
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
  const cusDarkMode = ref(false)

  // 文件视图模式偏好
  const fileViewMode = ref<'card' | 'list'>('list')
  const imageLoadMode = ref<'none' | 'lite' | 'full'>('full')

  /* ─── 2. Getters (计算属性) ─── */
  const credentials = computed(() => loggedIn.value ? '__session__' : null)

  // 包含附加副作用的特殊修改方法
  function setStoreUploadFolder(folder: string) {
    uploadFolder.value = folder
    localStorage.setItem('uploadFolder', folder)
  }

  /* ─── 4. Actions (异步数据请求) ─── */
  async function fetchUserConfig() {
    try {
      const response = await axios.get('/api/userConfig')
      userConfig.value = response.data
    }
    catch (error) {
      console.error('获取用户配置失败:', error)
    }
  }

  return {
    // 导出状态与 Getters
    userConfig,
    bingWallPapers,
    loggedIn,
    uploadMethod,
    uploadCopyUrlForm,
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
    cusDarkMode,
    fileViewMode,
    imageLoadMode,
    credentials,

    // 导出操作方法
    setStoreUploadFolder,
    fetchUserConfig,
    getTagColor,
    getTagDisplayName,
  }
}, {
  /* ─── 5. 高级持久化白名单配置 ─── */
  persist: {
    key: LocalStorageKey.APP_STORE,
    // 严格对齐你之前的白名单：不包含 adminLoggedIn、userLoggedIn，防止刷新网页时登录凭证伪造泄露
    pick: [
      'userConfig',
      'uploadMethod',
      'uploadCopyUrlForm',
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
      'cusDarkMode',
      'fileViewMode',
      'imageLoadMode',
    ],
  },
})
