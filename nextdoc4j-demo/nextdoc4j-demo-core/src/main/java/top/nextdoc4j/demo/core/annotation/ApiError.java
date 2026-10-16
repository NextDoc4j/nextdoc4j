package top.nextdoc4j.demo.core.annotation;

import java.lang.annotation.*;


/**
 * 声明接口可能返回的错误响应，可重复标注。
 *
 * <p>单个状态码只有一个 @ApiError 时，生成 mediaType 级 {@code example}（单值）。
 * <p>同一状态码有多个 @ApiError 时，生成 mediaType 级 {@code examples}（命名多值，Swagger UI 下拉切换）。
 * <p>status = -1 时生成 {@code default} 响应码。
 * <p>无 schema 时（bareContent = true）只生成 description，不附加 content。
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
@Repeatable(ApiErrors.class)
public @interface ApiError {

    /**
     * 业务错误码，同时作为 examples 的 key 名称。
     * 例："username.exist"、"param.invalid"
     */
    String code();

    /**
     * HTTP 状态码。
     * 特殊值 -1 表示生成 "default" 响应。
     */
    int status();

    /**
     * 人类可读的错误描述，同时作为：
     * - ApiResponse.description
     * - example 的 message 字段值
     * - examples[key].summary
     */
    String reason() default "";

    /**
     * 额外的 message 字段值，不填时默认使用 reason()。
     * 用于 reason 作为标题、message 需要更详细说明的场景。
     */
    String message() default "";

    /**
     * 是否为裸响应（不生成 content，只有 description）。
     * 适用于 403 无权限等不返回 body 的场景。
     */
    boolean bareContent() default false;

    /**
     * 覆盖默认的 media type，默认 "application/json"。
     */
    String mediaType() default "application/json";

    /**
     * 是否将 example 提升到 components/examples 并生成 $ref 引用。
     * 开启后可在多个接口间复用同一个示例。
     */
    boolean refExample() default false;
}