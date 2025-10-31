/*
 * Copyright (c) 2025-present echo. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of the NextDoc4j project.
 */
package top.nextdoc4j.core.constant;

import java.util.Arrays;

/**
 * 路径过滤配置常量类
 *
 * @author echo
 * @since 1.0.1
 */
public class NextDoc4jFilterConstant {

    /**
     * 需要过滤的路径配置
     */
    public static final class BlockedPaths {

        private BlockedPaths() {
        }

        // NextDoc4j 相关路径
        public static final String NEXT_DOC4J_HTML = "/doc.html";
        public static final String NEXT_DOC4J_PREFIX = "/nextdoc/";

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

        /**
         * 所有精确匹配的路径
         */
        public static final String[] EXACT_PATHS = {NEXT_DOC4J_HTML, API_DOCS_YAML, API_DOCS, SWAGGER_UI_HTML,
            SWAGGER_RESOURCES};

        /**
         * 所有前缀匹配的路径
         */
        public static final String[] PREFIX_PATHS = {NEXT_DOC4J_PREFIX, API_DOCS_PREFIX, SWAGGER_UI_PREFIX,
            SWAGGER_RESOURCES_PREFIX, WEBJARS_SWAGGER_UI_PREFIX};

        /**
         * 用于 FilterRegistrationBean 的 URL 模式
         */
        public static final String[] URL_PATTERNS = {NEXT_DOC4J_HTML, NEXT_DOC4J_PREFIX + "*", API_DOCS,
            API_DOCS_PREFIX + "*", API_DOCS_PREFIX + "**", SWAGGER_UI_HTML, SWAGGER_UI_PREFIX + "*",
            SWAGGER_UI_PREFIX + "**", SWAGGER_RESOURCES, SWAGGER_RESOURCES_PREFIX + "*",
            SWAGGER_RESOURCES_PREFIX + "**", WEBJARS_SWAGGER_UI_PREFIX + "*", WEBJARS_SWAGGER_UI_PREFIX + "**"};

        // ==================== Ant 模式转换方法 ====================

        /**
         * 将精确路径转换为 Ant 模式（支持 context-path）
         * <p>转换规则：/doc.html -> /**\/doc.html</p>
         *
         * @param path 原始路径
         * @return Ant 模式路径
         */
        public static String toAntExactPattern(String path) {
            if (path == null || path.isEmpty()) {
                return path;
            }
            return path.startsWith("/") ? "/**" + path : path;
        }

        /**
         * 将前缀路径转换为 Ant 模式（支持 context-path）
         * <p>转换规则：/nextdoc/ -> /**\/nextdoc/**</p>
         *
         * @param prefix 原始前缀路径
         * @return Ant 模式路径
         */
        public static String toAntPrefixPattern(String prefix) {
            if (prefix == null || prefix.isEmpty()) {
                return prefix;
            }
            String cleanPrefix = prefix.endsWith("/") ? prefix.substring(0, prefix.length() - 1) : prefix;
            return cleanPrefix.startsWith("/") ? "/**" + cleanPrefix + "/**" : cleanPrefix + "/**";
        }

        /**
         * 获取所有精确匹配的 Ant 路径模式
         *
         * @return Ant 路径模式数组
         */
        public static String[] getAntExactPatterns() {
            return Arrays.stream(EXACT_PATHS).map(BlockedPaths::toAntExactPattern).toArray(String[]::new);
        }

        /**
         * 获取所有前缀匹配的 Ant 路径模式
         *
         * @return Ant 路径模式数组
         */
        public static String[] getAntPrefixPatterns() {
            return Arrays.stream(PREFIX_PATHS).map(BlockedPaths::toAntPrefixPattern).toArray(String[]::new);
        }
    }
}