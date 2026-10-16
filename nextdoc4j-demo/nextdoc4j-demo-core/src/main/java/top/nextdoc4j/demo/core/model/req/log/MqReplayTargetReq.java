package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "MQ 重放目标")
public class MqReplayTargetReq {

    @Schema(description = "目标类型", example = "MQ")
    private String targetType;

    @Schema(description = "Topic", example = "operate-log-replay")
    private String topic;

    @Schema(description = "Tag", example = "ORDER")
    private String tag;

    @Schema(description = "消息Key", example = "MSG-20260413-0001")
    private String messageKey;

    @Schema(description = "消息体")
    private Object body;
}