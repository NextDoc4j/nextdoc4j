# 界面功能截图

采集日期：2026-10-21。全部素材由无头 Google Chrome / Playwright 访问线上 Demo 后截图，没有复用旧版 UI 截图。

- 单体：<https://single-demo.nextdoc4j.top/>
- 网关：<https://gateway-demo.nextdoc4j.top/>
- 浏览器窗口：1440 × 960；偏好抽屉使用 1440 × 820。
- 设备像素比：2。界面保持跟随系统，分别创建浅色、深色的全新浏览器上下文。
- 采集时禁用过渡、动画和输入光标；不替换页面内容或接口数据。
- 原始 PNG 转为无损 WebP，保留原始像素；官网按逻辑尺寸展示。
- 每个场景对应 `名称-light.webp` 与 `名称-dark.webp`，通过 `ThemedScreenshot` 跟随官网主题切换，保留点击放大。
- 整体布局保留完整窗口；枚举、响应、模型、管理页与弹窗裁切到对应操作区域。实际来源与裁切参数记录在 `manifest.json`。

| 名称 | 来源与操作 |
| --- | --- |
| workspace | 单体 `#/home`，保留已打开的用户查询标签 |
| api-detail | 单体 `#/docs/operations/createUser`，查看接口、权限和响应示例 |
| model | 单体 `#/docs/schemas/UserResp`，展示字段和 JSON 示例 |
| json-enum | 单体 `#/docs/operations/updateUser/debug`，选择 Body → JSON，展开 status 枚举 |
| query-enum | 单体 `#/docs/operations/getUserByStatusQuery/debug`，展开 Query 的 status 枚举 |
| form-enum | 单体 `#/docs/operations/updateUser/debug`，切换 form-data 编辑模式并展开 status 枚举；仅演示编辑交互，未将原 JSON 接口作为 multipart 接口发送 |
| debug-request | 单体 `#/docs/operations/getUserById/debug`，填写 id=1，实际发起 GET 并收到成功响应 |
| response-json | 同一次用户查询场景，聚焦响应面板 |
| response-image | 单体 `#/docs/operations/getAvatar/debug`，填写 id=1，实际读取头像并打开响应图片预览 |
| response-sse | 单体 `#/docs/operations/streamTokens/debug`，实际接收 SSE 后展示事件 |
| workflow | 单体用户查询调试页，前置操作添加“设置请求参数”步骤，未运行额外业务请求 |
| authentication | 单体 `#/settings/auth`，展示空凭据状态，不填入真实 Token |
| global-parameters | 单体 `#/settings/config`，在当前浏览器配置演示 Header `X-Tenant-Id=demo-tenant` |
| gateway | 网关 `#/services/系统管理/home`，展开当前服务选择器；节点状态以采集时实际返回为准 |
| search | 单体全局搜索，输入“用户”，展示匹配结果 |
| export | 单体 `#/settings/export`，打开格式选择窗口，未实际导出 |
| preferences | 单体主页打开偏好设置的“通用偏好” |
| cache-settings | 网关主页打开偏好设置的“Nextdoc4j”，展示服务范围和草稿开关 |

更新时应成对重拍同一场景，保留完整下拉列表 / 弹窗边界，并同步 MDX 中的图片宽高。不要将页面加载中、错误页或未展开的选择器当作交互完成状态。
