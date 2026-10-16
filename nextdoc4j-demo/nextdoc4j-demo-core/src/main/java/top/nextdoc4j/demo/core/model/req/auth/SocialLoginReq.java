package top.nextdoc4j.demo.core.model.req.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;

/**
 * 第三方账号登录参数
 *
 * @author KAI
 * @author Charles7c
 * @since 2024/12/25 15:43
 */
@Data
@Schema(description = "第三方账号登录参数")
public class SocialLoginReq extends LoginReq {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 第三方登录平台
     */
    @Schema(description = "第三方登录平台", example = "gitee")
    @NotBlank(message = "第三方登录平台不能为空")
    private String source;

    /**
     * 授权码
     */
    @Schema(description = "授权码", example = "a08d33e9e577fb339de027499784ed4e871d6f62ae65b459153e906ab546bd56")
    @NotBlank(message = "授权码不能为空")
    private String code;

    /**
     * 状态码
     */
    @Schema(description = "状态码", example = "2ca8d8baf437eb374efaa1191a3d")
    @NotBlank(message = "状态码不能为空")
    private String state;
}
