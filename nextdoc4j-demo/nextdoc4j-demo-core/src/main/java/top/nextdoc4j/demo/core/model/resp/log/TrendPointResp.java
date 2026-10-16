package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "趋势点")
public class TrendPointResp {

    @Schema(description = "日期", example = "2026-04-13")
    private String date;

    @Schema(description = "总数", example = "1200")
    private Long total;

    @Schema(description = "失败数", example = "12")
    private Long fail;
}