package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Schema(description = "数据变更日志内容")
public class DataChangeOperateContentResp {

    @Schema(description = "内容类型", example = "DATA_CHANGE")
    private String type;

    @Schema(description = "实体名", example = "Order")
    private String entityName;

    @Schema(description = "实体ID", example = "50001")
    private String entityId;

    @Schema(description = "操作类型", example = "UPDATE")
    private String changeType;

    @ArraySchema(
            schema = @Schema(implementation = FieldChangeItemResp.class),
            arraySchema = @Schema(description = "字段变更项")
    )
    private List<FieldChangeItemResp> fieldChanges;

    @Schema(description = "变更前快照")
    private Map<String, Object> beforeSnapshot;

    @Schema(description = "变更后快照")
    private Map<String, Object> afterSnapshot;
}