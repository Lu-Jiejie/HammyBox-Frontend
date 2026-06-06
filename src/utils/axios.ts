import type { AxiosError } from 'axios'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores'

const store = useAppStore()
const router = useRouter()

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
      store.adminLoggedIn = false

      if (config?.silentAuth && !isRedirectingToLogin) {
        isRedirectingToLogin = true
        router.push('/admin/login').finally(() => {
          isRedirectingToLogin = false
        })
      }
    }
  },
)

export default instance
