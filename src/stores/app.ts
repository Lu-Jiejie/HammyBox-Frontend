import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { LocalStorageKey } from '@/types'
import axiosInstance from '@/utils/axios'

export const useAppStore = defineStore('app', () => {
  /* ─── 1. State (响应式状态) ─── */
  const userConfig = ref<any>(null)
  const bingWallPapers = ref<Array<{ url: string }>>([])

  // 会话状态标记（不存储密码，实际认证通过 HttpOnly Cookie，且不参与本地持久化）
  const adminLoggedIn = ref(false)
  const userLoggedIn = ref(false)

  const uploadMethod = ref('default')
  const uploadCopyUrlForm = ref('')

  const compressConfig = reactive({
    customerCompress: undefined,
    compressQuality: undefined,
    compressBar: undefined,
    serverCompress: undefined,
    convertToWebp: undefined,
  })

  const storeUploadChannel = ref('')
  const storeChannelName = ref<string | null>(null) // null表示从未选择，''表示用户主动清空
  const storeAutoRetry = ref(true)
  const storeUploadNameType = ref('')
  const uploadFolder = ref('')

  const customUrlSettings = reactive({
    useCustomUrl: 'false',
    customUrlPrefix: '',
  })

  const adminUrlSettings = reactive({
    useCustomUrl: 'false',
    customUrlPrefix: '',
  })

  const autoReUpload = ref(true)

  // 深色模式状态
  const useDarkMode = ref<boolean | null>(null)
  const cusDarkMode = ref(false)

  /* ─── 2. Getters (计算属性) ─── */
  // 保持原有别名，确保项目中现有的 fetchWithAuth.js 或老业务代码直接无缝运行
  // const storeUploadMethod = computed(() => uploadMethod.value)
  // const storeAutoReUpload = computed(() => autoReUpload.value)
  const credentials = computed(() => adminLoggedIn.value ? '__session__' : null)

  // 兼容针对 uploadFolder 的原有 localStorage 兜底降级逻辑
  // const storeUploadFolder = computed(() => {
  //   return uploadFolder.value || localStorage.getItem('uploadFolder') || ''
  // })

  /* ─── 3. Actions (同步赋值方法，平替旧的 Mutations) ─── */
  // function setUserConfig(val: any) { userConfig.value = val }
  // function setBingWallPapers(val: any[]) { bingWallPapers.value = val }
  // function setAdminLoggedIn(loggedIn: boolean) { adminLoggedIn.value = loggedIn }
  // function setUserLoggedIn(loggedIn: boolean) { userLoggedIn.value = loggedIn }
  // function setUploadMethod(method: string) { uploadMethod.value = method }
  // function setUploadCopyUrlForm(form: string) { uploadCopyUrlForm.value = form }
  // function setStoreUploadChannel(channel: string) { storeUploadChannel.value = channel }
  // function setStoreChannelName(name: string | null) { storeChannelName.value = name }
  // function setStoreUploadNameType(type: string) { storeUploadNameType.value = type }
  // function setStoreAutoRetry(retry: boolean) { storeAutoRetry.value = retry }
  // function setUseDarkMode(mode: boolean | null) { useDarkMode.value = mode }
  // function setCusDarkMode(dark: boolean) { cusDarkMode.value = dark }
  // function setStoreAutoReUpload(retry: boolean) { autoReUpload.value = retry }

  // 兼容旧代码：setCredentials 映射到 adminLoggedIn
  function setCredentials(credentials: any) {
    adminLoggedIn.value = credentials !== null && credentials !== undefined
  }

  // // 针对 reactive 对象的子属性精确更新
  // function setCompressConfig({ key, value }: { key: string, value: any }) {
  //   (compressConfig as any)[key] = value
  // }
  // function setCustomUrlSettings({ key, value }: { key: string, value: any }) {
  //   (customUrlSettings as any)[key] = value
  // }
  // function setAdminUrlSettings({ key, value }: { key: string, value: any }) {
  //   (adminUrlSettings as any)[key] = value
  // }

  // 包含附加副作用的特殊修改方法
  function setStoreUploadFolder(folder: string) {
    uploadFolder.value = folder
    localStorage.setItem('uploadFolder', folder)
  }

  /* ─── 4. Actions (异步数据请求) ─── */
  async function fetchUserConfig() {
    try {
      const response = await axiosInstance.get('/api/userConfig')
      userConfig.value = response.data
    }
    catch (error) {
      console.error('获取用户配置失败:', error)
    }
  }

  async function fetchBingWallPapers() {
    try {
      const response = await axiosInstance.get('/api/bing/wallpaper')
      const wallpapers = response.data.data
      const processedPapers = wallpapers.map((wallpaper: any) => ({
        url: `https://www.bing.com${wallpaper.url}`,
      }))

      // 预加载图片流，阻塞直到图片全部缓存完成，避免前台壁纸闪烁
      await Promise.all(processedPapers.map((wallpaper: any) => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = reject
          img.src = wallpaper.url
        })
      }))

      bingWallPapers.value = processedPapers
    }
    catch (error) {
      console.error('预加载 Bing 壁纸失败:', error)
    }
  }

  return {
    // 导出状态与 Getters
    userConfig,
    bingWallPapers,
    adminLoggedIn,
    userLoggedIn,
    uploadMethod,
    uploadCopyUrlForm,
    compressConfig,
    storeUploadChannel,
    storeChannelName,
    storeAutoRetry,
    storeUploadNameType,
    uploadFolder,
    customUrlSettings,
    adminUrlSettings,
    autoReUpload,
    useDarkMode,
    cusDarkMode,
    // storeUploadMethod,
    // storeAutoReUpload,
    credentials,
    // storeUploadFolder,

    // 导出操作方法
    // setUserConfig,
    // setBingWallPapers,
    setCredentials,
    // setAdminLoggedIn,
    // setUserLoggedIn,
    // setUploadMethod,
    // setUploadCopyUrlForm,
    // setCompressConfig,
    // setStoreUploadChannel,
    // setStoreChannelName,
    // setStoreUploadNameType,
    // setCustomUrlSettings,
    // setStoreAutoRetry,
    // setAdminUrlSettings,
    // setUseDarkMode,
    // setCusDarkMode,
    setStoreUploadFolder,
    // setStoreAutoReUpload,
    fetchUserConfig,
    fetchBingWallPapers,
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
      'storeUploadChannel',
      'storeChannelName',
      'storeAutoRetry',
      'storeUploadNameType',
      'uploadFolder',
      'customUrlSettings',
      'adminUrlSettings',
      'autoReUpload',
      'useDarkMode',
      'cusDarkMode',
    ],
  },
})
