package top.nextdoc4j.demo.core.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "日志分析查询")
public class OperateLogAnalysisQuery {

    @Schema(description = "开始日期", type = "string", format = "date", example = "2026-04-01")
    private LocalDate startDate;

    @Schema(description = "结束日期", type = "string", format = "date", example = "2026-04-13")
    private LocalDate endDate;

    @Schema(description = "模块编码", example = "ORDER")
    private String module;

    @Schema(description = "是否按天聚合", example = "true")
    private Boolean groupByDay = true;

    @Schema(description = "是否只统计失败日志", example = "false")
    private Boolean onlyFailed = false;
}