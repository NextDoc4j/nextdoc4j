package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
@Schema(description = "角色权限分配请求参数")
public class RolePermissionReq {

    @NotEmpty
    @Schema(description = "权限ID列表")
    private Set<Long> permissionIds;
}