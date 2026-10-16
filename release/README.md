# 发布与集成测试脚本

[返回仓库总览](../README.md)

脚本入口和 `package.json` 都在 `release/` 目录。日常推荐从仓库根目录使用 `pnpm --dir release`，底层仍由 Node.js 调用 pnpm、Maven 和 Java。前端构建、Demo 预览和正式发布使用同一套路径与资源同步规则。

复制 `.env.example` 为 `.env` 后，所有命令会自动读取 `release/.env`。当前目录已提供本机配置模板；命令行环境变量会覆盖 `.env` 中的同名值。

常用配置包括：

- `NEXTDOC4J_MAVEN_SETTINGS`：Maven Central 发布使用的 `settings.xml` 路径；
- `NEXTDOC4J_DEV_BACKEND_MODE`、`NEXTDOC4J_DEV_BACKEND_URL`：开发联调是否复用 IDEA 服务；
- `NEXTDOC4J_DEV_BACKEND_PORT`、`NEXTDOC4J_DEV_UI_PORT`、`NEXTDOC4J_PREVIEW_PORT`：服务端口；
- `NEXTDOC4J_PUBLISH_SKIP_CHECKS`、`NEXTDOC4J_PREVIEW_SKIP_UI_BUILD`：是否跳过前置步骤，默认不跳过；
- `MAVEN_BIN`、`JAVA_BIN`、`PNPM_BIN`：工具路径，通常不需要设置。

## 目录结构

```text
release/
├── package.json       # pnpm 命令入口，脚本只负责发布和集成验证
├── .env.example       # 可提交的配置说明模板
├── .env               # 本机配置，不提交到 Git
├── common.mjs         # 路径、进程、HTTP 检查和工具调用公共方法
├── build-ui.mjs       # 构建前端并同步后端静态资源
├── test-dev.mjs       # 开发联调：复用 IDEA Demo 或启动临时 Demo
├── test-preview.mjs   # 打包预览：构建独立 Demo 并做 HTTP 冒烟检查
├── publish.mjs        # 完整检查后执行 Maven Central deploy
└── README.md          # 命令、配置和发布流程说明
```

脚本之间的边界是固定的：`test-dev` 面向开发联调，允许复用 IDEA 服务；`test-preview` 面向最终产物验证，始终启动独立打包 Demo；`publish` 串联所有检查后才发布，不会自动提交代码、创建 Tag 或推送 Git。

## 只构建前端资源

```bash
pnpm --dir release run build-ui
```

脚本会执行前端生产构建，把构建结果同步到 `nextdoc4j/nextdoc4j-ui/src/main/resources`，并把前端 `index.html` 处理为后端使用的 `doc.html`。

## 开发联调

```bash
pnpm --dir release run test-dev
```

脚本会优先检测 `8000` 端口上的 Spring Boot 3 单体 Demo。如果 IDEA 中已经启动 `Nextdoc4jDemoSb3Application`，脚本会复用这个服务，只启动前端 Vite 开发服务器；没有检测到时才会构建并启动自己的 Demo。前端代理会自动指向检测到的 Demo。

可通过环境变量修改端口：

```bash
NEXTDOC4J_DEV_BACKEND_PORT=8001 NEXTDOC4J_DEV_UI_PORT=5778 pnpm --dir release run test-dev
```

也可以显式选择模式：

```bash
# 强制使用已由 IDEA 启动的服务，不自动构建 Demo
pnpm --dir release run test-dev --existing

# 忽略已有服务，始终构建并启动脚本自己的 Demo
pnpm --dir release run test-dev --jar
```

脚本也支持指定已有服务地址：

```bash
NEXTDOC4J_DEV_BACKEND_URL=http://127.0.0.1:8000 pnpm --dir release run test-dev --existing
```

## 打包预览

```bash
pnpm --dir release run test-preview
```

脚本会执行前端完整检查与构建，将 `index.html` 处理为后端的 `doc.html`，构建 Demo，然后启动打包后的 Demo 并检查：

- `doc.html` 能返回 HTML；
- OpenAPI 文档能返回 JSON；
- 生成的前端静态资源能访问。

如果已经完成前端构建并只想重复验证后端打包，可以使用：

```bash
pnpm --dir release run test-preview --skip-ui-build
```

## 正式发布

```bash
pnpm --dir release run publish
```

也可以使用环境变量：

```bash
NEXTDOC4J_MAVEN_SETTINGS=/path/to/settings.xml pnpm --dir release run publish
```

发布脚本依次执行：

1. 前端 `check`；
2. 前端构建并同步后端资源；
3. 根聚合测试；
4. 打包启动独立 Demo，验证 `doc.html`、OpenAPI 和静态资源；
5. 使用 `nextdoc4j/pom.xml` 执行 `clean deploy -Prelease`。

正式发布不从根聚合 POM 发布，因此不会进入 `nextdoc4j-tests` 或 Demo。集中测试模块只参与根目录测试，正式发布不需要再通过 `-pl '!nextdoc4j-tests'` 排除它。

仅在已经完成全部检查、需要重复执行 Maven 发布时才使用：

```bash
NEXTDOC4J_PUBLISH_SKIP_CHECKS=true pnpm --dir release run publish
```

脚本不会自动提交代码、创建 Tag 或推送 Git。建议确认 `master` 上的版本和工作区后，再执行发布并创建对应版本 Tag。
