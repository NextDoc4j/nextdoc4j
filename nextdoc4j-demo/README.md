<p align="center">
  <img src="./nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-monolith/src/main/resources/favicon.ico" alt="Nextdoc4j Logo" width="180">
</p>

<h1 align="center">Nextdoc4j Demo</h1>

[返回仓库总览](../README.md)

<p align="center">
  <strong>🚀 NextDoc4j 多架构演示工程（Spring Boot 3 / 4 双轨）</strong><br>
  演示单体与网关微服务两种接入方式，并支持 SB3 与 SB4 并行运行。
</p>

<p align="center">
  🌐 <a href="https://demo.nextdoc4j.top/">在线演示</a> |
  📘 <a href="https://nextdoc4j.top/">官方文档</a> |
  🧩 <a href="https://nextdoc4j.top/more/changelog.html">更新日志</a> |
  ❓ <a href="https://nextdoc4j.top/more/faq.html">常见问题</a>
</p>

## 📖 项目简介

`nextdoc4j-demo` 是 Monorepo 中的集成示例目录，用于展示 NextDoc4j 在不同技术栈与部署架构下的接入方式：

- Spring Boot 3 与 Spring Boot 4 双版本隔离
- 单体服务模式
- 网关 + 微服务模式
- 统一的模型层、API 层复用，按 Boot 主版本隔离运行模块

> 本项目以演示和参考为主，不建议直接用于生产环境。

## 🏗 当前目录结构

```text
nextdoc4j-demo
├── nextdoc4j-demo-build
│   ├── nextdoc4j-demo-bom-sb3
│   └── nextdoc4j-demo-bom-sb4
├── nextdoc4j-demo-core
├── nextdoc4j-demo-api
│   ├── nextdoc4j-demo-api-user
│   ├── nextdoc4j-demo-api-system
│   └── nextdoc4j-demo-api-file
├── nextdoc4j-demo-boot3
│   ├── nextdoc4j-demo-boot3-monolith
│   ├── nextdoc4j-demo-boot3-service-user
│   ├── nextdoc4j-demo-boot3-service-system
│   ├── nextdoc4j-demo-boot3-service-file
│   ├── nextdoc4j-demo-boot3-gateway-webflux
│   └── nextdoc4j-demo-boot3-gateway-webmvc
└── nextdoc4j-demo-boot4
    ├── nextdoc4j-demo-boot4-monolith
    ├── nextdoc4j-demo-boot4-service-user
    ├── nextdoc4j-demo-boot4-service-system
    ├── nextdoc4j-demo-boot4-service-file
    ├── nextdoc4j-demo-boot4-gateway-webflux
    └── nextdoc4j-demo-boot4-gateway-webmvc
```

## 📦 模块说明

- `nextdoc4j-demo-build`: 版本与依赖管理聚合层
- `nextdoc4j-demo-bom-sb3`: SB3 依赖对齐 BOM
- `nextdoc4j-demo-bom-sb4`: SB4 依赖对齐 BOM
- `nextdoc4j-demo-core`: 共享模型与基础能力（不绑定 SB3/SB4）
- `nextdoc4j-demo-api-*`: 共享业务 API 层，按用户/系统/文件拆分
- `nextdoc4j-demo-boot3`: Spring Boot 3 演示聚合层
- `nextdoc4j-demo-boot3-monolith`: SB3 单体演示服务
- `nextdoc4j-demo-boot3-service-user/system/file`: SB3 微服务业务模块
- `nextdoc4j-demo-boot3-gateway-webflux/webmvc`: SB3 网关聚合服务
- `nextdoc4j-demo-boot4`: Spring Boot 4 演示聚合层
- `nextdoc4j-demo-boot4-monolith`: SB4 单体演示服务
- `nextdoc4j-demo-boot4-service-user/system/file`: SB4 微服务业务模块
- `nextdoc4j-demo-boot4-gateway-webflux/webmvc`: SB4 网关聚合服务

## ✅ 环境要求

- JDK 17+
- Maven 3.9+
- 可访问你本地 Maven settings 中配置的仓库

## 🔧 编译

在项目根目录执行：

