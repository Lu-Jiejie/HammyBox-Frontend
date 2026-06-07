import type { App } from 'vue'
import type { InstallFn } from './'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAppStore } from '@/stores'

export const router = createRouter({
  routes,
  history: createWebHistory(import.meta.env.BASE_URL),
})

// 鉴权守卫：按目标路由的 meta.auth 校验登录态。
// 登录态刻意不持久化（防刷新伪造），刷新后未登录则跳对应登录页，
// 并带上 redirect，便于登录成功后回到原页面。
router.beforeEach((to) => {
  const auth = to.meta.auth
  if (!auth)
    return true

  const store = useAppStore()
  const loggedIn = auth === 'admin' ? store.adminLoggedIn : store.userLoggedIn
  if (loggedIn)
    return true

  const loginPath = auth === 'admin' ? '/admin/login' : '/login'
  return { path: loginPath, query: { redirect: to.fullPath } }
})

export const install: InstallFn = (app: App) => {
  app.use(router)
}
