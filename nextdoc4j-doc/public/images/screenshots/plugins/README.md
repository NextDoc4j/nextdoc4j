# 插件说明截图

采集日期：2026-10-21。使用无头 Google Chrome / Playwright 访问在线 Demo，截图保持真实页面内容。

- 单体：<https://single-demo.nextdoc4j.top/>
- 网关：<https://gateway-demo.nextdoc4j.top/>
- 视口：1440 × 960，设备像素比 2。
- 每个场景分别创建系统浅色和深色的全新上下文，工作台保持跟随系统。
- 采集时仅关闭动画、过渡和输入光标，不替换 DOM 文案或接口返回。
- PNG 转为无损 WebP，官网通过 `ThemedScreenshot` 显示并按当前主题切换。
- `manifest.json` 记录实际 URL、主题、窗口与裁切坐标。

| 文件前缀 | 来源与操作 |
| --- | --- |
| enum | 单体更新用户调试页，打开 Body → JSON，展开 status 候选值，裁切请求编辑区 |
| enum-document-parameters | 单体按状态查询用户的文档详情，裁切请求参数区域，展示类型、必填与枚举含义 |
| enum-document-example | 单体更新用户的文档详情，在请求 JSON 结构示例中展开 status 枚举定义，保留示例与弹层上下文 |
| authentication | 单体全局认证页，保留未配置凭据的真实状态，裁切方案与详情区 |
| permissions | 单体新增用户详情，裁切接口头部与完整 Sa-Token 权限组合 |
| gateway | 网关主页展开当前服务选择器；节点可用状态以采集时返回为准 |

每组均包含 `-light.webp` 和 `-dark.webp`。更新时使用相同场景与视口成对重拍；不要把正文中的自定义示例伪装成 Demo 已实现的接口。
