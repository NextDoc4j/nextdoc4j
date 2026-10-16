package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import top.nextdoc4j.demo.core.enums.RoleStatusType;

@Data
@Schema(description = "角色更新请求参数")
public class RoleUpdateReq {

    @Size(min = 2, max = 50)
    @Schema(description = "角色名称", example = "管理员")
    private String name;

    @Pattern(regexp = "^[A-Z_]+$", message = "角色编码只能包含大写字母和下划线")
    @Size(min = 2, max = 50)
    @Schema(description = "角色编码", example = "ADMIN")
    private String code;

    @Size(max = 200)
    @Schema(description = "角色描述", example = "系统管理员角色")
    private String description;

    @Pattern(regexp = "^([1|2])$")
    @Schema(description = "角色状态", example = "1")
    private RoleStatusType status;

    @Min(1)
    @Max(999)
    @Schema(description = "排序号", example = "1")
    private Integer sort;
}