package top.nextdoc4j.demo.core.model.base;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
@Schema(description = "分页基础查询参数")
public class PageQuery {

    @Schema(description = "页码", example = "1", minimum = "1", defaultValue = "1")
    @Min(1)
    private Integer current = 1;

    @Schema(description = "每页条数", example = "20", minimum = "1", maximum = "200", defaultValue = "20")
    @Min(1)
    @Max(200)
    private Integer size = 20;
}