package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "角色菜单更新参数")
public class UpdateMenusReq implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "角色ID")
    @NotNull(message = "不能为空")
    private Long roleId;

    @Schema(description = "菜单列表")
    @Valid
    @NotNull(message = "不能为空")
    private List<@NotNull(message = "不能为空") Menu> menus;

    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "菜单权限信息")
    public static class Menu implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        @Schema(description = "菜单id")
        @NotNull(message = "不能为空")
        private Long menuId;

        @Schema(description = "数据权限值，含义由 Menu.scopeType 决定")
        @NotNull(message = "不能为空")
        private Integer scope;
    }
}