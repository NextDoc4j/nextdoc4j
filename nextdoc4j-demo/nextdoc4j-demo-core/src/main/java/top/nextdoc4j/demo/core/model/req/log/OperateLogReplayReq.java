package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "日志重放请求")
public class OperateLogReplayReq {

    @Schema(description = "源日志ID", example = "18990010001", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Long logId;

    @Schema(description = "是否异步重放", example = "false")
    private Boolean async = false;

    @Schema(description = "是否忽略鉴权", example = "false")
    private Boolean ignoreAuth = false;

    @Schema(
            description = "重放目标，支持 HTTP 或 MQ",
            discriminatorProperty = "targetType",
            oneOf = {HttpReplayTargetReq.class, MqReplayTargetReq.class}
    )
    private Object replayTarget;
}