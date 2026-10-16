package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 *
 * @author echo
 * @since 2025/09/16 11:49
 **/
@Data
@Schema(description = "通知响应参数")
public class NotificationResp {

    @Schema(description = "通知ID", example = "1")
    private Long id;

    @Schema(description = "通知标题", example = "系统维护通知")
    private String title;

    @Schema(description = "通知内容", example = "系统将于今晚22:00-24:00进行维护")
    private String content;

    @Schema(description = "通知类型", example = "SYSTEM",
            allowableValues = {"SYSTEM", "SECURITY", "FEATURE", "BACKUP", "ALERT"})
    private String type;

    @Schema(description = "通知级别", example = "INFO",
            allowableValues = {"INFO", "WARNING", "SUCCESS", "ERROR"})
    private String level;

    @Schema(description = "目标类型", example = "USER",
            allowableValues = {"USER", "GROUP", "ALL"})
    private String targetType;

    @Schema(description = "目标ID", example = "1001")
    private Long targetId;

    @Schema(description = "通知状态", example = "SENT",
            allowableValues = {"SENT", "FAILED", "PENDING"})
    private String status;

    @Schema(description = "是否已读", example = "false")
    private Boolean read;

    @Schema(description = "创建时间", example = "2025-09-16T10:00:00")
    private LocalDateTime createTime;

    @Schema(description = "更新时间", example = "2025-09-16T10:00:00")
    private LocalDateTime updateTime;

}
