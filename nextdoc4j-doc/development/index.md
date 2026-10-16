# NextDoc4j 前端开发指南

## 项目概述

NextDoc4j-UI 是 NextDoc4j 的前端界面项目，提供现代化、可定制性强的 API 文档展示界面。作为 SpringDoc OpenAPI 的替代 UI 方案，它支持 API 文档浏览、在线测试、多语言 i18n 等功能。

## 技术栈

| 技术                  | 版本     | 用途          |
|---------------------|--------|-------------|
| **Vue**             | 3.5.x  | 前端框架        |
| **TypeScript**      | 5.8.x  | 类型支持        |
| **Vite**            | 6.3.x  | 构建工具        |
| **Pinia**           | 3.0.x  | 状态管理        |
| **Vue Router**      | 4.5.x  | 路由管理        |
| **Element Plus**    | 2.10.x | UI 组件库      |
| **TailwindCSS**     | 3.4.x  | 原子化 CSS     |
| **Monaco Editor**   | 0.52.x | 代码编辑器       |
| **Markdown-it**     | 14.x   | Markdown 渲染 |
| **vue-json-viewer** | 3.x    | JSON 查看器    |
| **Axios**           | 1.x    | HTTP 客户端    |
| **dayjs**           | 1.11.x | 日期处理        |

## 项目架构

### Monorepo 结构

项目采用 **pnpm workspace + Turbo** 的 Monorepo 架构：

```
nextdoc4j-ui/
├── apps/                          # 应用目录
│   └── web-ele/                   # NextDoc4j 主应用
├── packages/                      # 共享包
│   ├── @core/                     # 核心模块
│   │   ├── base/                  # 基础功能
│   │   ├── ui-kit/                # UI 组件库
│   │   ├── forward/               # 转发功能
│   │   └── .../
│   ├── effects/                   # 副作用/效果模块
│   ├── business/                  # 业务模块
│   └── .../
├── internal/                      # 内部工具配置
│   ├── lint-configs/              # 代码规范配置
│   │   ├── eslint-config/         # ESLint 配置
│   │   ├── prettier-config/       # Prettier 配置
│   │   └── stylelint-config/      # StyleLint 配置
│   ├── vite-config/               # Vite 构建配置
│   ├── tailwind-config/           # TailwindCSS 配置
│   ├── tsconfig/                  # TypeScript 配置
│   └── node-utils/                # Node 工具函数
├── docs/                          # 文档目录
├── playground/                    # 游乐场
└── scripts/                       # 构建脚本
```

### 主应用结构 (apps/web-ele)

```
apps/web-ele/src/
├── api/                      # API 接口
│   ├── core/                 # 核心 API
│   │   └── openApi.ts        # OpenAPI 接口定义
│   ├── index.ts              # API 入口
│   └── request.ts            # 请求封装
├── assets/                   # 静态资源
│   ├── style/                # 样式文件
│   │   ├── index.scss        # 全局样式入口
│   │   ├── scrollbar.scss    # 滚动条样式
│   │   └── github-markdown.css
│   └── logo.png              # Logo
├── bootstrap.ts              # 应用初始化
├── components/               # 公共组件
│   ├── api-test.vue          # API 测试组件
│   ├── body-params.vue       # Body 参数组件
│   ├── json-view.vue         # JSON 查看器
│   ├── json-viewer/          # JSON 查看器子组件
│   ├── loading.vue           # 加载组件
│   ├── params-table.vue      # 参数表格
│   └── schema-view.vue       # Schema 查看器
├── constants/                # 常量定义
│   ├── data-types.ts         # 数据类型
│   └── methods.ts            # HTTP 方法
├── directive/                # 自定义指令
│   ├── copyText.ts           # 复制文本指令
│   └── index.ts              # 指令入口
├── layouts/                  # 布局组件
│   ├── auth.vue              # 认证布局
│   ├── basic.vue             # 基础布局
│   └── index.ts              # 布局入口
├── locales/                  # 国际化
│   ├── index.ts              # i18n 入口
│   └── langs/
│       ├── en-US/page.json   # 英文语言包
│       └── zh-CN/page.json   # 中文语言包
├── main.ts                   # 应用入口
├── preferences.ts            # 用户偏好设置
├── router/                   # 路由配置
│   ├── access.ts             # 权限控制
│   ├── generate.ts           # 路由生成
│   ├── guard.ts              # 路由守卫
│   ├── index.ts              # 路由入口
│   └── routes/               # 路由定义
│       ├── core.ts           # 核心路由
│       ├── index.ts          # 路由入口
│       └── modules/          # 模块路由
│           └── home.ts       # 首页路由
├── store/                    # Pinia 状态管理
│   ├── access.ts             # 权限状态
│   ├── api.ts                # API 状态
│   └── index.ts              # Store 入口
├── typings/                  # 类型定义
│   └── openApi.d.ts          # OpenAPI 类型
├── utils/                    # 工具函数
│   ├── enumexpand.ts         # 枚举扩展
│   ├── schema.ts             # Schema 处理
│   └── securityexpand.ts     # 安全扩展
└── views/                    # 页面视图
    ├── _core/                # 核心页面
    │   └── fallback/         # 错误页面
    │       ├── not-found.vue
    │       ├── forbidden.vue
    │       ├── internal-error.vue
    │       └── .../
    ├── authorize/            # 授权页面
    ├── document/             # 文档页面
    │   ├── components/       # 文档组件
    │   │   ├── document.vue
    │   │   ├── parameter-view.vue
    │   │   ├── path-segment.vue
    │   │   └── security-view.vue
    │   └── index.vue
    ├── entity/               # 实体页面
    │   ├── components/       # 实体组件
    │   └── index.vue
    ├── home/                 # 首页
    └── markdown/             # Markdown 页面
```

