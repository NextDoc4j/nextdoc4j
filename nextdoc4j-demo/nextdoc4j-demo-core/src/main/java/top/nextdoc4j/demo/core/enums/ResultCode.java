package top.nextdoc4j.demo.core.enums;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "全局响应状态码枚举")
public enum ResultCode {
    // 成功状态
    SUCCESS("0", "操作成功"),

    // 客户端错误 4xx
    BAD_REQUEST("400", "请求参数错误"),
    UNAUTHORIZED("401", "未授权访问"),
    FORBIDDEN("403", "访问被禁止"),
    NOT_FOUND("404", "资源不存在"),
    METHOD_NOT_ALLOWED("405", "请求方法不允许"),
    NOT_ACCEPTABLE("406", "请求格式不可接受"),
    REQUEST_TIMEOUT("408", "请求超时"),
    CONFLICT("409", "资源冲突"),
    GONE("410", "资源已被删除"),
    LENGTH_REQUIRED("411", "缺少Content-Length头"),
    PRECONDITION_FAILED("412", "前置条件失败"),
    PAYLOAD_TOO_LARGE("413", "请求体过大"),
    URI_TOO_LONG("414", "请求URI过长"),
    UNSUPPORTED_MEDIA_TYPE("415", "不支持的媒体类型"),
    RANGE_NOT_SATISFIABLE("416", "请求范围无效"),
    EXPECTATION_FAILED("417", "预期失败"),
    UNPROCESSABLE_ENTITY("422", "请求参数验证失败"),
    TOO_MANY_REQUESTS("429", "请求过于频繁"),

    // 服务器错误 5xx
    INTERNAL_ERROR("500", "服务器内部错误"),
    NOT_IMPLEMENTED("501", "功能未实现"),
    BAD_GATEWAY("502", "网关错误"),
    SERVICE_UNAVAILABLE("503", "服务不可用"),
    GATEWAY_TIMEOUT("504", "网关超时"),
    HTTP_VERSION_NOT_SUPPORTED("505", "HTTP版本不支持"),

    // 业务错误 6xxx
    USER_NOT_EXISTS("6001", "用户不存在"),
    USER_DISABLED("6002", "用户已被禁用"),
    USER_ALREADY_EXISTS("6003", "用户已存在"),
    PASSWORD_ERROR("6004", "密码错误"),
    PASSWORD_TOO_WEAK("6005", "密码强度不够"),
    LOGIN_EXPIRED("6006", "登录已过期"),
    PERMISSION_DENIED("6007", "权限不足"),
    ROLE_NOT_EXISTS("6008", "角色不存在"),
    ROLE_ALREADY_EXISTS("6009", "角色已存在"),
    ROLE_HAS_USERS("6010", "角色下存在用户，无法删除"),

    // 文件错误 7xxx
    FILE_NOT_EXISTS("7001", "文件不存在"),
    FILE_TOO_LARGE("7002", "文件过大"),
    FILE_TYPE_NOT_SUPPORTED("7003", "不支持的文件类型"),
    FILE_UPLOAD_FAILED("7004", "文件上传失败"),
    FILE_DOWNLOAD_FAILED("7005", "文件下载失败"),

    // 系统错误 8xxx
    SYSTEM_MAINTENANCE("8001", "系统维护中"),
    SYSTEM_BUSY("8002", "系统繁忙，请稍后重试"),
    CONFIG_ERROR("8003", "系统配置错误"),
    DATABASE_ERROR("8004", "数据库操作失败"),
    CACHE_ERROR("8005", "缓存操作失败"),

    // 第三方服务错误 9xxx
    THIRD_PARTY_SERVICE_ERROR("9001", "第三方服务异常"),
    SMS_SEND_FAILED("9002", "短信发送失败"),
    EMAIL_SEND_FAILED("9003", "邮件发送失败"),
    PAYMENT_FAILED("9004", "支付失败");

    @Schema(description = "状态码")
    private final String code;

    @Schema(description = "状态信息")
    private final String msg;

    ResultCode(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    /**
     * 根据状态码获取枚举
     */
    public static ResultCode getByCode(String code) {
        for (ResultCode resultCode : ResultCode.values()) {
            if (resultCode.code().equals(code)) {
                return resultCode;
            }
        }
        return null;
    }

    public String code() {
        return code;
    }

    public String msg() {
        return msg;
    }

    /**
     * 判断是否为成功状态
     */
    public boolean isSuccess() {
        return SUCCESS.equals(this);
    }

    /**
     * 判断是否为客户端错误
     */
    public boolean isClientError() {
        return code.startsWith("4");
    }

    /**
     * 判断是否为服务器错误
     */
    public boolean isServerError() {
        return code.startsWith("5");
    }

    /**
     * 判断是否为业务错误
     */
    public boolean isBusinessError() {
        return code.startsWith("6") || code.startsWith("7") || code.startsWith("8") || code.startsWith("9");
    }
}
