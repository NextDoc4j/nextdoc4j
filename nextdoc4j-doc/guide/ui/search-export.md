# 全局搜索与导出

聚焦 NextDoc4j 全局效能工具：**全文字段检索、全局公共参数管理与多格式专业文档离线导出中心**。

## 1. 全局检索

- **多维度智能命中**：支持同时对 URL 路径、接口名称、中文描述及参数说明进行拼音与模糊匹配。
- **关键字精准高亮**：搜索结果实时高亮匹配片段，并附带 HTTP 方法（GET / POST / PUT 等）彩色徽章。
- **微服务全局互联**：在网关聚合场景下，支持跨所有下游微服务实时穿透检索。

<UiSearchCards />

## 2. 全局参数管理与调试缓存

- **统一 Header / Query 注入**：统一配置跨接口公共入参（如 `tenant-id`、`X-Request-Id`），调试时全自动携带。
- **调试缓存控制**：一键开启或清理历史参数缓存，满足不同测试场景需求。
- **分组概览总控（1.4.0+）**：在全局设置中灵活开关接口分组概览视图。

<UiShowcaseBox
  src="/images/screenshots/guide/global-params-placeholder.png"
  title="全局参数配置与缓存管理"
  tag="Params & Cache"
  caption="统一维护全局 Header / Query 参数，并可一键开关调试缓存与分组概览视图"
/>

## 3. 全量与范围文档导出中心

- **多格式一键导出**：支持 Markdown、独立离线 HTML、OpenAPI 3 JSON、Word `docx` 以及 PDF 文档导出。
- **范围灵活选择**：支持导出全量项目接口，或仅勾选特定业务分组与特定 Controller。
- **品牌定制附件**：导出时自动附带自定义 Logo、企业版权页脚及离线 Markdown 扩展规范。

<UiShowcaseBox
  src="/images/screenshots/guide/export-doc-placeholder.png"
  title="全量与范围文档导出中心"
  tag="Export Center"
  caption="支持范围勾选、实时预览与 Markdown / HTML / OpenAPI JSON / docx / PDF 多格式导出"
/>
