# Sa-Token 权限码插件

Sa-Token 权限码插件用于解析 `@SaCheckPermission`、`@SaCheckRole`、`@SaIgnore` 注解，在接口调试时动态展示权限元数据。

## UI 适配效果

配置插件后，UI 会在接口详情标题下方直观显示权限码与角色要求徽章：

<UiSecurityCards />

## 快速开始

<PluginSatokenTerminal />

::: tip 版本建议
**1.4.0** 起统一为 `nextdoc4j-plugin-security-satoken`（Boot 3 / 4 共用）。建议先在 `dependencyManagement` 中引入 `nextdoc4j-bom`，这样无需单独写版本号。
:::

## 支持的注解矩阵

| 注解 | 说明 | 支持参数 |
| :--- | :--- | :--- |
| `@SaCheckPermission` | 权限校验 | `value`, `mode = SaMode.OR / AND`, `orRole` |
| `@SaCheckRole` | 角色校验 | `value`, `mode = SaMode.OR / AND` |
| `@SaIgnore` | 忽略校验 | 标记公开无需鉴权的接口端点 |

## OpenAPI 输出效果

解析后的权限信息会添加到 OpenAPI 扩展字段 `x-nextdoc4j-security`：

```json
{
  "paths": {
    "/api/user/{id}": {
      "get": {
        "x-nextdoc4j-security": {
          "permissions": [
            { "values": ["user:read"], "mode": "AND", "type": "permission" }
          ],
          "roles": [],
          "ignore": false
        }
      }
    }
  }
}
```

NextDoc4j UI 会自动读取 `x-nextdoc4j-security` 扩展字段，并在接口标题区域以高亮徽章形式呈现权限元数据。

## 自定义权限框架（扩展 SPI）

如果你使用的是非 Sa-Token 的鉴权框架，可通过实现 `NextDoc4jSecurityMetadataResolver` 接口快速接入：

```java
@Component
public class CustomSecurityResolver implements NextDoc4jSecurityMetadataResolver {

    @Override
    public void resolve(Class<?> beanType, Method method, NextDoc4jSecurityMetadata metadata) {
        CustomSecurity annotation = method.getAnnotation(CustomSecurity.class);
        if (annotation == null) {
            return;
        }
        metadata.addPermission(annotation.permissions(), "AND", "custom", null);
    }

    @Override
    public boolean supports(Class<?> beanType, Method method) {
        return method.isAnnotationPresent(CustomSecurity.class);
    }

    @Override
    public int getOrder() {
        return 200;
    }

    @Override
    public String getName() {
        return "CustomSecurityResolver";
    }
}
```
