import type { Router } from 'vue-router'
import { setupAuthGuard } from './auth'
import { setupCommonGuard } from './common'

export function setupRouterGuard(router: Router) {
  // 通用守卫（NProgress 等）
  setupCommonGuard(router)

  // 鉴权守卫
  setupAuthGuard(router)
}
