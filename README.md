# dockit4j

## 项目信息
| 标识                | 详情                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| 版本                | v1.0.0                                                               |
| 适配框架            | SpringDoc、OpenAPI 3、springboot3.4.x                                                 |
| 替代工具            | Swagger UI                                                           |
| 许可证              | Apache License 2.0                    |
| 官方文档            | [docs.dockit4j.top](https://docs.dockit4j.top)                        |
| 联系邮箱            | dockit4j@126.com                                                     |
| 前端仓库            | [dockit4j-UI](https://gitee.com/dockit4j/dockit4j-ui)              |
| 后端仓库            | [dockit4j](https://gitee.com/dockit4j/dockit4j)                    |
| 文档仓库            | [dockit4j-docs](https://gitee.com/dockit4j/dockit4j-docs)          |

## 简介
dockit4j 是一款专为 **SpringDoc** 和 **OpenAPI 3** 打造的现代化文档 UI 工具，致力于替代传统 Swagger UI，为开发者营造更美观、可定制性强且体验更优的 API 文档展示与调试环境。

深度适配 SpringDoc 生态，在传承 API 文档核心功能基础上，对界面交互、功能拓展及实用体验全方位升级，助力开发团队高效开展 API 管理与测试工作，让文档系统成为项目研发流程里的得力“助手”。

![dockit4j 主界面效果](.image/interface/主界面.png)

## 核心功能（v1.0.0）
### 1. 全新 UI 体系
深度适配 **SpringDoc** 与 **OpenAPI 3** 规范，重塑文档展示逻辑，告别传统 Swagger UI 样式：
- 接口列表层级分明，参数、响应示例排版贴合阅读习惯，信息获取更便捷
- 优化交互流程，调试按钮触发、文档折叠展开等操作，契合日常开发场景

### 2. 灵活配置能力
支持多样配置策略，适配不同环境与场景：
- **功能开关**：按需启用/禁用（如文档启用,生产启用等 ），精准把控文档系统能力边界
- **生产模式**：适配生产环境，优化文档访问权限，保障线上稳定
- **配置简易**：兼容 Spring 生态配置方式，通过配置文件或代码，快速调整系统行为

### 3. 安全与品牌定制
提升文档系统实用性与品牌属性：
- **认证登录**：新增登录校验，可对接项目权限体系，守护 API 文档访问安全
- **品牌植入**：支持自定义品牌 `logo`、系统标题，让文档系统融入团队/项目形象

### 4. 动态界面优化
聚焦登录页与主页体验升级：
- **登录界面**：实现动态 `title`、`logo` 渲染，支持配置化自定义展示内容，打造专属登录页
- **主页同步**：与登录页风格统一，动态加载标题、`logo`，保持视觉一致性
- **性能兼顾**：动态效果基于轻量化渲染，不影响页面加载速度与交互流畅度

![登录界面效果](.image/interface/登录.png)

## 快速开始
1. **引入依赖**
```yaml
        <dependency>
            <groupId>zw.dockit4j</groupId>
            <artifactId>dockit4j-springboot3-starter</artifactId>
            <version>${Latest version}</version>
        </dependency>
```

2. **配置参数**
```yaml
dockit4j:
  enabled: true # 是否启用 dockit4j，默认 false
 ```

3. **体验功能**
启动应用后，访问文档系统地址`http://localhost:端口/doc.html`，即可体验


## 参与贡献
欢迎通过以下方式，参与 dockit4j 迭代：
- 提交 **Issue**：反馈功能建议、Bug 问题，清晰描述复现步骤或需求场景
- 发起 **Pull Request**：提交代码优化、新功能实现，建议先通过 Issue 沟通方案

## 许可证
项目采用 [Apache-2.0] 开源，具体以仓库 `LICENSE` 文件为准 。