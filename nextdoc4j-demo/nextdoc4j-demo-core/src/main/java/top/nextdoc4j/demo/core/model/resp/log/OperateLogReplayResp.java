package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "日志重放响应")
public class OperateLogReplayResp {

    @Schema(description = "重放任务ID", example = "REPLAY-20260413-0001")
    private String replayTaskId;

    @Schema(description = "是否已接受", example = "true")
    private Boolean accepted;

    @Schema(description = "执行状态", example = "SUCCESS", allowableValues = {"PENDING", "RUNNING", "SUCCESS", "FAILED"})
    private String status;

    @Schema(description = "目标信息，演示 anyOf")
    private Object target;

    @ArraySchema(
            schema = @Schema(implementation = ReplayStepResp.class),
            arraySchema = @Schema(description = "重放步骤")
    )
    private List<ReplayStepResp> steps;
}