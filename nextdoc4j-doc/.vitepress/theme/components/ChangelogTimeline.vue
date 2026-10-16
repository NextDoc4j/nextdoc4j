<template>
  <div class="changelog-wrapper">
    <div class="changelog-timeline">
      <article v-for="release in releases" :key="release.version" class="vp-release-card">
        <header class="rc-header">
          <div class="rc-header-left">
            <h2 :id="release.anchor" class="rc-version-tag">{{ release.version }}</h2>
            <span
              v-if="release.badge"
              class="rc-status-pill"
              :class="release.badgeTone === 'milestone' ? 'status-milestone' : 'status-patch'"
            >
              {{ release.badge }}
            </span>
            <div class="rc-date-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{{ release.date }}</span>
            </div>
          </div>

          <div class="rc-header-actions">
            <a :href="releaseGithubUrl(release.version)" target="_blank" rel="noopener noreferrer" class="rc-action-btn">
              <span>GitHub Release</span>
            </a>
          </div>
        </header>

        <div class="rc-summary-strip">
          <strong>版本摘要：</strong>
          <span v-html="release.summary"></span>
        </div>

        <div v-if="release.breaking" class="breaking-box-wrap">
          <div class="breaking-box">
            <div class="breaking-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ release.breaking.title }}</span>
            </div>
            <p>{{ release.breaking.description }}</p>
            <div class="diff-grid">
              <div class="diff-col old">
                <span class="diff-label">{{ release.breaking.oldLabel }}</span>
                <code>{{ release.breaking.oldValue }}</code>
              </div>
              <div class="diff-col new">
                <span class="diff-label">{{ release.breaking.newLabel }}</span>
                <code>{{ release.breaking.newValue }}</code>
              </div>
            </div>
          </div>
        </div>

        <div class="rc-body">
          <section
            v-for="group in release.groups"
            v-show="(!release.breaking || group.tone !== 'note') && (!release.dependencies || group.tone !== 'dep')"
            :key="`${release.version}-${group.title}`"
            class="change-group"
          >
            <div class="group-title-row">
              <div class="group-title-left">
                <span class="group-dot" :class="`dot-${group.tone}`"></span>
                <span class="group-title">{{ cleanGroupTitle(group.title) }}</span>
              </div>
              <span class="group-count-tag">{{ groupCountLabel(group) }}</span>
            </div>
            <ul class="change-list">
              <li v-for="item in group.items" :key="item" class="change-item">
                <span class="change-bullet" :class="`bullet-${group.tone}`"></span>
                <div v-html="item"></div>
              </li>
            </ul>
          </section>

          <section v-if="release.dependencies" class="change-group">
            <div class="group-title-row">
              <div class="group-title-left">
                <span class="group-dot dot-dep"></span>
                <span class="group-title">核心依赖升级矩阵</span>
              </div>
              <span class="group-count-tag">{{ release.dependencies.length }} 项更新</span>
            </div>
            <div class="dep-grid">
              <div v-for="dependency in release.dependencies" :key="dependency.name" class="dep-pill">
                <span class="dep-pill-name">{{ dependency.name }}</span>
                <span class="dep-pill-ver">{{ dependency.version }}</span>
              </div>
            </div>
          </section>
        </div>

        <footer class="rc-footer">
          <span>NextDoc4j Maintainers</span>
          <span>Release: <code>{{ release.version }}</code></span>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
type ReleaseTone = 'feat' | 'fix' | 'opt' | 'dep' | 'note'

interface ReleaseGroup {
  title: string
  tone: ReleaseTone
  items: string[]
}

interface ReleaseBreaking {
  title: string
  description: string
  oldLabel: string
  oldValue: string
  newLabel: string
  newValue: string
}

interface ReleaseDependency {
  name: string
  version: string
}

interface Release {
  version: string
  anchor: string
  date: string
  badge?: string
  badgeTone?: 'milestone'
  summary: string
  groups: ReleaseGroup[]
  breaking?: ReleaseBreaking
  dependencies?: ReleaseDependency[]
}

/**
 * 清理旧日志数据中的分类前置图标，统一使用设计稿中的纯色圆点表达分类。
 * @param {string} title 原始分类标题。
 * @returns {string} 去除前置图标后的分类标题。
 */
function cleanGroupTitle(title: string): string {
  return title.replace(/^(?:🚀|💡|🐛|📦|🔁|✨)\s*/, '')
}

/**
 * 根据日志分类生成卡片分组右侧的数量标签。
 * @param {ReleaseGroup} group 当前日志分组。
 * @returns {string} 与设计稿一致的分组数量或兼容性标签。
 */
function groupCountLabel(group: ReleaseGroup): string {
  if (group.tone === 'note') {
    return '兼容'
  }
  if (group.tone === 'feat') {
    return `${group.items.length} 项新增`
  }
  if (group.tone === 'fix') {
    return `${group.items.length} 项修复`
  }
  if (group.tone === 'dep') {
    return `${group.items.length} 项更新`
  }
  return `${group.items.length} 项优化`
}

/**
 * 根据版本号生成对应的 GitHub Release 详情地址。
 * @param {string} version 当前日志版本号，包含 v 前缀。
 * @returns {string} 对应版本的 GitHub Release 地址。
 */
function releaseGithubUrl(version: string): string {
  return `https://github.com/NextDoc4j/nextdoc4j/releases/tag/${version.replace(/^v/, '')}`
}

