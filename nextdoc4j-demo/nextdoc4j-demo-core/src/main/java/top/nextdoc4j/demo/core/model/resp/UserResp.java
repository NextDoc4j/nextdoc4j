package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.Priority;
import top.nextdoc4j.demo.core.enums.StatusType;

import java.time.LocalDateTime;

@Data
@Schema(description = "用户响应参数")
public class UserResp {


    @Schema(description = "用户ID", example = "1")
    private Long id;

    @Schema(description = "用户名", example = "echo")
    private String username;

    @Schema(description = "邮箱", example = "nextdoc4j@163.com")
    private String email;

    @Schema(description = "年龄", example = "25")
    private Integer age;

    @Schema(description = "手机号", example = "13800001111")
    private String phone;

    @Schema(description = "用户状态")
    private StatusType status;

    @Schema(description = "优先级")
    private Priority priority;

    @Schema(description = "创建时间", example = "2024-01-01T12:00:00")
    private LocalDateTime createTime;

    @Schema(description = "更新时间", example = "2024-01-01T12:00:00")
    private LocalDateTime updateTime;

}