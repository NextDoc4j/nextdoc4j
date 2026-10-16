# NextDoc4j 基础配置

基础配置控制 NextDoc4j 的核心功能开关、浏览器访问路径、前后端跨域调试支持以及生产环境一键安全隐身模式。

## 核心参数速查表

所有配置均以 `nextdoc4j` 为统一命名空间，支持 Spring Boot 配置文件智能补全：

| 配置项名称 | 类型 | 默认值 | 说明与约束 |
| :--- | :--- | :--- | :--- |
| `nextdoc4j.enabled` | `boolean` | `false` | NextDoc4j 文档功能总开关。未开启时不注册相关路由与 Bean。 |
| `nextdoc4j.doc-path` | `string` | `/doc.html` | 自定义文档访问入口（**1.4.0+**，单段自定义路径如 `/docs`；非法格式启动 fail-fast）。 |
| `nextdoc4j.cors` | `boolean` | `false` | 是否启用跨域支持（CORS），便于前后端分离项目本地联调。 |
| `nextdoc4j.production` | `boolean` | `false` | 生产环境安全隐身模式，启用后彻底禁用文档及 SpringDoc 原始元数据暴露。 |

## 完整配置示例

在项目的配置文件中按需开启相关参数，支持 YAML 与 Properties 格式：

<ConfigBasicTerminal />

## 关键配置项深度解析

<ConfigBasicDeepDive />

## 多环境配置矩阵（Dev / Test / Prod）

推荐使用 Spring Boot 多环境配置文件（`application-dev.yml` / `application-prod.yml`）进行差异化管控：

<ConfigEnvMatrix />

## 常见配置误区与 FAQ

<ConfigBasicFaq />
