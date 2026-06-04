import type { App } from 'vue'

export type InstallFn = (app: App) => void

const modules = import.meta.glob<{ install: InstallFn }>('./*.ts', { eager: true })
export function registerModules(app: App) {
  Object.values(modules).forEach((module) => {
    const install = module.install
    if (install) {
      install(app)
    }
  })
}
