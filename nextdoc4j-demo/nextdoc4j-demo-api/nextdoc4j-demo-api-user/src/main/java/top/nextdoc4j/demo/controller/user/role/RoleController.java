package top.nextdoc4j.demo.controller.user.role;


import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.enums.ResultCode;
import top.nextdoc4j.demo.core.enums.RoleStatusType;
import top.nextdoc4j.demo.core.model.base.PageResult;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.query.RoleQuery;
import top.nextdoc4j.demo.core.model.req.RolePermissionReq;
import top.nextdoc4j.demo.core.model.req.RoleReq;
import top.nextdoc4j.demo.core.model.req.RoleUpdateReq;
import top.nextdoc4j.demo.core.model.req.UpdateMenusReq;
import top.nextdoc4j.demo.core.model.resp.PermissionResp;
import top.nextdoc4j.demo.core.model.resp.RoleDetailResp;
import top.nextdoc4j.demo.core.model.resp.RoleResp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 角色管理控制器
 *
 * @author echo
 * @since 2025/09/15
 */
@Slf4j
@Tag(
        name = "角色管理",
        description = "角色管理相关接口",
        extensions = @Extension(properties = @ExtensionProperty(name = "x-order", value = "1"))
)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/role")
public class RoleController {

    @Operation(summary = "新增角色", description = "创建一个新的系统角色",
            extensions = @Extension(properties = @ExtensionProperty(name = "x-order", value = "1")))
    @PostMapping
    public R<RoleResp> createRole(@RequestBody RoleReq roleReq) {
        RoleResp roleResp = BeanUtil.copyProperties(roleReq, RoleResp.class);
        roleResp.setId(IdUtil.getSnowflakeNextId());
        roleResp.setCreateTime(LocalDateTime.now());
        roleResp.setUpdateTime(LocalDateTime.now());
        return R.ok(roleResp);
    }

