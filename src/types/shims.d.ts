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

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /**
     * 该路由需要的登录身份：
     * - 'user'：upload（上传）页，需用户登录
     * - 'admin'：管理页，需管理员登录
     * 未设置则为公开路由（如登录页）。
     */
    auth?: 'user' | 'admin'
  }
}
