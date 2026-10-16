package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Schema(description = "数据变更日志内容")
public class DataChangeOperateContentReq {

    @Schema(description = "内容类型", example = "DATA_CHANGE", requiredMode = Schema.RequiredMode.REQUIRED)
    private String type;

    @Schema(description = "实体名", example = "Order")
    private String entityName;

    @Schema(description = "实体ID", example = "50001")
    private String entityId;

    @Schema(description = "操作类型", example = "UPDATE", allowableValues = {"CREATE", "UPDATE", "DELETE"})
    private String changeType;

    @ArraySchema(
            schema = @Schema(implementation = FieldChangeItemReq.class),
            arraySchema = @Schema(description = "字段变更项")
    )
    private List<FieldChangeItemReq> fieldChanges;

    @Schema(description = "变更前快照", example = "{\"status\":\"INIT\",\"amount\":100}")
    private Map<String, Object> beforeSnapshot;

    @Schema(description = "变更后快照", example = "{\"status\":\"PAID\",\"amount\":100}")
    private Map<String, Object> afterSnapshot;
}