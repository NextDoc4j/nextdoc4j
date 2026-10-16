package top.nextdoc4j.demo.core.model.base;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * 树节点基类 —— 复现 issue #13：参数示例遇到树结构会生成很多层。
 * <p>
 * 子类以自身作为泛型参数（如 {@code MenuTreeNode extends TreeNode<MenuTreeNode>}），
 * 导致 children 字段类型递归指向自身，示例生成时无限/多层嵌套。
 *
 * @param <T> 子节点类型
 * @author echo
 * @see <a href="https://github.com/NextDoc4j/nextdoc4j/issues/13">#13</a>
 */
@Data
@Schema(description = "树节点基类")
public abstract class TreeNode<T extends TreeNode<T>> {

    @Schema(description = "节点 ID", example = "1")
    private Long id;

    @Schema(description = "父节点 ID", example = "0")
    private Long parentId;

    @Schema(description = "节点名称", example = "根节点")
    private String name;

    @Schema(description = "子节点列表")
    private List<T> children;
}
