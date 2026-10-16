package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;
import top.nextdoc4j.demo.core.model.query.NotificationQuery;

@EqualsAndHashCode(callSuper = true)
@Data
@Schema(
        description = "补录操作日志请求",
        allOf = {NotificationQuery.class}
)
public class OperateLogSaveReq extends OperateLogBaseReq {

    @Schema(
            description = "日志内容，多态结构，按 type 区分",
            requiredMode = Schema.RequiredMode.REQUIRED,
            discriminatorProperty = "type",
            oneOf = {
                    LoginOperateContentReq.class,
                    DataChangeOperateContentReq.class,
                    ApprovalOperateContentReq.class
            }
    )
    @Valid
    @NotNull
    private Object content;
}