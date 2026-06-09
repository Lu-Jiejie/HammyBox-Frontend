---
name: hammybox-frontend
description: 开发与维护 HammyBox 图床前端（Vue 3 + Vite + TypeScript，搭配 UnoCSS、shadcn-vue、Pinia、vue-router 文件路由、vue-i18n、TanStack Query）。凡是涉及本仓库的页面/布局改动、新增页面、路由调整、主题与暗色模式、国际化、文件管理、shadcn-vue 组件接入、Pinia 状态或 API 接口对接，都应使用本技能。即使用户没有明确说”图床”或”前端”，只要任务发生在本仓库内，也优先参考本技能。
license: MIT
metadata:
  repository: HammyBox-Frontend
  package-manager: npm
  framework: vue
  language: typescript
---

## 用途与范围

维护这个 HammyBox 图床前端仓库：文件上传、文件管理（浏览/搜索/删除）、标签管理、API Tokens、系统设置、登录鉴权、布局与主题、国际化、Pinia 状态、API 接口对接。

## 代码库地图

- 应用入口：`src/main.ts`、`src/App.vue`
- 插件/模块注册：`src/modules/`（每个文件导出 `install(app)`，自动批量注册）
- 布局：`src/layouts/`（`default.vue` 使用 shadcn-vue 的 Sidebar 组件）
- 页面（文件路由源）：`src/pages/**`
  - `src/pages/upload.vue`：文件上传页（含拖拽上传、配置面板）
  - `src/pages/files/`：文件管理页（列表/卡片视图、搜索、文件夹导航）
  - `src/pages/tags/`：标签管理
  - `src/pages/api-tokens/`：API Token 管理
  - `src/pages/settings/`：系统设置（安全、上传渠道、页面配置等）
- 组件：`src/components/`
  - `src/components/shadcn/**`：shadcn-vue UI 基础组件（由 CLI 管理，ESLint 已忽略，勿手改格式）
  - `src/components/AppSidebar.vue`：应用侧边栏（使用 Sidebar 组件）
  - `src/components/nav/`：导航相关组件（NavMain、NavUser）
  - `src/components/FolderTreeSelector.vue`、`TreeView.vue`、`TagBadge.vue` 等业务组件
- 状态：`src/stores/`（`app.ts` 为主要 store，setup-store 写法 + 持久化）
- 组合式函数：`src/composables/`（如 `useAuth.ts` 登录鉴权）
- API 接口：`src/api/`（如 `files.ts`、`tags.ts` 等，使用 axios）
- 工具：`src/utils/`（`axios.ts`、`shadcn.ts` 等）
- 类型：`src/types/`
- 国际化文案：`src/locale/`（`zh-CN.json` / `en-US.json`）
- 样式：`src/styles/`（`main.css` 全局样式）

## 参考文档

- 系统知识地图（导航索引，定位文件用）：[references/SYSTEM_KNOWLEDGE_MAP.md](references/SYSTEM_KNOWLEDGE_MAP.md)
- API 文档（接口细节，设计约定用）：[api](../../../docs/api/)

## 标准工作流

1. 先读目标目录已有实现，复用既定模式与代码风格，不要另起炉灶。
2. 优先复用 `src/components/shadcn/**` 现成组件和共享工具（如 `cn`），避免重复造轮子。
3. 仅在必要时改动公共 API；不要顺手大面积重排无关代码（pre-commit 的 `eslint --fix` 已自动处理格式）。
4. **遵循 frontend-design skill 的美学原则**：注重视觉层次、间距、配色、动画细节，避免通用 AI 风格，创造有特色的界面。

## 常用命令与校验

- **不要运行 `npm run dev` 启动开发服务器**——用户会自行管理开发服务器的启动和停止。
- 构建：`npm run build`
- 单元测试：`npm run test`（如有配置）

**重要约定**：

- **禁止运行 `npm run dev` / `pnpm dev` / `yarn dev` 等启动开发服务器的命令。** 用户会根据需要自行启动，AI 不应主动启动或重启开发服务器。
- **不要运行 lint 或 typecheck 命令。** 验证改动以用户在浏览器中的实际表现为准，由用户确认效果与控制台报错。
- 提交时 pre-commit hook 会自动运行 `eslint --fix`，无需手动触发格式化；不要为了”顺手格式化”而大面积重排无关代码。
- 若确需类型层面的确认，优先靠 IDE/Volar 的内联提示。

## 设计与实现约定

