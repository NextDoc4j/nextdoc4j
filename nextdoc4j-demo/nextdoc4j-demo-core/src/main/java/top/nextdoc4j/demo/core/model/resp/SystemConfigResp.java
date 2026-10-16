package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "系统配置响应参数")
public class SystemConfigResp {

    @Schema(description = "配置ID", example = "1")
    private Long id;

    @Schema(description = "配置名称", example = "系统名称")
    private String name;

    @Schema(description = "配置键", example = "system.name")
    private String key;

    @Schema(description = "配置值", example = "NextDoc4j Demo")
    private String value;

    @Schema(description = "配置描述", example = "系统显示名称")
    private String description;

    @Schema(description = "是否可编辑", example = "true")
    private Boolean editable;

    @Schema(description = "更新时间", example = "2024-01-01T12:00:00")
    private LocalDateTime updateTime;
}