# 贡献指南

NextDoc4j 致力于为 Java 开发者提供强大而易用的现代化 API 调试工作台。作为开源社区驱动的项目，我们诚挚欢迎大家参与 Issue 排查、新特性开发、文档编写与测试验证。

<div class="more-tech-pill-strip no-section-divider" aria-label="贡献方式">
  <span class="more-tech-pill is-brand"><span class="more-tech-pill-dot"></span>开源协作</span>
  <span class="more-tech-pill">Spotless 自动格式化</span>
  <span class="more-tech-pill">Angular Commit 规范</span>
</div>

## 代码托管平台

Gitee 是项目主仓库，GitHub 与 GitCode 提供同步入口，您可以从下方平台查看源码或参与协作：

<MorePlatformCards />

## 贡献必读

如果您是开源贡献新手，建议先阅读以下权威指引，了解参与开源项目的流程与最佳协作姿势：

| 参考文档 | 核心简介 | 访问地址 |
| :--- | :--- | :--- |
| **《开源项目礼节》** | 涵盖开源协作中的最佳沟通实践，帮助您在社区中保持高效友善沟通 | [MDN 社区指南](https://developer.mozilla.org/zh-CN/docs/MDN/Community/Open_source_etiquette) |
| **《如何为开源做贡献》** | 专为初学者准备的开源贡献指南，从 Git 基础到 PR 流程一应俱全 | [Open Source Guide](https://opensource.guide/zh-hans/how-to-contribute/) |

## 分支管理模型

NextDoc4j 只维护 `master` 作为长期主线。功能、修复、文档和 Demo 修改都从最新的 `master` 创建短期分支，完成验证后提交 PR 回 `master`：

| 分支示例 | 用途 | 合并目标 |
| :--- | :--- | :--- |
| `feat/<name>` | 新功能 | `master` |
| `fix/<name>` | 缺陷修复 | `master` |
| `docs/<name>` | 文档和官网 | `master` |
| `demo/<name>` | 集成示例 | `master` |

详细规则见仓库根目录的 [CONTRIBUTING.md](https://github.com/NextDoc4j/nextdoc4j/blob/master/CONTRIBUTING.md)。

## 贡献代码八步流程

<ContributeWorkflow />

## 开发规范与 Commit 指南

<ContributeSpecs />
