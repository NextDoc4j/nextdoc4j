package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "字段变更项")
public class FieldChangeItemReq {

    @Schema(description = "字段名", example = "status")
    private String field;

    @Schema(description = "字段中文名", example = "订单状态")
    private String fieldLabel;

    @Schema(description = "变更前值", example = "INIT")
    private Object beforeValue;

    @Schema(description = "变更后值", example = "PAID")
    private Object afterValue;

    @Schema(description = "是否敏感字段", example = "false")
    private Boolean sensitive;
}