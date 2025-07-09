package zw.dockit4j.core.constant;

/**
 * 路径过滤配置常量类
 *
 * @author echo
 * @date 2025/05/27
 */
public class Dockit4jFilterConstant {

    /**
     * 需要过滤的路径配置
     */
    public static final class BlockedPaths {
        // Dockit4j 相关路径
        public static final String DOCKIT_HTML = "/doc.html";
        public static final String DOCKIT4J_PREFIX = "/assets/";

        // SpringDoc 相关路径
        public static final String API_DOCS = "/v3/api-docs";
        public static final String API_DOCS_PREFIX = "/v3/api-docs/";
        public static final String API_DOCS_YAML = "/v3/api-docs.yaml";

        // Swagger UI 相关路径
        public static final String SWAGGER_UI_HTML = "/swagger-ui.html";
        public static final String SWAGGER_UI_PREFIX = "/swagger-ui/";
        public static final String SWAGGER_RESOURCES = "/swagger-resources";
        public static final String SWAGGER_RESOURCES_PREFIX = "/swagger-resources/";
        public static final String WEBJARS_SWAGGER_UI_PREFIX = "/webjars/swagger-ui/";

        // 所有精确匹配的路径
        public static final String[] EXACT_PATHS = {DOCKIT_HTML, API_DOCS, SWAGGER_UI_HTML, SWAGGER_RESOURCES};

        // 所有前缀匹配的路径
        public static final String[] PREFIX_PATHS = {DOCKIT4J_PREFIX, API_DOCS_PREFIX, SWAGGER_UI_PREFIX,
            SWAGGER_RESOURCES_PREFIX, WEBJARS_SWAGGER_UI_PREFIX};

        // 用于 FilterRegistrationBean 的 URL 模式
        public static final String[] URL_PATTERNS = {DOCKIT_HTML, DOCKIT4J_PREFIX + "*", API_DOCS,
            API_DOCS_PREFIX + "*", API_DOCS_PREFIX + "**", SWAGGER_UI_HTML, SWAGGER_UI_PREFIX + "*",
            SWAGGER_UI_PREFIX + "**", SWAGGER_RESOURCES, SWAGGER_RESOURCES_PREFIX + "*",
            SWAGGER_RESOURCES_PREFIX + "**", WEBJARS_SWAGGER_UI_PREFIX + "*", WEBJARS_SWAGGER_UI_PREFIX + "**"};

        // 用于正则匹配的模式
        public static final String[] REGEX_PATTERNS = {"/dockit4j/.*", "/v3/api-docs/.*", "/swagger-ui/.*",
            "/swagger-resources/.*", "/webjars/swagger-ui/.*"};
    }
}
