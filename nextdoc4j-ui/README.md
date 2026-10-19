# nextdoc4j-ui 前端

[返回仓库总览](../README.md)

这里是 NextDoc4j 的 React 前端源码。它和 Java 后端一起发布：生产构建结果会同步到 `nextdoc4j/nextdoc4j-ui/src/main/resources`，由 Maven 打进后端制品并通过 `/doc.html` 提供服务。

## 目录结构

```text
nextdoc4j-ui/
├── package.json                 # pnpm 脚本、依赖和 Node 版本要求
├── pnpm-lock.yaml               # 前端依赖锁定文件
├── index.html                   # Vite 开发入口
├── public/                      # 不参与源码导入的公共资源
│   ├── fonts/                   # 字体资源
│   └── licenses/                # 第三方资源许可证
├── src/
│   ├── main.tsx                 # React 启动入口
│   ├── app.tsx                  # 应用根组件和路由入口
│   ├── assets/                  # Logo、导出等源码资源
│   ├── components/              # 跨功能复用的 UI 组件
│   ├── features/                # 按业务能力拆分的页面和状态
│   │   ├── aggregation/         # 多服务文档聚合
│   │   ├── documentation/       # 文档阅读和刷新
│   │   ├── export/               # OpenAPI、Markdown、PDF、Docx 导出
│   │   ├── playground/           # 在线调试、工作流和请求执行
│   │   ├── security/             # 认证和安全方案展示
│   │   └── workspace/            # 工作区、标签和持久化
│   ├── lib/                     # 浏览器存储、HTTP 和底层库封装
│   ├── styles/                  # 全局样式和功能样式
│   ├── types/                   # TypeScript 类型定义
│   └── utils/                   # 与界面无关的通用工具
├── tests/                       # Vitest 测试
│   ├── components/              # 组件行为测试
│   ├── features/                # 功能和状态测试
│   ├── fixtures/                # 测试数据和模拟服务
│   └── lib/                     # 底层工具测试
├── scripts/
│   ├── sync-backend-resources.mjs       # 构建产物同步到 Java 资源目录
│   └── compatibility-fixture-server.mjs # 兼容性测试夹具服务
├── vite.config.ts               # Vite、开发代理和构建配置
├── vitest.config.ts             # 测试环境配置
└── .env.*                       # 本地开发和生产环境变量
```

## 环境要求和安装

- Node.js 20.10+
- pnpm 9+

在仓库根目录执行：

```bash
pnpm --dir nextdoc4j-ui install
```

## 开发、检查和测试

启动前端开发服务器：

```bash
pnpm --dir nextdoc4j-ui run dev
```

默认 Vite 地址是 `http://localhost:5777`。开发服务器的 `/api` 请求会代理到 `.env.development` 配置的后端地址；使用统一联调脚本时，代理会自动指向本地 Demo 或 IDEA 中已经运行的 Demo：

```bash
# 单体：启动 UI + 单体服务
pnpm --dir release run test-dev-single

# 网关：启动 UI + 网关 + 微服务
pnpm --dir release run test-dev-gateway
```

网关模式默认启动用户、系统、文件服务，也可以通过 `NEXTDOC4J_DEMO_GATEWAY_SERVICES=user,system` 指定服务列表。联调脚本会根据启动场景自动设置 Vite 代理，不需要修改 `.env.development`。

也可以用 Profile 选择 Spring Boot 3/4、单体/网关、WebMvc/WebFlux 组合，例如：

```bash
pnpm --dir release run test-dev -- --profile=sb4-single-webflux
pnpm --dir release run test-dev -- --profile=sb4-gateway-webmvc --services=user,system
```

完整检查包括 TypeScript、ESLint、Vitest 和 Prettier：

```bash
pnpm --dir nextdoc4j-ui run check
```

也可以单独执行：

```bash
pnpm --dir nextdoc4j-ui run typecheck
pnpm --dir nextdoc4j-ui run lint
pnpm --dir nextdoc4j-ui run test
pnpm --dir nextdoc4j-ui run format:check
```

## 构建和后端同步

只构建 Vite 产物：

```bash
pnpm --dir nextdoc4j-ui run build
```

构建并同步到后端：

```bash
pnpm --dir release run build-ui
```

同步过程会：

1. 执行前端检查和生产构建；
2. 清理后端资源目录下旧的 `nextdoc` 静态资源；
3. 复制新构建的 `assets`、`fonts`、`licenses`；
4. 将 `dist/index.html` 的资源路径转换为后端使用的 `doc.html`。

同步后的资源如果属于本次功能变更，应和源码一起提交；`dist`、`node_modules` 和缓存不提交。

## 贡献约定

页面级改动优先放在对应的 `features` 目录，跨功能复用的组件放在 `components`，通用逻辑放在 `lib` 或 `utils`。新增行为应同时补充 Vitest 测试。涉及后端资源的改动，请执行 [release README](../release/README.md) 中的打包预览测试。
