package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "脱敏操作人榜单")
public class MaskedOperatorRankResp {

    @Schema(description = "脱敏名称", example = "张**")
    private String maskedName;

    @Schema(description = "次数", example = "580")
    private Long count;
}