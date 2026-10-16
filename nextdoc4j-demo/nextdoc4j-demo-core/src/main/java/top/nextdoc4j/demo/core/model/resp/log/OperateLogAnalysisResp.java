package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "日志统计分析响应")
public class OperateLogAnalysisResp {

    @Schema(description = "总日志数", example = "12000")
    private Long totalCount;

    @Schema(description = "成功数", example = "11880")
    private Long successCount;

    @Schema(description = "失败数", example = "120")
    private Long failCount;

    @Schema(description = "平均耗时(ms)", example = "89.5")
    private Double avgDurationMs;

    @Schema(description = "P95耗时(ms)", example = "320")
    private Long p95DurationMs;

    @ArraySchema(
            schema = @Schema(implementation = ModuleCountResp.class),
            arraySchema = @Schema(description = "按模块统计")
    )
    private List<ModuleCountResp> moduleStats;

    @ArraySchema(
            schema = @Schema(implementation = TrendPointResp.class),
            arraySchema = @Schema(description = "趋势数据")
    )
    private List<TrendPointResp> trends;

    @Schema(
            description = "操作人榜单，演示 anyOf：可能返回完整榜单项，也可能返回脱敏榜单项",
            anyOf = {OperatorRankResp.class, MaskedOperatorRankResp.class}
    )
    private Object topOperator;
}