## 环境要求

### 必需环境
- **Node.js**: 20.10.0 或更高版本（推荐 22.17.1）
- **pnpm**: 9.12.0 或更高版本（推荐 10.12.4）

### 推荐开发工具
- Visual Studio Code
- WebStorm / PhpStorm

## 开发环境搭建

### 1. 克隆项目
```bash
git clone https://gitee.com/nextdoc4j/nextdoc4j-ui.git
cd nextdoc4j-ui
```

### 2. 安装依赖
```bash
# 使用 pnpm 安装（自动禁止其他包管理器）
pnpm install

# 如果遇到依赖问题，可尝试重新安装
pnpm reinstall
```

### 3. 启动开发服务器
```bash
# 启动所有应用
pnpm dev

# 仅启动 web-ele 应用
pnpm dev:app
```

### 4. 构建生产版本
```bash
# 构建所有应用
pnpm build

# 仅构建 web-ele 应用
pnpm build:app

# 构建并分析
pnpm build:analyze
```

### 5. 代码检查
```bash
# 检查代码
pnpm check

# 类型检查
pnpm check:type

# 循环依赖检查
pnpm check:circular

# 依赖检查
pnpm check:dep

# 拼写检查
pnpm check:cspell
```

### 6. 代码格式化
```bash
# 格式化代码
pnpm format

# ESLint 检查
pnpm lint
```

## 核心 API 接口

### OpenAPI 接口

```typescript
// 获取完整的 OpenAPI 规范
GET /v3/api-docs

// 获取 Swagger 配置
GET /v3/api-docs/swagger-config

// 获取指定模块的 API 文档
GET /v3/api-docs/{module}
```

### 前端调用示例

```typescript
import { getOpenAPI, getOpenAPIConfig, getModuleAPIDoc } from '#/api/core/openApi';

// 获取 OpenAPI 规范
const openApiSpec = await getOpenAPI();

// 获取配置
const config = await getOpenAPIConfig();

// 获取指定模块文档
const moduleDoc = await getModuleAPIDoc('user-service');
```

## 主要功能模块

| 模块              | 说明               |
|-----------------|------------------|
| **首页**          | 概览所有 API 文档      |
| **文档浏览**        | 按模块/标签查看 API 文档  |
| **API 测试**      | 在线发起请求测试接口       |
| **授权管理**        | API 认证配置         |
| **Markdown 文档** | 集成 Markdown 文档展示 |
| **枚举展示**        | 显示枚举字段的可读值       |
| **认证信息**        | 展示当前用户的认证状态      |

## 代码规范

### ESLint 配置

项目使用 `@vben/eslint-config` 进行代码检查，包含以下规则集：
- TypeScript 检查
- Vue 组件检查
- Import 排序
- JSDoc 注释
- Prettier 格式化
- 代码优化建议

### Commit 规范

项目使用 **Commitizen** 和 **commitlint** 进行提交信息规范：

```bash
# 交互式提交
pnpm commit

# 或使用 czg
czg
```

提交类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

### 版本管理

项目使用 **Changeset** 进行版本管理：

```bash
# 创建版本变更
pnpm changeset

# 版本发布
pnpm version
pnpm build
pnpm publish
```

## 构建配置

### Vite 配置

项目使用 `@vben/vite-config` 进行构建配置，支持：
- 多环境配置（development、production、analyze）
- 自动导入
- 代码压缩
- PWA 支持
- 模块 federation

### TailwindCSS 配置

使用 `@vben/tailwind-config` 提供：
- 原子化 CSS 类
- 暗黑主题支持
- 自定义颜色配置
- 响应式设计

## 部署

### 构建产物

构建产物位于 `apps/web-ele/dist/` 目录，可部署到任何静态托管服务。

---

本开发指南将根据项目发展持续更新，欢迎贡献和建议！
