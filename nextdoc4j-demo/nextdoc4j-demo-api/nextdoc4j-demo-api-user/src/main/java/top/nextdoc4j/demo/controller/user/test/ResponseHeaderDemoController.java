package top.nextdoc4j.demo.controller.user.test;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * 响应头演示：适用于 Java 17+、Spring Boot 3 与 springdoc-openapi 2.x。
 *
 * <p>注解声明接口文档，ResponseEntity 写入真实 HTTP 响应头。
 * scenario 仅用于切换演示分支；示例中的额度、版本和任务数据为固定演示值，
 * 不代表真实业务的限流额度、资源版本或任务状态。
 */
@Tag(name = "响应头示例")
@RestController
@RequestMapping("/design/reports")
public class ResponseHeaderDemoController {

    /**
     * 演示成功响应头、无响应体和限流响应头。
     *
     * @param id 导出任务标识。
     * @param scenario 演示场景：ready 返回 200，empty 返回 204，limited 返回 429。
     * @return 当前场景的 HTTP 状态、响应头和响应体。
     */
    @Operation(summary = "获取导出任务", description = "演示不同 HTTP 状态下的响应头定义与返回")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "导出任务已就绪",
            headers = {
                @Header(
                    name = "X-Request-Id",
                    description = "本次请求的追踪标识，排查问题时可提供此值",
                    schema = @Schema(type = "string", example = "req_20260911_001")
                ),
                @Header(
                    name = "X-RateLimit-Remaining",
                    description = "当前时间窗口内剩余的调用次数；此接口使用固定演示值",
                    schema = @Schema(type = "integer", format = "int32", minimum = "0", example = "59")
                ),
                @Header(
                    name = "ETag",
                    description = "资源版本标识；示例使用固定版本值",
                    schema = @Schema(type = "string", example = "\"report-v3\"")
                )
            },
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = ExportTaskResp.class)
            )
        ),
        @ApiResponse(
            responseCode = "204",
            description = "任务已完成，无需返回内容",
            content = @Content
        ),
        @ApiResponse(
            responseCode = "429",
            description = "请求过于频繁",
            headers = @Header(
                name = "Retry-After",
                description = "建议客户端等待的秒数",
                schema = @Schema(type = "integer", minimum = "1", example = "60")
            ),
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = ErrorResp.class)
            )
        )
    })
    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getReport(
        @Parameter(description = "导出任务标识", example = "export_1001")
        @PathVariable("id") String id,
        @Parameter(
            description = "用于切换示例，不是真实限流判断",
            schema = @Schema(allowableValues = {"ready", "empty", "limited"})
        )
        @RequestParam(value = "scenario", defaultValue = "ready") String scenario
    ) {
        if ("empty".equals(scenario)) {
            return ResponseEntity.noContent().build();
        }
        if ("limited".equals(scenario)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "60")
                .body(new ErrorResp("rate.limit", "请稍后重试", false));
        }

        String requestId = "req_" + UUID.randomUUID();
        ExportTaskResp body = new ExportTaskResp(
            id,
            "READY",
            "https://example.com/exports/report-1001.csv",
            900
        );
        return ResponseEntity.ok()
            .header("X-Request-Id", requestId)
            .header("X-RateLimit-Remaining", "59")
            .eTag("\"report-v3\"")
            .body(body);
    }

    @Schema(description = "导出任务结果")
    public record ExportTaskResp(
        @Schema(description = "导出任务标识", example = "export_1001",
            accessMode = Schema.AccessMode.READ_ONLY, requiredMode = Schema.RequiredMode.REQUIRED)
        String id,
        @Schema(description = "导出任务状态", example = "READY",
            allowableValues = {"READY", "PROCESSING"}, requiredMode = Schema.RequiredMode.REQUIRED)
        String status,
        @Schema(description = "临时下载地址，有效期为 15 分钟", format = "uri",
            example = "https://example.com/exports/report-1001.csv")
        String downloadUrl,
        @Schema(description = "下载地址有效期，单位为秒", minimum = "0", maximum = "900", example = "900")
        Integer expiresIn
    ) {
    }

    @Schema(description = "错误响应")
    public record ErrorResp(
        @Schema(description = "业务错误码", example = "rate.limit") String code,
        @Schema(description = "错误说明", example = "请稍后重试") String msg,
        @Schema(description = "是否成功", example = "false") Boolean success
    ) {
    }
}