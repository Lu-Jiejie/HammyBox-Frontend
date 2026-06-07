---
name: cloudflare-imgbed-frontend
description: 开发与维护 CloudFlare-ImgBed 图床前端（Vue 3 + Vite + TypeScript，搭配 UnoCSS、shadcn-vue、Pinia、vue-router 文件路由、vue-i18n、axios）。凡是涉及本仓库的页面/布局改动、新增页面、路由调整、主题与暗色模式、国际化、上传与文件管理、备份恢复/重建索引、shadcn-vue 组件接入、Pinia 状态或 axios 接口对接，都应使用本技能。即使用户没有明确说“图床”或“前端”，只要任务发生在本仓库内，也优先参考本技能。
license: MIT
metadata:
  repository: CloudFlare-ImgBed-Frontend
  package-manager: pnpm
  framework: vue
  language: typescript
---

## 用途与范围

维护这个 CloudFlare 图床前端仓库：前台上传/文件浏览页、后台管理页、登录鉴权、布局与主题、国际化、Pinia 状态、axios 接口对接，以及备份生成 / 数据恢复 / 索引重建等业务服务。

本项目仍处于搭建阶段（近期提交多为 WIP），侧栏菜单、首页等存在 shadcn 模板的占位示例数据（如 `Acme Inc`、`src/pages/index.vue` 仅渲染 `1`）。改动前先确认目标处是真实业务代码还是待替换的脚手架占位。

## 代码库地图

- 应用入口：`src/main.ts`、`src/App.vue`
- 插件/模块注册：`src/modules/`（每个文件导出 `install(app)`，自动批量注册）
- 布局：`src/layout/`（`AdminLayout.vue` / `DefaultLayout.vue`，在 `App.vue` 中按路由手动切换）
- 页面（文件路由源）：`src/pages/**`
- 组件：`src/components/`
  - `src/components/shadcn/**`：shadcn-vue UI 基础组件（由 CLI 管理，ESLint 已忽略，勿手改格式）
  - `src/components/header/`、`src/components/nav/`：业务组件
- 状态：`src/stores/`（`app.ts` / `file.ts`，setup-store 写法 + 持久化）
- 组合式函数：`src/composables/`（如 `useBackground.ts`）
- 工具与服务：`src/utils/`（`axios.ts` 及备份/批处理/恢复/索引重建服务）
- 类型：`src/types/`（含 `LocalStorageKey` 枚举）
- 国际化文案：`src/locale/`（`zh-CN.json` / `en-US.json`）
- 样式：`src/styles/`（`main.css` 全局样式 + `shadcn.css` 主题变量）

## 参考文档

- 系统知识地图（导航索引，定位文件用）：[references/SYSTEM_KNOWLEDGE_MAP.md](references/SYSTEM_KNOWLEDGE_MAP.md)

## 标准工作流

1. 先读目标目录已有实现，复用既定模式与代码风格，不要另起炉灶。
2. 优先复用 `src/components/shadcn/**` 现成组件和共享工具（如 `cn`），避免重复造轮子。
3. 仅在必要时改动公共 API；不要顺手大面积重排无关代码（pre-commit 的 `eslint --fix` 已自动处理格式）。

## 常用命令与校验

- 开发服务器：`pnpm dev`（实际监听 3333 端口，CLI 的 `--port 3333` 会覆盖 `vite.config.ts` 里的 3000）
- 构建：`pnpm build`
- 单元测试：`pnpm test`（`vitest`）

要求（重要）：

- **不要运行 `pnpm lint` / `eslint`，也不要运行 `pnpm typecheck` / `vue-tsc`。** 原因：本机（Windows）环境下 `eslint .` 会以段错误（退出码 `3221225477` / `0xC0000005`）崩溃；这类静态检查在此项目当前不可靠，也不是首选的验证手段。
- 验证改动以**运行中的 dev server（HMR）+ 浏览器实际表现**为准：让用户在浏览器里确认效果与控制台报错，而不是跑 lint/typecheck。
- 提交时 nano-staged 仍会对暂存文件自动跑 `eslint --fix`，无需你手动触发格式化；不要为了“顺手格式化”而大面积重排无关代码。
- 若确需类型层面的确认，优先靠 IDE/Volar 的内联提示，而非命令行 `vue-tsc`。

## 设计与实现约定

