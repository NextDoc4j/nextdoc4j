package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import top.nextdoc4j.demo.core.model.query.NotificationQuery;

import java.time.LocalDateTime;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(
        description = "操作日志详情",
        allOf = {NotificationQuery.class}
)
public class OperateLogDetailResp extends OperateLogSimpleResp {

    @Schema(description = "租户ID", example = "2001")
    private Long tenantId;

    @Schema(description = "组织ID", example = "3001")
    private Long orgId;

    @Schema(description = "业务ID", example = "50001")
    private Long bizId;

    @Schema(description = "请求ID", example = "REQ-20260413-0001")
    private String requestId;

    @Schema(description = "链路ID", example = "TRACE-20260413-0001")
    private String traceId;

    @Schema(description = "地区", example = "浙江省杭州市")
    private String region;

    @Schema(description = "User-Agent", example = "Mozilla/5.0")
    private String userAgent;

    @Schema(description = "错误码", example = "ORDER_001")
    private String errorCode;

    @Schema(description = "错误信息", example = "订单库存不足")
    private String errorMsg;

    @Schema(description = "创建时间", type = "string", format = "date-time", example = "2026-04-13T10:20:31")
    private LocalDateTime createdAt;

    @Schema(
            description = "操作人信息，演示 anyOf：可能是正常用户，也可能是已删除用户快照",
            anyOf = {OperatorUserResp.class, DeletedOperatorUserResp.class}
    )
    private Object operator;

    @Schema(
            description = "日志内容，多态结构，演示 oneOf",
            discriminatorProperty = "type",
            oneOf = {
                    LoginOperateContentResp.class,
                    DataChangeOperateContentResp.class,
                    ApprovalOperateContentResp.class
            }
    )
    private Object content;

    @Schema(description = "扩展标签")
    private List<String> tags;
}