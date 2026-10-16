package top.nextdoc4j.demo.controller.user.sse;

import cn.hutool.core.util.RandomUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import top.nextdoc4j.demo.core.enums.StatusType;
import top.nextdoc4j.demo.core.model.resp.UserResp;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 *
 * @author echo
 * @since 2026/07/09 10:25
 **/
@Tag(
        name = "SSE测试",
        description = "SSE测试相关接口",
        extensions = @Extension(properties = @ExtensionProperty(name = "x-order", value = "3"))
)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sse")
public class SseTestController {

    private final ScheduledExecutorService executor = Executors.newScheduledThreadPool(10);


    @Operation(summary = "用户数据 SSE 推送", description = "实时推送用户数据变更，使用 Server-Sent Events")
    @GetMapping(value = "/user", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUsers() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        executor.schedule(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    UserResp user = new UserResp();
                    user.setId((long) i);
                    user.setUsername("sse_user_" + i);
                    user.setEmail("sse_user" + i + "@nextdoc4j.top");
                    user.setAge(RandomUtil.randomInt(18, 65));
                    user.setStatus(StatusType.ACTIVE);
                    user.setCreateTime(LocalDateTime.now());
                    user.setUpdateTime(LocalDateTime.now());

                    emitter.send(SseEmitter.event()
                            .id(String.valueOf(i))
                            .name("user-data")
                            .data(user));

                    Thread.sleep(1000);
                }
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.completeWithError(e);
            }
        }, 0, TimeUnit.SECONDS);

        return emitter;
    }

    @Operation(summary = "文本进度 SSE", description = "推送纯文本进度消息")
    @GetMapping(value = "/text", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamText() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        executor.schedule(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    emitter.send(SseEmitter.event()
                            .id(String.valueOf(i))
                            .name("progress")
                            .data("正在处理第 " + i + " 步，共 5 步"));
                    Thread.sleep(1000);
                }
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.completeWithError(e);
            }
        }, 0, TimeUnit.SECONDS);
        return emitter;
    }

    @Operation(summary = "默认消息 SSE", description = "不指定 event 名，走默认 message")
    @GetMapping(value = "/plain", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamPlain() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        executor.schedule(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    emitter.send(SseEmitter.event().data("tick-" + i));
                    Thread.sleep(800);
                }
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.completeWithError(e);
            }
        }, 0, TimeUnit.SECONDS);
        return emitter;
    }

    @Operation(summary = "AI 逐字流 SSE", description = "高频推送短文本片段，模拟大模型输出")
    @GetMapping(value = "/tokens", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTokens() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        String[] tokens = "你 好 ， 这是 一 段 流 式 输出 的 演 示 文 本 。".split(" ");
        executor.schedule(() -> {
            try {
                for (int i = 0; i < tokens.length; i++) {
                    emitter.send(SseEmitter.event()
                            .id(String.valueOf(i + 1))
                            .name("token")
                            .data(tokens[i]));
                    Thread.sleep(200);
                }
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.completeWithError(e);
            }
        }, 0, TimeUnit.SECONDS);
        return emitter;
    }

    @Operation(summary = "中途异常 SSE", description = "推送几条后主动报错结束")
    @GetMapping(value = "/error", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamError() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        executor.schedule(() -> {
            try {
                for (int i = 1; i <= 3; i++) {
                    emitter.send(SseEmitter.event()
                            .id(String.valueOf(i))
                            .name("data")
                            .data("正常数据 " + i));
                    Thread.sleep(1000);
                }
                // 关键：把错误作为一条 SE 事件推给前端，而不是 completeWithError
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("模拟服务端异常"));
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.complete();
            }
        }, 0, TimeUnit.SECONDS);
        return emitter;
    }
}
