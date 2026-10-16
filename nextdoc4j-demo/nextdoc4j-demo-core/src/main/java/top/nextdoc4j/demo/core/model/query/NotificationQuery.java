package top.nextdoc4j.demo.core.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 *
 * @author echo
 * @since 2025/09/16 11:47
 **/
@Data
@Schema(description = "通知查询参数")
public class NotificationQuery {

    @Schema(description = "通知标题，支持模糊查询", example = "系统")
    @NotNull
    private String title;

    @Schema(description = "通知类型", example = "SYSTEM",
            allowableValues = {"SYSTEM", "SECURITY", "FEATURE", "BACKUP", "ALERT"})
    private String type;

    @Schema(description = "通知级别", example = "INFO",
            allowableValues = {"INFO", "WARNING", "SUCCESS", "ERROR"})
    private String level;

    @Schema(description = "是否已读", example = "false")
    private Boolean read;

    @Schema(description = "通知状态", example = "SENT",
            allowableValues = {"PENDING", "SENT", "FAILED"})
    private String status;

    @Schema(description = "当前页码，默认1", example = "1")
    private Integer pageNum = 1;

    @Schema(description = "每页记录数，默认10", example = "10")
    private Integer pageSize = 10;

    @Schema(description = "目标类型", example = "USER", allowableValues = {"USER", "ROLE", "ALL"})
    private String targetType;

    @Schema(description = "目标ID", example = "1")
    private Long targetId;
}
