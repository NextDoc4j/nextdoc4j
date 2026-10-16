# 文档浏览与在线调试

聚焦 NextDoc4j 日常研发最高频的两大核心功能：**沉浸式接口结构树浏览** 与 **强交互在线请求调试面板**。

## 1. 多维接口文档浏览体系

- **分组与标签多维聚合**：左侧导航树支持快速切换 OpenAPI Group 与 Controller Tag，**1.4.0** 全新推出**分组概览工作台**。
- **模型与示例联动**：请求 Body / 返回 Response 支持参数视图、模式 Schema 视图与多状态码示例实时切换。
- **多态模型分段选择**：原生支持 OpenAPI 3 的 `oneOf` / `anyOf` 互斥模型选择器。
- **TypeScript 代码生成**：一键生成全强类型的 TS 请求/响应 Interface 定义，大幅提升前端对接效率。

<UiBrowseCards />

<UiShowcaseBox
  src="/images/screenshots/guide/overview.png"
  title="接口分组概览与快捷导航面板（1.4.0+）"
  tag="Group Overview"
  caption="分组概览集中展示该模块下所有 API 列表、请求方式标签及说明"
/>

<UiOverviewGrid />

## 2. 沉浸式在线调试与 SSE 事件流

- **五维参数联动编辑**：原生支持 Path 路径变量、Query 查询参数、Header 自定义请求头、Cookie 与 Body 请求体。
- **Content-Type 智能感知**：支持 `application/json`、`multipart/form-data`、`x-www-form-urlencoded`、`raw` 等自动补全。
- **文件与混合表单上传**：轻松调试多附件与复杂 Form 表单组合入参。
- **SSE 流式事件调试（1.4.0+）**：原生接收大模型输出与持续数据流，支持虚拟滚动与手动中断。
- **请求缓存机制**：自动记忆历史填写的测试参数，无需重复输入。

<UiShowcaseBox
  src="/images/screenshots/guide/debug-sse.png"
  title="SSE 实时事件流调试展示（1.4.0+）"
  tag="SSE Live"
  caption="支持 Server-Sent Events 事件逐条推送、打字机渲染与耗时监控"
/>
