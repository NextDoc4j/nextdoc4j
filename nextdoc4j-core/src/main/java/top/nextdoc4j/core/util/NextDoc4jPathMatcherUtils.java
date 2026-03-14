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

import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * NextDoc4j 路径匹配工具类（纯 Java 实现，不依赖 Spring）。
 *
 * @author echo
 * @since 1.0.1
 */
public final class NextDoc4jPathMatcherUtils {

    private static final String[] EXACT_PATTERNS = NextDoc4jFilterConstant.BlockedPaths.getAntExactPatterns();
    private static final String[] PREFIX_PATTERNS = NextDoc4jFilterConstant.BlockedPaths.getAntPrefixPatterns();
    private static final Map<String, Pattern> PATTERN_CACHE = new ConcurrentHashMap<>();

    private NextDoc4jPathMatcherUtils() {
        throw new AssertionError("Utility class should not be instantiated");
    }

    /**
     * Ant 风格路径匹配。
     */
    public static boolean match(String pattern, String path) {
        if (pattern == null || pattern.isEmpty() || path == null || path.isEmpty()) {
            return false;
        }
        String normalizedPath = normalizePath(path);
        Pattern regex = PATTERN_CACHE.computeIfAbsent(pattern, NextDoc4jPathMatcherUtils::toRegexPattern);
        return regex.matcher(normalizedPath).matches();
    }

    /**
     * 判断请求路径是否应该被拦截/过滤。
     */
    public static boolean shouldBlock(String requestUri) {
        if (requestUri == null || requestUri.isEmpty()) {
            return false;
        }

        for (String pattern : EXACT_PATTERNS) {
            if (match(pattern, requestUri)) {
                return true;
            }
        }

        for (String pattern : PREFIX_PATTERNS) {
            if (match(pattern, requestUri)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 判断请求路径是否需要认证。
     */
    public static boolean isAuthenticationRequired(String requestUri, boolean authEnabled) {
        return authEnabled && shouldBlock(requestUri);
    }

    /**
     * 判断路径是否为 NextDoc4j 资源路径。
     */
    public static boolean isNextDoc4jResource(String requestUri) {
        if (requestUri == null || requestUri.isEmpty()) {
            return false;
        }

        String docHtmlPattern = NextDoc4jFilterConstant.BlockedPaths
            .toAntExactPattern(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML);
        String nextdocPattern = NextDoc4jFilterConstant.BlockedPaths
            .toAntPrefixPattern(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX);

        return match(docHtmlPattern, requestUri) || match(nextdocPattern, requestUri);
    }

    private static String normalizePath(String path) {
        String normalized = path.trim();
        if (normalized.isEmpty()) {
            return normalized;
        }
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        return normalized.replaceAll("/{2,}", "/");
    }

    private static Pattern toRegexPattern(String antPattern) {
        String normalizedPattern = normalizePath(antPattern);
        StringBuilder regex = new StringBuilder("^");
        for (int i = 0; i < normalizedPattern.length();) {
            // AntPathMatcher 语义："/**/" 可匹配零个或多个路径段（含 context-path 场景）
            if (normalizedPattern.startsWith("/**/", i)) {
                regex.append("(?:/.+)?/");
                i += 4;
                continue;
            }
            // 结尾 "/**" 允许当前路径段后续任意深度子路径，且可为空
            if (normalizedPattern.startsWith("/**", i) && i + 3 == normalizedPattern.length()) {
                regex.append("(?:/.*)?");
                i += 3;
                continue;
            }

            char ch = normalizedPattern.charAt(i);
            if (ch == '*') {
                boolean isDoubleStar = (i + 1 < normalizedPattern.length()) && normalizedPattern.charAt(i + 1) == '*';
                if (isDoubleStar) {
                    regex.append(".*");
                    i += 2;
                } else {
                    regex.append("[^/]*");
                    i++;
                }
                continue;
            }
            if (ch == '?') {
                regex.append("[^/]");
                i++;
                continue;
            }
            if ("\\.^$|()[]{}+".indexOf(ch) >= 0) {
                regex.append('\\');
            }
            regex.append(ch);
            i++;
        }
        regex.append('$');
        return Pattern.compile(regex.toString());
    }
}
