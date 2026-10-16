package top.nextdoc4j.demo.controller.user.user;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.enums.ResultCode;
import top.nextdoc4j.demo.core.enums.StatusType;
import top.nextdoc4j.demo.core.model.base.PageResult;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.query.UserQuery;
import top.nextdoc4j.demo.core.model.req.RoleReq;
import top.nextdoc4j.demo.core.model.req.UserBatchReq;
import top.nextdoc4j.demo.core.model.req.UserReq;
import top.nextdoc4j.demo.core.model.req.UserUpdateReq;
import top.nextdoc4j.demo.core.model.resp.UserResp;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 用户控制器
 *
 * @author echo
 * @date 2025/09/16
 */
@Tag(
        name = "用户管理",
        description = "用户管理相关接口",
        extensions = @Extension(properties = @ExtensionProperty(name = "x-order", value = "2"))
)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user")
public class UserController {


    @ApiError(code = "error", status = 400, reason = "测试错误")
    @ApiError(code = "username.exist", status = 409, reason = "用户名已存在")
    @SaCheckPermission(value = {"user-add", "user-all", "user-delete"}, mode = SaMode.OR, orRole = "admin")
    @Operation(summary = "新增用户", description = "创建一个新的用户账户")
    @PostMapping
    public R<UserResp> createUser(@RequestBody UserReq userReq) {
        UserResp userResp = BeanUtil.copyProperties(userReq, UserResp.class);
        userResp.setId(IdUtil.getSnowflakeNextId());
        userResp.setStatus(StatusType.ACTIVE);
        userResp.setCreateTime(LocalDateTime.now());
        userResp.setUpdateTime(LocalDateTime.now());
        return R.ok(userResp);
    }

    /**
     * 批量新增用户（对象包装方式）
     * <p>
     * 示例请求体：
     * {
     * "users": [
     * { "username": "Alice", "email": "alice@test.com" },
     * { "username": "Bob", "email": "bob@test.com" }
     * ]
     * }
     */
    @Operation(
            summary = "批量新增用户（对象包装）",
            description = """
                    批量创建多个用户账户。
                    入参使用对象封装格式（UserBatchReq），包含一个 users 列表字段。
                    适合在请求中需要附带额外元数据时使用（如操作人、来源等）。
                    """
    )
    @PostMapping("/batch-object")
    public R<List<UserResp>> createUsersBatchByObject(@RequestBody UserBatchReq batchReq) {
        List<UserResp> users = batchReq.getUsers().stream()
                .map(userReq -> {
                    UserResp userResp = BeanUtil.copyProperties(userReq, UserResp.class);
                    userResp.setId(IdUtil.getSnowflakeNextId());
                    userResp.setStatus(StatusType.ACTIVE);
                    userResp.setCreateTime(LocalDateTime.now());
                    userResp.setUpdateTime(LocalDateTime.now());
                    return userResp;
                })
                .toList();
        return R.ok(users);
    }

    /**
     * 批量新增用户（直接数组方式）
     * <p>
     * 示例请求体：
     * [
     * { "username": "Alice", "email": "alice@test.com" },
     * { "username": "Bob", "email": "bob@test.com" }
     * ]
     */
    @Operation(
            summary = "批量新增用户（直接数组）",
            description = """
                    批量创建多个用户账户。
                    入参为用户对象数组，适用于简洁的前端批量创建请求。
                    与 /batch-object 功能一致，仅请求结构不同。
                    """
    )
    @PostMapping("/batch-array")
    public R<List<UserResp>> createUsersBatchByArray(@RequestBody List<UserReq> batchReq) {
        List<UserResp> users = batchReq.stream()
                .map(userReq -> {
                    UserResp userResp = BeanUtil.copyProperties(userReq, UserResp.class);
                    userResp.setId(IdUtil.getSnowflakeNextId());
                    userResp.setStatus(StatusType.ACTIVE);
                    userResp.setCreateTime(LocalDateTime.now());
                    userResp.setUpdateTime(LocalDateTime.now());
                    return userResp;
                })
                .toList();
        return R.ok(users);
    }


