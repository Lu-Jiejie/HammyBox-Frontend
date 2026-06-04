import type { App } from 'vue'
import type { InstallFn } from '.'
import { useLocalStorage } from '@vueuse/core'
import { createI18n } from 'vue-i18n'
import enUS from '../locale/en-US.json'
import zhCN from '../locale/zh-CN.json'
import { LocalStorageKey } from '../types'

const availableLocales = ['en-US', 'zh-CN'] as const
type AvailableLocale = typeof availableLocales[number]
export const locale = useLocalStorage<AvailableLocale>(LocalStorageKey.APP_LOCALE, 'en-US')

const i18n = createI18n({
  legacy: false,
  locale: locale.value,
  fallbackLocale: 'en-US',
  messages: {
    'en-US': enUS,
    'zh-CN': zhCN,
  },
})

export function changeLocale(newLocale: AvailableLocale) {
  locale.value = newLocale
  i18n.global.locale.value = newLocale
}

export function toggleLocale() {
  const locales = availableLocales
  const newLocale = locales[(locales.indexOf(locale.value) + 1) % locales.length]
  changeLocale(newLocale)
}

export const install: InstallFn = (app: App) => {
  app.use(i18n)
}
