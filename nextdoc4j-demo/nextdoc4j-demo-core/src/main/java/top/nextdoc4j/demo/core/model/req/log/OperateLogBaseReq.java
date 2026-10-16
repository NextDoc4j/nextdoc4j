package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "补录日志基础请求")
public class OperateLogBaseReq {

    @Schema(description = "模块编码", example = "ORDER", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String module;

    @Schema(description = "业务类型", example = "CREATE_ORDER", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String bizType;

    @Schema(description = "是否成功", example = "true", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Boolean success;

    @Schema(description = "租户ID", example = "2001")
    private Long tenantId;

    @Schema(description = "组织ID", example = "3001")
    private Long orgId;

    @Schema(description = "业务编号", example = "ORD202604130001")
    private String bizNo;

    @Schema(description = "业务ID", example = "50001")
    private Long bizId;

    @Schema(description = "请求ID", example = "REQ-20260413-0001")
    private String requestId;

    @Schema(description = "链路ID", example = "TRACE-20260413-0001")
    private String traceId;

    @Schema(description = "客户端IP", example = "192.168.1.10")
    private String ip;

    @Schema(description = "地区", example = "浙江省杭州市")
    private String region;

    @Schema(description = "User-Agent", example = "Mozilla/5.0")
    private String userAgent;

    @Schema(description = "请求URI", example = "/api/orders")
    private String requestUri;

    @Schema(description = "HTTP方法", example = "POST", allowableValues = {"GET", "POST", "PUT", "DELETE", "PATCH"})
    private String httpMethod;

    @Schema(description = "HTTP状态码", example = "200")
    private Integer httpStatus;

    @Schema(description = "耗时(ms)", example = "123")
    private Long durationMs;

    @Schema(description = "错误码", example = "ORDER_001")
    private String errorCode;

    @Schema(description = "错误信息", example = "订单库存不足")
    private String errorMsg;

    @Schema(description = "操作时间", type = "string", format = "date-time", example = "2026-04-13T10:20:30")
    private LocalDateTime occurredAt;

    @Schema(description = "操作人ID", example = "10001")
    private Long operatorId;

    @Schema(description = "操作人姓名", example = "张三")
    private String operatorName;

    @Schema(description = "操作人类型", example = "USER", allowableValues = {"USER", "ADMIN", "SYSTEM", "THIRD_PARTY"})
    private String operatorType;
}