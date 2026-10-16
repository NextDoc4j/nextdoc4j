package top.nextdoc4j.demo.core.model.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "批量用户操作请求参数")
public class UserBatchReq {

    @NotEmpty
    @Size(min = 1, max = 100)
    @Valid
    @Schema(description = "用户列表")
    private List<UserReq> users;
}