package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "带修改者信息的基础VO")
public class WithModifierVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "主键")
    private Long id;

    @Schema(description = "创建者信息")
    private UserMetaVO creator;

    @Schema(description = "创建时间")
    private String createTime;

    @Schema(description = "修改者信息")
    private UserMetaVO modifier;

    @Schema(description = "修改时间")
    private String updateTime;


    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "用户元信息")
    public static class UserMetaVO implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        @Schema(description = "用户ID")
        private Long id;

        @Schema(description = "手机")
        private String phone;

        @Schema(description = "姓名")
        private String name;
    }
}