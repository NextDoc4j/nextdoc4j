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

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 文档入口路径解析（纯 Java）。
 * <p>
 * 物理资源固定为 {@code doc.html}；对外入口由 {@code nextdoc4j.doc-path} 决定。
 * 未配置时入口为 {@code /doc.html}；配置后入口为自定义<strong>单段</strong>路径。
 * <p>
 * <strong>校验 vs 热路径：</strong>
 * <ul>
 * <li>{@link #validateConfiguredDocPath(String)} — 启动期 fail-fast，非法抛异常</li>
 * <li>{@link #effectiveDocPath(String)} — 请求热路径解析，非法时降级为默认路径且<strong>不抛</strong></li>
 * </ul>
 *
 * @author echo
 * @since 1.4.0
 */
public final class NextDoc4jDocPathSupport {

    /**
     * 默认对外入口（与 UI jar 文件名一致）。
     */
    public static final String DEFAULT_DOC_PATH = NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML;

    /**
     * classpath 下固定 UI 入口文件名（位于 META-INF/resources/）。
     */
    public static final String PHYSICAL_DOC_HTML = "doc.html";

    /**
     * 单段根路径：{@code /} + 一段非空、不含 {@code /} 的名称（可含 {@code .html} 等）。
     */
    private static final Pattern SINGLE_SEGMENT = Pattern.compile("^/[^/]+$");

    private NextDoc4jDocPathSupport() {
        throw new AssertionError("Utility class should not be instantiated");
    }

    /**
     * 热路径解析生效文档入口：blank → 默认；非法/多段 → 降级为默认（不抛异常）。
     * <p>
     * 过滤器 / matcher 等每请求逻辑必须使用本方法，禁止在热路径调用 {@link #validateConfiguredDocPath(String)}。
     *
     * @param configuredDocPath 配置值 {@code nextdoc4j.doc-path}
     * @return 规范化后的生效路径，永不为 null
     */
    public static String effectiveDocPath(String configuredDocPath) {
        if (configuredDocPath == null || configuredDocPath.isBlank()) {
            return DEFAULT_DOC_PATH;
        }
        String normalized = normalizePath(configuredDocPath);
        if (normalized.isEmpty() || "/".equals(normalized) || !isSafeNormalizedSingleSegment(normalized)) {
            // 热路径永不抛：非法配置降级为默认，避免过滤器每请求 500；启动期由 validateConfiguredDocPath fail-fast
            return DEFAULT_DOC_PATH;
        }
        return normalized;
    }

    /**
     * 启动期校验配置：blank 通过（表示默认）；非 blank 非法/多段则抛 {@link IllegalStateException}。
     * <p>
     * 仅供 {@code NextDoc4jDocPathValidator} 等启动装配调用，不要在过滤器热路径使用。
     */
    public static void validateConfiguredDocPath(String configuredDocPath) {
        if (configuredDocPath == null || configuredDocPath.isBlank()) {
            return;
        }
        String normalized = normalizePath(configuredDocPath);
        if (normalized.isEmpty() || "/".equals(normalized)) {
            throw new IllegalStateException(
                "Invalid nextdoc4j.doc-path: empty path after normalize. Use a single-segment path like /internal-docs.html");
        }
        if (!isSafeNormalizedSingleSegment(normalized)) {
            throw new IllegalStateException(
                "Invalid nextdoc4j.doc-path='" + configuredDocPath + "' (normalized='" + normalized + "'). "
                    + "Must be a single-segment root path such as /internal-docs.html or /nd4j-docs. "
                    + "Multi-segment paths (e.g. /api/console) break relative ./nextdoc assets and are not supported.");
        }
    }

    /**
     * 是否配置了非默认入口（旧 {@code /doc.html} 应失效）。
     * 使用热路径解析；非法配置降级为默认后返回 false。
     */
    public static boolean isCustomDocPath(String configuredDocPath) {
        return isCustomEffectivePath(effectiveDocPath(configuredDocPath));
    }

    /**
     * 生效路径是否不同于默认入口。
     * <p>
     * {@code effectiveDocPath} 应为 {@link #effectiveDocPath(String)} 的返回值（已规范化、带前导 {@code /}）。
     */
    public static boolean isCustomEffectivePath(String effectiveDocPath) {
        return effectiveDocPath != null && !DEFAULT_DOC_PATH.equals(effectiveDocPath);
    }

    /**
     * 请求 URI 是否命中默认入口 {@code /doc.html}（支持 context-path 前缀）。
     */
    public static boolean matchesDefaultDocPath(String requestUri) {
        return matchesExactDocPath(requestUri, DEFAULT_DOC_PATH);
    }

    /**
     * 请求 URI 是否命中生效文档入口（支持 context-path）。热路径，不抛。
     */
    public static boolean matchesEffectiveDocPath(String requestUri, String configuredDocPath) {
        return matchesExactDocPath(requestUri, effectiveDocPath(configuredDocPath));
    }

    /**
     * 请求 URI 是否命中给定的精确文档路径（支持 context-path）。
     * <p>
     * {@code exactDocPath} 约定为已带前导 {@code /} 的生效路径或常量；不再二次 {@link #normalizePath(String)}。
     */
    public static boolean matchesExactDocPath(String requestUri, String exactDocPath) {
        if (requestUri == null || requestUri.isEmpty() || exactDocPath == null || exactDocPath.isEmpty()) {
            return false;
        }
        String pattern = NextDoc4jFilterConstant.BlockedPaths.toAntExactPattern(exactDocPath);
        return NextDoc4jPathMatcherUtils.match(pattern, requestUri);
    }

    /**
     * 构建 Filter 注册用的 URL 模式（热路径安全：非法配置降级为默认入口模式）。
     */
    public static String[] blockedUrlPatterns(String configuredDocPath) {
        String effective = effectiveDocPath(configuredDocPath);
        return NextDoc4jFilterConstant.BlockedPaths.buildUrlPatterns(effective, isCustomEffectivePath(effective));
    }

    /**
     * 用于 shouldBlock 的精确文档入口列表（热路径安全）。
     */
    public static List<String> protectedExactDocPaths(String configuredDocPath) {
        String effective = effectiveDocPath(configuredDocPath);
        List<String> paths = new ArrayList<>(2);
        paths.add(effective);
        if (isCustomEffectivePath(effective)) {
            paths.add(DEFAULT_DOC_PATH);
        }
        return paths;
    }

    /**
     * 规范化路径：trim、保证前导 /、折叠 //、去掉尾部 /（非根）。
     */
    public static String normalizePath(String path) {
        if (path == null) {
            return "";
        }
        String normalized = path.trim();
        if (normalized.isEmpty()) {
            return "";
        }
        int q = normalized.indexOf('?');
        if (q >= 0) {
            normalized = normalized.substring(0, q);
        }
        int hash = normalized.indexOf('#');
        if (hash >= 0) {
            normalized = normalized.substring(0, hash);
        }
        normalized = normalized.replace('\\', '/');
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        normalized = normalized.replaceAll("/{2,}", "/");
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    /**
     * 文档入口是否安全：null/空白视为「使用默认」通过；
     * 非空须为<strong>单段</strong>根路径（{@code ^/[^/]+$}），且不含路径穿越。
     */
    public static boolean isSafeDocPath(String path) {
        if (path == null || path.isBlank()) {
            return true;
        }
        String n = normalizePath(path);
        return isSafeNormalizedSingleSegment(n);
    }

    /**
     * 对<strong>已</strong> {@link #normalizePath(String)} 的路径做单段安全判断（无二次 normalize）。
     */
    static boolean isSafeNormalizedSingleSegment(String normalized) {
        if (normalized == null || normalized.isEmpty() || "/".equals(normalized)) {
            return false;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("..") || lower.contains("%2e")) {
            return false;
        }
        return SINGLE_SEGMENT.matcher(normalized).matches();
    }
}
