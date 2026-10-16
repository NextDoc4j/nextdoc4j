package top.nextdoc4j.demo.core.model.req;

/**
 * @author echo
 * @since 2025/09/15 15:25
 **/

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.Priority;

import java.time.LocalDateTime;

@Data
@Schema(description = "新增用户请求参数")
public class UserReq {

    @NotNull
    @Schema(description = "用户ID", example = "1")
    private Long id;

    @NotBlank
    @Size(min = 2, max = 10)
    @Schema(description = "用户名", example = "echo")
    private String username;

    @Email
    @Schema(description = "邮箱", example = "nextdoc4j@163.com")
    private String email;

    @Min(18)
    @Max(60)
    @Schema(description = "年龄", example = "25")
    private Integer age;

    @DecimalMin(value = "0", inclusive = false)
    @DecimalMax(value = "100", inclusive = false)
    @Schema(description = "分数", example = "75")
    private Double score;

    @Schema(description = "优先级")
    private Priority priority;

    @Pattern(regexp = "^[0-9]{11}$")
    @Schema(description = "手机号", example = "13800001111")
    private String phone;

    @Past
    @Schema(description = "注册时间", example = "2023-01-01T12:00:00Z")
    private LocalDateTime registerTime;


}
