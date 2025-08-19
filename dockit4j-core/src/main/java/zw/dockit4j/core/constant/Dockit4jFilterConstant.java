package zw.dockit4j.core.constant;

import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

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

        private BlockedPaths() {
        }

        /* --- Dockit4j 相关路径 --- */
        public static final String DOCKIT_HTML = "/doc.html";
        public static final String DOCKIT4J_PREFIX = "/assets/";

        /* --- SpringDoc 相关路径 --- */
        public static final String API_DOCS = "/v3/api-docs";
        public static final String API_DOCS_PREFIX = "/v3/api-docs/";
        public static final String API_DOCS_YAML = "/v3/api-docs.yaml";

        /* --- Swagger UI 相关路径 --- */
        public static final String SWAGGER_UI_HTML = "/swagger-ui.html";
        public static final String SWAGGER_UI_PREFIX = "/swagger-ui/";
        public static final String SWAGGER_RESOURCES = "/swagger-resources";
        public static final String SWAGGER_RESOURCES_PREFIX = "/swagger-resources/";
        public static final String WEBJARS_SWAGGER_UI_PREFIX = "/webjars/swagger-ui/";

        /**
         * 精确匹配
         */
        public static final Set<String> EXACT_PATHS = Set
            .of(DOCKIT_HTML, API_DOCS, API_DOCS_YAML, SWAGGER_UI_HTML, SWAGGER_RESOURCES);

        /**
         * 前缀匹配
         */
        public static final List<String> PREFIX_PATHS = List
            .of(DOCKIT4J_PREFIX, API_DOCS_PREFIX, SWAGGER_UI_PREFIX, SWAGGER_RESOURCES_PREFIX, WEBJARS_SWAGGER_UI_PREFIX);

        /**
         * URL 模式（用于 FilterRegistrationBean）
         */
        public static final String[] URL_PATTERNS = PREFIX_PATHS.stream()
            .flatMap(p -> Stream.of(p + "*", p + "**"))
            .toArray(String[]::new);

        /**
         * 正则匹配
         */
        public static final String[] REGEX_PATTERNS = PREFIX_PATHS.stream().map(p -> p + ".*").toArray(String[]::new);
    }
}
