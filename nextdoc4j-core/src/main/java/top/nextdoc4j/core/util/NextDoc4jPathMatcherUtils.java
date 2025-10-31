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
package top.nextdoc4j.core.util;

import org.springframework.util.AntPathMatcher;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;

/**
 * NextDoc4j 路径匹配工具类
 *
 * <p>使用 AntPathMatcher 实现路径匹配，完整支持：</p>
 * <ul>
 * <li>无 context-path 的直接访问：/doc.html</li>
 * <li>有 context-path 的访问：/app/doc.html、/api/v1/doc.html</li>
 * <li>多级 context-path：/company/project/api/doc.html</li>
 * <li>前缀路径：/nextdoc/**, /swagger-ui/**</li>
 * </ul>
 *
 * @author echo
 * @since 1.0.1
 */
public class NextDoc4jPathMatcherUtils {

    /**
     * Ant 路径匹配器（单例）
     */
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    /**
     * 精确匹配的 Ant 路径模式
     */
    private static volatile String[] exactPatterns;

    /**
     * 前缀匹配的 Ant 路径模式
     */
    private static volatile String[] prefixPatterns;

    /**
     * 私有构造函数，防止实例化
     */
    private NextDoc4jPathMatcherUtils() {
        throw new AssertionError("Utility class should not be instantiated");
    }

    /**
     * 判断请求路径是否应该被拦截/过滤
     *
     * <p>使用 Ant 模式匹配，自动支持任意 context-path：</p>
     * <ul>
     * <li>/doc.html → 匹配</li>
     * <li>/app/doc.html → 匹配</li>
     * <li>/api/v1/doc.html → 匹配</li>
     * <li>/nextdoc/config.json → 匹配</li>
     * <li>/app/nextdoc/style.css → 匹配</li>
     * </ul>
     *
     * @param requestUri 请求 URI
     * @return true-应该被拦截/过滤，false-允许通过
     */
    public static boolean shouldBlock(String requestUri) {
        if (requestUri == null || requestUri.isEmpty()) {
            return false;
        }

        // 1. 精确路径匹配
        for (String pattern : getExactPatterns()) {
            if (PATH_MATCHER.match(pattern, requestUri)) {
                return true;
            }
        }

        // 2. 前缀路径匹配
        for (String pattern : getPrefixPatterns()) {
            if (PATH_MATCHER.match(pattern, requestUri)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 判断请求路径是否需要认证
     *
     * @param requestUri  请求 URI
     * @param authEnabled 是否启用认证
     * @return true-需要认证，false-不需要认证
     */
    public static boolean isAuthenticationRequired(String requestUri, boolean authEnabled) {
        if (!authEnabled) {
            return false;
        }
        return shouldBlock(requestUri);
    }

    /**
     * 判断路径是否为 NextDoc4j 资源路径
     *
     *
     * @param requestUri 请求 URI
     * @return true-是 NextDoc4j 资源路径
     */
    public static boolean isNextDoc4jResource(String requestUri) {
        if (requestUri == null || requestUri.isEmpty()) {
            return false;
        }

        String docHtmlPattern = NextDoc4jFilterConstant.BlockedPaths
            .toAntExactPattern(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML);

        String nextdocPattern = NextDoc4jFilterConstant.BlockedPaths
            .toAntPrefixPattern(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX);

        return PATH_MATCHER.match(docHtmlPattern, requestUri) || PATH_MATCHER.match(nextdocPattern, requestUri);
    }

    /**
     * 获取 AntPathMatcher 实例
     *
     * @return AntPathMatcher 实例
     */
    public static AntPathMatcher getPathMatcher() {
        return PATH_MATCHER;
    }

    /**
     * 获取精确匹配的 Ant 路径模式
     *
     * @return Ant 路径模式数组
     */
    private static String[] getExactPatterns() {
        if (exactPatterns == null) {
            synchronized (NextDoc4jPathMatcherUtils.class) {
                if (exactPatterns == null) {
                    exactPatterns = NextDoc4jFilterConstant.BlockedPaths.getAntExactPatterns();
                }
            }
        }
        return exactPatterns;
    }

    /**
     * 获取前缀匹配的 Ant 路径模式
     *
     * @return Ant 路径模式数组
     */
    private static String[] getPrefixPatterns() {
        if (prefixPatterns == null) {
            synchronized (NextDoc4jPathMatcherUtils.class) {
                if (prefixPatterns == null) {
                    prefixPatterns = NextDoc4jFilterConstant.BlockedPaths.getAntPrefixPatterns();
                }
            }
        }
        return prefixPatterns;
    }
}
