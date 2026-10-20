## 变更说明

<!-- 描述问题、触发场景和合并后的最终行为。 -->

## 变更类型

- [ ] `feat` 新功能
- [ ] `fix` 缺陷修复
- [ ] `docs` 文档或 README
- [ ] `refactor` 重构或内部优化
- [ ] `test` 测试调整
- [ ] `build/chore` 构建、发布或工程维护

## 涉及模块

- [ ] 根目录治理文件
- [ ] `nextdoc4j` 后端
- [ ] `nextdoc4j-ui` 前端
- [ ] `nextdoc4j-doc` 官网
- [ ] `nextdoc4j-demo` 集成示例
- [ ] `nextdoc4j-tests` 集中测试
- [ ] `release` 自动化脚本
- [ ] `static` 静态资源

## 关联 Issue

<!-- 使用 Closes #123、Fixes #123 或 Related to #123。没有则填写“无”。 -->

## 验证情况

<!-- 写明实际执行的命令和结果；没有执行时说明原因。 -->

- [ ] `mvn test`
- [ ] `(cd nextdoc4j-ui && pnpm check)`
- [ ] `(cd nextdoc4j-doc && pnpm type-check && pnpm build)`
- [ ] `pnpm --dir release run test-preview`
- [ ] 已执行其他验证，见上方说明
- [ ] 未执行验证，已说明原因

## 资源、文档和兼容性

- [ ] 前端构建资源已按需要同步到后端资源目录
- [ ] 相关模块 README 或官网文档已更新
- [ ] 已评估 API、配置、Maven 坐标或运行时兼容性影响
- [ ] 没有生成文件、个人配置或无关格式化变更

## UI 变更

<!-- UI 修改请附截图或录屏；非 UI 修改填写“不适用”。 -->

## 破坏性变更

<!-- 如果存在，请说明迁移方式；没有请填写“无”。 -->

## 提交前确认

- [ ] 我已阅读 [CONTRIBUTING.md](../CONTRIBUTING.md)。
- [ ] 这个 PR 只包含一个清晰的目标。
- [ ] 我确认没有提交密码、令牌或其他敏感信息。
