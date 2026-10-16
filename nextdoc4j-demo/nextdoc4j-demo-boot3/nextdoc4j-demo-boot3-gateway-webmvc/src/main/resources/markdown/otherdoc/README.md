<p align="center">
  <img src="favicon.ico" alt="Nextdoc4j Logo" width="180">
</p>

<h1 align="center">Nextdoc4j</h1>

<p align="center">
  <strong>🚀 现代化的 API 文档后端解决方案</strong><br>
  基于 <strong>Spring Boot 3 / 4</strong> + <strong>SpringDoc</strong> 构建，替代 Swagger UI，<br>
  提供更美观、更强大的开发体验，让 API 文档焕然一新。
</p>

<p align="center">
  🌐 <a href="https://demo.nextdoc4j.top/">在线演示</a> |
  📘 <a href="https://nextdoc4j.top/">官方文档</a> |
  🧩 <a href="https://nextdoc4j.top/more/changelog.html">更新日志</a> |
  ❓ <a href="https://nextdoc4j.top/more/faq.html">常见问题</a>
</p>

## 📖 项目简介

**NextDoc4j Demo** 是一个演示项目，用于展示 Nextdoc4j 在不同架构下的集成方式，包括传统的单体应用和现代化的微服务架构。

该项目的主要目标是：

1. **展示 NextDoc4j 的基本功能**
   提供可运行的示例代码，让开发者快速了解 NextDoc4j 的核心用法。

2. **演示不同架构下的集成方式**
   展示 NextDoc4j 在 Spring Boot 单体应用和 Spring Cloud 微服务架构中的集成方法。

3. **作为学习与参考示例**
   开发者可以参考该项目快速上手，或在自己的项目中测试 NextDoc4j 文档生成功能。

> ⚡ 本项目仅作演示与示例用途，不建议直接用于生产环境。

## 🏗 项目结构

本项目采用 Maven 多模块结构，包含以下模块：

```
nextdoc4j-demo
├── nextdoc4j-demo-build           # Spring Boot 版本配置与 BOM
│   ├── nextdoc4j-demo-bom-sb3
│   └── nextdoc4j-demo-bom-sb4
├── nextdoc4j-demo-core            # 不绑定 Spring Boot 的共享模型与基础能力
├── nextdoc4j-demo-api             # 共享 API 层
│   ├── nextdoc4j-demo-api-user
│   ├── nextdoc4j-demo-api-system
│   └── nextdoc4j-demo-api-file
├── nextdoc4j-demo-boot3           # Spring Boot 3 演示模块
│   ├── nextdoc4j-demo-boot3-monolith
│   ├── nextdoc4j-demo-boot3-service-user
│   ├── nextdoc4j-demo-boot3-service-system
│   ├── nextdoc4j-demo-boot3-service-file
│   ├── nextdoc4j-demo-boot3-gateway-webflux
│   └── nextdoc4j-demo-boot3-gateway-webmvc
└── nextdoc4j-demo-boot4           # Spring Boot 4 演示模块
    ├── nextdoc4j-demo-boot4-monolith
    ├── nextdoc4j-demo-boot4-service-user
    ├── nextdoc4j-demo-boot4-service-system
    ├── nextdoc4j-demo-boot4-service-file
    ├── nextdoc4j-demo-boot4-gateway-webflux
    └── nextdoc4j-demo-boot4-gateway-webmvc
```

## 🚀 快速开始

### 环境要求

- JDK 17 或更高版本
- Maven 3.9+
- IDE 支持（IntelliJ IDEA, Eclipse, VS Code 等）

### 运行 Spring Boot 单体应用

```bash
# Spring Boot 3
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-monolith spring-boot:run -DskipTests

# Spring Boot 4
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-monolith spring-boot:run -DskipTests
```

访问地址：
- Spring Boot 3：http://localhost:8000/doc.html
- Spring Boot 4：http://localhost:8100/doc.html

### 运行 Spring Cloud 微服务架构

1. 启动网关服务：
```bash
# Spring Boot 3 WebFlux 网关
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-gateway-webflux spring-boot:run -DskipTests

# Spring Boot 4 WebFlux 网关
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-gateway-webflux spring-boot:run -DskipTests
```

2. 启动各业务服务：
```bash
# Spring Boot 3
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-service-user spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-service-system spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-service-file spring-boot:run -DskipTests

# Spring Boot 4
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-service-user spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-service-system spring-boot:run -DskipTests
mvn -pl nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-service-file spring-boot:run -DskipTests
```

访问地址：http://localhost:9000/<网关配置的业务系统地址>/doc.html

## 📁 模块说明

### Core 与 API 模块
`nextdoc4j-demo-core` 包含不绑定 Spring Boot 的共享模型与基础能力，`nextdoc4j-demo-api` 按业务域拆分共享 API 层。

### Spring Boot 3 / 4 单体应用
展示了在不同 Spring Boot 主版本下的单体应用集成方式，适合小型项目或快速原型开发。

### Spring Cloud 微服务架构
展示了在微服务架构中如何使用 NextDoc4j，包括：
- 网关层的统一文档入口
- 各个微服务的独立文档聚合
- 服务发现与负载均衡集成

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html) 许可证。

## 💬 联系我们

- 📧 邮箱：nextdoc4j@163.com
- 🌐 官网：[https://nextdoc4j.top](https://nextdoc4j.top)

---

**NextDoc4j** - 让 API 文档焕然一新！  如果这个项目对你有帮助，请给它一个 ⭐️