- 一律使用 Vue 3 Composition API + `<script setup lang="ts">`；项目开启了 `propsDestructure`，可直接解构 `defineProps`。
- 路由是**文件路由**：在 `src/pages/**` 增删改文件即生成路由，不要手写路由表。页面元信息用 `definePage({ meta: { ... } })` 宏声明。
- 布局：主要使用 `src/layouts/default.vue`，采用 shadcn-vue 的 Sidebar 组件系统。侧边栏配置在 `src/components/AppSidebar.vue`。
- Pinia 用 setup-store 写法，并通过 `persist: { key, pick: [...] }` 做持久化白名单；需要持久化的 key 统一在 `src/types/index.ts` 管理。**登录态（`userLoggedIn`）不持久化**，刷新后需重新登录（路由守卫会跳转登录页）。
- 登录鉴权统一走 `src/composables/useAuth.ts`：复用 app store 的 `userLoggedIn`，提供 `login(authCode)` 和 `logout()` 方法。使用 `vue-sonner` 的 `toast` 提示操作结果。
- 路由守卫在 `src/modules/router.ts` 的 `beforeEach`：按目标路由 `meta.auth` 校验登录态，未登录跳登录页并带 `redirect` query。新增受保护页时用 `definePage({ meta: { auth: true } })` 声明。
- 登录页在 `src/pages/login/index.vue`（输入认证码）。
- 所有 HTTP 请求走 `src/utils/axios.ts` 的实例（`withCredentials`，401 自动处理）。鉴权基于 HttpOnly Cookie，前端只存会话标记。
- **数据获取优先使用 TanStack Query (`@tanstack/vue-query`)**：通过 `useQuery`、`useMutation` 等 hooks 管理服务端状态，自动处理缓存、重试、加载态。不要在组件中直接用 `ref` + `axios` 管理异步数据。
- 样式优先 UnoCSS 原子类与 `uno.config.ts` 中的 shortcuts（如 `place-center`），图标用 `i-lucide-*`。
- i18n 通过 `useI18n()` 的 `t()` 取文案，新增文案需同时更新 `zh-CN.json` 与 `en-US.json`。
- 主题/暗色模式用 VueUse 的 `useColorMode`（light/dark/auto 循环）。
- 导入优先用 `@/`（指向 `src/`）别名，避免脆弱的相对路径。
- **视觉设计**：遵循精致、现代的设计语言，注重：
  - 卡片/面板使用 `bg-card/50 border backdrop-blur-sm` 营造层次感
  - 图标统一使用 15px 左右尺寸保持精致感
  - 按钮使用 `ghost` variant + `hover:bg-accent/50` 创造轻量交互
  - 文本层次：标题用 `text-3xl font-bold`，描述用 `text-muted-foreground`，标签用 `text-xs text-muted-foreground/80 uppercase`
  - 动画使用 `transition-*` 类，关键交互使用 Vue 的 `<Transition>` 组件

## 常见任务指引

### 新增页面

1. 在 `src/pages/**` 下创建 `.vue` 文件（如 `src/pages/foo.vue` 或 `src/pages/foo/index.vue`），路由自动生成。
2. 需要标题等元信息时用 `definePage({ meta: { title: '...' } })`。
3. 需要鉴权时用 `definePage({ meta: { auth: true } })`。
4. 复用现有布局与共享组件，保持间距与排版一致。

### 接入/新增组件

1. 先在 `src/components/shadcn/**` 找现成 UI 组件复用；需要新的 shadcn 组件时用 shadcn-vue CLI 添加，**不要手写到该目录或手动格式化**（已被 ESLint 忽略）。
2. 业务组件放在 `src/components/` 或对应页面的 `components/` 子目录以便复用。

### 新增第三方插件

1. 在 `src/modules/` 下新建 `<plugin>.ts`，导出 `export const install: InstallFn = (app) => { ... }`。
2. 无需手动注册——`src/modules/index.ts` 会用 `import.meta.glob` 自动收集并调用所有 `install`。

### 新增 Pinia store

1. 在 `src/stores/` 新建 `<name>.ts`，用 setup-store 写法 `defineStore('id', () => {...}, { persist: {...} })`。
2. 需持久化时在 `persist.pick` 中列出白名单字段；敏感/登录态字段不要进白名单。
3. 在 `src/stores/index.ts` 中导出。

### 登录 / 登出 / 鉴权

1. 登录、登出统一用 `useAuth()`：`login(authCode)` 登录，`logout()` 登出。
2. 新增需要鉴权的页面：用 `definePage({ meta: { auth: true } })` 标注，守卫会自动拦截未登录访问并带 `redirect` 跳登录页。登录页本身不要设 `meta.auth`。

### 对接后端接口

1. 从 `@/api/*` 导入接口函数（如 `getFileList`、`deleteFile` 等），这些函数内部使用 `@/utils/axios` 实例。
2. 在组件中优先使用 TanStack Query 的 `useQuery`、`useMutation` 管理数据：
   ```typescript
   const { data, isLoading, refetch } = useQuery({
     queryKey: ['files', params],
     queryFn: () => getFileList(params.value)
   })
   ```
3. 对于修改操作使用 `useMutation` 并配合 `queryClient.invalidateQueries` 刷新相关数据。

### 更新主题/样式

1. 优先 UnoCSS 原子类与 shortcuts；全局样式在 `src/styles/main.css`。
2. 遵循既定的视觉设计语言：卡片用 `bg-card/50 border backdrop-blur-sm`，按钮用 `ghost` + `hover:bg-accent/50`。
3. 避免大量内联样式，保持组件可维护。

### 优化页面视觉效果

1. 参考 `src/pages/upload.vue` 的配置面板设计：层次分明、精致的间距、统一的图标尺寸。
2. 使用一致的文本层级：大标题 `text-3xl font-bold`、小标题 `text-sm font-medium`、标签 `text-xs text-muted-foreground/80 uppercase`。
3. 为关键交互添加过渡动画：折叠面板用 `<Transition>`，按钮用 `transition-colors`。

### 输出要求

改动完成后，给出简洁的中文小结，说明做了什么改动以及效果。无需运行 lint、typecheck 或 dev server。
