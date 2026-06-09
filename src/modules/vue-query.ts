import type { App } from 'vue'
import type { InstallFn } from '.'
import type { VueQueryPluginOptions } from '@tanstack/vue-query'
import { VueQueryPlugin } from '@tanstack/vue-query'

export const install: InstallFn = (app: App) => {
  const vueQueryOptions: VueQueryPluginOptions = {
    queryClientConfig: {
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1,
          staleTime: 5 * 60 * 1000, // 5 minutes
        },
      },
    },
  }

  app.use(VueQueryPlugin, vueQueryOptions)
}
