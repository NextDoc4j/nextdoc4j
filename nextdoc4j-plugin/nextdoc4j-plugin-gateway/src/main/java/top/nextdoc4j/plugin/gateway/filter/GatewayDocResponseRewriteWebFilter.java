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
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
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
import reactor.core.scheduler.Schedulers;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.customizer.GatewaySwaggerConfigCustomizer;
import top.nextdoc4j.plugin.gateway.resolver.NextDoc4jGatewayRouteMetadataResolver;
import top.nextdoc4j.plugin.gateway.resolver.NextDoc4jGatewayServiceContextPathResolver;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 网关文档响应重写过滤器
 * <p>
 * 处理两类响应：
 * <ul>
 * <li>OpenAPI 文档：合并网关全局安全配置（服务配置优先）并修正 servers.url</li>
 * <li>swagger-config：补充服务可用性状态与网关扩展字段</li>
 * </ul>
 *
 * @author echo
 * @since 1.1.7
 */
public class GatewayDocResponseRewriteWebFilter implements WebFilter {

    private static final Duration ROUTE_TIMEOUT = Duration.ofMillis(1500);
    private static final String SWAGGER_CONFIG_SUFFIX = NextDoc4jFilterConstant.BlockedPaths.API_DOCS + "/swagger-config";

    private final GatewayDocProperties properties;
    private final ObjectMapper objectMapper;
    private final RouteDefinitionLocator routeDefinitionLocator;
    private final NextDoc4jGatewayRouteFilter routeFilter;
    private final NextDoc4jGatewayRouteMetadataResolver metadataResolver;
    private final NextDoc4jGatewayServiceContextPathResolver contextPathResolver;
    private final ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider;

    public GatewayDocResponseRewriteWebFilter(GatewayDocProperties properties,
                                              ObjectMapper objectMapper,
                                              RouteDefinitionLocator routeDefinitionLocator,
                                              NextDoc4jGatewayRouteFilter routeFilter,
                                              NextDoc4jGatewayRouteMetadataResolver metadataResolver,
                                              NextDoc4jGatewayServiceContextPathResolver contextPathResolver,
                                              ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.routeDefinitionLocator = routeDefinitionLocator;
        this.routeFilter = routeFilter;
        this.metadataResolver = metadataResolver;
        this.contextPathResolver = contextPathResolver;
        this.swaggerConfigCustomizerProvider = swaggerConfigCustomizerProvider;
    }

