package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.StatusType;

@Data
@Schema(description = "用户更新请求参数")
public class UserUpdateReq {

    @Size(min = 2, max = 50)
    @Schema(description = "用户名", example = "echo")
    private String username;

    @Email
    @Schema(description = "邮箱", example = "nextdoc4j@163.com")
    private String email;

    @Min(18)
    @Max(120)
    @Schema(description = "年龄", example = "25")
    private Integer age;

    @Pattern(regexp = "^[0-9]{11}$")
    @Schema(description = "手机号", example = "13800001111")
    private String phone;

    @Pattern(regexp = "^(ACTIVE|INACTIVE|PENDING)$")
    @Schema(description = "用户状态", example = "ACTIVE")
    private StatusType status;
}