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

import java.util.List;
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

    private static final String[] DEFAULT_PREFIX_PATTERNS = NextDoc4jFilterConstant.BlockedPaths.getAntPrefixPatterns();
    private static final String[] NON_DOC_EXACT_ANT = NextDoc4jFilterConstant.BlockedPaths.getAntNonDocExactPatterns();
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
     * 判断请求路径是否应该被拦截/过滤（使用默认文档入口 {@code /doc.html}）。
     */
    public static boolean shouldBlock(String requestUri) {
        return shouldBlock(requestUri, null);
    }

    /**
     * 判断请求路径是否应该被拦截/过滤。
     *
     * @param requestUri        请求 URI
     * @param configuredDocPath {@code nextdoc4j.doc-path}，null/空白视为默认
     */
    public static boolean shouldBlock(String requestUri, String configuredDocPath) {
        if (requestUri == null || requestUri.isEmpty()) {
            return false;
        }

        List<String> docPaths = NextDoc4jDocPathSupport.protectedExactDocPaths(configuredDocPath);
        for (String docPath : docPaths) {
            String pattern = NextDoc4jFilterConstant.BlockedPaths.toAntExactPattern(docPath);
            if (match(pattern, requestUri)) {
                return true;
            }
        }

        for (String pattern : NON_DOC_EXACT_ANT) {
            if (match(pattern, requestUri)) {
                return true;
            }
        }

        for (String pattern : DEFAULT_PREFIX_PATTERNS) {
            if (match(pattern, requestUri)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 判断请求路径是否需要认证（默认文档入口）。
     */
    public static boolean isAuthenticationRequired(String requestUri, boolean authEnabled) {
        return isAuthenticationRequired(requestUri, authEnabled, null);
    }

    /**
     * 判断请求路径是否需要认证。
     */
    public static boolean isAuthenticationRequired(String requestUri, boolean authEnabled, String configuredDocPath) {
        return authEnabled && shouldBlock(requestUri, configuredDocPath);
    }

    /**
     * 判断路径是否为 NextDoc4j UI 资源路径（默认入口）。
     */
    public static boolean isNextDoc4jResource(String requestUri) {
        return isNextDoc4jResource(requestUri, null);
    }

    /**
     * 判断路径是否为 NextDoc4j UI 资源路径（生效入口 + /nextdoc/**）。
     */
    public static boolean isNextDoc4jResource(String requestUri, String configuredDocPath) {
        if (requestUri == null || requestUri.isEmpty()) {
            return false;
        }

        String effective = NextDoc4jDocPathSupport.effectiveDocPath(configuredDocPath);
        String docHtmlPattern = NextDoc4jFilterConstant.BlockedPaths.toAntExactPattern(effective);
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
            if (normalizedPattern.startsWith("/**/", i)) {
                regex.append("(?:/.+)?/");
                i += 4;
                continue;
            }
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
