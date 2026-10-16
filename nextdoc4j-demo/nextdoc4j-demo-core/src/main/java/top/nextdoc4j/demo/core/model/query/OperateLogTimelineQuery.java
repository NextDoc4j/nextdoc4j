package top.nextdoc4j.demo.core.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "日志时间线查询")
public class OperateLogTimelineQuery {

    @Schema(description = "业务主键", example = "ORD202604130001")
    private String bizNo;

    @Schema(description = "链路ID", example = "TRACE-20260413-0001")
    private String traceId;

    @Schema(description = "开始时间", type = "string", format = "date-time", example = "2026-04-13T00:00:00")
    private LocalDateTime startTime;

    @Schema(description = "结束时间", type = "string", format = "date-time", example = "2026-04-13T23:59:59")
    private LocalDateTime endTime;
}