package top.nextdoc4j.demo.controller.system.notification;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.enums.ResultCode;
import top.nextdoc4j.demo.core.model.base.PageResult;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.query.NotificationQuery;
import top.nextdoc4j.demo.core.model.req.NotificationReq;
import top.nextdoc4j.demo.core.model.resp.NotificationResp;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

/**
 * 通知管理控制器
 *
 * @author echo
 * @since 2025/09/15
 */
@Tag(name = "通知管理")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notification")
public class NotificationController {

    private final ScheduledExecutorService executor = Executors.newScheduledThreadPool(10);
    private final Map<String, SseEmitter> sseEmitters = new ConcurrentHashMap<>();

    @Operation(summary = "发送通知", description = "创建并发送一条新的通知消息")
    @PostMapping
    public R<NotificationResp> sendNotification(@RequestBody NotificationReq notificationReq) {
        NotificationResp notification = new NotificationResp();
        notification.setId(IdUtil.getSnowflakeNextId());
        notification.setTitle(notificationReq.getTitle());
        notification.setContent(notificationReq.getContent());
        notification.setType(notificationReq.getType());
        notification.setLevel(notificationReq.getLevel());
        notification.setTargetType(notificationReq.getTargetType());
        notification.setTargetId(notificationReq.getTargetId());
        notification.setStatus("SENT");
        notification.setRead(false);
        notification.setCreateTime(LocalDateTime.now());
        notification.setUpdateTime(LocalDateTime.now());

        // 模拟实时推送给在线用户
        broadcastNotification(notification);

        return R.ok(notification);
    }

    @Operation(summary = "批量发送通知", description = "批量创建并发送多条通知消息")
    @PostMapping("/batch")
    public R<List<NotificationResp>> sendNotificationsBatch(@RequestBody List<NotificationReq> notificationReqs) {
        List<NotificationResp> notifications = notificationReqs.stream()
                .map(req -> {
                    NotificationResp notification = new NotificationResp();
                    notification.setId(IdUtil.getSnowflakeNextId());
                    notification.setTitle(req.getTitle());
                    notification.setContent(req.getContent());
                    notification.setType(req.getType());
                    notification.setLevel(req.getLevel());
                    notification.setTargetType(req.getTargetType());
                    notification.setTargetId(req.getTargetId());
                    notification.setStatus("SENT");
                    notification.setRead(false);
                    notification.setCreateTime(LocalDateTime.now());
                    notification.setUpdateTime(LocalDateTime.now());
                    return notification;
                })
                .toList();

        // 批量推送
        notifications.forEach(this::broadcastNotification);

        return R.ok(notifications);
    }

