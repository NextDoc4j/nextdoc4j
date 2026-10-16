package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "系统配置更新请求参数")
public class SystemConfigReq {

    @NotBlank
    @Size(min = 1, max = 100)
    @Schema(description = "配置键", example = "system.name")
    private String key;

    @NotBlank
    @Size(min = 1, max = 500)
    @Schema(description = "配置值", example = "NextDoc4j Demo")
    private String value;

    @Size(max = 200)
    @Schema(description = "配置描述", example = "系统显示名称")
    private String description;
}