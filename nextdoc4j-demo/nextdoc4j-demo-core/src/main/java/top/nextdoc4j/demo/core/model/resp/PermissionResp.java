package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "权限响应参数")
public class PermissionResp {

    @Schema(description = "权限ID", example = "1")
    private Long id;

    @Schema(description = "权限名称", example = "用户管理")
    private String name;

    @Schema(description = "权限编码", example = "user:manage")
    private String code;

    @Schema(description = "权限类型", example = "MENU", allowableValues = {"MENU", "BUTTON", "API"})
    private String type;

    @Schema(description = "父权限ID", example = "0")
    private Long parentId;

    @Schema(description = "权限路径", example = "/admin/user")
    private String path;

    @Schema(description = "权限图标", example = "user-o")
    private String icon;

    @Schema(description = "排序号", example = "1")
    private Integer sort;

    @Schema(description = "权限状态", example = "ACTIVE", allowableValues = {"ACTIVE", "INACTIVE"})
    private String status;

    @Schema(description = "权限描述", example = "用户管理相关权限")
    private String description;
}