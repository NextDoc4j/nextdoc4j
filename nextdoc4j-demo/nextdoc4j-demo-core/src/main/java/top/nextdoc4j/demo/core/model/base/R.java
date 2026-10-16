package top.nextdoc4j.demo.core.model.base;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import top.nextdoc4j.demo.core.enums.ResultCode;

/**
 * 响应信息
 *
 * @author Charles7c
 * @since 1.0.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class R<T> {
    @Schema(description = "状态码", example = "0")
    private String code;

    @Schema(description = "状态信息", example = "ok")
    private String msg;

    @Schema(description = "是否成功", example = "true")
    private boolean success;

    @Schema(description = "时间戳", example = "1691453288000")
    private Long timestamp = System.currentTimeMillis();

    @Schema(description = "响应数据")
    private T data;

    // --------- 静态方法 ---------
    public static <T> R<T> ok(T data) {
        return new R<>(ResultCode.SUCCESS.code(), ResultCode.SUCCESS.msg(), true, System.currentTimeMillis(), data);
    }

    public static <T> R<T> fail(ResultCode resultCode) {
        return new R<>(resultCode.code(), resultCode.msg(), false, System.currentTimeMillis(), null);
    }

    public static <T> R<T> fail(String code, String msg) {
        return new R<>(code, msg, false, System.currentTimeMillis(), null);
    }

    public static <T> R<T> fail(String msg) {
        return new R<>(ResultCode.INTERNAL_ERROR.code(), msg, false, System.currentTimeMillis(), null);
    }
}