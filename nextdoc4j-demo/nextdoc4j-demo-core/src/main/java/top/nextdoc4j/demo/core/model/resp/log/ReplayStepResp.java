package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "重放步骤")
public class ReplayStepResp {

    @Schema(description = "步骤序号", example = "1")
    private Integer stepNo;

    @Schema(description = "步骤名称", example = "参数构建")
    private String stepName;

    @Schema(description = "是否成功", example = "true")
    private Boolean success;

    @Schema(description = "耗时(ms)", example = "30")
    private Long durationMs;

    @Schema(description = "结果信息", example = "请求参数构建完成")
    private String message;
}