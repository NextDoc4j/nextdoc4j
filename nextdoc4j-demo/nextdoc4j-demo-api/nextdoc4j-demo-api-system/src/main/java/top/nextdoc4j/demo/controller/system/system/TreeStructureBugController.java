package top.nextdoc4j.demo.controller.system.system;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.resp.MenuTreeNode;

import java.util.Collections;
import java.util.List;

/**
 * 复现 issue #13：树结构参数示例会生成很多层。
 * <p>
 * 响应/请求体使用 {@link MenuTreeNode}（{@code extends TreeNode<MenuTreeNode>}），
 * 文档生成时 children 会递归嵌套多层。期望：children 嵌套时只渲染一层，内层 children 为空数组。
 *
 * @author echo
 * @see <a href="https://github.com/NextDoc4j/nextdoc4j/issues/13">#13</a>
 */
@Tag(name = "树结构示例", description = "复现参数示例遇到树结构会生成很多层的问题")
@RestController
@RequestMapping("/api/system/tree-bug")
public class TreeStructureBugController {

    @Operation(summary = "获取菜单树", description = "返回自引用树结构，用于复现文档 example 多层嵌套")
    @GetMapping("/menus")
    public R<List<MenuTreeNode>> getMenuTree() {
        MenuTreeNode root = new MenuTreeNode();
        root.setId(1L);
        root.setParentId(0L);
        root.setName("系统管理");
        root.setPath("/system");
        root.setIcon("setting");
        root.setSort(1);
        root.setChildren(Collections.emptyList());
        return R.ok(List.of(root));
    }

    @Operation(summary = "保存菜单树", description = "请求体为自引用树结构，用于复现请求参数 example 多层嵌套")
    @PostMapping("/menus")
    public R<MenuTreeNode> saveMenuTree(@RequestBody MenuTreeNode menuTree) {
        return R.ok(menuTree);
    }
}
