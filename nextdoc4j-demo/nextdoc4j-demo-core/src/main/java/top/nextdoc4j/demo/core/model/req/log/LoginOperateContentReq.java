package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "登录日志内容")
public class LoginOperateContentReq {

    @Schema(description = "内容类型", example = "LOGIN", requiredMode = Schema.RequiredMode.REQUIRED)
    private String type;

    @Schema(description = "登录方式", example = "PASSWORD", allowableValues = {"PASSWORD", "SMS", "EMAIL", "SSO"})
    private String loginType;

    @Schema(description = "登录账号", example = "zhangsan")
    private String loginAccount;

    @Schema(description = "设备类型", example = "PC", allowableValues = {"PC", "MOBILE", "PAD"})
    private String deviceType;

    @Schema(description = "浏览器", example = "Chrome")
    private String browser;

    @Schema(description = "操作系统", example = "Windows 11")
    private String os;

    @Schema(description = "是否成功", example = "true")
    private Boolean success;
}