    @Override
    public Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull WebFilterChain chain) {
        if (!properties.isEnabled()) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();
        Mono<Void> refreshMono = Mono.empty();
        if (isSwaggerConfig(path)) {
            GatewaySwaggerConfigCustomizer customizer = swaggerConfigCustomizerProvider.getIfAvailable();
            if (customizer != null) {
                refreshMono = customizer.refreshUrlsAsync();
            }
        }
        if (!shouldRewrite(path)) {
            return refreshMono.then(chain.filter(exchange));
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

        return refreshMono.then(chain.filter(exchange.mutate().response(decoratedResponse).build()));
    }

    private boolean shouldRewrite(String path) {
        return StringUtils.hasText(path) && path.contains(NextDoc4jFilterConstant.BlockedPaths.API_DOCS);
    }

    private boolean isJsonContent(MediaType mediaType) {
        if (mediaType == null) {
            return true;
        }
        return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType) || mediaType.getSubtype().contains("json");
    }

    private Mono<String> rewriteBody(String path, String sourceBody) {
        if (!StringUtils.hasText(sourceBody)) {
            return Mono.just(sourceBody);
        }

        try {
            JsonNode jsonNode = objectMapper.readTree(sourceBody);
            if (!(jsonNode instanceof ObjectNode objectNode)) {
                return Mono.just(sourceBody);
            }

            if (isSwaggerConfig(path)) {
                // swagger-config 保持 springdoc 原始结构，只在请求前刷新 urls 数据
                return Mono.just(sourceBody);
            }

            rewriteApiDocs(path, objectNode);
            return Mono.just(objectMapper.writeValueAsString(objectNode));
        } catch (Exception e) {
            return Mono.just(sourceBody);
        }
    }

    private boolean isSwaggerConfig(String path) {
        return StringUtils.hasText(path) && path.endsWith(SWAGGER_CONFIG_SUFFIX);
    }

    private void rewriteApiDocs(String path, ObjectNode root) {
        mergeGlobalSecuritySchemes(root);
        rewriteServers(path, root);
    }

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

    private void rewriteServers(String path, ObjectNode root) {
        int apiDocsIndex = path.indexOf(NextDoc4jFilterConstant.BlockedPaths.API_DOCS);
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

    private String normalizePrefix(String prefix) {
        String normalized = prefix.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized.replaceAll("/{2,}", "/");
    }

    private void rewriteSwaggerConfig(ObjectNode root, List<ServiceRuntimeInfo> runtimeInfoList) {
        ArrayNode urlsNode = root.withArray("urls");
        Map<String, ServiceRuntimeInfo> runtimeInfoByName = new LinkedHashMap<>();
        for (ServiceRuntimeInfo runtimeInfo : runtimeInfoList) {
            runtimeInfoByName.put(runtimeInfo.name, runtimeInfo);
        }

        Set<String> consumedDocUrls = new HashSet<>();
        ArrayNode runtimeServices = objectMapper.createArrayNode();

        for (JsonNode urlNode : urlsNode) {
            if (!(urlNode instanceof ObjectNode itemNode)) {
                continue;
            }

            String name = itemNode.path("name").asText();
            String currentUrl = itemNode.path("url").asText();
            ServiceRuntimeInfo info = runtimeInfoByName.get(name);
            if (info == null) {
                info = matchByUrl(currentUrl, runtimeInfoList);
            }

            if (info != null) {
                itemNode.put("url", info.docUrl);
                consumedDocUrls.add(info.docUrl);
                decorateServiceNode(itemNode, info);
            } else {
                decorateServiceNode(itemNode, ServiceRuntimeInfo.unknown());
            }
            runtimeServices.add(itemNode.deepCopy());
        }

        for (ServiceRuntimeInfo runtimeInfo : runtimeInfoList) {
            if (consumedDocUrls.contains(runtimeInfo.docUrl)) {
                continue;
            }
            ObjectNode appendNode = objectMapper.createObjectNode();
            appendNode.put("name", runtimeInfo.name);
            appendNode.put("url", runtimeInfo.docUrl);
            decorateServiceNode(appendNode, runtimeInfo);
            urlsNode.add(appendNode);
            runtimeServices.add(appendNode.deepCopy());
        }

        ObjectNode gatewayNode = objectMapper.createObjectNode();
        gatewayNode.set("globalSecuritySchemes", objectMapper.valueToTree(properties.getSecurity().getGlobalSchemes()));
        gatewayNode.set("services", runtimeServices);
        root.set("x-nextdoc4j-gateway", gatewayNode);
    }

    private Mono<List<ServiceRuntimeInfo>> loadRouteRuntimeInfoListAsync() {
        return Mono.fromCallable(this::loadRouteRuntimeInfoList)
            .subscribeOn(Schedulers.boundedElastic())
            .onErrorReturn(List.of());
    }

    private List<ServiceRuntimeInfo> loadRouteRuntimeInfoList() {
        List<ServiceRuntimeInfo> runtimeInfoList = new ArrayList<>();
        List<RouteDefinition> routeDefinitions = routeDefinitionLocator.getRouteDefinitions()
            .collectList()
            .block(ROUTE_TIMEOUT);
        if (routeDefinitions == null || routeDefinitions.isEmpty()) {
            return runtimeInfoList;
        }

        for (RouteDefinition route : routeDefinitions) {
            if (routeFilter != null && !routeFilter.test(route, properties)) {
                continue;
            }

            String gatewayPrefix = extractGatewayPrefix(route);
            if (!StringUtils.hasText(gatewayPrefix)) {
                continue;
            }

            String contextPath = contextPathResolver.resolveContextPath(route);
            String normalizedContextPath = StringUtils.hasText(contextPath) ? contextPath : "";
            String docUrl = buildDocUrl(gatewayPrefix, normalizedContextPath);

            String serviceId = contextPathResolver.extractServiceId(route);
            String displayName = metadataResolver.resolveDisplayName(route);
            if (!StringUtils.hasText(displayName)) {
                displayName = route.getId();
            }

            String status = "UNKNOWN";
            boolean disabled = false;
            String reason = null;

            if (StringUtils.hasText(serviceId)) {
                boolean available = contextPathResolver.isServiceAvailable(serviceId);
                status = available ? "UP" : "DOWN";
                disabled = !available;
                if (!available) {
                    reason = "service not discoverable";
                }
            }

            runtimeInfoList
                .add(new ServiceRuntimeInfo(displayName, gatewayPrefix, normalizePrefix(gatewayPrefix + properties
                    .getDocPath()), docUrl, serviceId, normalizedContextPath, status, disabled, reason));
        }
        return runtimeInfoList;
    }

    private void decorateServiceNode(ObjectNode itemNode, ServiceRuntimeInfo info) {
        itemNode.put("status", info.status);
        itemNode.put("disabled", info.disabled);
        itemNode.put("serviceId", info.serviceId);
        itemNode.put("contextPath", info.contextPath);
        if (StringUtils.hasText(info.reason)) {
            itemNode.put("reason", info.reason);
        } else {
            itemNode.remove("reason");
        }
    }

    private ServiceRuntimeInfo matchByUrl(String url, List<ServiceRuntimeInfo> runtimeInfoList) {
        if (!StringUtils.hasText(url)) {
            return null;
        }
        for (ServiceRuntimeInfo info : runtimeInfoList) {
            if (url.equals(info.docUrl) || url.equals(info.baseDocUrl)) {
                return info;
            }
        }
        return null;
    }

    private String extractGatewayPrefix(RouteDefinition route) {
        if (route == null || route.getPredicates() == null) {
            return null;
        }
        return route.getPredicates()
            .stream()
            .filter(predicate -> "Path".equalsIgnoreCase(predicate.getName()))
            .flatMap(predicate -> predicate.getArgs().values().stream())
            .findFirst()
            .map(path -> {
                if (path.endsWith("/**")) {
                    return path.substring(0, path.length() - 3);
                }
                if (path.endsWith("/*")) {
                    return path.substring(0, path.length() - 2);
                }
                return path;
            })
            .map(this::normalizePrefix)
            .orElse(null);
    }

    private String buildDocUrl(String gatewayPrefix, String contextPath) {
        StringBuilder urlBuilder = new StringBuilder();
        if (StringUtils.hasText(gatewayPrefix)) {
            urlBuilder.append(normalizePrefix(gatewayPrefix));
        }
        if (StringUtils.hasText(contextPath)) {
            urlBuilder.append(normalizePrefix(contextPath));
        }
        urlBuilder.append(properties.getDocPath());
        return normalizePrefix(urlBuilder.toString());
    }

    private static final class ServiceRuntimeInfo {

        private final String name;
        private final String gatewayPrefix;
        private final String baseDocUrl;
        private final String docUrl;
        private final String serviceId;
        private final String contextPath;
        private final String status;
        private final boolean disabled;
        private final String reason;

        private ServiceRuntimeInfo(String name,
                                   String gatewayPrefix,
                                   String baseDocUrl,
                                   String docUrl,
                                   String serviceId,
                                   String contextPath,
                                   String status,
                                   boolean disabled,
                                   String reason) {
            this.name = name;
            this.gatewayPrefix = gatewayPrefix;
            this.baseDocUrl = baseDocUrl;
            this.docUrl = docUrl;
            this.serviceId = serviceId;
            this.contextPath = contextPath;
            this.status = status;
            this.disabled = disabled;
            this.reason = reason;
        }

        private static ServiceRuntimeInfo unknown() {
            return new ServiceRuntimeInfo("", "", "", "", "", "", "UNKNOWN", false, null);
        }
    }
}
