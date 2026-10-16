package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "操作人榜单")
public class OperatorRankResp {

    @Schema(description = "操作人ID", example = "10001")
    private Long operatorId;

    @Schema(description = "操作人名称", example = "张三")
    private String operatorName;

    @Schema(description = "次数", example = "580")
    private Long count;
}