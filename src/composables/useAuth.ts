// composables/useAuth.ts

import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { useAppStore } from '@/stores'
import instance from '@/utils/axios'

export type AuthType = 'user' | 'admin'

// ── 模块级单例的加载态 ──
// 登录/登出可能由多个组件触发（登录页、侧边栏登出按钮等），
// 把 loading 提升到模块作用域，保证同一时刻全局只有一份状态、互不串扰。
const userLoading = ref(false)
const adminLoading = ref(false)

// 最小加载时长：避免请求过快时按钮 loading 一闪而过，观感更稳。
function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  const delay = new Promise(resolve => setTimeout(resolve, ms))
  return Promise.all([promise, delay]).then(([result]) => result)
}

export function useAuth() {
  const { t } = useI18n()
  const store = useAppStore()
  const { userLoggedIn, adminLoggedIn } = storeToRefs(store)

  // upload 页登录：仅凭认证码。会话 Token 由后端通过 HttpOnly Cookie 下发。
  async function loginUser(authCode: string): Promise<boolean> {
    userLoading.value = true
    try {
      const res = await withMinDelay(
        // 不传 silentAuth：登录失败的 401 不应触发拦截器跳转，由这里自行提示。
        instance.post('/api/auth/login', { authCode }),
        500,
      )

      // 拦截器对错误不会 re-throw，失败时 res 为 undefined。
      if (res?.status === 200) {
        userLoggedIn.value = true
        toast.success(t('auth.uploadLogin.success'))
        return true
      }

      toast.error(t('auth.uploadLogin.failed'))
      return false
    }
    finally {
      userLoading.value = false
    }
  }

  // 管理页登录：用户名 + 密码。
  async function loginAdmin(username: string, password: string): Promise<boolean> {
    adminLoading.value = true
    try {
      const res = await withMinDelay(
        instance.post('/api/auth/adminLogin', { username, password }),
        500,
      )

      if (res?.status === 200) {
        adminLoggedIn.value = true
        toast.success(t('auth.adminLogin.success'))
        return true
      }

      toast.error(t('auth.adminLogin.failed'))
      return false
    }
    finally {
      adminLoading.value = false
    }
  }

  // 登出：authType 指定登出哪一侧（user=upload 页，admin=管理页）；
  // 不传则全部登出。请求体仅在指定时携带 authType。
  async function logout(authType?: AuthType): Promise<void> {
    await instance.post('/api/auth/logout', authType ? { authType } : {})

    // 不论后端结果如何都清掉对应本地会话标记，保证前端状态与意图一致。
    if (!authType || authType === 'user')
      userLoggedIn.value = false
    if (!authType || authType === 'admin')
      adminLoggedIn.value = false

    toast.success(t('auth.logout.success'))
  }

  return {
    userLoading,
    adminLoading,
    userLoggedIn,
    adminLoggedIn,

    loginUser,
    loginAdmin,
    logout,
  }
}
