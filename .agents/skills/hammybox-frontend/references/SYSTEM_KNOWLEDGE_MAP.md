# 系统知识地图（面向 AI Agent）

> 这是一份「导航索引」，只保留高层结构与关键入口文件，方便 AI 快速定位，不复述实现细节。

## 项目概览

- 技术栈：Vue 3 + Vite 8 + TypeScript + UnoCSS
- 路由：`vue-router` v5，**文件路由**（`vue-router/vite` 从 `src/pages` 生成，类型写入 `src/typed-router.d.ts`）
- 状态：Pinia（启用 `pinia-plugin-persistedstate`）
- 数据请求：axios（统一实例 + 拦截器）
- UI：shadcn-vue（new-york-v4 风格，底层 reka-ui）/ `@lucide/vue` / vue-sonner（toast）
- 样式引擎：UnoCSS（presetWind4 + presetShadcn + presetAttributify + presetIcons + presetWebFonts）
- 国际化：vue-i18n（`zh-CN` / `en-US`）
- 包管理：pnpm

## 启动流程

- `index.html`
- `src/main.ts`：创建应用 → `registerModules(app)` 批量注册插件 → 引入 `uno.css` 与 `src/styles/main.css` → 挂载 `#app`
- `src/App.vue`：渲染全局 `<Toaster>` + 按 `route.path` 选择布局组件包裹 `<router-view />`

## 构建 / 生成（Vite）

- `vite.config.ts`
  - 别名：`@/` → `src/`
  - 路由生成：`vue-router/vite`（`exclude: ['**/components/**', '**/layout/**']`，类型输出 `src/typed-router.d.ts`）
  - UnoCSS：`unocss/vite`（配置见 `uno.config.ts`）
  - `Vue({ script: { propsDestructure: true } })`：可直接解构 props
  - dev server：CLI `--port 3333` 覆盖配置里的 `port: 3000`；`/dev-api` 代理到 `http://localhost:8080`

## 模块 / 插件注册（约定核心）

- `src/modules/index.ts`：用 `import.meta.glob('./*.ts', { eager: true })` 自动收集同目录所有模块，依次调用其导出的 `install(app)`。
- 现有模块：`router.ts`、`pinia.ts`、`i18n.ts`。
- **新增插件**：在 `src/modules/` 新建 `<plugin>.ts` 并 `export const install: InstallFn = (app) => {...}`，无需在别处手动注册。

## 路由与布局

- 页面（路由源）：`src/pages/**`
  - `index.vue` → `/`（前台上传，`definePage` 标题"图片上传"，`meta.auth: 'user'`）
  - `admin/index.vue` → `/admin`（`meta.auth: 'admin'`）
  - `admin/[...all].vue` → `/admin/:all(.*)`（后台 catch-all，`meta.auth: 'admin'`）
  - `admin/login.vue` → `/admin/login`（管理员登录，公开，表单在 `admin/components/AdminLoginForm.vue`）
  - `login/index.vue` → `/login`（上传登录，公开，表单在 `login/components/LoginForm.vue`）
- 路由装配：`src/modules/router.ts`（`createWebHistory` + `vue-router/auto-routes`）
  - **鉴权守卫**：`beforeEach` 按 `to.meta.auth`（`'user'` / `'admin'`）校验 app store 登录态，未登录跳对应登录页并带 `redirect` query
- 页面元信息：在页面内用 `definePage({ meta: {...} })`（不要手写路由表）；受保护页加 `meta.auth`
- 布局：`src/layout/AdminLayout.vue`、`src/layout/DefaultLayout.vue`
  - **布局选择逻辑在 `App.vue`**：`route.path` 以 `/admin` 开头且非 `/admin/login` → `AdminLayout`，否则 `DefaultLayout`。这是手动判断，不是 layout 插件，也不读 `meta.layout`。

## 状态与持久化

- `src/stores/app.ts`：用户配置、Bing 壁纸、登录态标记、上传/压缩/自定义 URL 设置、暗色模式偏好；`fetchUserConfig` / `fetchBingWallPapers` 等异步 action。
- `src/stores/file.ts`：文件列表状态 + DTO 转换器（`transformFileList` 隔离后端原始结构），本地增删改 + `refreshFileList` / `loadMoreFiles`（走 `/manage/list`）。
- 持久化：`defineStore(..., { persist: { key, pick: [...] } })`，key 来自 `src/types/index.ts` 的 `LocalStorageKey` 枚举。
- 安全约定：`adminLoggedIn` / `userLoggedIn` **不入持久化白名单**，避免刷新时伪造登录态泄露——代价是刷新后需重新登录（路由守卫会跳对应登录页）。登录态读写统一经 `useAuth()`。

## 数据请求 / API

- axios 实例：`src/utils/axios.ts`
  - `baseURL`：生产 `/`，开发 `/dev-api`（由 vite 代理）
  - `withCredentials: true`（基于 HttpOnly Cookie 鉴权）
  - 响应拦截器：401 时置 `adminLoggedIn = false`；若请求带 `silentAuth` 则跳转 `/admin/login`。**注意拦截器对错误不 re-throw**，失败时 promise 以 `undefined` resolve，调用方需检查返回值（如 `res?.status === 200`）而非 try/catch
- 登录鉴权：`src/composables/useAuth.ts`
  - 复用 app store 的 `userLoggedIn` / `adminLoggedIn`
  - `loginUser(authCode)` → `POST /api/auth/login`（upload 页）
  - `loginAdmin(username, password)` → `POST /api/auth/adminLogin`（管理页）
  - `logout(authType?)` → `POST /api/auth/logout`，body 带 `authType`（`'user'`/`'admin'` 分别登出，**不传则全部登出**）
  - `userLoading` / `adminLoading`：模块级单例加载态；登录带最小加载时长 + `vue-sonner` toast 提示
