# NextDoc4j 后端开发指南

## 适用范围

- 主仓：`nextdoc4j`
- 演示仓：`nextdoc4j-demo`（用于验证 SB3/SB4、单体/网关两种运行形态）

## 环境要求

### 必需环境

- **JDK**: 17 或更高版本
- **Maven**: 3.9.x 或更高版本
- **Git**: 用于版本管理

### 推荐开发工具

- IntelliJ IDEA 2023.x 或更高版本
- Visual Studio Code（Java 扩展包）

## 当前后端模块总览（以 `nextdoc4j` 1.5.0 为准）

```text
nextdoc4j/
├── nextdoc4j-bom/                    # 薄 BOM：仅管理 top.nextdoc4j 自身模块
├── nextdoc4j-core
├── nextdoc4j-common                 # Spring 侧通用能力（过滤器、资源、扩展等）
├── nextdoc4j-adapter/
│   ├── nextdoc4j-adapter-jackson2
│   └── nextdoc4j-adapter-jackson3
├── nextdoc4j-plugin/
│   ├── nextdoc4j-plugin-enum
│   ├── nextdoc4j-plugin-gateway
│   └── nextdoc4j-plugin-security/
│       ├── nextdoc4j-plugin-security-core
│       ├── nextdoc4j-plugin-security-schemes
│       └── nextdoc4j-plugin-security-satoken
├── nextdoc4j-starter/
│   ├── nextdoc4j-spring-boot-starter           # 单体（Boot 3/4 共用）
│   └── nextdoc4j-gateway-spring-boot-starter   # 网关 WebFlux/WebMvc（Boot 3/4 共用）
├── nextdoc4j-tests/                 # 聚合单测（不发布 Central）
└── nextdoc4j-ui
```

## 模块职责

### 1. `nextdoc4j-bom`

独立薄 BOM（**不继承**根 POM 的 Boot/Cloud/springdoc 管理），**只**声明 `top.nextdoc4j` 自身模块版本。

- 宿主通过 `import` 引入后，自行管理 Spring Boot / Cloud / springdoc 版本。
- springdoc 需宿主显式引入（starter 内为 `optional`，不传递）：
  - WebMvc：`org.springdoc:springdoc-openapi-starter-webmvc-ui`
  - WebFlux：`org.springdoc:springdoc-openapi-starter-webflux-ui`
  - 版本建议：Boot 3 → `springdoc-openapi-bom` **2.8.17**；Boot 4 → **3.0.3**
### 2. `nextdoc4j-core`

核心中立层（不绑定 Spring Boot 版本），主要提供：

- 基础配置模型：`NextDoc4jProperties`、`NextDoc4jExtension`
- 通用常量：`NextDoc4jConstants`、`NextDoc4jFilterConstant`
- 网关中立模型与枚举：`GatewaySecurityScheme`、`DocPathStrategy`、`NameResolveStrategy`
- JSON 抽象：`DocJsonNode` / `DocArrayNode`（`asText`、`forEachElement` 等）
- 基础工具：路径匹配、文档路径支持、基础认证工具、版本号提供器

### 3. `nextdoc4j-adapter`

Jackson 主版本适配：

- `nextdoc4j-adapter-jackson2`：`com.fasterxml` Jackson 2
- `nextdoc4j-adapter-jackson3`：`tools.jackson` Jackson 3

### 4. `nextdoc4j-starter`

运行时装配层，负责自动配置、过滤器与资源暴露。**1.4.0 起两套 starter**：

- `nextdoc4j-spring-boot-starter`：单体（WebMvc / WebFlux 由宿主 springdoc UI 决定）
- `nextdoc4j-gateway-spring-boot-starter`：Spring Cloud Gateway（WebFlux / WebMvc 共用坐标）

说明：

- 配置绑定桥接在 starter / common 内，`core` 保持纯模型中立。
- 网关 starter 内置路由定位、响应改写与聚合能力装配。
- 支持 `nextdoc4j.doc-path` 自定义文档入口。

### 5. `nextdoc4j-plugin`

插件收敛为共用实现（不再按 SB3/SB4 双轨拆分 starter 坐标）：

- 枚举：`nextdoc4j-plugin-enum`
- 网关：`nextdoc4j-plugin-gateway`
- 安全：`nextdoc4j-plugin-security-core` / `security-schemes` / `security-satoken`

### 6. `nextdoc4j-ui`

前端静态资源包，打包后放入 `META-INF/resources/`，供 starter 直接对外暴露：

- `doc.html`
- `doclogin.html`
- `/nextdoc/**` 资源

### 7. `nextdoc4j-tests`

聚合单元测试模块；**不发布**到 Maven Central。

## 依赖与装配链路

### 单体链路

