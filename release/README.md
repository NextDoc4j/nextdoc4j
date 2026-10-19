# release 脚本

从仓库根目录执行：

```bash
pnpm --dir release run <command>
```

配置文件为 [`.env.example`](.env.example)，复制为 `.env` 后使用。命令行环境变量优先于 `.env`。

## 目录结构

```text
release/
├── buildui/
│   └── build-ui.mjs       # 构建前端并同步后端资源
├── test/
│   ├── demo-profiles.mjs  # Demo Profile 和端口定义
│   ├── test-dev.mjs       # 前端开发联调
│   ├── test-preview.mjs   # 后端打包预览
│   └── test-matrix.mjs    # 批量验证多个 Profile
├── publish/
│   └── publish.mjs        # 检查并发布 Maven 制品
├── common.mjs             # 公共路径、进程和 HTTP 方法
├── .env.example           # 配置模板
├── .env                   # 本机配置，不提交
└── package.json           # pnpm 命令入口
```

## buildui

构建前端并同步 `doc.html`、`nextdoc/assets`：

```bash
pnpm --dir release run build-ui
```

没有专用参数。工具路径使用通用配置中的 `PNPM_BIN`。

## test-dev

启动 Vite 和指定 Demo。默认 Profile 是 `sb3-single-webmvc`。

```bash
pnpm --dir release run test-dev-single
pnpm --dir release run test-dev-gateway
pnpm --dir release run test-dev -- --profile=sb4-single-webflux
pnpm --dir release run test-dev -- --profile=sb4-gateway-webmvc --services=user,system
```

命令参数：

- `--profile=<名称>`：选择 Profile；
- `--services=<列表>`：网关服务，支持 `all`、`none`、`user`、`system`、`file`，可逗号组合；
- `--existing`：只复用已有后端；
- `--jar`：忽略已有后端并重新构建启动。

`.env` 参数：

- `NEXTDOC4J_DEMO_PROFILE`：Profile；默认 `sb3-single-webmvc`；
- `NEXTDOC4J_DEMO_BACKEND_URL`：已有后端地址；默认按 Profile 使用本机地址；
- `NEXTDOC4J_DEMO_BACKEND_PORT`：自启动后端端口；默认按 Profile 使用；
- `NEXTDOC4J_DEMO_GATEWAY_SERVICES`：网关服务列表；默认 `all`；
- `NEXTDOC4J_DEV_BACKEND_MODE`：`auto`、`existing` 或 `jar`；默认 `auto`；
- `NEXTDOC4J_DEV_UI_PORT`：Vite 端口；默认 `5777`；
- `NEXTDOC4J_DEV_NACOS_GRPC_PORT_OFFSET`：Nacos gRPC 端口偏移；默认使用 Nacos 默认值。

## test-preview

构建并启动指定 Profile 的后端，检查文档页面、OpenAPI 和静态资源：

```bash
pnpm --dir release run test-preview
pnpm --dir release run test-preview -- --profile=sb4-single-webflux
pnpm --dir release run test-preview -- --profile=sb3-gateway-webflux --build-ui=false
```

检查通过后默认保持服务运行，可直接访问输出的 Preview 地址；按 `Ctrl+C` 停止服务。

命令参数：

- `--profile=<名称>`：选择 Profile；
- `--services=<列表>`：网关服务列表；
- `--build-ui=true|false`：是否先构建 UI，默认读取 `.env` 中的 `NEXTDOC4J_PREVIEW_BUILD_UI`。
- `--keep-alive=true|false`：检查通过后是否保持服务运行，默认读取 `.env` 中的 `NEXTDOC4J_PREVIEW_KEEP_ALIVE`。

`.env` 参数：

- `NEXTDOC4J_PREVIEW_BUILD_UI`：`true` 或 `false`；默认 `true`；
- `NEXTDOC4J_PREVIEW_KEEP_ALIVE`：`true` 或 `false`；默认 `true`；
- `NEXTDOC4J_DEMO_PREVIEW_PORT`：Preview 端口；默认按 Profile 使用；
- `NEXTDOC4J_TEST_PROFILES`：矩阵测试的 Profile 列表；留空表示全部。

批量验证：

```bash
pnpm --dir release run test-matrix
pnpm --dir release run test-matrix -- --profiles=sb3-single-webmvc,sb4-single-webflux
pnpm --dir release run test-matrix -- --build-ui=false
```

## publish

发布前默认执行前端检查、UI 构建、Maven 测试和 Preview，然后执行 Maven deploy：

```bash
pnpm --dir release run publish
pnpm --dir release run publish -- --settings /path/to/settings.xml
pnpm --dir release run publish -- --skip-checks
```

参数：

- `--settings <路径>`：指定 Maven `settings.xml`；
- `--skip-checks`：跳过发布前检查。

`.env` 参数：

- `NEXTDOC4J_MAVEN_SETTINGS`：Maven settings.xml 路径；
- `NEXTDOC4J_PUBLISH_SKIP_CHECKS`：`true` 或 `false`；默认 `false`。

通用工具参数：

- `MAVEN_BIN`：Maven 命令；默认 `mvn`；
- `JAVA_BIN`：Java 命令；默认 `java`；
- `PNPM_BIN`：pnpm 命令；默认 `pnpm`。