- 业务服务（封装好的领域逻辑，优先复用）：
  - `src/utils/batchDataService.ts`：批量操作，`BatchDataService` 类 + `BatchOperationError`（按状态码的错误处理表）
  - `src/utils/backupGeneratorService.ts`：备份生成（fetching/building/downloading 阶段 + 进度回调）
  - `src/utils/DataRestoreService.ts`：从备份恢复数据
  - `src/utils/indexRebuilder.ts`：重建索引

## 国际化

- 配置：`src/modules/i18n.ts`（`legacy: false`，默认/回退 `en-US`，当前语言用 `useLocalStorage` 持久化到 `LocalStorageKey.APP_LOCALE`）
- 导出 API：`locale`、`changeLocale(newLocale)`、`toggleLocale()`
- 文案：`src/locale/zh-CN.json`、`src/locale/en-US.json`（新增文案两边都要加）
- 组件内取文案：`const { t } = useI18n()`

## 主题 / 暗色模式

- 切换组件：`src/components/header/ThemeSwitch.vue`，用 VueUse `useColorMode({ emitAuto: true })`，按 light → dark → auto 循环。
- 主题色变量：`src/styles/shadcn.css`（shadcn 的 CSS 变量，baseColor neutral）。
- 注意：`stores/app.ts` 里的 `useDarkMode` / `cusDarkMode` 是旧字段；当前生效的暗色机制是 `useColorMode`。

## UnoCSS / 样式

- 配置：`uno.config.ts`
  - presets：`presetWind4`、`presetAnimations`、`presetShadcn({ color: 'neutral' }, { componentLibrary: 'reka' })`、`presetAttributify`、`presetIcons`、`presetWebFonts`
  - transformers：`transformerDirectives`、`transformerVariantGroup`
  - shortcuts：`header-sperator`、`place-center`
- 图标：`i-lucide-*`、`i-carbon-*`（presetIcons，`@iconify/json`）
- shadcn 配置：`components.json`（style `new-york-v4`，css `src/styles/shadcn.css`）
- 别名（components.json）：`ui` → `@/components/shadcn`，`utils` → `@/utils/shadcn`（`cn` 函数），`lib` → `@/utils`

## 组件目录约定

- shadcn-vue 基础 UI：`src/components/shadcn/**`（CLI 管理，**ESLint 已忽略，勿手改格式**）
- shadcn blocks：`src/components/new-york-v4/blocks/**`
- 业务组件：`src/components/`（`header/`、`nav/`、`AppSidebar.vue`、`Hint.vue` 等）
- 组合式函数：`src/composables/`（`useBackground.ts` 壁纸、`useAuth.ts` 登录鉴权；`index.ts` 目前为空）

## 关键约定

- 路由是文件式：**不要手写/手改路由表**，在 `src/pages/**` 增删改文件即可。
- 用 `definePage({ meta })` 声明页面元信息，而非分散的临时逻辑。
- 布局由 `App.vue` 按路径判断——加后台页时注意路径前缀。
- Pinia 用 setup-store + `persist.pick` 白名单；敏感/登录态不持久化。
- 所有请求走 `@/utils/axios` 实例；需要 401 静默跳登录时传 `silentAuth`。
- 导入优先 `@/`（指向 `src/`），避免脆弱相对路径。

## 常见任务（改哪里）

- 加页面/路由：在 `src/pages/**` 新建 `.vue`（可选 `definePage` meta）。
- 改/加布局：编辑 `src/layout/*.vue`，并核对 `App.vue` 的布局选择条件。
- 加插件：`src/modules/<plugin>.ts` 导出 `install`，自动注册。
- 加 store：`src/stores/*.ts`（setup-store + persist），并在 `index.ts` 导出。
- 对接接口：用 `@/utils/axios` 实例；批量/备份/恢复/索引类逻辑复用 `src/utils/*Service.ts`。
- 登录/登出/鉴权：用 `useAuth()`（`loginUser` / `loginAdmin` / `logout(authType?)`）；受保护页加 `definePage({ meta: { auth: 'user' | 'admin' } })`，守卫自动拦截。
- 加文案：同步改 `src/locale/zh-CN.json` 与 `en-US.json`。

## 常见坑

- 自动生成的类型/路由：增删页面后，`src/typed-router.d.ts` 可能需要 dev server 重新生成或重启 IDE/TS 才能识别。
- 布局判断在 `App.vue` 硬编码：新后台页若路径不在 `/admin` 下，不会套用 `AdminLayout`。
- 持久化白名单：往 `persist.pick` 里加字段要谨慎，登录/敏感态不要加。
- `axios.ts` 在模块顶层调用了 `useAppStore()` / `useRouter()`：改动该文件时注意 Pinia/Router 的初始化时序。
- 脚手架占位：`AppSidebar.vue`、`nav/*` 仍是 shadcn 模板示例数据，`src/pages/index.vue` 仅渲染占位——替换前先确认。
- dev 端口：实际是 3333（CLI 覆盖），不是 `vite.config.ts` 里写的 3000。

## 快速校验

- 开发：`pnpm dev`（监听 3333 端口）
- 构建：`pnpm build`
- 单元测试：`pnpm test`
- **不要运行 `pnpm lint` / `eslint` 或 `pnpm typecheck` / `vue-tsc`**：本机 Windows 环境下 `eslint .` 会段错误崩溃（退出码 `3221225477`），此类静态检查不可靠。验证以运行中的 dev server（HMR）+ 浏览器实际表现为准；格式化交给 pre-commit 的 nano-staged 自动处理。
