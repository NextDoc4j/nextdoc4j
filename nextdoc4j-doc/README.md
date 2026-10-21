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
├── scripts/changelog/       # 根目录更新日志同步
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
- 社区统一入口为 `/more/team`，按团队、添加维护者入群、赞助排序；联系方式与赞助图片配置位于 `scripts/team/team.config.ts`，二维码来源见 `public/images/community/README.md`。旧 `/more/join-group` 保留静态跳转。
- 发布前执行类型检查和静态构建，确认内部链接、搜索和移动端布局。

### 更新日志

更新日志统一维护仓库根目录的 `CHANGELOG.md`。官网的 `content/docs/more/changelog.mdx` 由脚本自动生成，请勿手动修改。

- `pnpm dev`：启动前同步，运行期间监听源文件修改并自动更新页面，支持编辑器以替换文件的方式保存。
- `pnpm build`：在 Fumadocs 编译前同步，更新日志随其他页面一起导出至 `out/`。
- `pnpm changelog:sync`：手动同步一次；内容未变化时不重写页面。

部署 Nginx 时只需上传 `out/`，服务器无需保留 `CHANGELOG.md` 或源码。修改日志后，线上网站需要重新构建和部署。

如果在独立目录或 CI 中构建官网，请先获取主仓库日志并通过环境变量指定文件路径：

```bash
NEXTDOC4J_CHANGELOG_PATH=/path/to/CHANGELOG.md pnpm --dir nextdoc4j-doc build
```

环境变量未配置时，默认读取官网目录上一级的 `CHANGELOG.md`。源文件缺失或为空时，启动和构建会明确报错；开发期间同步失败会保留上次生成的页面，修复源文件后继续自动同步。

## UI 动效来源

平台链接的悬浮提示复用仓库内 [Rare UI](https://rareui.com) 适配组件的短内容过渡。Copyright (c) 2026 Swami Malode；许可证见 [components/rare-ui/LICENSE](components/rare-ui/LICENSE)。
