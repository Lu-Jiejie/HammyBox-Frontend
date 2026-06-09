import type { App } from 'vue'
import type { InstallFn } from './'
import router from '@/router'

export { router }

export const install: InstallFn = (app: App) => {
  app.use(router)
}
