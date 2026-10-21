# “开始”文档的界面截图

这些图片于 2026-10-21 使用无头 Chrome / Playwright 截取，来自仓库当前的 React UI 源码与本地单体 Demo，不是旧线上演示的截图。

- 界面：`nextdoc4j-ui` Vite 开发服务，代理到本地 Boot 3 MVC Demo。
- 后端：`nextdoc4j-demo-boot3-monolith`，Spring Boot 3.5.16，NextDoc4j 1.5.0。
- 尺寸：1440 × 960，设备像素比 1。
- 主题：分别模拟系统浅色、深色，界面保持跟随系统；截图时关闭过渡动画。
- `workspace-*`：`#/home` 工作台首页。
- `detail-*`：`#/docs/operations/getUserById` 接口详情。
- `playground-*`：同一接口的在线调试页，填写 `id=1`，实际请求本地 `GET /api/user/1` 并得到 HTTP 200 后截图。

官网通过 `ThemedScreenshot` 组件随当前站点主题切换图片，并支持点击放大。每次更新界面素材时，应同时更新一对深浅图片，保持相同窗口尺寸和操作场景。
