package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Map;

@Data
@Schema(description = "HTTP 重放目标")
public class HttpReplayTargetReq {

    @Schema(description = "目标类型", example = "HTTP")
    private String targetType;

    @Schema(description = "目标URL", example = "http://127.0.0.1:8080/api/orders")
    private String url;

    @Schema(description = "HTTP方法", example = "POST", allowableValues = {"GET", "POST", "PUT", "DELETE", "PATCH"})
    private String method;

    @Schema(description = "请求头")
    private Map<String, String> headers;

    @Schema(description = "请求体")
    private Object body;
}