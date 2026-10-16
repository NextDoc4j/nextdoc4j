# 认证展示插件

认证展示插件用于在 API 文档中读取 `springdoc.components.security-schemes` 配置，并在 NextDoc4j 中生成独立的全局认证配置页，同时在在线调试时自动携带认证信息。

## UI 适配效果

配置插件后，UI 会新增“全局认证”独立配置页面，并在在线调试时自动将鉴权信息注入请求头：

<PluginAuthCards />

## 快速开始

<PluginAuthTerminal />

::: tip 版本建议
**1.4.0** 起统一为 `nextdoc4j-plugin-security-schemes`（Boot 3 / 4 共用）。建议先在 `dependencyManagement` 中引入 `nextdoc4j-bom`，这样无需单独写版本号。
:::

## 路径排除（自定义白名单）

如果某些公开接口（如健康检查、公开登录）无需自动挂载认证请求头，可通过实现 `NextDoc4jPathExcluder` 接口自定义排除规则：

```java
@Component
public class CustomPathExcluder implements NextDoc4jPathExcluder {

    @Override
    public Set<String> getExcludedPaths() {
        Set<String> paths = new HashSet<>();
        paths.add("/actuator/**");
        paths.add("/public/**");
        paths.add("/api/auth/login");
        return paths;
    }

    @Override
    public int getOrder() {
        return 200;  // 数值越小优先级越高
    }
}
```
