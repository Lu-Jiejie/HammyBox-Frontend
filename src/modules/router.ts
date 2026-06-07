import type { App } from 'vue'
import type { InstallFn } from './'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAuth } from '@/composables/useAuth'
import { useAppStore } from '@/stores'

export const router = createRouter({
  routes,
  history: createWebHistory(import.meta.env.BASE_URL),
})

// 鉴权守卫：统一登录模型，需要鉴权的路由会调用后端 sessionCheck 验证会话。
// 登录态刻意不持久化（防刷新伪造），刷新后通过 sessionCheck 从后端恢复真实会话状态。
router.beforeEach(async (to) => {
  const auth = to.meta.auth
  if (!auth)
    return true

  const store = useAppStore()
  const { checkSession } = useAuth()

  // 如果内存中已标记为已登录，信任该状态（避免每次跳转都调 API）
  if (store.loggedIn)
    return true

  // 否则调用后端验证真实会话（处理页面刷新后的首次路由）
  const sessionValid = await checkSession()
  if (sessionValid)
    return true

  // 会话无效，跳转登录页并带上 redirect
  return { path: '/login', query: { redirect: to.fullPath } }
})

export const install: InstallFn = (app: App) => {
  app.use(router)
}
