import type { App } from 'vue'
import type { InstallFn } from './'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

export const router = createRouter({
  routes,
  history: createWebHistory(import.meta.env.BASE_URL),
})

export const install: InstallFn = (app: App) => {
  app.use(router)
}
