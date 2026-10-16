package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import top.nextdoc4j.demo.core.model.base.TreeNode;

/**
 * 菜单树节点 —— 复现 issue #13。
 * <p>
 * 继承 {@link TreeNode}，泛型绑定为自身，使 {@code children} 成为 {@code List<MenuTreeNode>}，
 * 触发文档参数示例多层递归嵌套。
 *
 * @author echo
 * @see <a href="https://github.com/NextDoc4j/nextdoc4j/issues/13">#13</a>
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "菜单树节点")
public class MenuTreeNode extends TreeNode<MenuTreeNode> {

    @Schema(description = "路由路径", example = "/system/user")
    private String path;

    @Schema(description = "图标", example = "user")
    private String icon;

    @Schema(description = "排序号", example = "1")
    private Integer sort;
}
