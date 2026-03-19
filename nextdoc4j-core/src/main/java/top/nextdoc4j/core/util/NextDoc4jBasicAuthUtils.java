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

import top.nextdoc4j.core.configuration.extension.NextDoc4jBasicAuth;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;
import java.util.UUID;

/**
 * NextDoc4j BasicAuth 纯 Java 工具类。
 *
 * @author echo
 * @since 1.2.0
 */
public final class NextDoc4jBasicAuthUtils {

    private static final String LOGO_PLACEHOLDER_START = "<!-- LOGO_PLACEHOLDER_START -->";
    private static final String LOGO_PLACEHOLDER_END = "<!-- LOGO_PLACEHOLDER_END -->";

    public static final String AUTH_SESSION_KEY = "nextdoc4j_authenticated";
    public static final String BASIC_AUTH_PREFIX = "Basic ";
    public static final String LOGOUT_ACTION = "logout";
    public static final String AJAX_HEADER = "X-Requested-With";
    public static final String AJAX_HEADER_VALUE = "XMLHttpRequest";
    public static final String DEFAULT_LOGIN_TITLE = "NextDoc4j - API文档认证";

    private NextDoc4jBasicAuthUtils() {
        throw new AssertionError("Utility class should not be instantiated");
    }

    /**
     * 若密码为空，生成默认密码并写回配置对象。
     *
     * @param basicAuth BasicAuth 配置
     * @return 新生成的密码；若原密码已存在则返回 null
     */
    public static String initializeDefaultPassword(NextDoc4jBasicAuth basicAuth) {
        if (basicAuth == null || hasText(basicAuth.getPassword())) {
            return null;
        }
        String generatedPassword = UUID.randomUUID().toString().replace("-", "");
        basicAuth.setPassword(generatedPassword);
        return generatedPassword;
    }

    /**
     * 构建默认密码生成日志内容。
     */
    public static String buildGeneratedPasswordBanner(String generatedPassword) {
        if (!hasText(generatedPassword)) {
            return null;
        }
        return """
            ╔══════════════════════════════════════════════════════════════════════════════════════╗
            ║                          NextDoc4j 基本认证已启用                                        ║
            ║                                                                                      ║
            ║  未配置密码，已自动生成默认密码，请妥善保管：                                                  ║
            ║  密码: %s                                           ║
            ║                                                                                      ║
            ║  建议：请在配置文件中设置自定义密码以确保安全性                                                 ║
            ╚══════════════════════════════════════════════════════════════════════════════════════╝
            """.formatted(generatedPassword);
    }

    /**
     * 判断请求路径是否需要认证。
     */
    public static boolean isAuthenticationRequired(String requestUri, boolean authEnabled) {
        return NextDoc4jPathMatcherUtils.isAuthenticationRequired(requestUri, authEnabled);
    }

    /**
     * 判断是否为注销请求。
     */
    public static boolean isLogoutRequest(String method, String action) {
        return "GET".equalsIgnoreCase(method) && LOGOUT_ACTION.equals(action);
    }

    /**
     * 校验 Basic Authentication 头（仅校验密码）。
     */
    public static boolean validateBasicAuthentication(String authHeader, String expectedPassword) {
        if (!hasText(authHeader) || !authHeader.startsWith(BASIC_AUTH_PREFIX)) {
            return false;
        }
        try {
            String base64Credentials = authHeader.substring(BASIC_AUTH_PREFIX.length());
            String credentials = new String(Base64.getDecoder().decode(base64Credentials), StandardCharsets.UTF_8);
            int colonIndex = credentials.indexOf(':');
            String password = colonIndex != -1 ? credentials.substring(colonIndex + 1) : credentials;
            return Objects.equals(expectedPassword, password);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 判断是否为 AJAX / Fetch 请求。
     */
    public static boolean isAjaxRequest(String xRequestedWith,
                                        String accept,
                                        String userAgent,
                                        String referer,
                                        String serverName) {
        if (AJAX_HEADER_VALUE.equals(xRequestedWith)) {
            return true;
        }

        if (accept != null && accept.contains("application/json") && !accept.contains("text/html")) {
            return true;
        }

        return accept != null && accept.contains("*/*") && hasText(userAgent) && userAgent
            .contains("Chrome") && hasText(referer) && hasText(serverName) && referer.contains(serverName);
    }

    /**
     * 构建认证成功后的回跳地址。
     */
    public static String buildRedirectUrl(String requestPath) {
        return requestPath + "?t=" + System.currentTimeMillis();
    }

    /**
     * 构建统一 JSON 响应体。
     */
    public static String buildJsonResponse(boolean success, String message) {
        return """
            {
              "success": %s,
              "message": "%s"
            }
            """.formatted(success, NextDoc4jResourcePureUtils.escapeJsonString(message));
    }

    /**
     * 检查模板是否包含登录页占位符。
     */
    public static boolean isTemplateWithPlaceholders(String template) {
        if (template == null) {
            return false;
        }
        return template.contains("LOGO_SRC_PLACEHOLDER") || template.contains("LOGO_CLASS_PLACEHOLDER") || template
            .contains("TITLE_CLASS_PLACEHOLDER") || template.contains("TITLE_PLACEHOLDER") || template
                .contains(LOGO_PLACEHOLDER_START) || template.contains(LOGO_PLACEHOLDER_END) || template
                    .contains("${title}");
    }

    /**
     * 安全替换占位符：占位符存在时才替换。
     */
    public static String replacePlaceholder(String template, String placeholder, String value) {
        if (template == null || placeholder == null) {
            return template;
        }
        if (!template.contains(placeholder)) {
            return template;
        }
        return template.replace(placeholder, value == null ? "" : value);
    }

    /**
     * 移除 Logo 容器标记。
     */
    public static String removeLogoContainer(String htmlTemplate) {
        if (htmlTemplate == null) {
            return null;
        }
        int startIndex = htmlTemplate.indexOf(LOGO_PLACEHOLDER_START);
        int endIndex = htmlTemplate.indexOf(LOGO_PLACEHOLDER_END);
        if (startIndex != -1 && endIndex != -1 && endIndex > startIndex) {
            int removeEnd = endIndex + LOGO_PLACEHOLDER_END.length();
            return htmlTemplate.substring(0, startIndex) + htmlTemplate.substring(removeEnd);
        }
        return htmlTemplate;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

}
