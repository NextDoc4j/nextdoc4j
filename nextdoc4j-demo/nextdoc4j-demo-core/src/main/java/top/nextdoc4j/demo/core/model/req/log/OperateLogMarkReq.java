package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "日志标记请求")
public class OperateLogMarkReq {

    @ArraySchema(
            schema = @Schema(description = "日志ID", example = "18990010001"),
            minItems = 1,
            uniqueItems = true,
            arraySchema = @Schema(description = "待标记日志ID列表")
    )
    @NotEmpty
    private List<Long> ids;

    @Schema(
            description = "标记人，可传用户ID或用户名，演示 anyOf",
            anyOf = {Long.class, String.class},
            examples = {"10001", "zhangsan"}
    )
    private Object marker;


    @Schema(
            description = "重放目标，支持 HTTP 或 MQ",
            discriminatorProperty = "targetType",
            anyOf = {HttpReplayTargetReq.class, MqReplayTargetReq.class}
    )
    private Object replayTarget;

    @Schema(description = "是否加星", example = "true")
    private Boolean starred;

    @Schema(description = "是否标记为敏感", example = "true")
    private Boolean sensitive;

    @ArraySchema(
            schema = @Schema(description = "标签", example = "风控关注"),
            arraySchema = @Schema(description = "标签列表")
    )
    private List<String> tags;

    @Schema(description = "备注", example = "人工巡检确认")
    private String remark;
}