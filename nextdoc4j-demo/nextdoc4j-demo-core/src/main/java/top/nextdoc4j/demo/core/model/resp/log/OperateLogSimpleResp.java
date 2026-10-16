package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(description = "操作日志简要信息")
public class OperateLogSimpleResp {

    @Schema(description = "日志ID", example = "18990010001")
    private Long id;

    @Schema(description = "模块编码", example = "ORDER")
    private String module;

    @Schema(description = "模块名称", example = "订单模块")
    private String moduleName;

    @Schema(description = "业务类型", example = "CREATE_ORDER")
    private String bizType;

    @Schema(description = "业务类型名称", example = "创建订单")
    private String bizTypeName;

    @Schema(description = "业务编号", example = "ORD202604130001")
    private String bizNo;

    @Schema(description = "是否成功", example = "true")
    private Boolean success;

    @Schema(description = "HTTP状态码", example = "200")
    private Integer httpStatus;

    @Schema(description = "耗时(ms)", example = "123")
    private Long durationMs;

    @Schema(description = "操作人ID", example = "10001")
    private Long operatorId;

    @Schema(description = "操作人名称", example = "张三")
    private String operatorName;

    @Schema(description = "请求URI", example = "/api/orders")
    private String requestUri;

    @Schema(description = "HTTP方法", example = "POST")
    private String httpMethod;

    @Schema(description = "客户端IP", example = "192.168.1.10")
    private String ip;

    @Schema(description = "发生时间", type = "string", format = "date-time", example = "2026-04-13T10:20:30")
    private LocalDateTime occurredAt;

    @Schema(description = "标签", example = "[\"敏感操作\",\"订单\"]")
    private List<String> tags;
}