const releases: Release[] = [
  {
    version: 'v1.5.0',
    anchor: 'v1-5-0',
    date: '2026-10-16',
    badge: 'LATEST STABLE',
    summary: '完成 NextDoc4j Monorepo 整合，统一后端、前端、官网文档、Demo 与发布工具，提升 AI 开发、测试和发布效率。',
    breaking: {
      title: '前端技术栈彻底重构（重要）',
      description: '本版本不再沿用旧版 Vben/Vue 二次开发工程，前端在 Monorepo 中使用 React、TypeScript 和 Vite 完全重写。',
      oldLabel: '旧版前端',
      oldValue: 'Vben + Vue 3 二次开发',
      newLabel: '新版前端',
      newValue: 'React + TypeScript + Vite'
    },
    groups: [
      {
        title: '🚀 新增功能 · 工程结构',
        tone: 'feat',
        items: [
          '统一管理 <code>nextdoc4j</code> 后端、<code>nextdoc4j-ui</code> 前端、<code>nextdoc4j-doc</code> 官网文档、<code>nextdoc4j-demo</code> 集成示例与 <code>static</code> 静态资源。',
          '新增根目录聚合 POM，为统一构建、测试和发布提供固定入口。',
          '新增 <code>nextdoc4j-tests</code> 测试聚合模块，集中运行产品模块测试且不发布到 Maven Central。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端重构',
        tone: 'feat',
        items: [
          '在 <code>nextdoc4j-ui</code> 中完全重写前端实现，重新构建页面、组件、状态管理、请求处理、路由、主题和构建流程。',
          '重新实现首页、接口分组、接口详情、实体模型、在线调试、全局认证、全局参数、搜索、导出和响应式布局。'
        ]
      },
      {
        title: '🚀 新增功能 · 自动化流程',
        tone: 'feat',
        items: [
          '新增 <code>release</code> 工具集，支持前端开发联调、前端构建同步、打包预览、Demo 启动和 Maven 发布。',
          '开发联调支持复用 IDEA 已启动的 Demo 服务，也支持脚本自动构建和启动 Demo。'
        ]
      },
      {
        title: '💡 功能优化 · 文档与体验',
        tone: 'opt',
        items: [
          '统一根目录与各模块 README、贡献指南、安全策略、行为准则、Issue 模板和 PR 模板。',
          '更新新版前端构建产物以及首页、接口详情、在线调试和认证页面的展示截图。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 构建资源',
        tone: 'fix',
        items: [
          '修复前端构建资源与后端 <code>doc.html</code> 引用路径不一致的问题。',
          '修复根 POM 聚合关系和 IDEA 模块展示不清晰导致的开发体验问题。'
        ]
      }
    ]
  },
  {
    version: 'v1.4.1',
    anchor: 'v1-4-1',
    date: '2026-07-31',
    summary: '本版本为稳定性修复版本，重点完善多 <code>RequestMappingHandlerMapping</code> 环境下的安全插件兼容性，并修复复杂数据模型示例展示异常。',
    groups: [
      {
        title: '🐛 BUG 修复 · 后端',
        tone: 'fix',
        items: [
          '修复同时注册多个 <code>RequestMappingHandlerMapping</code>（如 Spring Boot Actuator）时，生成 OpenAPI 文档可能抛出 <code>NoUniqueBeanDefinitionException</code> 的问题。',
          '修复多映射器场景下 Sa-Token 插件无法正确收集 <code>@SaIgnore</code> 排除路径的问题。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复树结构示例嵌套过深的问题，限制自引用结构的展开层级并收束叶子节点。',
          '修复循环引用类型显示为 <code>array&lt;ref&gt;</code> 的问题，改为展示实际组件类型名称。',
          '修复非字符串类型使用空字符串默认值时，请求体或子节点示例为空的问题。'
        ]
      },
      {
        title: '💡 升级说明',
        tone: 'opt',
        items: [
          '从 1.4.0 升级至 1.4.1 无需修改 Maven 坐标或现有配置，更新 NextDoc4j 版本即可。',
          '从 1.3.x 升级时，请参考 1.4.0 的 Maven 坐标迁移说明。'
        ]
      }
    ]
  },
  {
    version: 'v1.4.0',
    anchor: 'v1-4-0',
    date: '2026-07-21',
    badge: 'MAJOR MILESTONE',
    badgeTone: 'milestone',
    summary: 'NextDoc4j 架构重大升级版本！统一 Spring Boot 3 与 Boot 4 为单套 Maven 坐标，深度支持 SSE 流式事件调试与网关 StripPrefix 智能路由推导。',
    breaking: {
      title: '兼容性说明 · Maven 坐标统一化（重要迁移须知）',
      description: '从 1.4.0 开始，废弃原先区分 Boot 3 / Boot 4 的多套坐标命名，统一合并为单套标准坐标。',
      oldLabel: '旧版坐标（1.3.x 废弃）',
      oldValue: 'nextdoc4j-springboot3-starter',
      newLabel: '新版统一坐标（1.4.0+ 推荐）',
      newValue: 'nextdoc4j-spring-boot-starter'
    },
    dependencies: [
      { name: 'Spring Boot 3', version: '3.5.16' },
      { name: 'Spring Cloud', version: '2025.0.3' },
      { name: 'Springdoc', version: '2.8.17 / 3.x' },
      { name: 'Sa-Token', version: '1.45.0' },
      { name: 'Hutool', version: '移除' },
      { name: 'swagger-core', version: '传递管理' }
    ],
    groups: [
      {
        title: '🚀 新增功能 · 后端',
        tone: 'feat',
        items: [
          '统一 Boot 3 / 4 为单套坐标：<code>nextdoc4j-spring-boot-starter</code>、<code>nextdoc4j-gateway-spring-boot-starter</code>；新增薄 BOM <code>nextdoc4j-bom</code> 与 Jackson 2/3 适配层。',
          '支持 <code>nextdoc4j.doc-path</code> 自定义文档入口（默认 <code>/doc.html</code>）；登录页支持浅色 / 深色主题切换。',
          '网关透传路由 filters，按 <code>StripPrefix</code> 解析文档路径；改写子服务 <code>swagger-config</code> 分组 URL。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端',
        tone: 'feat',
        items: [
          '新增接口分组概览；详情支持 oneOf/anyOf 分段选择、响应状态码切换、Body 枚举与类型折叠。',
          '在线调试支持 SSE 实时展示 / 终止与 Content-Type 自动补全；响应体支持 XML 与多格式高亮。',
          '导出增强响应示例生成；优化 AI 复制与调试面板体验。'
        ]
      },
      {
        title: '💡 功能优化 · 后端',
        tone: 'opt',
        items: [
          '移除 Hutool；单测聚合至 <code>nextdoc4j-tests</code>（不发布中央库）；swagger-core 由 springdoc 传递管理。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '优化详情 / 调试 / 全局参数布局与暗黑主题、小屏响应式及菜单性能。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端',
        tone: 'fix',
        items: [
          '修复网关 swagger-config 重复前缀、StripPrefix 路径推导及响应改写 early-return 问题。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复聚合 URL 解析、请求体示例 / 调试高度、分组概览菜单闪回与导出 / 搜索等边界问题。'
        ]
      },
      {
        title: '🔁 兼容性说明 · Maven 坐标（重要）',
        tone: 'note',
        items: [
          '旧：<code>nextdoc4j-springboot3/4-starter</code>、拆分 gateway starter、<code>nextdoc4j-bom-springboot3/4</code>',
          '新：<code>nextdoc4j-spring-boot-starter</code>、<code>nextdoc4j-gateway-spring-boot-starter</code>、<code>nextdoc4j-bom</code>'
        ]
      },
      {
        title: '🔁 兼容性说明 · 配置',
        tone: 'note',
        items: [
          '可选 <code>nextdoc4j.doc-path</code>；未配置时仍为 <code>/doc.html</code>'
        ]
      },
      {
        title: '📦 依赖更新 · 后端',
        tone: 'dep',
        items: [
          '<strong>Spring Boot 3</strong>：3.5.16',
          '<strong>Spring Cloud（Spring Boot 3）</strong>：2025.0.3',
          '<strong>Springdoc</strong>：2.8.17（Boot 3；Boot 4 请用 springdoc 3.x）',
          '<strong>Sa-Token</strong>：1.45.0',
          '<strong>移除</strong>：Hutool',
          '<strong>swagger-core-jakarta</strong>：改由 springdoc 传递管理'
        ]
      }
    ]
  },
  {
    version: 'v1.3.2',
    anchor: 'v1-3-2',
    date: '2026-06-29',
    summary: '本版本聚焦开源社区接入与构建发布链路稳定性，完善社区入口并修正多模块发布版本问题。',
    groups: [
      {
        title: '⚡ 功能优化 · 文档',
        tone: 'opt',
        items: [
          'README 增加 LINUX DO 社区入口，并同步更新首页、接口详情和在线调试界面截图。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 构建',
        tone: 'fix',
        items: [
          '修复多模块引入内部 BOM 和核心依赖时发布 POM 版本未固定的问题，统一使用 revision 声明并通过 flatten 生成固定版本。'
        ]
      },
      {
        title: '📦 依赖更新 · 后端',
        tone: 'dep',
        items: [
          '<strong>Spring Boot 3 升级</strong>：3.5.14 -> 3.5.16',
          '<strong>Spring Cloud（Spring Boot 3）升级</strong>：2025.0.2 -> 2025.0.3',
          '<strong>Spring Boot 4 升级</strong>：4.0.6 -> 4.1.0',
          '<strong>Spring Cloud（Spring Boot 4）升级</strong>：2025.1.1 -> 2025.1.2',
          '<strong>Hutool 升级</strong>：5.8.44 -> 5.8.46',
          '<strong>Swagger Core 升级</strong>：2.2.47 -> 2.2.51'
        ]
      },
      {
        title: '📦 依赖更新 · 构建工具',
        tone: 'dep',
        items: [
          '<strong>Spotless Maven Plugin 升级</strong>：2.43.0 -> 3.7.0',
          '<strong>Flatten Maven Plugin 升级</strong>：1.6.0 -> 1.7.3',
          '<strong>Maven Source Plugin 升级</strong>：3.3.1 -> 3.4.0',
          '<strong>Maven Javadoc Plugin 升级</strong>：3.11.2 -> 3.12.0',
          '<strong>Maven GPG Plugin 升级</strong>：3.1.0 -> 3.2.8',
          '<strong>Central Publishing Maven Plugin 升级</strong>：0.8.0 -> 0.11.0'
        ]
      }
    ]
  },
  {
    version: 'v1.3.1',
    anchor: 'v1-3-1',
    date: '2026-04-27',
    summary: '本版本集中完善在线调试状态记忆、文本草稿恢复与复杂数据结构展示，提升前端交互稳定性。',
    groups: [
      {
        title: '🚀 新增功能 · 前端',
        tone: 'feat',
        items: [
          '新增接口文档调试面板状态记忆能力，可在页面切换或重新进入后自动恢复调试视图状态。',
          '新增请求体文本草稿缓存与恢复能力，支持 <code>json</code>、<code>raw</code>、<code>xml</code> 等多种文本类型的独立保存与切换恢复。',
          '新增调试面板加载中与空状态提示，提升接口文档页的状态反馈体验。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '优化标签页关闭逻辑，关闭全部标签页时优先保留首页，提升操作一致性。',
          '优化路由兜底处理，访问无效页面或异常跳转时可自动回退到可用页面。',
          '优化接口文档页调试状态同步时机，减少状态覆盖、显示延迟和异常闪动问题。',
          '优化请求参数、请求体和调试状态的数据渲染机制，通过唯一行键提升表格更新稳定性。',
          '优化 JSON 示例展示结构与样式，长内容场景下支持横向滚动，提升可读性。',
          '优化字段说明与注释区域布局，改善复杂数据结构下的展示效果。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复请求体草稿在类型切换、页面隐藏及只读视图场景下可能丢失或异常刷新的问题。',
          '修复 Query 参数编辑过程中因行键不稳定导致的光标失焦问题。',
          '修复关闭标签页后可能进入无效路由、回退异常或目标页面不存在的问题。',
          '修复 JSON 示例在长内容场景下出现越界、挤压或显示不完整的问题。'
        ]
      },
      {
        title: '📦 依赖更新 · 后端',
        tone: 'dep',
        items: [
          '<strong>Spring Boot 3 升级</strong>：3.5.11 -> 3.5.14',
          '<strong>Spring Boot 4 升级</strong>：4.0.3 -> 4.0.6'
        ]
      }
    ]
  },
  {
    version: 'v1.3.0',
    anchor: 'v1-3-0',
    date: '2026-04-16',
    summary: '本版本完成网关聚合、接口详情工作台、在线调试、导出和全局检索等核心能力扩展，是一次面向完整研发链路的重要升级。',
    groups: [
      {
        title: '🚀 新增功能 · 后端（网关聚合运行时）',
        tone: 'feat',
        items: [
          '新增 Spring Cloud Gateway WebMvc 聚合文档支持，提供独立的 <code>gateway-webmvc-starter</code>、路由定位器、响应重写过滤器与自动配置桥接，使 Servlet / WebMvc 网关也可完成文档自动发现、聚合与安全方案注入。',
          '为 WebFlux / WebMvc 网关统一引入中立路由模型与定位器接口，新增 <code>nextdoc4j-plugin-gateway-core</code>、<code>NextDoc4jGatewayRouteDefinitionLocator</code>、<code>GatewayRouteDefinition</code> / <code>GatewayPredicateDefinition</code>，支持跨运行时复用路由发现与元数据解析逻辑。'
        ]
      },
      {
        title: '🚀 新增功能 · 后端（Starter 与模块体系）',
        tone: 'feat',
        items: [
          '新增 <code>nextdoc4j-common</code> 聚合模块，并将基础认证、扩展解析、资源处理等通用能力下沉到 <code>nextdoc4j-common-springboot3/4</code>。',
          '按 Spring Boot 3/4 与运行时类型拆分 Starter，补齐常规 Starter、Gateway WebFlux Starter、Gateway WebMvc Starter，便于按需接入。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（接口详情工作台）',
        tone: 'feat',
        items: [
          '新增完整的接口详情工作台：参数视图、模式视图、请求/响应 JSON 示例、多示例切换，以及 <code>oneOf</code> / <code>allOf</code> / <code>anyOf</code> 组合类型展示与交互。',
          '新增请求/响应 TS 代码示例面板，以及请求参数、响应参数的 TS 实体代码生成能力。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（在线调试与导出）',
        tone: 'feat',
        items: [
          '新增高级在线调试能力，支持 Path / Query / Header / Cookie / Body 联动编辑、请求缓存、<code>Content-Type</code> 切换、<code>form-data</code> / file 上传、复制 BaseURL / Path，以及二进制、图片 / Base64 响应处理。',
          '新增文档导出中心，支持全局参数管理、自定义导出范围、聚合服务导出，以及 Markdown / HTML / OpenAPI JSON / Docx / PDF 多格式导出。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（聚合文档与检索）',
        tone: 'feat',
        items: [
          '新增实体模型 JSON 示例展示，并增强实体详情页的结构展示。',
          '增强微服务聚合文档与全局搜索能力，支持聚合服务展示、路径高亮和更完整的搜索索引。'
        ]
      },
      {
        title: '💡 功能优化 · 后端',
        tone: 'opt',
        items: [
          '重构 Spring Boot 3/4 版本层父 POM 与模块层级，统一公共依赖声明并梳理 Starter 边界，降低不同运行时之间的耦合与重复维护成本。',
          '优化网关自动发现链路：统一自动配置与手动配置的文档入口模型，增强 <code>metadata</code>、Path Predicate、URI 与服务 <code>context-path</code> 的组合解析能力，服务名、文档路径与 <code>serviceId</code> 提取更稳定。',
          '优化自动配置装配边界，WebFlux / WebMvc 按运行时独立生效，网关聚合、基础认证、资源过滤和扩展配置的 Bean 组合更清晰。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '接口详情页整体重构，参数区域、自适应布局、折叠交互、Schema 切换和调试联动体验明显增强。',
          '优化 JSON Viewer 与大响应渲染性能，增加分块渲染与滚动位置保留，长文档和大 JSON 的可用性更好。',
          '持续增强文档导出页，补齐权限 / 鉴权信息、响应示例、排序规则和预览性能，导出预览加入虚拟滚动。',
          '持续优化在线调试体验，请求参数表、代码格式、响应处理逻辑、缓存恢复和调试区交互更稳定。',
          '菜单、侧边栏、全局搜索和路由生成逻辑做了多轮性能与交互优化，搜索匹配和文档定位更自然。',
          '工程侧补充系统暗黑模式跟随、首页版本号从后端 <code>x-nextdoc4j.version</code> 读取、统一 OpenAPI 与在线调试超时，并移除了前端定时检查更新 / ws 相关配置。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端',
        tone: 'fix',
        items: [
          '修复 Spring Cloud Gateway MVC 场景下原先仅覆盖 WebFlux 的能力缺口，补齐 Servlet / WebMvc 网关场景下的路由读取、文档聚合与响应改写链路。',
          '修复不同网关实现与 Spring Boot 3/4 Starter 中通用类分散、装配边界混杂的问题，避免错误模块被引入或重复维护。',
          '修复路由元数据解析的兼容性边界，增强 <code>routesMap</code>、空路由 / 空谓词、嵌套 <code>nextdoc4j</code> metadata、缺省 URI 与服务名回退等场景下的兜底处理。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复在线调试 URL 解析里 <code>pathAndSearch</code> 可能为空的问题，以及 <code>form-data</code> 文件上传展示、悬浮提示和内容类型处理异常。',
          '修复接口详情页切换标签时的展开闪动、状态重置、嵌套参数必填识别错误、空 JSON 结构展示异常。',
          '修复 Schema 解析边界问题，包括数组 <code>items</code> 的 <code>$ref</code> 解析、枚举值为 <code>0</code> 被过滤、多内容类型响应渲染异常等。',
          '修复聚合模式下错误命中展示、聚合在线测试适配、全局认证折叠样式、图标响应式解析和重复主题配置问题。',
          '修复偏好设置中的水印开关不生效，并同步优化相关文案来源和显示逻辑。'
        ]
      },
      {
        title: '📦 依赖更新 · 后端',
        tone: 'dep',
        items: [
          '<strong>Spring Boot 3 升级</strong>：3.5.11 -> 3.5.13',
          '<strong>Spring Cloud（Spring Boot 3）升级</strong>：2025.0.0 -> 2025.0.2',
          '<strong>Spring Boot 4 升级</strong>：4.0.3 -> 4.0.5',
          '<strong>Springdoc 升级</strong>：2.8.16 -> 2.8.17（Spring Boot 3）',
          '<strong>Springdoc（Spring Boot 4）升级</strong>：3.0.2 -> 3.0.3',
          '<strong>Swagger 升级</strong>：2.2.45 -> 2.2.47',
          '<strong>Sa-Token 升级</strong>：1.44.0 -> 1.45.0（Spring Boot 3）'
        ]
      }
    ]
  },
  {
    version: 'v1.2.0',
    anchor: 'v1-2-0',
    date: '2026-03-24',
    summary: '本版本围绕模块体系、网关聚合、全局搜索、导出和在线调试缓存完成大范围能力补齐，并同步优化配置与安全边界。',
    groups: [
      {
        title: '🚀 新增功能 · 后端（模块与运行时）',
        tone: 'feat',
        items: [
          '重构模块结构以适配 Spring Boot 3/4，新增 <code>nextdoc4j-bom-springboot3/4</code> 与 <code>nextdoc4j-starter</code> 聚合结构，并将 Web 运行时能力下沉到 Starter 体系。'
        ]
      },
      {
        title: '🚀 新增功能 · 后端（网关能力）',
        tone: 'feat',
        items: [
          '新增微服务 <code>swagger-config</code> 访问配置。',
          '支持接口免鉴权规则并改进文档路由管理。'
        ]
      },
      {
        title: '🚀 新增功能 · 后端（插件能力）',
        tone: 'feat',
        items: [
          '新增 Sa-Token 安全元数据操作定制器支持。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（全局搜索）',
        tone: 'feat',
        items: [
          '统一构建全局搜索索引，支持路径检索、高亮展示及网关聚合场景搜索。',
          '调整搜索面板展示与交互，增强方法标签与结果布局可读性。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（聚合与导出）',
        tone: 'feat',
        items: [
          '支持基于网关 OpenAPI 配置的聚合服务展示。',
          '新增全局参数管理与文档导出能力，支持按分组/接口选择自定义范围。',
          '支持微服务聚合文档导出与 <code>docx</code> 格式导出。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（体验增强）',
        tone: 'feat',
        items: [
          '支持实体菜单描述悬浮提示。',
          '支持根据系统暗色模式自动切换主题。',
          '新增在线调试请求缓存能力。'
        ]
      },
      {
        title: '💡 功能优化 · 后端',
        tone: 'opt',
        items: [
          '统一并精简配置属性与自动配置模型：使用 <code>NextDoc4jPropertiesMetadata</code> 替换旧配置属性，网关配置改用 <code>@ConfigurationProperties</code>。',
          '重构网关与安全模块边界，移除冗余默认 OpenAPI Bean/网关核心依赖，安全包路径由 <code>security.core</code> 迁移至 <code>security.schemes</code>。',
          '提取并复用基础工具能力（基础认证、资源处理、路径匹配等），并优化异常处理与默认元数据赋值。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '优化菜单图标处理、全局认证路由逻辑、聚合路由初始化与服务数据获取流程。',
          '优化导出页面布局、参数显示、筛选逻辑与权限描述。',
          '重构 Markdown 目录组件并优化样式与交互。',
          '优化文件上传状态管理、必填字段处理与请求体变更事件通知机制。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端',
        tone: 'fix',
        items: [
          '统一 POM 版本并移除 <code>nextdoc4j-dependencies</code> 模块，修复构建结构问题。',
          '修复 Spring Boot 4 场景下 Jackson 导入路径问题，兼容 springdoc/swagger 传入 <code>JavaType</code>。',
          '修复网关安全方案处理与路径模式转换逻辑（增强 Ant 风格匹配）。',
          '通过 <code>@ConditionalOnMissingBean</code> 避免安全配置属性重复注入。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复全局检索方法标签样式和布局显示问题。',
          '修正上传文件类型断言顺序。',
          '修复聚合模式下错误命中展示问题。'
        ]
      },
      {
        title: '📦 依赖更新 · 后端',
        tone: 'dep',
        items: [
          '<strong>Spring Boot 3 升级</strong>：3.5.7 -> 3.5.11',
          '<strong>Spring Boot 4 升级</strong>：4.0.3',
          '<strong>Springdoc 升级</strong>：2.8.14 -> 2.8.16（Spring Boot 3）',
          '<strong>Springdoc（Spring Boot 4）</strong>：3.0.2'
        ]
      },
      {
        title: '📦 依赖更新 · 前端',
        tone: 'dep',
        items: [
          '降级 <code>@types/node</code> 至 <code>22.16.0</code>'
        ]
      }
    ]
  },
  {
    version: 'v1.1.7',
    anchor: 'v1-1-7',
    date: '2026-02-28',
    summary: '本版本重点增强微服务聚合下的 context-path 自动发现、服务状态管理和在线调试交互，提升网关场景的稳定性与可用性。',
    groups: [
      {
        title: '🚀 新增功能 · 后端（网关聚合与 context-path 自动发现）',
        tone: 'feat',
        items: [
          '新增微服务 <code>context-path</code> 自动发现能力，支持从注册中心 metadata 解析 <code>nextdoc4j.context-path</code> 等 key，并将服务 context-path 自动拼接到聚合文档地址。',
          '在 starter 侧新增 context-path 元数据发布机制，自动将 <code>server.servlet.context-path</code> 注入服务注册 metadata，保证网关可感知。',
          '增强网关文档改写能力，统一合并全局安全配置并修正 OpenAPI <code>servers.url</code>。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（微服务聚合文档）',
        tone: 'feat',
        items: [
          '新增聚合模式的服务选择器、服务菜单与动态路由生成能力，支持按服务维度浏览文档。',
          '新增聚合模式下 OpenAPI 数据缓存、标签页状态记忆与服务切换状态管理，减少重复请求。',
          '新增服务状态探测与容错切换能力，提升聚合模式稳定性。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端（交互能力）',
        tone: 'feat',
        items: [
          '新增请求参数 <code>Content-Type</code> 设置与处理能力，支持更完整的请求体调试。',
          '新增复制 <code>baseUrl</code> 与 <code>path</code> 功能，提升在线调试效率。',
          '新增菜单图标组件与图标渲染支持。',
          '实体模型菜单新增 JSON 示例视图，并优化实体属性展示。'
        ]
      },
      {
        title: '💡 功能优化 · 后端',
        tone: 'opt',
        items: [
          '将 Swagger URLs 刷新改为异步触发（路由刷新/心跳/请求前），优化网关与微服务启动时序下的数据一致性。',
          '优化服务上下文路径解析策略（注册中心、路由 metadata、本地缓存协同），提升重启场景下的更新及时性。',
          '精简文档响应重写过滤器，移除冗余逻辑与无用方法，统一路径处理常量并完善代码注释规范。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '优化网关聚合数据缓存与访问逻辑，简化 <code>getServiceData</code> 调用参数。',
          '优化响应体解析流程，增强多内容类型渲染能力。',
          '优化 Markdown 预览与目录交互体验。',
          '优化请求体内容类型推断与参数表展示。',
          '优化菜单 SVG 图标格式与颜色使用，并清理无用 SVG 资源。',
          '优化折叠菜单文字与子菜单标题显示。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端',
        tone: 'fix',
        items: [
          '优化上下文路径元数据处理与过滤器参数注解，提升兼容性与空安全。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '适配聚合模式下在线测试功能，修复服务切换后的调试请求问题。',
          '修复数组类型 <code>items</code> 引用 Schema 的解析问题。',
          '修复全局认证样式无法折叠问题。',
          '修复 icon 组件在响应式场景下的图标名称解析问题。',
          '修正 Markdown 解析器配置，允许原始 HTML 渲染。',
          '修复请求体内容类型与表单参数处理的异常场景。'
        ]
      }
    ]
  },
  {
    version: 'v1.1.6',
    anchor: 'v1-1-6',
    date: '2026-01-12',
    summary: '本版本补齐版本号提供、网关聚合插件和路由策略能力，并精简配置、依赖与模块边界。',
    groups: [
      {
        title: '🚀 新增功能 · 后端（版本号提供器）',
        tone: 'feat',
        items: [
          '新增版本号提供器，支持从属性文件、Manifest 等多种来源读取版本信息。',
          '在 OpenAPI 扩展字段中新增版本号字段，统一版本号注入机制。'
        ]
      },
      {
        title: '🚀 新增功能 · 后端（网关聚合插件）',
        tone: 'feat',
        items: [
          '新增网关聚合文档插件，实现 Spring Cloud Gateway 文档聚合功能。',
          '支持路由包含及排除策略，灵活控制聚合范围。',
          '支持多种策略解析文档路径与显示名称。',
          '支持自动发现和手动配置两种方式提供 Swagger URL。',
          '提供丰富的配置选项，包括路由过滤、名称解析、文档路径策略等。'
        ]
      },
      {
        title: '💡 功能优化 · 后端',
        tone: 'opt',
        items: [
          '优化扩展配置加载逻辑，分离基础信息与扩展配置。',
          '统一网关插件接口命名规范，提升扩展一致性。',
          '精简配置属性结构，优化代码逻辑。',
          '优化模块间依赖关系，移除冗余依赖声明。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '首页版本号改为从后端读取，移除对前端构建版本的依赖。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复枚举值为 0 时被过滤的问题（<a href="https://github.com/NextDoc4j/nextdoc4j-ui/pull/13" target="_blank" rel="noopener noreferrer">#13</a>）。'
        ]
      }
    ]
  },
  {
    version: 'v1.1.5',
    anchor: 'v1-1-5',
    date: '2025-12-22',
    summary: '本版本优化响应数据加载反馈，并修复认证过滤逻辑中的请求方法判断问题。',
    groups: [
      {
        title: '🚀 新增功能 · 前端',
        tone: 'feat',
        items: [
          '新增响应数据加载中状态反馈，提升用户等待体验。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端（认证过滤）',
        tone: 'fix',
        items: [
          '修复注销请求判断的逻辑错误，移除错误的 HttpUtil 导入，改用 Spring Framework 的 HttpMethod 进行请求方法比较。'
        ]
      }
    ]
  },
  {
    version: 'v1.1.4',
    anchor: 'v1-1-4',
    date: '2025-12-19',
    summary: '本版本完善应用版本与请求交互反馈，优化编辑器高度和 Sa-Token 路径排除处理。',
    groups: [
      {
        title: '🚀 新增功能 · 前端',
        tone: 'feat',
        items: [
          '新增应用版本号显示功能，提升用户体验。',
          '新增请求发送按钮加载状态，防止重复点击。',
          '新增 JSON 视图复制功能，支持将编辑器内容复制到剪贴板。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '优化测试请求参数编辑器高度自适应逻辑，设置默认高度 500 像素，避免内容少时高度过低。'
        ]
      },
      {
        title: '💡 功能优化 · 后端（Sa-Token 插件）',
        tone: 'opt',
        items: [
          '优化路径排除器实现，通过 SpringUtil.getBean() 延迟获取替代构造函数注入。',
          '解决用户自定义多个 RequestMappingHandlerMapping Bean 时的注入冲突问题。',
          '降低 AutoConfiguration 与实现类的耦合度。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复 format-left 图标填充颜色显示问题，确保图标颜色正确继承父元素颜色。'
        ]
      }
    ]
  },
  {
    version: 'v1.1.3',
    anchor: 'v1-1-3',
    date: '2025-12-18',
    summary: '本版本新增认证展示、Sa-Token 适配和枚举解析能力，完善 API 权限信息与枚举数据的可视化展示。',
    groups: [
      {
        title: '🚀 新增功能 · 后端（认证展示插件）',
        tone: 'feat',
        items: [
          '新增接口认证信息展示插件，支持 OpenAPI Security 元数据统一解析和展示。',
          '新增 Sa-Token 适配模块，实现权限、角色及忽略规则注解的解析与展示。',
          '支持全局和接口级别的鉴权配置，自动注入 OpenAPI 鉴权信息。',
          '引入路径排除机制，基于注解动态排除特定接口的鉴权。'
        ]
      },
      {
        title: '🚀 新增功能 · 后端（枚举解析）',
        tone: 'feat',
        items: [
          '新增枚举展示解析，支持自定义枚举接口类型及方法名。',
          '支持基于反射调用自定义的枚举值和描述方法。',
          '统一解析流程，增强了扩展性和灵活性。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端',
        tone: 'feat',
        items: [
          '新增认证展示组件，支持 API 访问权限及权限要求明细展示。',
          '增强枚举展示功能，支持枚举描述展示，格式（1 - 启用，0 - 未启用）。',
          'JSON 查看器、参数视图、模式视图组件均支持扩展枚举信息展示。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复 JSON 节点复制功能异常问题。'
        ]
      }
    ]
  },
  {
    version: 'v1.1.2',
    anchor: 'v1-1-2',
    date: '2025-12-08',
    summary: '本版本完善枚举插件自动配置、枚举值描述映射和 JSON 展示能力，并清理冗余依赖与自动装配问题。',
    groups: [
      {
        title: '🚀 新增功能 · 后端（枚举插件）',
        tone: 'feat',
        items: [
          '实现枚举插件自动配置，基于 SpringDoc 与配置属性自动启用。',
          '支持通过配置控制描述颜色与展示开关。',
          '新增插件相关常量，统一命名空间与插件标识管理。',
          '补充自动配置元数据，增强 Spring Boot 自动加载支持。'
        ]
      },
      {
        title: '🚀 新增功能 · 后端（枚举处理能力）',
        tone: 'feat',
        items: [
          '增强枚举参数与模型处理能力，支持参数与模型中的枚举类型完整自定义处理。',
          '统一设置枚举类型的 enum 列表、type、format。',
          '新增枚举值与描述映射信息追加展示。',
          '优化枚举描述 Map 的生成顺序与安全性，确保展示稳定。'
        ]
      },
      {
        title: '🚀 新增功能 · 前端',
        tone: 'feat',
        items: [
          '新增 JSON 复制能力。',
          '新增 JSON 字段说明展示。',
          '支持渲染 HTML 格式的 API 描述（兼容后端能力增强）。'
        ]
      },
      {
        title: '💡 功能优化 · 后端（枚举插件）',
        tone: 'opt',
        items: [
          '调整为从配置读取描述颜色与展示开关。',
          '优化枚举描述与枚举值展示逻辑，支持可控的显示策略。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端',
        tone: 'fix',
        items: [
          '从 nextdoc4j-core 与 nextdoc4j-dependencies 移除 jackson-databind 冗余依赖。',
          '为 NextDoc4jExtensionOpenApiCustomizer 添加 @SuppressWarnings 处理无效警告。',
          '清理多余依赖声明，规整 pom.xml 配置。',
          '优化枚举参数处理与自动装配逻辑，移除无效注解，并统一注入 ObjectMapper。'
        ]
      },
      {
        title: '📦 依赖更新',
        tone: 'dep',
        items: [
          '<strong>Spring Boot 升级</strong>：3.5.5 -> 3.5.7'
        ]
      }
    ]
  },
  {
    version: 'v1.1.1',
    anchor: 'v1-1-1',
    date: '2025-11-13',
    summary: '本版本优化路径匹配与 HTML API 描述展示，并修复主题、认证参数和测试按钮交互问题。',
    groups: [
      {
        title: '💡 功能优化 · 后端',
        tone: 'opt',
        items: [
          '移除 NextDoc4jPathMatcherUtils 中不必要的双重检查锁定，精简逻辑结构，提升执行效率。'
        ]
      },
      {
        title: '💡 功能优化 · 前端',
        tone: 'opt',
        items: [
          '支持渲染 HTML 格式的 API 描述，丰富接口文档展示能力，提升阅读体验。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 前端',
        tone: 'fix',
        items: [
          '修复深色模式下全局认证样式异常问题，统一视觉表现。',
          '修复 header / query 参数名与 securitySchemes 定义不一致的问题，保证认证参数解析正确。',
          '修复测试按钮未禁用导致的重复点击问题，避免多次请求触发。'
        ]
      }
    ]
  },
  {
    version: 'v1.1.0',
    anchor: 'v1-1-0',
    date: '2025-11-05',
    summary: '本版本重构 API 详情页与全局认证 UI，优化左右分栏阅读体验并修复带前缀路径的过滤匹配问题。',
    groups: [
      {
        title: '💡 功能优化 · 详情页样式重构',
        tone: 'opt',
        items: [
          '重构 API 详情页样式，将请求参数示例与 JSON 示例调整为左右结构分布，优化界面布局与信息可读性（优化前为单栏展示，优化后左右分栏更清晰）。'
        ]
      },
      {
        title: '💡 功能优化 · 全局认证 UI 重构',
        tone: 'opt',
        items: [
          '全新设计全局认证配置 UI，布局更简洁直观，支持多种认证方式的便捷配置与管理。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 后端路径过滤',
        tone: 'fix',
        items: [
          '修复后端路径过滤无法匹配前缀的问题，确保 /xxx/v3/api-docs 等带前缀的路径也能被正确拦截。'
        ]
      },
      {
        title: '📦 依赖更新',
        tone: 'dep',
        items: [
          '<strong>Jackson 升级</strong>：2.18.2 -> 2.20.0',
          '<strong>Spring Boot3 升级</strong>：3.5.5 -> 3.5.6',
          '<strong>Springdoc 升级</strong>：2.8.13 -> 2.8.14',
          '<strong>Hutool 升级</strong>：5.8.37 -> 5.8.41',
          '<strong>Swagger 升级</strong>：2.2.36 -> 2.2.39'
        ]
      }
    ]
  },
  {
    version: 'v1.0.1',
    anchor: 'v1-0-1',
    date: '2025-10-17',
    summary: '本版本优化主页视觉、上下文路径、列表解析和文件上传展示，并修复标题一致性与双 JSON 折叠问题。',
    groups: [
      {
        title: '💡 功能优化 · 主页配色',
        tone: 'opt',
        items: [
          '统一主页配色方案，与全局风格保持一致，提升视觉一致性。'
        ]
      },
      {
        title: '💡 功能优化 · Spring Boot 适配',
        tone: 'opt',
        items: [
          '自动适配 servlet.context-path，保证在自定义上下文路径下，文档可通过对应路径（如 /app/doc.html）访问。'
        ]
      },
      {
        title: '💡 功能优化 · 列表解析与入参展示',
        tone: 'opt',
        items: [
          '改进 list 数组类型字段解析逻辑，提升文档展示准确性和可读性。',
          '增加入参字段范围信息，更直观体现参数约束。'
        ]
      },
      {
        title: '💡 功能优化 · 文件上传接口',
        tone: 'opt',
        items: [
          '接口在有无 multipart/form-data 声明的情况下，均可展示文件类型信息。',
          '优化文件 + 额外参数上传（表单混合提交）的解析和展示。'
        ]
      },
      {
        title: '🐛 BUG 修复 · 标题统一性',
        tone: 'fix',
        items: [
          '修复主页与左侧菜单栏标题不一致的问题，保证界面风格统一。'
        ]
      },
      {
        title: '🐛 BUG 修复 · Body 双 JSON 折叠',
        tone: 'fix',
        items: [
          '修复同一接口返回或请求体包含两个 JSON 时，折叠/展开显示异常的问题。'
        ]
      },
      {
        title: '📦 依赖更新',
        tone: 'dep',
        items: [
          '<strong>Springdoc 升级</strong>：2.8.11 -> 2.8.13'
        ]
      }
    ]
  },
  {
    version: 'v1.0.0',
    anchor: 'v1-0-0',
    date: '2025-09-10',
    badge: 'INITIAL RELEASE',
    summary: 'NextDoc4j 首个正式版本，围绕 SpringDoc / OpenAPI 3 提供现代化 API 文档 UI、配置管理、认证和品牌定制能力。',
    groups: [
      {
        title: '✨ 新特性',
        tone: 'feat',
        items: [
          '<strong>核心适配</strong>：深度适配 SpringDoc 与 OpenAPI 3 规范，提供全新现代化文档 UI，替代传统 Swagger UI，优化 API 文档展示与交互体验。',
          '<strong>配置管理</strong>：支持开关配置（可灵活控制文档 UI 功能启用 / 禁用）与生产模式配置（适配生产环境下的文档访问权限与安全管控）。',
          '<strong>认证功能</strong>：新增认证登录模块，保障 API 文档访问安全性，防止未授权用户查看敏感接口信息。',
          '<strong>品牌定制</strong>：支持品牌 logo 与标题自定义配置，可根据团队或项目需求替换默认标识，强化品牌辨识度。',
          '<strong>登录界面美化</strong>：实现动态标题与动态 logo 效果，支持配置化展示，提升品牌辨识度。',
          '<strong>主页优化</strong>：同步增加主页动态标题与动态 logo 配置，与登录界面保持整体视觉统一。'
        ]
      }
    ]
  }
]
</script>

<style scoped>
.changelog-wrapper {
  margin: 16px 0 32px;
}

.changelog-timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 单版本卡片设计稿 */
.vp-release-card {
  position: relative;
  overflow: hidden;
  margin: 0;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.25s ease;
}

.vp-release-card:hover {
  border-color: rgba(5, 150, 105, 0.35);
  box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.06);
}

.dark .vp-release-card {
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .vp-release-card:hover {
  border-color: rgba(52, 211, 153, 0.35);
}

.rc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  flex-wrap: wrap;
}

.dark .rc-header,
.dark .rc-footer {
  background: rgba(255, 255, 255, 0.02);
}

.rc-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.rc-version-tag {
  margin: 0;
  padding: 0;
  color: var(--vp-c-text-1, #0f172a);
  font-family: var(--vp-font-display, var(--vp-font-family-base, sans-serif));
  font-size: 20px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
  border: 0;
  scroll-margin-top: 96px;
}

.dark .rc-version-tag {
  color: #f8fafc;
}

.rc-status-pill {
  padding: 2px 8px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  border-radius: 999px;
  white-space: nowrap;
}

.status-milestone {
  color: #ffffff;
  background: linear-gradient(135deg, #059669, #10b981);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
}

.status-patch {
  color: #059669;
  background: rgba(5, 150, 105, 0.1);
  border: 1px solid rgba(5, 150, 105, 0.25);
}

.dark .status-patch {
  color: #34d399;
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.3);
}

.rc-date-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vp-c-text-3, #94a3b8);
  font-family: var(--vp-font-mono, monospace);
  font-size: 12px;
  white-space: nowrap;
}

.rc-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.rc-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  color: var(--vp-c-text-2, #475569);
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 6px;
  transition: all 0.15s ease;
}

.dark .rc-action-btn {
  background: var(--vp-c-bg-mute, #1e293b);
}

.rc-action-btn:hover {
  color: var(--vp-c-brand-1, #059669);
  border-color: var(--vp-c-brand-1, #059669);
}

.rc-summary-strip {
  margin: 18px 20px 14px;
  padding: 14px 16px;
  color: var(--vp-c-text-2, #475569);
  font-size: 13.5px;
  line-height: 1.65;
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.07) 0%, rgba(14, 165, 233, 0.03) 100%);
  border: 1px solid rgba(5, 150, 105, 0.2);
  border-left: 4px solid var(--vp-c-brand-1, #059669);
  border-radius: 10px;
}

.dark .rc-summary-strip {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%);
  border-color: rgba(16, 185, 129, 0.25);
  border-left-color: var(--vp-c-brand-1, #34d399);
}

.rc-summary-strip strong,
.change-item :deep(strong) {
  color: var(--vp-c-text-1, #0f172a);
}

.dark .rc-summary-strip strong,
.dark .change-item :deep(strong) {
  color: #f8fafc;
}

.rc-summary-strip :deep(code),
.change-item :deep(code),
.rc-footer code {
  padding: 2px 6px;
  color: var(--vp-c-brand-1, #059669);
  font-family: var(--vp-font-mono, monospace);
  font-size: 0.88em;
  font-weight: 600;
  background: var(--vp-c-brand-soft, rgba(5, 150, 105, 0.08));
  border-radius: 4px;
}

.breaking-box-wrap {
  padding: 0 20px;
}

.breaking-box {
  margin: 16px 0 8px;
  padding: 14px 16px;
  background: rgba(124, 58, 237, 0.05);
  border: 1.5px solid rgba(124, 58, 237, 0.22);
  border-radius: 10px;
}

.dark .breaking-box {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.35);
}

.breaking-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 750;
}

.dark .breaking-title {
  color: #c4b5fd;
}

.breaking-box p {
  margin: 0;
  color: var(--vp-c-text-2, #475569);
  font-size: 12.5px;
  line-height: 1.5;
}

.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.diff-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-x: auto;
  padding: 10px 12px;
  color: #e2e8f0;
  font-family: var(--vp-font-mono, monospace);
  font-size: 11.5px;
  line-height: 1.45;
  background: #0f172a;
  border-radius: 8px;
}

.diff-label {
  color: #94a3b8;
  font-family: var(--vp-font-sans, sans-serif);
  font-size: 10.5px;
}

.diff-col code {
  color: inherit;
  font: inherit;
  white-space: nowrap;
}

.diff-col.old code {
  color: #fb7185;
}

.diff-col.new code {
  color: #34d399;
}

.rc-body {
  padding: 0 20px 18px;
}

.change-group {
  margin-top: 16px;
}

.group-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  margin-bottom: 8px;
  background: var(--vp-c-bg-mute, #f1f5f9);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 8px;
}

.group-title-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.group-dot,
.change-bullet {
  flex: 0 0 auto;
  border-radius: 50%;
}

.group-dot {
  width: 7px;
  height: 7px;
}

.dot-feat,
.bullet-feat {
  background: #059669;
}

.dot-fix,
.bullet-fix {
  background: #e11d48;
}

.dot-opt,
.bullet-opt {
  background: #2563eb;
}

.dot-dep,
.bullet-dep {
  background: #d97706;
}

.dot-note,
.bullet-note {
  background: #7c3aed;
}

.group-title {
  min-width: 0;
  overflow: hidden;
  color: var(--vp-c-text-1, #0f172a);
  font-size: 12.5px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .group-title {
  color: #f8fafc;
}

.group-count-tag {
  flex-shrink: 0;
  color: var(--vp-c-text-3, #94a3b8);
  font-family: var(--vp-font-mono, monospace);
  font-size: 11px;
}

.change-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 10px;
  margin: 0;
  list-style: none;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--vp-c-text-2, #475569);
  font-size: 13px;
  line-height: 1.6;
}

.change-item > div {
  min-width: 0;
}

.change-bullet {
  width: 5px;
  height: 5px;
  margin-top: 8px;
}

.change-item :deep(a) {
  color: var(--vp-c-brand-1, #059669);
  text-decoration: none;
}

.change-item :deep(a:hover) {
  text-decoration: underline;
}

.scope-tag {
  display: inline-block;
  padding: 1px 6px;
  margin-right: 4px;
  color: var(--vp-c-text-1, #0f172a);
  font-family: var(--vp-font-mono, monospace);
  font-size: 11px;
  font-weight: 600;
  background: var(--vp-c-bg-mute, #f1f5f9);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 4px;
}

.dep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.dep-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  color: var(--vp-c-text-2, #475569);
  font-size: 11.5px;
  background: var(--vp-c-bg-mute, #f1f5f9);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 6px;
}

.dark .group-title-row,
.dark .scope-tag,
.dark .dep-pill {
  background: #1e293b;
}

.dep-pill-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-pill-ver {
  flex-shrink: 0;
  color: var(--vp-c-brand-1, #059669);
  font-family: var(--vp-font-mono, monospace);
  font-weight: 600;
}

.rc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  color: var(--vp-c-text-3, #94a3b8);
  font-size: 12px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

@media (max-width: 640px) {
  .rc-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px 16px;
  }

  .rc-header-left {
    gap: 8px;
  }

  .rc-header-actions {
    width: 100%;
  }

  .rc-action-btn {
    justify-content: center;
    width: 100%;
  }

  .rc-summary-strip,
  .breaking-box-wrap {
    margin-right: 16px;
    margin-left: 16px;
  }

  .breaking-box-wrap {
    padding: 0;
  }

  .rc-body {
    padding-right: 16px;
    padding-left: 16px;
  }

  .diff-grid {
    grid-template-columns: 1fr;
  }

  .rc-footer {
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 16px;
  }

}
</style>