    @Operation(summary = "根据ID查询角色", description = "通过角色ID获取角色详细信息")
    @GetMapping("/{id}")
    public R<RoleResp> getRoleById(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        RoleResp role = new RoleResp();
        role.setId(id);
        role.setName("role_" + id);
        role.setCode("ROLE_" + id);
        role.setDescription("角色" + id + "的描述");
        role.setStatus(RoleStatusType.ACTIVE);
        role.setSort(id.intValue());
        role.setCreateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 100)));
        role.setUpdateTime(LocalDateTime.now());

        return R.ok(role);
    }

    @Operation(summary = "分页查询角色", description = "根据条件分页查询角色列表")
    @GetMapping("/page")
    public R<PageResult<RoleResp>> queryRoles(RoleQuery query) {
        List<RoleResp> roles = CollUtil.newArrayList();
        for (int i = 1; i <= query.getPageSize(); i++) {
            RoleResp role = new RoleResp();
            long roleId = (long) (query.getPageNum() - 1) * query.getPageSize() + i;
            role.setId(roleId);
            role.setName("role_" + roleId);
            role.setCode("ROLE_" + roleId);
            role.setDescription("角色" + roleId + "的描述信息");
            role.setStatus(RandomUtil.randomEle(List.of(RoleStatusType.ACTIVE, RoleStatusType.INACTIVE)));
            role.setSort((int) roleId);
            role.setCreateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 365)));
            role.setUpdateTime(LocalDateTime.now());
            roles.add(role);
        }

        PageResult<RoleResp> pageResult = new PageResult<>();
        pageResult.setRecords(roles);
        pageResult.setTotal(500L);
        pageResult.setCurrent(query.getPageNum());
        pageResult.setSize(query.getPageSize());
        pageResult.setPages((long) Math.ceil(500.0 / query.getPageSize()));

        return R.ok(pageResult);
    }

    @Operation(summary = "获取所有角色", description = "获取所有启用状态的角色列表，用于下拉选择")
    @GetMapping("/list")
    public R<List<RoleResp>> getAllRoles() {
        List<RoleResp> roles = CollUtil.newArrayList();
        String[] roleNames = {"管理员", "普通用户", "访客", "审计员", "运营"};
        String[] roleCodes = {"ADMIN", "USER", "GUEST", "AUDITOR", "OPERATOR"};

        for (int i = 0; i < roleNames.length; i++) {
            RoleResp role = new RoleResp();
            role.setId((long) (i + 1));
            role.setName(roleNames[i]);
            role.setCode(roleCodes[i]);
            role.setDescription(roleNames[i] + "角色");
            role.setStatus(RoleStatusType.ACTIVE);
            role.setSort(i + 1);
            role.setCreateTime(LocalDateTime.now().minusDays(100));
            role.setUpdateTime(LocalDateTime.now());
            roles.add(role);
        }

        return R.ok(roles);
    }

    @Operation(summary = "更新角色", description = "根据角色ID更新角色信息")
    @PutMapping("/{id}")
    public R<RoleResp> updateRole(@PathVariable Long id, @RequestBody RoleUpdateReq updateReq) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        RoleResp role = new RoleResp();
        role.setId(id);
        role.setName(updateReq.getName());
        role.setCode(updateReq.getCode());
        role.setDescription(updateReq.getDescription());
        role.setStatus(updateReq.getStatus());
        role.setSort(updateReq.getSort());
        role.setCreateTime(LocalDateTime.now().minusDays(30));
        role.setUpdateTime(LocalDateTime.now());

        return R.ok(role);
    }

    @ApiError(code = "role.id.invalid", status = 400, reason = "角色ID无效")
    @ApiError(code = "role.not.found", status = 404, reason = "角色不存在")
    @ApiError(code = "role.user.bound", status = 409, reason = "该角色下存在用户，无法删除")
    @Operation(summary = "删除角色", description = "根据角色ID删除角色")
    @DeleteMapping("/{id}")
    public R<Void> deleteRole(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        // 检查是否有用户关联此角色
        if (id == 1L) {
            return R.fail("409", "该角色下存在用户，无法删除");
        }

        return R.ok(null);
    }

    @ApiError(code = "role.user.bound.batch", status = 409, reason = "批量删除中包含有用户关联的角色，删除失败")
    @Operation(summary = "批量删除角色", description = "根据角色ID列表批量删除角色")
    @DeleteMapping("/batch")
    public R<Void> deleteRolesBatch(@RequestBody List<Long> ids) {
        // 模拟批量删除逻辑，检查是否有不可删除的角色
        if (ids.contains(1L)) {
            return R.fail("409", "批量删除中包含有用户关联的角色，删除失败");
        }
        return R.ok(null);
    }

    @Operation(summary = "分配角色权限", description = "为指定角色分配权限")
    @PostMapping("/{id}/permissions")
    public R<Void> assignPermissions(@PathVariable Long id,
                                     @RequestBody RolePermissionReq permissionReq) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        return R.ok(null);
    }

    @Operation(summary = "获取角色权限", description = "获取指定角色的权限列表")
    @GetMapping("/{id}/permissions")
    public R<List<PermissionResp>> getRolePermissions(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        List<PermissionResp> permissions = CollUtil.newArrayList();
        String[] permissionNames = {"用户管理", "角色管理", "权限管理", "系统配置", "数据统计"};
        String[] permissionCodes = {"user:manage", "role:manage", "permission:manage", "system:config", "data:statistics"};

        for (int i = 0; i < permissionNames.length; i++) {
            PermissionResp permission = new PermissionResp();
            permission.setId((long) (i + 1));
            permission.setName(permissionNames[i]);
            permission.setCode(permissionCodes[i]);
            permission.setType("MENU");
            permission.setParentId(0L);
            permission.setPath("/admin/" + permissionCodes[i].split(":")[0]);
            permission.setSort(i + 1);
            permission.setStatus("ACTIVE");
            permissions.add(permission);
        }

        return R.ok(permissions);
    }

    @Operation(summary = "启用/禁用角色", description = "切换角色状态")
    @PatchMapping("/{id}/toggle-status")
    public R<RoleResp> toggleRoleStatus(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        RoleResp role = new RoleResp();
        role.setId(id);
        role.setName("role_" + id);
        role.setCode("ROLE_" + id);
        role.setDescription("角色" + id + "的描述");
        role.setStatus(RoleStatusType.INACTIVE); // 切换状态
        role.setSort(id.intValue());
        role.setCreateTime(LocalDateTime.now().minusDays(30));
        role.setUpdateTime(LocalDateTime.now());

        return R.ok(role);
    }


    /**
     * 更新角色菜单权限
     */
    @Operation(summary = "更新角色菜单权限")
    @PutMapping("/menus-update")
    public void updateMenus(@RequestBody @Valid UpdateMenusReq request) {
        log.info("更新角色菜单权限: {}", request);
    }

    /**
     * 获取角色详细信息列表
     */
    @Operation(summary = "获取角色详细信息列表")
    @GetMapping("/list-detail")
    public List<RoleDetailResp> getRoleList() {
        return List.of(RoleDetailResp.builder().name("role_1").code("ROLE_1").description("角色1的描述").build());
    }
}