    @Operation(summary = "获取用户通知列表", description = "分页获取指定用户的通知列表")
    @GetMapping("/user/{userId}")
    @Parameter(name = "userId", description = "用户ID", example = "1")
    public R<PageResult<NotificationResp>> getUserNotifications(@PathVariable Long userId,
                                                                NotificationQuery query) {
        if (userId <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        List<NotificationResp> notifications = CollUtil.newArrayList();
        String[] titles = {"系统维护通知", "密码安全提醒", "新功能上线", "数据备份完成", "账户异常登录"};
        String[] types = {"SYSTEM", "SECURITY", "FEATURE", "BACKUP", "ALERT"};
        String[] levels = {"INFO", "WARNING", "SUCCESS", "ERROR"};

        for (int i = 1; i <= query.getPageSize(); i++) {
            NotificationResp notification = new NotificationResp();
            long notificationId = (long) (query.getPageNum() - 1) * query.getPageSize() + i;
            notification.setId(notificationId);
            notification.setTitle(RandomUtil.randomEle(titles));
            notification.setContent("这是通知内容 " + notificationId);
            notification.setType(RandomUtil.randomEle(types));
            notification.setLevel(RandomUtil.randomEle(levels));
            notification.setTargetType("USER");
            notification.setTargetId(userId);
            notification.setStatus("SENT");
            notification.setRead(RandomUtil.randomBoolean());
            notification.setCreateTime(LocalDateTime.now().minusHours(RandomUtil.randomInt(1, 72)));
            notification.setUpdateTime(LocalDateTime.now());
            notifications.add(notification);
        }

        PageResult<NotificationResp> pageResult = new PageResult<>();
        pageResult.setRecords(notifications);
        pageResult.setTotal(200L);
        pageResult.setCurrent(query.getPageNum());
        pageResult.setSize(query.getPageSize());
        pageResult.setPages((long) Math.ceil(200.0 / query.getPageSize()));

        return R.ok(pageResult);
    }

    @ApiError(code = "notification.id.invalid", status = 400, reason = "通知ID无效")
    @ApiError(code = "notification.not.found", status = 404, reason = "通知不存在")
    @Operation(summary = "获取通知详情", description = "根据通知ID获取通知详细信息")
    @GetMapping("/{id}")
    @Parameter(name = "id", description = "通知ID", example = "1")
    public R<NotificationResp> getNotificationById(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        NotificationResp notification = new NotificationResp();
        notification.setId(id);
        notification.setTitle("系统通知 " + id);
        notification.setContent("这是一条重要的系统通知内容，请及时查看处理。");
        notification.setType("SYSTEM");
        notification.setLevel("INFO");
        notification.setTargetType("USER");
        notification.setTargetId(1L);
        notification.setStatus("SENT");
        notification.setRead(false);
        notification.setCreateTime(LocalDateTime.now().minusDays(1));
        notification.setUpdateTime(LocalDateTime.now());

        return R.ok(notification);
    }

    @Operation(summary = "标记通知为已读", description = "将指定的通知标记为已读状态")
    @PatchMapping("/{id}/read")
    @Parameter(name = "id", description = "通知ID", example = "1")
    public R<NotificationResp> markAsRead(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        NotificationResp notification = new NotificationResp();
        notification.setId(id);
        notification.setTitle("系统通知 " + id);
        notification.setContent("这是一条重要的系统通知内容。");
        notification.setType("SYSTEM");
        notification.setLevel("INFO");
        notification.setTargetType("USER");
        notification.setTargetId(1L);
        notification.setStatus("SENT");
        notification.setRead(true); // 标记为已读
        notification.setCreateTime(LocalDateTime.now().minusDays(1));
        notification.setUpdateTime(LocalDateTime.now());

        return R.ok(notification);
    }

    @Operation(summary = "批量标记已读", description = "批量将多个通知标记为已读状态")
    @PatchMapping("/read/batch")
    public R<Void> markAsReadBatch(@RequestBody List<Long> ids) {
        // 模拟批量标记已读操作
        return R.ok(null);
    }

    @Operation(summary = "删除通知", description = "根据通知ID删除通知")
    @Parameter(name = "id", description = "通知ID", example = "1")
    @DeleteMapping("/{id}")
    public R<Void> deleteNotification(@PathVariable Long id) {
        if (id <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        if (id == 999L) {
            return R.fail(ResultCode.NOT_FOUND);
        }

        return R.ok(null);
    }

    @Operation(summary = "批量删除通知", description = "根据通知ID列表批量删除通知")
    @DeleteMapping("/batch")
    public R<Void> deleteNotificationsBatch(@RequestBody
                                            @Schema(description = "要删除的通知ID列表", example = "[1, 2, 3, 4, 5]")
                                            List<Long> ids) {
        return R.ok(null);
    }

    @Operation(summary = "获取未读通知数量", description = "获取指定用户的未读通知数量")
    @Parameter(name = "userId", description = "用户ID", example = "1")
    @GetMapping("/user/{userId}/unread-count")
    public R<Long> getUnreadCount(@PathVariable Long userId) {
        if (userId <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        Long unreadCount = RandomUtil.randomLong(0, 50);
        return R.ok(unreadCount);
    }

    @ApiError(code = "notification.user.offline", status = 503, reason = "当前用户通知通道不可用")
    @Operation(summary = "实时通知推送", description = "建立SSE连接，实时推送通知消息")
    @Parameter(name = "userId", description = "用户ID", example = "1")
    @GetMapping(value = "/sse/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeNotifications(@PathVariable String userId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // 保存连接
        sseEmitters.put(userId, emitter);

        // 连接断开时清理
        emitter.onCompletion(() -> sseEmitters.remove(userId));
        emitter.onTimeout(() -> sseEmitters.remove(userId));
        emitter.onError(throwable -> sseEmitters.remove(userId));

        // 发送连接成功消息
        try {
            emitter.send(SseEmitter.event()
                    .id("connect")
                    .name("connected")
                    .data("连接成功，开始接收实时通知"));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @Operation(summary = "清空用户通知", description = "清空指定用户的所有通知")
    @Parameter(name = "userId", description = "用户ID", example = "1")
    @DeleteMapping("/user/{userId}/clear")
    public R<Void> clearUserNotifications(@PathVariable Long userId) {
        if (userId <= 0) {
            return R.fail(ResultCode.BAD_REQUEST);
        }

        return R.ok(null);
    }

    /**
     * 广播通知给在线用户
     */
    private void broadcastNotification(NotificationResp notification) {
        String targetUserId = notification.getTargetId().toString();
        SseEmitter emitter = sseEmitters.get(targetUserId);

        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .id(notification.getId().toString())
                        .name("notification")
                        .data(notification));
            } catch (IOException e) {
                sseEmitters.remove(targetUserId);
            }
        }
    }
}