```bash
mvn clean compile -s /usr/local/maven/apache-maven-3.9.9/conf/nextdoc4j/settings-nextdoc4j.xml
```

## 🚀 启动说明

### 启动类命名（SB3/SB4）

- `nextdoc4j-demo-boot3-monolith`: `Nextdoc4jDemoSb3Application`
- `nextdoc4j-demo-boot4-monolith`: `Nextdoc4jDemoSb4Application`
- `nextdoc4j-demo-boot3-gateway-webflux`: `GatewayServiceSb3Application`
- `nextdoc4j-demo-boot4-gateway-webflux`: `GatewayServiceSb4Application`
- `nextdoc4j-demo-boot3-gateway-webmvc`: `GatewayWebMvcServiceSb3Application`
- `nextdoc4j-demo-boot4-gateway-webmvc`: `GatewayWebMvcServiceSb4Application`
- `nextdoc4j-demo-boot3-service-user`: `UserServiceSb3Application`
- `nextdoc4j-demo-boot4-service-user`: `UserServiceSb4Application`
- `nextdoc4j-demo-boot3-service-system`: `SystemServiceSb3Application`
- `nextdoc4j-demo-boot4-service-system`: `SystemServiceSb4Application`
- `nextdoc4j-demo-boot3-service-file`: `FileServiceSb3Application`
- `nextdoc4j-demo-boot4-service-file`: `FileServiceSb4Application`

### 单体服务

SB3 单体：

```bash
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-monolith spring-boot:run -DskipTests
```

SB4 单体：

```bash
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-monolith spring-boot:run -DskipTests
```

默认端口：

- SB3: `8000`
- SB4: `8100`

访问示例：

- `http://localhost:8000/doc.html`
- `http://localhost:8100/doc.html`

### 网关微服务

SB3 网关 WebFlux：

```bash
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-gateway-webflux spring-boot:run -DskipTests
```

SB4 网关 WebFlux：

```bash
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-gateway-webflux spring-boot:run -DskipTests
```

SB3 网关 WebMvc：

```bash
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-gateway-webmvc spring-boot:run -DskipTests
```

SB4 网关 WebMvc：

```bash
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-gateway-webmvc spring-boot:run -DskipTests
```

SB3 用户/文件服务：

```bash
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-service-user spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-service-system spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-service-file spring-boot:run -DskipTests
```

SB4 用户/文件服务：

```bash
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-service-user spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-service-system spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-service-file spring-boot:run -DskipTests
```

默认端口与服务名：

- SB3 网关 WebFlux `9000`，服务 `gateway-server-sb3`
- SB3 网关 WebMvc `9001`，服务 `gateway-webmvc-server-sb3`
- SB3 用户 `9002`，服务 `user-service-sb3`
- SB3 系统 `9004`，服务 `system-service-sb3`
- SB3 文件 `9003`，服务 `file-service-sb3`
- SB4 网关 WebFlux `9100`，服务 `gateway-server-sb4`
- SB4 网关 WebMvc `9101`，服务 `gateway-webmvc-server-sb4`
- SB4 用户 `9102`，服务 `user-service-sb4`
- SB4 系统 `9104`，服务 `system-service-sb4`
- SB4 文件 `9103`，服务 `file-service-sb4`

> 说明：网关与微服务模块已内置 `spring-cloud-starter-alibaba-nacos-discovery` 和 `spring-cloud-starter-alibaba-nacos-config`。
> 默认通过 `spring.config.import` 加载 `optional:nacos:${spring.application.name}.yml?group=...`。
> 分组隔离约定：SB3 使用 `NEXTDOC4J_SB3`，SB4 使用 `NEXTDOC4J_SB4`，保证 3 只发现 3、4 只发现 4。

## 🤝 贡献指南

请遵循仓库根目录的 [CONTRIBUTING.md](../CONTRIBUTING.md)，Demo 修改完成后向 `master` 提交 Pull Request。

## 📄 许可证

本目录适用仓库根目录的 [Apache License 2.0](../LICENSE)。

## 💬 联系方式

- 邮箱：`nextdoc4j@163.com`
- 官网：[https://nextdoc4j.top](https://nextdoc4j.top)
