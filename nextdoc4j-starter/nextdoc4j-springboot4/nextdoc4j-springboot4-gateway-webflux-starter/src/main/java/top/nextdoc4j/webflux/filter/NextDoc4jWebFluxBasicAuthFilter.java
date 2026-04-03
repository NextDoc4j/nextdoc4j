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
package top.nextdoc4j.webflux.filter;

import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import org.springframework.web.server.WebSession;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBasicAuth;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import top.nextdoc4j.core.util.NextDoc4jBasicAuthUtils;
import top.nextdoc4j.core.util.NextDoc4jResourceUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Objects;

/**
 * NextDoc4j WebFlux 基本认证过滤器。
 *
 * @author echo
 * @since 1.2.0
 */
public class NextDoc4jWebFluxBasicAuthFilter implements WebFilter {

    private static final Logger log = LoggerFactory.getLogger(NextDoc4jWebFluxBasicAuthFilter.class);

    private static final Duration SESSION_TIMEOUT = Duration.ofMinutes(30);
    private static final String DOC_LOGIN = "classpath:/META-INF/resources/doclogin.html";

    private final NextDoc4jBasicAuth basicAuth;
    private final NextDoc4jExtension extension;
    private final ResourceLoader resourceLoader;
    private final OpenAPI openAPI;