    @Operation(summary = "根据 ID 查询用户", description = "通过用户 ID 获取用户详细信息")
    @GetMapping("/{id}")
    public R<UserResp> getUserById(@PathVariable @Max(value = 999L, message = "id 不能大于 999") Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        UserResp user = new UserResp();
        user.setId(id);
        user.setUsername("user_" + id);
        user.setEmail("user" + id + "@nextdoc4j.top");
        user.setAge(25);
        user.setPhone("138" + String.format("%08d", id));
        user.setStatus(StatusType.ACTIVE);
        user.setCreateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 100)));
        user.setUpdateTime(LocalDateTime.now());

        return R.ok(user);
    }

    @Operation(
            summary = "根据用户状态查询用户信息",
            description = "通过用户状态查询用户信息示例（仅返回一条模拟数据）"
    )
    @GetMapping("/status/{status}")
    public R<UserResp> getUserByStatusPath(@PathVariable StatusType status) {

        if (status == null) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (StatusType.INACTIVE.equals(status)) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        UserResp user = new UserResp();
        user.setId(1001L);
        user.setUsername("user_" + status.name().toLowerCase());
        user.setEmail("user_" + status.name().toLowerCase() + "@nextdoc4j.top");
        user.setAge(25);
        user.setPhone("13800001234");
        user.setStatus(status);
        user.setCreateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 100)));
        user.setUpdateTime(LocalDateTime.now());

        return R.ok(user);
    }

    @Operation(
            summary = "根据用户状态查询用户信息",
            description = "通过用户状态（query 参数）查询用户信息"
    )
    @GetMapping("/status")
    public R<UserResp> getUserByStatusQuery(
            @RequestParam StatusType status
    ) {

        if (StatusType.INACTIVE.equals(status)) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        UserResp user = new UserResp();
        user.setId(1002L);
        user.setUsername("user_" + status.name().toLowerCase());
        user.setEmail("user_" + status.name().toLowerCase() + "@nextdoc4j.top");
        user.setAge(26);
        user.setPhone("13800005678");
        user.setStatus(status);
        user.setCreateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 100)));
        user.setUpdateTime(LocalDateTime.now());

        return R.ok(user);
    }

    @Operation(summary = "分页查询用户", description = "根据条件分页查询用户列表，支持用户名和邮箱模糊查询")
    @GetMapping("/page")
    public R<PageResult<UserResp>> queryUsers(UserQuery query) {
        List<UserResp> users = CollUtil.newArrayList();
        for (int i = 1; i <= query.getPageSize(); i++) {
            UserResp user = new UserResp();
            long userId = (long) (query.getPageNum() - 1) * query.getPageSize() + i;
            user.setId(userId);
            user.setUsername("user_" + userId);
            user.setEmail("user" + userId + "@nextdoc4j.top");
            user.setAge(RandomUtil.randomInt(18, 65));
            user.setPhone("138" + String.format("%08d", userId));
            user.setStatus(RandomUtil.randomEle(List.of(StatusType.ACTIVE, StatusType.INACTIVE, StatusType.PENDING)));
            user.setCreateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 365)));
            user.setUpdateTime(LocalDateTime.now());
            users.add(user);
        }

        PageResult<UserResp> pageResult = new PageResult<>();
        pageResult.setRecords(users);
        pageResult.setTotal(1000L);
        pageResult.setCurrent(query.getPageNum());
        pageResult.setSize(query.getPageSize());
        pageResult.setPages((long) Math.ceil(1000.0 / query.getPageSize()));

        return R.ok(pageResult);
    }

    @SaCheckRole(value = {"admin", "test"})
    @Operation(summary = "更新用户", description = "根据用户ID更新用户信息")
    @PutMapping("/{id}")
    public R<UserResp> updateUser(@PathVariable Long id, @RequestBody UserUpdateReq updateReq) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        UserResp user = new UserResp();
        user.setId(id);
        user.setUsername(updateReq.getUsername());
        user.setEmail(updateReq.getEmail());
        user.setAge(updateReq.getAge());
        user.setPhone(updateReq.getPhone());
        user.setStatus(updateReq.getStatus());
        user.setCreateTime(LocalDateTime.now().minusDays(30));
        user.setUpdateTime(LocalDateTime.now());

        return R.ok(user);
    }

    @Operation(summary = "删除用户", description = "根据用户ID删除用户")
    @DeleteMapping("/{id}")
    public R<Void> deleteUser(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        return R.ok(null);
    }

    @Operation(summary = "批量删除用户", description = "根据用户ID列表批量删除用户")
    @DeleteMapping("/batch")
    public R<Void> deleteUsersBatch(@RequestBody List<Long> ids) {
        // 模拟批量删除逻辑
        return R.ok(null);
    }



    @Operation(summary = "导出用户数据", description = "导出用户数据为 CSV 文件")
    @GetMapping("/export")
    public byte[] exportUsers(UserQuery query) {
        String csvContent = "ID,用户名,邮箱,年龄,手机号,状态,创建时间\n" +
                "1,user_1,user1@nextdoc4j.top,25,13800000001,ACTIVE,2024-01-01 12:00:00\n" +
                "2,user_2,user2@nextdoc4j.top,30,13800000002,ACTIVE,2024-01-02 12:00:00\n";

        return csvContent.getBytes();
    }

    @Operation(summary = "启用/禁用用户", description = "切换用户状态")
    @PatchMapping("/{id}/toggle-status")

    public R<UserResp> toggleUserStatus(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        UserResp user = new UserResp();
        user.setId(id);
        user.setUsername("user_" + id);
        user.setEmail("user" + id + "@nextdoc4j.top");
        user.setAge(25);
        user.setPhone("138" + String.format("%08d", id));
        user.setStatus(StatusType.ACTIVE); // 切换状态
        user.setCreateTime(LocalDateTime.now().minusDays(30));
        user.setUpdateTime(LocalDateTime.now());

        return R.ok(user);
    }
}
