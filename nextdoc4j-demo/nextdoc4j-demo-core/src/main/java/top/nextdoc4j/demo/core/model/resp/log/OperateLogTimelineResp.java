package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "日志时间线响应")
public class OperateLogTimelineResp {

    @Schema(description = "日志ID", example = "18990010001")
    private Long id;

    @Schema(description = "链路ID", example = "TRACE-20260413-0001")
    private String traceId;

    @Schema(description = "业务编号", example = "ORD202604130001")
    private String bizNo;

    @Schema(description = "节点名称", example = "创建订单")
    private String nodeName;

    @Schema(description = "模块", example = "ORDER")
    private String module;

    @Schema(description = "业务类型", example = "CREATE")
    private String bizType;

    @Schema(description = "是否成功", example = "true")
    private Boolean success;

    @Schema(description = "发生时间", type = "string", format = "date-time", example = "2026-04-13T10:20:30")
    private LocalDateTime occurredAt;
}