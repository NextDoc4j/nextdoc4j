package top.nextdoc4j.demo.core.model.resp.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "正常操作人信息")
public class OperatorUserResp {

    @Schema(description = "用户ID", example = "10001")
    private Long id;

    @Schema(description = "用户名", example = "zhangsan")
    private String username;

    @Schema(description = "昵称", example = "张三")
    private String nickname;

    @Schema(description = "部门名称", example = "订单中心")
    private String deptName;

    @Schema(description = "是否启用", example = "true")
    private Boolean enabled;
}