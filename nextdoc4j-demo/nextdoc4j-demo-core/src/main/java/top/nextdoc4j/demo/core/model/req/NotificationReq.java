package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "发送通知请求参数")
public class NotificationReq {

    @NotBlank
    @Size(min = 1, max = 100)
    @Schema(description = "通知标题", example = "系统维护通知")
    private String title;

    @NotBlank
    @Size(min = 1, max = 1000)
    @Schema(description = "通知内容", example = "系统将于今晚22:00-24:00进行维护，期间服务可能不可用")
    private String content;

    @NotBlank
    @Pattern(regexp = "^(SYSTEM|SECURITY|FEATURE|BACKUP|ALERT)$")
    @Schema(description = "通知类型", example = "SYSTEM",
            allowableValues = {"SYSTEM", "SECURITY", "FEATURE", "BACKUP", "ALERT"})
    private String type;

    @NotBlank
    @Pattern(regexp = "^(INFO|WARNING|SUCCESS|ERROR)$")
    @Schema(description = "通知级别", example = "INFO",
            allowableValues = {"INFO", "WARNING", "SUCCESS", "ERROR"})
    private String level;

    @NotBlank
    @Pattern(regexp = "^(USER|ROLE|ALL)$")
    @Schema(description = "目标类型", example = "USER",
            allowableValues = {"USER", "ROLE", "ALL"})
    private String targetType;

    @Schema(description = "目标ID", example = "1")
    private Long targetId;

    @Schema(description = "通知状态", example = "SENT",
            allowableValues = {"PENDING", "SENT", "FAILED"})
    private String status;

    @Schema(description = "是否已读", example = "false")
    private Boolean read;

    @Schema(description = "创建时间", example = "2024-01-01T12:00:00")
    private LocalDateTime createTime;

    @Schema(description = "更新时间", example = "2024-01-01T12:00:00")
    private LocalDateTime updateTime;
}