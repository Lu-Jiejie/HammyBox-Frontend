import type zhCN from '../locale/zh-CN.json'

type MessageSchema = typeof zhCN

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * 是否在发生 401 错误时开启静默认证流程
     */
    silentAuth?: boolean
  }
}