```text
业务应用
  -> nextdoc4j-spring-boot-starter
      -> nextdoc4j-common / nextdoc4j-core
      -> nextdoc4j-ui
      -> jackson adapter（2 或 3）
  -> org.springdoc:springdoc-openapi-starter-webmvc-ui
     或 org.springdoc:springdoc-openapi-starter-webflux-ui（宿主引入，optional 不传递）
```

### 网关链路

```text
业务应用
  -> nextdoc4j-gateway-spring-boot-starter
      -> nextdoc4j-plugin-gateway
      -> nextdoc4j-common / nextdoc4j-core
      -> nextdoc4j-ui
  -> spring-cloud-starter-gateway-server-webflux 或 ...-webmvc（宿主引入）
  -> springdoc-openapi-starter-webflux-ui 或 ...-webmvc-ui（宿主引入）
```

### 可选插件接入

- 枚举：`nextdoc4j-plugin-enum`
- 认证展示：`nextdoc4j-plugin-security-schemes`
- Sa-Token：`nextdoc4j-plugin-security-satoken`

## 配置模型归属（当前实现）

| 配置前缀 | 模型类 | 所在模块 | 说明 |
|---|---|---|---|
| `nextdoc4j` | `NextDoc4jProperties` | `nextdoc4j-core` | 通用主配置模型 |
| `nextdoc4j` | `NextDoc4jPropertiesMetadata` | `nextdoc4j-starter/*` / common | 配置元数据桥接（用于自动配置绑定展开） |
| `nextdoc4j.doc-path` | （`NextDoc4jProperties`） | `nextdoc4j-core` | 文档入口路径（1.4.0，默认 `/doc.html`） |
| `nextdoc4j.auth` | `NextDoc4jBasicAuth` | `nextdoc4j-core` | 基础认证配置 |
| `nextdoc4j.extension` | `NextDoc4jExtension` | `nextdoc4j-core` | 品牌、Markdown 扩展配置 |
| `nextdoc4j.gateway` | `GatewayDocProperties` | `nextdoc4j-plugin-gateway` | 网关聚合与路由解析配置 |
| `nextdoc4j.plugin.enum` | `NextDoc4jEnumProperties` | `nextdoc4j-plugin-enum` | 枚举插件开关 |
| `nextdoc4j.plugin.security` | `NextDoc4jSecurityProperties` | `nextdoc4j-plugin-security-core` | 安全插件开关 |

## 核心扩展点（SPI）

### 枚举扩展

- `EnumMetadataResolver`（`nextdoc4j-plugin-enum`）
- 作用：自定义枚举值、描述、OpenAPI `type/format` 与扩展元数据

### 安全扩展

- `NextDoc4jSecurityMetadataResolver`（`nextdoc4j-plugin-security-core`）
- 作用：将业务安全注解解析为统一安全元数据

- `NextDoc4jPathExcluder`（`nextdoc4j-plugin-security-core`）
- 作用：排除无需鉴权展示的路径（支持 Ant 风格）

### 网关扩展

- `NextDoc4jGatewayRouteFilter`（`nextdoc4j-plugin-gateway`）
- 作用：按路由维度筛选是否参与聚合

- `NextDoc4jGatewayRouteMetadataResolver`（`nextdoc4j-plugin-gateway`）
- 作用：自定义路由文档地址与显示名称解析规则（含 `StripPrefix` 等 filter 感知）

## 本地开发流程

### 1. 拉取与编译

```bash
git clone https://github.com/NextDoc4j/nextdoc4j.git
cd nextdoc4j
mvn clean compile
```

### 2. 定向编译某个模块

```bash
# 例：只编译网关 starter 及其依赖
mvn -pl nextdoc4j-starter/nextdoc4j-gateway-spring-boot-starter -am clean compile

# 例：只编译 Sa-Token 插件及其依赖
mvn -pl nextdoc4j-plugin/nextdoc4j-plugin-security/nextdoc4j-plugin-security-satoken -am clean compile
```

### 3. 联调演示仓（建议）

在 `nextdoc4j-demo` 中验证改动是否覆盖双版本与双形态：

- 单体入口：`http://127.0.0.1:8000/doc.html`（SB3）
- 网关入口：`http://127.0.0.1:9000/doc.html`（SB3）

## 开发新增模块建议

新增功能优先遵循当前分层方式（**1.4.0 单套坐标**）：

1. 先放入中立 `core`（纯模型/SPI/工具）
2. 需要 Spring 装配时放入 `common` 或对应 `plugin` / `starter`（避免再拆 SB3/SB4 双轨 artifact）
3. 在模块中注册 `AutoConfiguration.imports`
4. 补充到 `nextdoc4j-bom` 的 `dependencyManagement`

Jackson 主版本差异通过 `nextdoc4j-adapter-jackson2/3` 隔离，而不是复制整套 starter。
