# NextDoc4j 品牌配置

通过品牌定制功能，您可以轻松自定义文档界面的外观，包括 Logo、标题和动态页脚，打造企业专属的统一文档门户。

## 品牌配置项速查

品牌定制参数统一挂载在 `nextdoc4j.extension.brand` 路径下：

| 参数 | 类型 | 说明 | 示例值 |
| :--- | :--- | :--- | :--- |
| `logo` | `string` | 自定义 Logo 路径，支持 classpath 资源引用。 | `classpath:brand/logo/logo.png` |
| `title` | `string` | 系统主标题，渲染在认证登录页与文档导航顶部。 | `"企业级开放平台 API 文档"` |
| `footer-text` | `string` | 页脚版权说明，支持标准 Markdown 语法与动态环境变量。 | `"Copyright © 2025 [官网](https://...)"` |

## 完整配置示例

<ConfigBrandTerminal />

## Logo 资源配置规范

Logo 会自适应深浅主题与 Retina 高清屏，推荐遵循以下工程目录规范：

```
src/main/resources/
└── brand/
    └── logo/
        └── logo.png    # 建议比例 3:1 ~ 4:1，高度 40px~60px，透明背景 PNG/SVG
```

## 系统标题与优先级机制

NextDoc4j 按照以下级联规则智能解析页面主标题：

<ConfigBrandPriority />

## 页脚动态变量与 Markdown 支持

页脚不仅支持 Markdown 超链接语法，还可动态插值 Spring Boot 应用环境信息：

| 变量占位符 | 取值来源说明 | 示例值 |
| :--- | :--- | :--- |
| `${application.name}` | `spring.application.name` | `star-user-service` |
| `${application.version}` | 项目构建版本或 OpenAPI Version | `1.5.0` |
| `${application.contact.name}` | OpenAPI Contact 联系人姓名 | `平台架构组` |
| `${application.contact.url}` | OpenAPI Contact 联系网址 | `https://github.com/team` |
| `${application.url}` | 应用官网 URL | `https://example.com` |

### 页脚模板示例

**带链接的版权信息**
```yaml
footer-text: 'Copyright © 2025 [星瀚云科技](https://example.com)'
```

**完整动态信息展示**
```yaml
footer-text: 'Copyright © 2025 [${application.contact.name}](${application.contact.url}) ⋅ [${application.name}](${application.url}) v${application.version}'
```

## 界面视觉呈现效果

<ConfigBrandCards />
