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
    compressQuality: 4, // MB - target size after compression
    compressBar: 5, // MB - threshold to trigger compression
    serverCompress: true, // Telegram server-side compression
    convertToWebp: false,
  })

  // 上传配置
  const uploadChannel = ref('telegram')
  const uploadChannelName = ref<string>('')
  const uploadFolder = ref('')
  const uploadNameType = ref('default')

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
  const fileViewMode = ref<'card' | 'list'>('card')

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
    customUrlSettings,
    adminUrlSettings,
    useDarkMode,
    cusDarkMode,
    fileViewMode,
    credentials,

    // 导出操作方法
    setStoreUploadFolder,
    fetchUserConfig,
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
      'customUrlSettings',
      'adminUrlSettings',
      'useDarkMode',
      'cusDarkMode',
      'fileViewMode',
    ],
  },
})
