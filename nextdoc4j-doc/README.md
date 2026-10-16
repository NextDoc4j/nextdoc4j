# nextdoc4j-doc 官网与使用文档

[返回仓库总览](https://github.com/NextDoc4j/nextdoc4j#readme)

这里是 NextDoc4j 官网和使用文档，基于 VitePress 构建。文档介绍后端配置、前端能力、插件、网关聚合、Demo 和项目协作流程；官网本身不发布 Maven 制品。

## 目录结构

```text
nextdoc4j-doc/
├── package.json                 # VitePress 脚本和依赖
├── pnpm-lock.yaml               # 官网依赖锁定文件
├── index.md                     # 首页
├── guide/                       # 面向使用者的产品文档
│   ├── index.md                 # 指南概览
│   ├── start/                   # 安装和快速开始
│   ├── config/                  # 基础、品牌、认证、Markdown 配置
│   ├── ui/                      # 文档浏览、调试、搜索、导出和网关界面
│   └── plugin/                  # 枚举、认证、Sa-Token、网关插件
├── development/                # 面向贡献者和维护者的开发文档
│   ├── index.md                 # 开发入口和前端流程
│   └── backend.md               # 后端结构和构建方式
├── more/                       # 项目运营和社区内容
│   ├── contribute.md            # 在线贡献指南
│   ├── changelog.md             # 版本更新日志
│   ├── faq.md                   # 常见问题
│   ├── join-group.md            # 社区讨论入口
│   └── team/                    # 团队和赞助信息
├── public/                     # 原样复制到网站根目录的静态资源
│   ├── logo/                    # Logo、favicon 和社交分享图
│   └── images/                  # 截图、联系方式和支付图片
├── .vitepress/
│   ├── config.mts               # 站点、导航、侧边栏、SEO 配置
│   └── theme/                   # 自定义主题和 Vue 组件
├── scripts/                    # 构建辅助脚本
│   └── responsive-check.mjs     # 页面响应式检查
├── env.d.ts                    # VitePress/Vue 类型声明
└── tsconfig.json               # 官网 TypeScript 配置
```

## 文档目录和 URL

VitePress 会把 Markdown 文件映射为页面路径：

- `guide/start/started.md` → `/guide/start/started`
- `guide/config/basicconfiguration.md` → `/guide/config/basicconfiguration`
- `development/backend.md` → `/development/backend`
- `more/faq.md` → `/more/faq`

新增或移动页面后，需要同步修改 `.vitepress/config.mts` 中的导航和侧边栏，否则页面可能可以访问但不会出现在菜单中。

## 环境要求和安装

- Node.js 20+
- pnpm 9+

在仓库根目录执行：

```bash
pnpm --dir nextdoc4j-doc install
```

## 常用命令

启动本地文档站：

```bash
pnpm --dir nextdoc4j-doc run docs:dev
```

类型检查：

```bash
pnpm --dir nextdoc4j-doc run type-check
```

构建官网：

```bash
pnpm --dir nextdoc4j-doc run docs:build
```

预览构建结果：

```bash
pnpm --dir nextdoc4j-doc run docs:preview
```

响应式检查：

```bash
pnpm --dir nextdoc4j-doc run test:responsive
```

## 内容维护规则

- 产品行为变化时，同时更新对应指南、FAQ 和更新日志；
- 图片放在 `public/images`，正文使用以 `/images/` 开头的路径；
- Logo 和 favicon 放在 `public/logo`；
- 需要生成团队缓存时使用 `pnpm --dir nextdoc4j-doc run team:update`；
- 不提交 `node_modules`、`.vitepress/dist`、缓存和本机 `.env`；
- 文档页面修改应在构建后检查链接、导航和移动端布局。
