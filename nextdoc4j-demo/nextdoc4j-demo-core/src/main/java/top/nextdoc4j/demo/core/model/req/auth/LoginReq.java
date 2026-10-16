package top.nextdoc4j.demo.core.model.req.auth;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.AuthTypeEnum;

import java.io.Serial;
import java.io.Serializable;

/**
 * 登录参数基类
 *
 * @author KAI
 * @author Charles7c
 * @since 2024/12/22 15:16
 */
@Data
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY, property = "authType", visible = true)
@JsonSubTypes({@JsonSubTypes.Type(value = AccountLoginReq.class, name = "ACCOUNT"),
        @JsonSubTypes.Type(value = EmailLoginReq.class, name = "EMAIL"),
        @JsonSubTypes.Type(value = PhoneLoginReq.class, name = "PHONE")})
@Schema(description = "基础登录参数")
public class LoginReq implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 客户端 ID
     */
    @Schema(description = "客户端 ID", example = "ef51c9a3e9046c4f2ea45142c8a8344a")
    @NotBlank(message = "客户端ID不能为空")
    private String clientId;

    /**
     * 认证类型
     */
    @Schema(description = "认证类型", example = "ACCOUNT")
    @NotNull(message = "认证类型非法")
    private AuthTypeEnum authType;
}
