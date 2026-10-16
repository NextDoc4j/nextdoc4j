package top.nextdoc4j.demo.controller.user.auth;

import cn.dev33.satoken.annotation.SaIgnore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.req.auth.LoginReq;
import top.nextdoc4j.demo.core.model.resp.LoginResp;

import java.util.UUID;

/**
 * 认证管理
 *
 * @author echo
 * @since 2025/10/17
 */
@Slf4j
@Tag(name = "认证管理", description = "登录登出")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {


    @SaIgnore
    @ApiError(code = "auth.type.unsupported", status = 400, reason = "不支持的登录类型")
    @ApiError(code = "auth.credentials.invalid", status = 401, reason = "账号或密码错误")
    @ApiError(code = "auth.account.locked", status = 423, reason = "账号已被锁定")
    @Operation(summary = "登录", description = "用户登录")
    @PostMapping("/login")
    public R<LoginResp> login(@Validated @RequestBody LoginReq req, HttpServletRequest request) {   // 登录参数基类
        // 模拟生成 token（你可以换成 Sa-Token / JWT）
        String token = "HHwZoiBwCfh0xLdWOAd0bHOkEZlIMMOQKJyeFUw9T3ArrhL57od2i42s1o0sSXKkeHPJXvQsninhPFH2lArDDQ==";
        return R.ok(LoginResp.builder().token(token).build());
    }
}
