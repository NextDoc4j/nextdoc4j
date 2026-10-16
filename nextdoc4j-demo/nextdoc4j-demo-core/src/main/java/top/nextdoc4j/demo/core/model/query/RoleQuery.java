package top.nextdoc4j.demo.core.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.RoleStatusType;

@Data
@Schema(description = "角色查询参数")
public class RoleQuery {

    @Schema(description = "角色名称，支持模糊查询", example = "管理员")
    private String name;

    @Schema(description = "角色编码，支持模糊查询", example = "ADMIN")
    private String code;

    @Schema(description = "角色状态", example = "1")
    private RoleStatusType status;

    @Schema(description = "当前页码，默认1", example = "1")
    private Integer pageNum = 1;

    @Schema(description = "每页记录数，默认10", example = "10")
    private Integer pageSize = 10;
}