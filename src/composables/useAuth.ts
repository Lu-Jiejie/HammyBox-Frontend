// composables/useAuth.ts

import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useAppStore } from '@/stores'
import axios from '@/utils/axios'

// ── 模块级单例的加载态 ──
// 登录/登出可能由多个组件触发（登录页、侧边栏登出按钮等），
// 把 loading 提升到模块作用域，保证同一时刻全局只有一份状态、互不串扰。
const loading = ref(false)

// 最小加载时长：避免请求过快时按钮 loading 一闪而过，观感更稳。
function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  const delay = new Promise(resolve => setTimeout(resolve, ms))
  return Promise.all([promise, delay]).then(([result]) => result)
}

export interface AuthResult {
  success: boolean
  error?: string
}

export function useAuth() {
  const store = useAppStore()
  const { loggedIn } = storeToRefs(store)

  // 会话检查：应用启动时调用，从后端同步真实会话状态
  async function checkSession(): Promise<boolean> {
    try {
      const response = await axios.get<{ valid: boolean }>('/api/auth/sessionCheck')
      if (response.data?.valid) {
        loggedIn.value = true
        return true
      }
      loggedIn.value = false
      return false
    }
    catch {
      loggedIn.value = false
      return false
    }
  }

  // 单一登录：仅凭密码。会话 Token 由后端通过 HttpOnly Cookie 下发。
  async function login(password: string): Promise<AuthResult> {
    loading.value = true
    try {
      await withMinDelay(
        axios.post('/api/auth/login', { password }),
        500,
      )

      loggedIn.value = true
      return { success: true }
    }
    catch {
      return { success: false, error: 'auth.login.failed' }
    }
    finally {
      loading.value = false
    }
  }

  // 登出：单用户模型，无需参数。
  async function logout(): Promise<AuthResult> {
    try {
      await axios.post('/api/auth/logout')
    }
    catch {
      // 忽略登出错误
    }

    // 不论后端结果如何都清掉本地会话标记，保证前端状态与意图一致。
    loggedIn.value = false

    return { success: true }
  }

  return {
    loading,
    loggedIn,

    login,
    logout,
    checkSession,
  }
}
