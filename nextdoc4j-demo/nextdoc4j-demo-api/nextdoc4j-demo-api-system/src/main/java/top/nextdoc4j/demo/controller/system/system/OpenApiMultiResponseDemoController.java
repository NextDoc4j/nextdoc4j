package top.nextdoc4j.demo.controller.system.system;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.model.base.R;

@Tag(name = "OpenAPI 多响应示例", description = "演示 springdoc + swagger 的多种 response 写法")
@RestController
@RequestMapping("/api/openapi/response-demo")
public class OpenApiMultiResponseDemoController {

    // -------------------------------------------------------------------------
    // 场景 1：单个状态码，单个 error → 生成 mediaType.example（内联单值）
    // -------------------------------------------------------------------------
    // 输出：
    // "409": {
    //   "description": "用户名已存在",
    //   "content": { "application/json": { "schema": {$ref}, "example": {...} } }
    // }
    @ApiError(code = "username.exist", status = 409, reason = "用户名已存在")
    @Operation(summary = "场景1：单 error（内联 example）")
    @PostMapping("/single")
    public R<Void> scene1() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 2：同一状态码多个 error → 生成 mediaType.examples（命名多值）
    // -------------------------------------------------------------------------
    // 输出：
    // "400": {
    //   "description": "参数不合法 / 用户名不能为空",
    //   "content": { "application/json": {
    //     "schema": {$ref},
    //     "examples": {
    //       "400_param.invalid":    { "summary": "参数不合法",   "value": {...} },
    //       "400_username.required":{ "summary": "用户名不能为空", "value": {...} }
    //     }
    //   }}
    // }
    @ApiError(code = "param.invalid", status = 400, reason = "参数不合法")
    @ApiError(code = "username.required", status = 400, reason = "用户名不能为空")
    @Operation(summary = "场景2：同状态码多 error（examples 下拉）")
    @PostMapping("/multi-same-status")
    public R<Void> scene2() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 3：多个不同状态码，每个只有一个 error
    // -------------------------------------------------------------------------
    @ApiError(code = "error", status = 400, reason = "请求参数错误")
    @ApiError(code = "username.exist", status = 409, reason = "用户名已存在")
    @ApiError(code = "server.error", status = 500, reason = "服务器内部错误")
    @Operation(summary = "场景3：多个不同状态码，各一个 error")
    @PostMapping("/multi-status")
    public R<Void> scene3() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 4：裸响应（bareContent=true）→ 只有 description，无 content
    // -------------------------------------------------------------------------
    // 输出：
    // "403": { "description": "无权限" }
    // "401": { "description": "未登录或 Token 已过期" }
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @ApiError(code = "unauthorized", status = 401, reason = "未登录或 Token 已过期", bareContent = true)
    @Operation(summary = "场景4：裸响应，无 content（403/401）")
    @GetMapping("/bare")
    public R<Void> scene4() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 5：default 响应码（status = -1）
    // -------------------------------------------------------------------------
    // 输出：
    // "default": {
    //   "description": "未知服务器错误",
    //   "content": { "application/json": { ... } }
    // }
    @ApiError(code = "unknown.error", status = -1, reason = "未知服务器错误")
    @Operation(summary = "场景5：default 响应码")
    @GetMapping("/default-code")
    public R<Void> scene5() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 6：refExample=true → example 提升到 components/examples，生成 $ref
    // -------------------------------------------------------------------------
    // 输出：
    // components/examples:
    //   "400_username.required": { "summary": "用户名不能为空", "value": {...} }
    // 接口中：
    //   "examples": { "400_username.required": { "$ref": "#/components/examples/400_username.required" } }
    @ApiError(code = "username.required", status = 400, reason = "用户名不能为空", refExample = true)
    @Operation(summary = "场景6：refExample=true，提升到 components/examples")
    @PostMapping("/ref-example")
    public R<Void> scene6() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 7：reason 与 message 分离（reason 作标题，message 作详细说明）
    // -------------------------------------------------------------------------
    // 输出 example value：{ "code": "rate.limit", "message": "每分钟最多请求 60 次，请稍后重试" }
    @ApiError(
            code = "rate.limit",
            status = 429,
            reason = "请求过于频繁",
            message = "每分钟最多请求 60 次，请稍后重试"
    )
    @Operation(summary = "场景7：reason 与 message 分离")
    @GetMapping("/rate-limit")
    public R<Void> scene7() {
        return R.ok(null);
    }


    // -------------------------------------------------------------------------
    // 场景 8：混合 — 多状态码 + 部分裸响应 + 部分多 error + default
    // -------------------------------------------------------------------------
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @ApiError(code = "param.invalid", status = 400, reason = "参数不合法")
    @ApiError(code = "username.required", status = 400, reason = "用户名不能为空")
    @ApiError(code = "username.exist", status = 409, reason = "用户名已存在")
    @ApiError(code = "unknown.error", status = -1, reason = "未知服务器错误")
    @Operation(summary = "场景8：混合完整示例")
    @PostMapping("/mixed")
    public R<Void> scene8() {
        return R.ok(null);
    }

}
