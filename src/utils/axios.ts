import type { AxiosError } from 'axios'
import axios from 'axios'
import { router } from '@/modules/router'
import { useAppStore } from '@/stores'

const instance = axios.create({
  baseURL: import.meta.env.PROD ? '/' : '/dev-api',
  withCredentials: true,
})

let isRedirectingToLogin = false

instance.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const { response, config } = error

    if (response?.status === 401) {
      const store = useAppStore()
      store.loggedIn = false

      if (config?.silentAuth && !isRedirectingToLogin) {
        isRedirectingToLogin = true
        router.push('/login').finally(() => {
          isRedirectingToLogin = false
        })
      }
    }

    // 必须返回 rejected promise，否则错误对象会变成 undefined
    return Promise.reject(error)
  },
)

export default instance
