package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.RoleStatusType;

import java.time.LocalDateTime;

@Data
@Schema(description = "角色响应参数")
public class RoleResp {

    @Schema(description = "角色ID", example = "1")
    private Long id;

    @Schema(description = "角色名称", example = "管理员")
    private String name;

    @Schema(description = "角色编码", example = "ADMIN")
    private String code;

    @Schema(description = "角色描述", example = "系统管理员角色")
    private String description;

    @Schema(description = "角色状态", example = "1")
    private RoleStatusType status;

    @Schema(description = "排序号", example = "1")
    private Integer sort;

    @Schema(description = "创建时间", example = "2024-01-01T12:00:00")
    private LocalDateTime createTime;

    @Schema(description = "更新时间", example = "2024-01-01T12:00:00")
    private LocalDateTime updateTime;
}