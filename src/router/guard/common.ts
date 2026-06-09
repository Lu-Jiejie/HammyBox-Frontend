import type { Router } from 'vue-router'
import NProgress from 'nprogress'

export function setupCommonGuard(router: Router) {
  // NProgress 路由进度条
  router.beforeEach(async () => {
    NProgress.start()
    // 测试用：添加人工延迟来更明显地看到进度条
    // await new Promise(resolve => setTimeout(resolve, 500))
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
