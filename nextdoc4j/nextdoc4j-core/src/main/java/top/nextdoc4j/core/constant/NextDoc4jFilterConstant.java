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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 路径过滤配置常量类
 *
 * @author echo
 * @since 1.0.1
 */
public class NextDoc4jFilterConstant {

    /**
     * 需要过滤的路径配置（唯一数据源：文档入口 + 非文档 springdoc/swagger/nextdoc 路径）。
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
         * 非文档入口的精确路径（api-docs / swagger 等），不含 UI 入口。
         */
        public static final String[] NON_DOC_EXACT_PATHS = {API_DOCS_YAML, API_DOCS, SWAGGER_UI_HTML, SWAGGER_RESOURCES};

        /**
         * 前缀匹配路径（含 /nextdoc/ 与 springdoc/swagger 前缀）。
         */
        public static final String[] PREFIX_PATHS = {NEXT_DOC4J_PREFIX, API_DOCS_PREFIX, SWAGGER_UI_PREFIX,
            SWAGGER_RESOURCES_PREFIX, WEBJARS_SWAGGER_UI_PREFIX};

        /**
         * 默认精确路径：默认 UI 入口 + {@link #NON_DOC_EXACT_PATHS}。
         */
        public static final String[] EXACT_PATHS;

        /**
         * 默认 Filter URL 模式（文档入口为 {@link #NEXT_DOC4J_HTML}）。
         */
        public static final String[] URL_PATTERNS;

        static {
            EXACT_PATHS = concat(new String[] {NEXT_DOC4J_HTML}, NON_DOC_EXACT_PATHS);
            URL_PATTERNS = buildUrlPatterns(NEXT_DOC4J_HTML, false);
        }

        /**
         * 构建 FilterRegistrationBean URL 模式。
         *
         * @param effectiveDocPath 生效文档入口（已规范化）
         * @param includeDefaultWhenCustom 自定义入口时是否额外包含默认 /doc.html
         */
        public static String[] buildUrlPatterns(String effectiveDocPath, boolean includeDefaultWhenCustom) {
            Set<String> patterns = new LinkedHashSet<>();
            if (effectiveDocPath != null && !effectiveDocPath.isEmpty()) {
                patterns.add(effectiveDocPath);
            }
            if (includeDefaultWhenCustom) {
                patterns.add(NEXT_DOC4J_HTML);
            }
            patterns.add(NEXT_DOC4J_PREFIX + "*");
            patterns.add(API_DOCS);
            patterns.add(API_DOCS_PREFIX + "*");
            patterns.add(API_DOCS_PREFIX + "**");
            patterns.add(API_DOCS_YAML);
            patterns.add(SWAGGER_UI_HTML);
            patterns.add(SWAGGER_UI_PREFIX + "*");
            patterns.add(SWAGGER_UI_PREFIX + "**");
            patterns.add(SWAGGER_RESOURCES);
            patterns.add(SWAGGER_RESOURCES_PREFIX + "*");
            patterns.add(SWAGGER_RESOURCES_PREFIX + "**");
            patterns.add(WEBJARS_SWAGGER_UI_PREFIX + "*");
            patterns.add(WEBJARS_SWAGGER_UI_PREFIX + "**");
            return patterns.toArray(String[]::new);
        }

        /**
         * 将精确路径转换为 Ant 模式（支持 context-path）
         * <p>转换规则：/doc.html -> /**\/doc.html</p>
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
         */
        public static String toAntPrefixPattern(String prefix) {
            if (prefix == null || prefix.isEmpty()) {
                return prefix;
            }
            String cleanPrefix = prefix.endsWith("/") ? prefix.substring(0, prefix.length() - 1) : prefix;
            return cleanPrefix.startsWith("/") ? "/**" + cleanPrefix + "/**" : cleanPrefix + "/**";
        }

        public static String[] getAntExactPatterns() {
            return Arrays.stream(EXACT_PATHS).map(BlockedPaths::toAntExactPattern).toArray(String[]::new);
        }

        public static String[] getAntPrefixPatterns() {
            return Arrays.stream(PREFIX_PATHS).map(BlockedPaths::toAntPrefixPattern).toArray(String[]::new);
        }

        public static String[] getAntNonDocExactPatterns() {
            return Arrays.stream(NON_DOC_EXACT_PATHS).map(BlockedPaths::toAntExactPattern).toArray(String[]::new);
        }

        private static String[] concat(String[] head, String[] tail) {
            List<String> all = new ArrayList<>(head.length + tail.length);
            all.addAll(Arrays.asList(head));
            all.addAll(Arrays.asList(tail));
            return all.toArray(String[]::new);
        }
    }
}