- 一律使用 Vue 3 Composition API + `<script setup lang="ts">`；项目开启了 `propsDestructure`，可直接解构 `defineProps`。
- 路由是**文件路由**：在 `src/pages/**` 增删改文件即生成路由，不要手写路由表。页面元信息用 `definePage({ meta: { ... } })` 宏声明。
- 布局切换在 `App.vue` 里按 `route.path` 手动判断（非 layout 插件）：`/admin` 开头且非 `/admin/login` 用 `AdminLayout`，其余用 `DefaultLayout`。新增需要管理布局的页面时，确认其路径落在该判断分支内。
- Pinia 用 setup-store 写法，并通过 `persist: { key, pick: [...] }` 做持久化白名单；`LocalStorageKey` 统一放在 `src/types/index.ts`。**登录态（`adminLoggedIn` 等）刻意不持久化**，以防刷新页面时伪造登录态。
- 所有 HTTP 请求走 `src/utils/axios.ts` 的实例（`withCredentials`，401 自动跳 `/admin/login`，支持自定义 `silentAuth` 配置）。鉴权基于 HttpOnly Cookie，前端只存会话标记。
- 样式优先 UnoCSS 原子类与 `uno.config.ts` 中的 shortcuts（如 `place-center`、`header-sperator`），图标用 `i-lucide-*` / `i-carbon-*`。
- i18n 通过 `useI18n()` 的 `t()` 取文案，新增文案需同时更新 `zh-CN.json` 与 `en-US.json`；切换语言用 `src/modules/i18n.ts` 导出的 `changeLocale` / `toggleLocale`。
- 主题/暗色模式用 VueUse 的 `useColorMode`（light/dark/auto 循环，见 `ThemeSwitch.vue`）。
- 导入优先用 `@/`（指向 `src/`）别名，避免脆弱的相对路径。

## 常见任务指引

### 新增页面

1. 在 `src/pages/**` 下创建 `.vue` 文件（如 `src/pages/foo.vue` 或 `src/pages/foo/index.vue`），路由自动生成。
2. 需要标题等元信息时用 `definePage({ meta: { title: '...' } })`。
3. 若页面需要后台布局，确保路径落在 `/admin` 下且非 `/admin/login`（参见 `App.vue` 的布局判断）。
4. 复用现有布局与共享组件，保持间距与排版一致。

### 接入/新增组件

1. 先在 `src/components/shadcn/**` 找现成 UI 组件复用；需要新的 shadcn 组件时用 shadcn-vue CLI 添加，**不要手写到该目录或手动格式化**（已被 ESLint 忽略）。
2. 业务组件放在 `src/components/`（如 `header/`、`nav/`）以便跨页面复用。

### 新增第三方插件

1. 在 `src/modules/` 下新建 `<plugin>.ts`，导出 `export const install: InstallFn = (app) => { ... }`。
2. 无需手动注册——`src/modules/index.ts` 会用 `import.meta.glob` 自动收集并调用所有 `install`。

### 新增 Pinia store

1. 在 `src/stores/` 新建 `<name>.ts`，用 setup-store 写法 `defineStore('id', () => {...}, { persist: {...} })`。
2. 需持久化时在 `persist.pick` 中列出白名单字段，并把 key 加进 `LocalStorageKey` 枚举；敏感/登录态字段不要进白名单。
3. 在 `src/stores/index.ts` 中导出。

### 对接后端接口

1. 从 `@/utils/axios` 导入实例发请求；需要 401 静默跳登录的场景传 `{ silentAuth: true }`。
2. 复杂业务（备份/批量操作/恢复/重建索引）已封装在 `src/utils/*Service.ts` 与 `indexRebuilder.ts`，优先复用其类与错误类型（`BatchOperationError`）。

### 更新主题/样式

1. 优先 UnoCSS 原子类与 shortcuts；全局样式在 `src/styles/main.css`。
2. 主题色变量在 `src/styles/shadcn.css`，但由于这个项目配置了 `unocss-preset-shadcn` 以使 `shadcn-vue` 可以支持 `unocss`, 所以 `shadcn.css` 实际上没有任何用处，请别写入它。
3. 避免大量内联样式，保持组件可维护。

### 输出要求

改动完成后，给出简洁的中文小结，不需要做任何 lint 和 build 操作。
