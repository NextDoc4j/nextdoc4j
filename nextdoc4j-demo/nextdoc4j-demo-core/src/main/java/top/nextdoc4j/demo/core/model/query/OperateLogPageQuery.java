package top.nextdoc4j.demo.core.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import top.nextdoc4j.demo.core.model.base.PageQuery;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(
        description = "操作日志分页查询",
        allOf = {PageQuery.class}
)
public class OperateLogPageQuery extends PageQuery {

    @Schema(description = "日志ID", example = "18990010001")
    private Long id;

    @Schema(description = "模块编码", example = "ORDER", allowableValues = {"AUTH", "ORDER", "USER", "APPROVAL", "FILE", "SYSTEM"})
    private String module;

    @Schema(description = "业务类型", example = "CREATE_ORDER", allowableValues = {
            "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "EXPORT", "IMPORT", "APPROVE", "REJECT", "REPLAY"
    })
    private String bizType;

    @Schema(description = "是否成功", example = "true")
    private Boolean success;

    @Schema(description = "操作人ID", example = "10001")
    private Long operatorId;

    @Schema(description = "操作人姓名", example = "张三")
    private String operatorName;

    @Schema(description = "操作人类型", example = "USER", allowableValues = {"USER", "ADMIN", "SYSTEM", "THIRD_PARTY"})
    private String operatorType;

    @Schema(description = "租户ID", example = "2001")
    private Long tenantId;

    @Schema(description = "组织ID", example = "3001")
    private Long orgId;

    @Schema(description = "请求ID", example = "REQ-20260413-0001")
    private String requestId;

    @Schema(description = "链路ID", example = "TRACE-20260413-0001")
    private String traceId;

    @Schema(description = "客户端IP", example = "192.168.1.10")
    private String ip;

    @Schema(description = "地区", example = "浙江省杭州市")
    private String region;

    @Schema(description = "HTTP方法", example = "POST", allowableValues = {"GET", "POST", "PUT", "DELETE", "PATCH"})
    private String httpMethod;

    @Schema(description = "请求URI", example = "/api/orders")
    private String requestUri;

    @Schema(description = "HTTP状态码", example = "200")
    private Integer httpStatus;

    @Schema(description = "耗时下限(ms)", example = "100")
    private Long durationMsMin;

    @Schema(description = "耗时上限(ms)", example = "2000")
    private Long durationMsMax;

    @Schema(description = "开始时间", type = "string", format = "date-time", example = "2026-04-01T00:00:00")
    private LocalDateTime startTime;

    @Schema(description = "结束时间", type = "string", format = "date-time", example = "2026-04-13T23:59:59")
    private LocalDateTime endTime;

    @Schema(description = "标签列表", example = "[\"敏感操作\",\"风控关注\"]")
    private List<String> tags;

    @Schema(
            description = "模糊关键字，可匹配请求ID/链路ID/操作人/URI",
            example = "TRACE-20260413"
    )
    private String keyword;
}