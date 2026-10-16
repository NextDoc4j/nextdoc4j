# 贡献指南

感谢你参与 NextDoc4j。这个仓库是一个 Monorepo，后端、前端、官网、Demo、集中测试和发布脚本一起维护。

## 开始之前

请先阅读对应模块的 README：

- [后端](nextdoc4j/README.md)
- [前端](nextdoc4j-ui/README.md)
- [官网](nextdoc4j-doc/README.md)
- [Demo](nextdoc4j-demo/README.md)
- [集中测试](nextdoc4j-tests/README.md)
- [发布与集成测试](release/README.md)

常用环境要求：JDK 17+、Maven 3.9+、Node.js 20+ 和 pnpm 9+。首次修改前端或官网时，需要分别在对应目录执行 `pnpm install`。

## 分支和提交

`master` 是唯一长期维护分支，要求始终可以构建和测试。日常修改从最新的 `master` 创建短期分支：

```text
feat/<name>       新功能
fix/<name>        缺陷修复
docs/<name>       文档修改
demo/<name>       Demo 修改
chore/<name>      工程维护
```

完成后向 `master` 提交 Pull Request。不要直接向 `master` 推送，也不需要维护长期 `dev` 分支。分支合并后请删除短期分支。

提交信息建议使用以下前缀：`feat`、`fix`、`docs`、`refactor`、`test`、`build`、`chore`。

## 修改和验证

后端、集中测试和 Demo 的完整验证：

```bash
mvn test
```

前端验证：

```bash
(cd nextdoc4j-ui && pnpm check)
```

官网验证：

```bash
(cd nextdoc4j-doc && pnpm type-check && pnpm docs:build)
```

前后端开发联调和打包预览：

```bash
pnpm --dir release run test-dev
pnpm --dir release run test-preview
```

如果修改了前端并将构建资源带入后端包，请执行：

```bash
pnpm --dir release run build-ui
```

并把 `nextdoc4j/nextdoc4j-ui/src/main/resources` 中需要提交的资源变更一起放进 Pull Request。不要提交 `node_modules`、`dist`、`target`、日志、个人 `.env` 或 IDE 配置。

## Pull Request 要求

- 描述问题、触发场景和最终行为。
- 标明涉及的模块。
- 写明执行过的验证命令及结果。
- UI 修改附上截图或录屏。
- API 或配置变更同步更新对应模块 README 或官网文档。
- 不把无关格式化、生成文件和个人配置带入提交。

安全漏洞请按照 [SECURITY.md](SECURITY.md) 的方式私下报告，不要直接创建公开 Issue。
