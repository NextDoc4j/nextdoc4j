# nextdoc4j 后端

[返回仓库总览](../README.md)

这里是 NextDoc4j 的 Java 后端工程，包含核心能力、Spring Boot Starter、插件、JSON 适配器、BOM 和随制品发布的 UI 静态资源。Maven Central 的产品制品都从本目录构建和发布。

## 目录结构

```text
nextdoc4j/
├── pom.xml                         # 后端产品聚合与发布 POM
├── nextdoc4j-bom/                  # 对外提供的依赖版本管理 BOM
├── nextdoc4j-core/                 # 核心模型、配置、常量和基础工具
├── nextdoc4j-common/               # Spring MVC/WebFlux 公共资源与过滤能力
├── nextdoc4j-plugin/               # 可选功能插件聚合
│   ├── nextdoc4j-plugin-enum/      # 枚举参数和枚举元数据展示
│   ├── nextdoc4j-plugin-gateway/   # 网关路由聚合和 OpenAPI 改写
│   └── nextdoc4j-plugin-security/  # 安全方案、基础认证和 Sa-Token 插件
├── nextdoc4j-adapter/              # JSON 实现适配器聚合
│   ├── nextdoc4j-adapter-jackson2/ # Jackson 2 适配
│   └── nextdoc4j-adapter-jackson3/ # Jackson 3 适配
├── nextdoc4j-starter/              # Spring Boot Starter 聚合
│   ├── nextdoc4j-spring-boot-starter/         # 单体 MVC/WebFlux Starter
│   └── nextdoc4j-gateway-spring-boot-starter/ # Gateway Starter
├── nextdoc4j-ui/                   # 将前端资源打进后端 Jar 的静态资源模块
└── .style/                         # Java 格式化和许可证头配置
```

## 模块职责

| 模块 | 职责 | 是否面向用户发布 |
| --- | --- | --- |
| `nextdoc4j-bom` | 对齐 NextDoc4j 各产品模块版本 | 是 |
| `nextdoc4j-core` | 配置模型、文档路径、JSON 抽象和基础工具 | 是 |
| `nextdoc4j-common` | Web MVC/WebFlux 共用的资源、过滤和扩展能力 | 是 |
| `nextdoc4j-plugin-*` | 按需引入的枚举、网关和安全能力 | 是 |
| `nextdoc4j-adapter-*` | Jackson 2/3 的 JSON 映射实现 | 是 |
| `nextdoc4j-*-starter` | Spring Boot 自动配置和 Starter 入口 | 是 |
| `nextdoc4j-ui` | `doc.html`、静态资源和字体 | 是，作为后端依赖的一部分 |

产品模块遵循从 `core` 到 `common`、插件/适配器，再到 Starter 的依赖方向。新增能力时，优先放进职责明确的模块，避免把 Spring Boot 或第三方实现依赖带入 `core`。

## 环境要求

- JDK 17+
- Maven 3.9+
- 能访问项目依赖仓库的 Maven settings.xml

## 构建和测试

在仓库根目录运行完整聚合测试，会包含后端、集中测试和 Demo：

```bash
mvn test
```

只构建后端产品模块：

```bash
mvn -f nextdoc4j/pom.xml clean package -DskipTests
```

只构建某个模块及其 Maven 依赖，例如 Starter：

```bash
mvn -f nextdoc4j/pom.xml -pl nextdoc4j-starter/nextdoc4j-spring-boot-starter -am package
```

模块中的 Java 测试统一放在根目录的 `nextdoc4j-tests`，不要为同一功能在产品模块和集中测试模块重复维护测试。

## 前端资源

后端的 `nextdoc4j-ui/src/main/resources` 是发布输入，不是独立前端源码。修改 React 前端后，从仓库根目录执行：

```bash
pnpm --dir release run build-ui
```

脚本会构建 `nextdoc4j-ui`，把 `index.html` 处理为 `doc.html`，并同步 `assets`、`fonts` 和 `licenses`。这些资源会被 Maven 打进 `nextdoc4j-ui` Jar，再由 Starter 提供给宿主应用。

## 发布

正式发布使用本目录的 `pom.xml` 和 `release` Profile：

```bash
pnpm --dir release run publish
```

发布脚本会先检查前端、运行根聚合测试和打包预览，再执行 `clean deploy -Prelease`。根聚合、`nextdoc4j-tests` 和 Demo 不会发布到 Maven Central。发布配置见 [release/README.md](../release/README.md)。

## 相关文档

- [前端 README](../nextdoc4j-ui/README.md)
- [Demo README](../nextdoc4j-demo/README.md)
- [集中测试 README](../nextdoc4j-tests/README.md)
- [贡献指南](../CONTRIBUTING.md)
