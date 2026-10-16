---
title: 快速开始
description: NextDoc4j 快速开始集成指南：只需简单三步，即可在 Spring Boot 3.4.x / 4.x 项目中完成最简依赖引入、配置启用与在线调试。
---

# 快速开始集成

只需简单三步，即可在 Spring Boot 3.4.x / 4.x 项目中完成 NextDoc4j 的最简依赖引入、配置启用与在线调试。

<StartedNoticeCard />

## 三步快速集成（单体服务）

单体应用支持 Spring MVC (Servlet) 与 Spring WebFlux (Reactive) 两种底层 Web 栈，按照您的项目架构选择对应的依赖与配置即可。

### 第一步：添加 Maven 依赖

按宿主项目 Web 栈二选一引入 springdoc UI，宿主自行管控 springdoc 版本，starter 保持完全解耦：

<StartedMavenTerminal />

### 第二步：配置文件启用

在 `application.yml` 或 `application.properties` 中添加启用声明：

<StartedConfigTerminal />

### 第三步：启动并访问

启动 Spring Boot 应用，在浏览器中访问以下地址即可进入 NextDoc4j 现代化工作台：

<StartedAccessCard />

## 微服务网关场景快速引入

如果当前服务是 **Spring Cloud Gateway** 网关聚合服务，1.4.0 起统一引入网关 Starter `nextdoc4j-gateway-spring-boot-starter`，并自行引入对应网关运行时：

<StartedGatewaySection />

## 最小可运行 Controller 示例

使用标准的 OpenAPI 3 注解（`@Tag`、`@Operation`、`@Parameter`）即可在 NextDoc4j 中生成具备丰富调试功能的接口卡片：

<StartedControllerTerminal />

## 常见问题与安全拦截排查

集成过程中遇到拦截或资源加载异常时，请对照以下规则快速排查：

<StartedFaqAccordion />
