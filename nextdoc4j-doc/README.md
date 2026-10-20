# nextdoc4j-doc 官网文档

官网使用 Fumadocs、Next.js、React 和 MDX 构建，独立于 `nextdoc4j-ui` Vite 应用。文档构建为纯静态文件，可部署到现有官网域名。

## 目录结构

```text
nextdoc4j-doc/
├── app/                     # Next.js 页面、Fumadocs 布局和静态搜索
├── content/docs/            # MDX 文档内容和 meta.json 菜单定义
├── components/              # MDX、搜索和全局 Provider
├── lib/                     # Fumadocs source 与站点配置
├── public/                  # Logo、截图、二维码和团队缓存
├── scripts/team/            # 构建期团队缓存
├── next.config.mjs          # Next.js 静态导出
└── package.json
```

## 环境要求

- Node.js 20.10+
- pnpm 9+

## 常用命令

安装依赖：

```bash
pnpm --dir nextdoc4j-doc install
```

启动开发服务：

```bash
pnpm --dir nextdoc4j-doc dev
```

类型检查：

```bash
pnpm --dir nextdoc4j-doc type-check
```

构建静态官网：

```bash
pnpm --dir nextdoc4j-doc build
```

预览构建结果：

```bash
pnpm --dir nextdoc4j-doc start
```

## 内容维护

- 页面放在 `content/docs`，使用 `.mdx` 和 YAML frontmatter。
- 菜单顺序和分组通过各目录的 `meta.json` 定义。
- 图片放在 `public/images`，正文使用 `/images/...` 路径。
- 团队信息在构建阶段写入 `public/team-cache.json`。
- 发布前执行类型检查和静态构建，确认内部链接、搜索和移动端布局。
