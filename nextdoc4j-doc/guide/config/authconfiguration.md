# NextDoc4j 简单认证配置

为您的 API 文档添加轻量密码访问保护，防止未授权人员查看敏感接口资产。支持启动时动态生成 UUID 临时凭据与自定义静态密码。

## 认证参数速查

简单认证功能统一收敛在 `nextdoc4j.auth` 命名空间：

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `nextdoc4j.auth.enabled` | `boolean` | `false` | 是否开启文档密码拦截认证功能。 |
| `nextdoc4j.auth.password` | `string` | *自动生成 UUID* | 访问密码。未配置时系统启动会在控制台输出动态密码。 |

## 认证配置模式（两选一）

<ConfigAuthTerminal />

## 认证工作流程与安全机制

<ConfigAuthLifecycle />

## 登录界面视觉展示

<UiShowcaseBox
  src="/images/screenshots/guide/login.png"
  title="NextDoc4j 密码认证安全登录界面"
  tag="SECURITY AUTH"
  caption="开启认证拦截后，访问 /doc.html 自动跳转至专属安全登录页，输入访问凭据后进入工作台"
  alt="NextDoc4j 登录界面"
/>
