package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "模块统计")
public class ModuleCountResp {

    @Schema(description = "模块编码", example = "ORDER")
    private String module;

    @Schema(description = "模块名称", example = "订单模块")
    private String moduleName;

    @Schema(description = "数量", example = "3500")
    private Long count;
}