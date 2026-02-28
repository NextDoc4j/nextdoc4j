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
package top.nextdoc4j.plugin.gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.jspecify.annotations.NonNull;
import org.reactivestreams.Publisher;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.constant.GatewayMetadataConstants;
import top.nextdoc4j.plugin.gateway.customizer.GatewaySwaggerConfigCustomizer;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 网关文档响应重写过滤器
 * <p>
 * 处理两类请求：
 * <ul>
 * <li>swagger-config：请求前刷新 URL 列表（不改响应结构）</li>
 * <li>OpenAPI 文档：合并网关全局安全配置并修正 servers.url</li>
 * </ul>
 *
 * @author echo
 * @since 1.1.7
 */
public class GatewayDocResponseRewriteWebFilter implements WebFilter {

    private final GatewayDocProperties properties;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider;

    /**
     * 创建文档重写过滤器。
     */
    public GatewayDocResponseRewriteWebFilter(GatewayDocProperties properties,
                                              ObjectMapper objectMapper,
                                              ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.swaggerConfigCustomizerProvider = swaggerConfigCustomizerProvider;
    }

    @Override
    public Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull WebFilterChain chain) {
        if (!properties.isEnabled()) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();
        if (isSwaggerConfig(path)) {
            GatewaySwaggerConfigCustomizer customizer = swaggerConfigCustomizerProvider.getIfAvailable();
            Mono<Void> refreshMono = customizer != null ? customizer.refreshUrlsAsync() : Mono.empty();
            return refreshMono.then(chain.filter(exchange));
        }

        if (!shouldRewrite(path)) {
            return chain.filter(exchange);
        }

        ServerHttpResponse originalResponse = exchange.getResponse();
        DataBufferFactory dataBufferFactory = originalResponse.bufferFactory();

        ServerHttpResponseDecorator decoratedResponse = new ServerHttpResponseDecorator(originalResponse) {
            @Override
            public Mono<Void> writeWith(@NonNull Publisher<? extends DataBuffer> body) {
                if (!isJsonContent(getHeaders().getContentType())) {
                    return super.writeWith(body);
                }

                Flux<? extends DataBuffer> fluxBody = Flux.from(body);
                return DataBufferUtils.join(fluxBody).flatMap(dataBuffer -> {
                    byte[] content = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(content);
                    DataBufferUtils.release(dataBuffer);

                    String sourceBody = new String(content, StandardCharsets.UTF_8);
                    return rewriteBody(path, sourceBody).flatMap(rewrittenBody -> {
                        byte[] rewrittenBytes = rewrittenBody.getBytes(StandardCharsets.UTF_8);
                        getHeaders().setContentLength(rewrittenBytes.length);
                        return super.writeWith(Mono.just(dataBufferFactory.wrap(rewrittenBytes)));
                    });
                });
            }

            @Override
            public Mono<Void> writeAndFlushWith(@NonNull Publisher<? extends Publisher<? extends DataBuffer>> body) {
                return writeWith(Flux.from(body).flatMapSequential(publisher -> publisher));
            }
        };

        return chain.filter(exchange.mutate().response(decoratedResponse).build());
    }

    /**
     * 判断当前请求是否需要改写 OpenAPI 响应。
     */
    private boolean shouldRewrite(String path) {
        return StringUtils.hasText(path) && path.contains(GatewayMetadataConstants.API_DOCS_PATH);
    }

    /**
     * 判断响应是否是 JSON 类型。
     */
    private boolean isJsonContent(MediaType mediaType) {
        if (mediaType == null) {
            return true;
        }
        return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType) || mediaType.getSubtype().contains("json");
    }

    /**
     * 改写 OpenAPI 文档响应内容。
     */
    private Mono<String> rewriteBody(String path, String sourceBody) {
        if (!StringUtils.hasText(sourceBody)) {
            return Mono.just(sourceBody);
        }

        try {
            JsonNode jsonNode = objectMapper.readTree(sourceBody);
            if (!(jsonNode instanceof ObjectNode objectNode)) {
                return Mono.just(sourceBody);
            }

            rewriteApiDocs(path, objectNode);
            return Mono.just(objectMapper.writeValueAsString(objectNode));
        } catch (Exception e) {
            return Mono.just(sourceBody);
        }
    }

    /**
     * 判断是否为 swagger-config 请求。
     */
    private boolean isSwaggerConfig(String path) {
        return StringUtils.hasText(path) && path.endsWith(GatewayMetadataConstants.SWAGGER_CONFIG_SUFFIX);
    }

    /**
     * 改写 OpenAPI 文档（不影响 swagger-config）。
     */
    private void rewriteApiDocs(String path, ObjectNode root) {
        mergeGlobalSecuritySchemes(root);
        rewriteServers(path, root);
    }

    /**
     * 合并全局安全定义到 OpenAPI components.securitySchemes。
     */
    private void mergeGlobalSecuritySchemes(ObjectNode root) {
        Map<String, SecurityScheme> globalSchemes = properties.getSecurity().getGlobalSchemes();
        if (globalSchemes == null || globalSchemes.isEmpty()) {
            return;
        }

        ObjectNode componentsNode = root.with("components");
        ObjectNode localSecuritySchemesNode = componentsNode.with("securitySchemes");
        ObjectNode mergedSecuritySchemesNode = objectMapper.createObjectNode();

        globalSchemes.forEach((name, scheme) -> mergedSecuritySchemesNode.set(name, objectMapper.valueToTree(scheme)));
        localSecuritySchemesNode.fields()
            .forEachRemaining(entry -> mergedSecuritySchemesNode.set(entry.getKey(), entry.getValue()));
        componentsNode.set("securitySchemes", mergedSecuritySchemesNode);

        JsonNode securityNode = root.get("security");
        boolean needInjectGlobalSecurity = properties.getSecurity()
            .isApplyGlobalRequirement() && (securityNode == null || !securityNode.isArray() || securityNode.isEmpty());
        if (!needInjectGlobalSecurity) {
            return;
        }

        ArrayNode globalSecurityArray = objectMapper.createArrayNode();
        ObjectNode securityRequirement = objectMapper.createObjectNode();
        mergedSecuritySchemesNode.fieldNames()
            .forEachRemaining(name -> securityRequirement.set(name, objectMapper.createArrayNode()));
        globalSecurityArray.add(securityRequirement);
        root.set("security", globalSecurityArray);
    }

    /**
     * 根据当前请求路径修正 servers.url。
     */
    private void rewriteServers(String path, ObjectNode root) {
        int apiDocsIndex = path.indexOf(GatewayMetadataConstants.API_DOCS_PATH);
        if (apiDocsIndex <= 0) {
            return;
        }

        String serverPrefix = path.substring(0, apiDocsIndex);
        if (!StringUtils.hasText(serverPrefix)) {
            return;
        }

        String normalizedPrefix = normalizePrefix(serverPrefix);
        ArrayNode serversNode = objectMapper.createArrayNode();
        ObjectNode serverNode = objectMapper.createObjectNode();
        serverNode.put("url", normalizedPrefix);
        serversNode.add(serverNode);
        root.set("servers", serversNode);
    }

    /**
     * 归一化路径前缀，消除重复斜杠。
     */
    private String normalizePrefix(String prefix) {
        String normalized = prefix.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized.replaceAll(GatewayMetadataConstants.MULTIPLE_SLASH_PATTERN, "/");
    }
}
