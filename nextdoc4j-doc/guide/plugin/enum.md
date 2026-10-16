# 枚举展示插件

枚举展示插件用于在 API 文档中增强枚举类型的展示效果，自动解析枚举的 `value-description` 映射关系。

## UI 适配效果

配置插件后，UI 会在接口详情与在线调试中增强枚举展示，直接呈现枚举值与说明信息：

<PluginEnumCards />

## 快速开始

<PluginEnumTerminal />

::: tip 版本建议
**1.4.0** 起统一为 `nextdoc4j-plugin-enum`（Boot 3 / 4 共用）。建议先在 `dependencyManagement` 中引入 `nextdoc4j-bom`，这样无需单独写版本号。
:::

## 核心接口与模块说明

| 类 | 说明 |
| :--- | :--- |
| `EnumValue<T>` | 枚举值通用规范接口，定义 `getValue()` 与 `getDescription()` |
| `DefaultEnumMetadataResolver` | 默认元数据解析器，内置处理实现 `EnumValue` 接口的枚举 |
| `EnumMetadataResolver` | 自定义扩展解析器 SPI 接口，支持适配团队内部现有枚举基类 |

## 支持的基础类型映射

| Java 基础类型 | OpenAPI Type | OpenAPI Format | 说明 |
| :--- | :--- | :--- | :--- |
| `Integer` / `int` | `integer` | `int32` | 32 位整型状态码 |
| `Long` / `long` | `integer` | `int64` | 64 位长整型 |
| `String` | `string` | — | 字符串编码 |
| `Double` / `double` | `number` | `double` | 浮点数值 |
| `Float` / `float` | `number` | `float` | 单精度浮点数值 |

## 自定义解析器 (扩展 SPI)

如需支持企业现有内部枚举接口（例如 `BusinessEnum`），实现 `EnumMetadataResolver` 并注册为 Spring Bean 即可：

```java
@Component
public class BusinessEnumResolver implements EnumMetadataResolver {

    @Override
    public boolean supports(Class<?> enumClass) {
        return enumClass != null
            && enumClass.isEnum()
            && BusinessEnum.class.isAssignableFrom(enumClass);
    }

    @Override
    public Class<?> getEnumInterfaceType() {
        return BusinessEnum.class;
    }

    @Override
    public String getValueMethodName() {
        return "getCode";
    }

    @Override
    public String getDescriptionMethodName() {
        return "getLabel";
    }
}
```

## OpenAPI 输出规范

解析后的枚举元数据会自动注入 OpenAPI Schema 扩展字段 `x-nextdoc4j-enum`：

```json
{
  "status": {
    "type": "string",
    "enum": ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"],
    "x-nextdoc4j-enum": {
      "items": [
        { "value": "PENDING", "description": "待支付" },
        { "value": "PAID", "description": "已支付" },
        { "value": "SHIPPED", "description": "已发货" },
        { "value": "COMPLETED", "description": "已完成" },
        { "value": "CANCELLED", "description": "已取消" }
      ]
    }
  }
}
```

NextDoc4j UI 会自动读取 `x-nextdoc4j-enum` 扩展字段，在调试时下拉展示枚举值及其描述。
