import type { Router } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAppStore } from '@/stores'

export function setupAuthGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const store = useAppStore()
    const { checkSession } = useAuth()

    const authPaths = ['/login']
    const isAuthPage = authPaths.includes(to.path)
    const isFromAuthPage = authPaths.includes(from.path)

    // 如果用户已登录但访问登录页，重定向到之前的页面或首页
    if (store.loggedIn && isAuthPage) {
      // 检查 from 路由是否有效（有路径、不同于目标路径、不是登录页）
      if (from.path && from.path !== to.path && !isFromAuthPage) {
        return from
      }
      // 回退：重定向到首页（首次访问或无效来源）
      return { path: '/' }
    }

    // 登录页不需要鉴权，直接放行
    if (isAuthPage) {
      return true
    }

    // 其他所有页面都需要鉴权
    // 如果内存中已标记为已登录，信任该状态（避免每次跳转都调 API）
    if (store.loggedIn) {
      return true
    }

    // 否则调用后端验证真实会话（处理页面刷新后的首次路由）
    const sessionValid = await checkSession()
    if (sessionValid) {
      return true
    }

    // 会话无效，跳转登录页并带上 redirect
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  })
}