    public NextDoc4jWebFluxBasicAuthFilter(NextDoc4jProperties properties,
                                           ResourceLoader resourceLoader,
                                           OpenAPI openAPI) {
        Objects.requireNonNull(properties, "NextDoc4jProperties cannot be null");
        this.resourceLoader = Objects.requireNonNull(resourceLoader, "ResourceLoader cannot be null");
        this.openAPI = openAPI;
        this.basicAuth = properties.getAuth();
        this.extension = properties.getExtension();
        initializeDefaultPassword();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String uri = exchange.getRequest().getURI().getPath();
        if (!isAuthenticationRequired(uri)) {
            return chain.filter(exchange);
        }

        if (isLogoutRequest(exchange)) {
            return handleLogout(exchange);
        }

        return exchange.getSession().flatMap(session -> {
            if (isSessionAuthenticated(session)) {
                return chain.filter(exchange);
            }

            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader != null && authHeader.startsWith(NextDoc4jBasicAuthUtils.BASIC_AUTH_PREFIX)) {
                if (validateBasicAuthentication(authHeader)) {
                    createAuthenticatedSession(session);
                    return handleAuthenticationSuccess(exchange);
                }
                return handleAuthenticationFailure(exchange);
            }

            return showLoginPage(exchange);
        });
    }

    private void initializeDefaultPassword() {
        final String generatedPassword = NextDoc4jBasicAuthUtils.initializeDefaultPassword(basicAuth);
        if (generatedPassword != null) {
            String banner = NextDoc4jBasicAuthUtils.buildGeneratedPasswordBanner(generatedPassword);
            if (banner != null) {
                log.info("\n{}", banner);
            }
        }
    }

    private boolean isAuthenticationRequired(String uri) {
        return NextDoc4jBasicAuthUtils.isAuthenticationRequired(uri, basicAuth.isEnabled());
    }

    private boolean isLogoutRequest(ServerWebExchange exchange) {
        HttpMethod method = exchange.getRequest().getMethod();
        String methodName = method.name();
        String action = exchange.getRequest().getQueryParams().getFirst("action");
        return NextDoc4jBasicAuthUtils.isLogoutRequest(methodName, action);
    }

    private boolean isSessionAuthenticated(WebSession session) {
        return Boolean.TRUE.equals(session.getAttribute(NextDoc4jBasicAuthUtils.AUTH_SESSION_KEY));
    }

    private boolean validateBasicAuthentication(String authHeader) {
        return NextDoc4jBasicAuthUtils.validateBasicAuthentication(authHeader, basicAuth.getPassword());
    }

    private void createAuthenticatedSession(WebSession session) {
        session.getAttributes().put(NextDoc4jBasicAuthUtils.AUTH_SESSION_KEY, true);
        session.setMaxIdleTime(SESSION_TIMEOUT);
    }

    private Mono<Void> handleAuthenticationSuccess(ServerWebExchange exchange) {
        if (isAjaxRequest(exchange.getRequest())) {
            return sendJsonResponse(exchange.getResponse(), HttpStatus.OK, true, "认证成功");
        }
        String redirectUrl = NextDoc4jBasicAuthUtils.buildRedirectUrl(exchange.getRequest().getURI().getPath());
        return sendRedirect(exchange.getResponse(), redirectUrl);
    }

    private Mono<Void> handleAuthenticationFailure(ServerWebExchange exchange) {
        if (isAjaxRequest(exchange.getRequest())) {
            return sendJsonResponse(exchange.getResponse(), HttpStatus.UNAUTHORIZED, false, "认证失败");
        }
        clearBrowserAuthCache(exchange.getResponse());
        return exchange.getResponse().setComplete();
    }

    private Mono<Void> handleLogout(ServerWebExchange exchange) {
        return exchange.getSession().flatMap(session -> session.invalidate().then(Mono.defer(() -> {
            clearBrowserAuthCache(exchange.getResponse());
            return sendRedirect(exchange.getResponse(), exchange.getRequest().getURI().getPath());
        })));
    }

    private Mono<Void> showLoginPage(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.OK);
        response.getHeaders().setContentType(new MediaType("text", "html", StandardCharsets.UTF_8));
        setNoCacheHeaders(response);
        return writeString(response, loadLoginPageFromResources());
    }

    private boolean isAjaxRequest(ServerHttpRequest request) {
        HttpHeaders headers = request.getHeaders();
        String xRequestedWith = headers.getFirst(NextDoc4jBasicAuthUtils.AJAX_HEADER);
        String accept = headers.getFirst(HttpHeaders.ACCEPT);
        String userAgent = headers.getFirst(HttpHeaders.USER_AGENT);
        String referer = headers.getFirst(HttpHeaders.REFERER);

        String serverName = request.getURI().getHost();
        if (!StringUtils.hasText(serverName) && headers.getHost() != null) {
            serverName = headers.getHost().getHostName();
        }

        return NextDoc4jBasicAuthUtils.isAjaxRequest(xRequestedWith, accept, userAgent, referer, serverName);
    }

    private Mono<Void> sendJsonResponse(ServerHttpResponse response,
                                        HttpStatus status,
        boolean success,
                                        String message) {
        response.setStatusCode(status);
        response.getHeaders().setContentType(new MediaType("application", "json", StandardCharsets.UTF_8));
        String jsonResponse = NextDoc4jBasicAuthUtils.buildJsonResponse(success, message);
        return writeString(response, jsonResponse);
    }

    private Mono<Void> sendRedirect(ServerHttpResponse response, String redirectUrl) {
        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().setLocation(URI.create(redirectUrl));
        return response.setComplete();
    }

    private void clearBrowserAuthCache(ServerHttpResponse response) {
        response.getHeaders().set(HttpHeaders.WWW_AUTHENTICATE, "Basic realm=\"NextDoc4j API Documentation\"");
        setNoCacheHeaders(response);
    }

    private void setNoCacheHeaders(ServerHttpResponse response) {
        HttpHeaders headers = response.getHeaders();
        headers.set(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        headers.set(HttpHeaders.PRAGMA, "no-cache");
        headers.set(HttpHeaders.EXPIRES, "0");
    }

    private Mono<Void> writeString(ServerHttpResponse response, String content) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
    }

    private String loadLoginPageFromResources() {
        try {
            String htmlTemplate = NextDoc4jResourceUtils.readResourceContent(DOC_LOGIN, resourceLoader);
            if (htmlTemplate == null) {
                throw new RuntimeException("无法加载登录页面模板");
            }

            if (!NextDoc4jBasicAuthUtils.isTemplateWithPlaceholders(htmlTemplate)) {
                return htmlTemplate;
            }
            return processTemplateWithPlaceholders(htmlTemplate);
        } catch (Exception e) {
            throw new RuntimeException("加载登录页面资源失败: " + e.getMessage(), e);
        }
    }

    private String processTemplateWithPlaceholders(String htmlTemplate) {
        String logo = "";
        String title = NextDoc4jBasicAuthUtils.DEFAULT_LOGIN_TITLE;

        if (extension != null && extension.isEnabled()) {
            NextDoc4jBrand brand = extension.getBrand();
            if (brand != null) {
                logo = NextDoc4jResourceUtils.resolveLogo(brand.getLogo(), resourceLoader);
                if (StringUtils.hasText(brand.getTitle())) {
                    title = brand.getTitle();
                }
            }
        }

        if (NextDoc4jBasicAuthUtils.DEFAULT_LOGIN_TITLE.equals(title) && openAPI != null && openAPI.getInfo() != null) {
            String apiTitle = openAPI.getInfo().getTitle();
            if (StringUtils.hasText(apiTitle)) {
                title = apiTitle;
            }
        }

        if (StringUtils.hasText(logo)) {
            logo = NextDoc4jResourceUtils.ensureDataUrlFormat(logo);
            htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "LOGO_SRC_PLACEHOLDER", logo);
            htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "LOGO_CLASS_PLACEHOLDER", StringUtils.hasText(title)
                ? ""
                : "logo-only");
            htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "TITLE_CLASS_PLACEHOLDER", "with-logo");
        } else {
            htmlTemplate = NextDoc4jBasicAuthUtils.removeLogoContainer(htmlTemplate);
            htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "TITLE_CLASS_PLACEHOLDER", "");
        }

        htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "TITLE_PLACEHOLDER", NextDoc4jResourceUtils.escapeHtml(title));
        htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "${title}", NextDoc4jResourceUtils.escapeHtml(title));
        return htmlTemplate;
    }
}
