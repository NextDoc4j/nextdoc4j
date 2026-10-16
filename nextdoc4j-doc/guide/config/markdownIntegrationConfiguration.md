# NextDoc4j Markdown 文档配置

NextDoc4j 支持无缝将离线 Markdown 文档、接口验签规范、Docker 部署手册与架构设计集成到 API 工作台左侧导航树中。

<ConfigMarkdownCallout />

## 文档集成配置项速查

| 配置项参数 | 类型 | 说明 | 示例值 |
| :--- | :--- | :--- | :--- |
| `nextdoc4j.extension.enabled` | `boolean` | 是否开启 NextDoc4j 扩展特性引擎。 | `true` |
| `markdown[].group` | `string` | Markdown 文档分组名称，对应左侧导航树的一级节点。 | `"openapi"` / `"部署文档"` |
| `markdown[].location` | `string` | Markdown 文件物理路径，支持 `classpath:` 与 `**` 通配符。 | `classpath:markdown/openapi/*.md` |

## 完整配置示例

<ConfigMarkdownTerminal />

## 支持的文件路径与通配符规则

NextDoc4j 基于 Spring Resource 协议智能解析文档路径：

| 路径格式示例 | 匹配模式说明 | 适用场景 |
| :--- | :--- | :--- |
| `classpath:markdown/guide.md` | 单文件精确加载 | 系统架构概览、全局错误码规范等独立单篇文档。 |
| `classpath:markdown/docker/**` | 递归匹配该目录下所有 Markdown 文件 | 包含多章节教程的完整专题技术专栏。 |
| `classpath:markdown/*.md` | 匹配一级目录下的所有 `.md` 文件 | 平铺在目录下的多份快速指引文档。 |

## 工作台导航集成效果

集成后的 Markdown 文件会自动出现在左侧菜单栏，支持深浅主题无缝渲染与 Markdown-it 高亮排版：

<UiShowcaseBox
  src="/images/screenshots/guide/markdown.png"
  title="NextDoc4j Markdown 离线文档集成导航界面"
  tag="MARKDOWN ENGINE"
  caption="集成后的 Markdown 章节自动解析为左侧多级树状菜单，支持代码语法高亮与锚点目录定位"
  alt="NextDoc4j Markdown 文档集成效果"
/>
