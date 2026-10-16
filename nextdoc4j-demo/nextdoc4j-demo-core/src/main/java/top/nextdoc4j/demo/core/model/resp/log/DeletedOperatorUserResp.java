package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "已删除操作人快照")
public class DeletedOperatorUserResp {

    @Schema(description = "原用户ID", example = "10001")
    private Long originalUserId;

    @Schema(description = "原用户名", example = "zhangsan")
    private String originalUsername;

    @Schema(description = "展示名", example = "张三(已删除)")
    private String displayName;

    @Schema(description = "删除标记", example = "true")
    private Boolean deleted = true;
}