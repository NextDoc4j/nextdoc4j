package top.nextdoc4j.demo.core.model.base;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "分页响应结果")
public class PageResult<T> {

    @Schema(description = "数据列表")
    private List<T> records;

    @Schema(description = "总记录数", example = "100")
    private Long total;

    @Schema(description = "当前页码", example = "1")
    private Integer current;

    @Schema(description = "每页记录数", example = "10")
    private Integer size;

    @Schema(description = "总页数", example = "10")
    private Long pages;

    @Schema(description = "是否有下一页", example = "true")
    public Boolean hasNext() {
        return current < pages;
    }

    @Schema(description = "是否有上一页", example = "false")
    public Boolean hasPrevious() {
        return current > 1;
    }
}