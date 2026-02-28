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
package top.nextdoc4j.plugin.gateway.resolver;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.client.discovery.ReactiveDiscoveryClient;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.util.StringUtils;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.constant.GatewayMetadataConstants;

import java.net.URI;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gateway 服务 context-path 自动发现解析器
 *
 * @author echo
 * @since 1.1.7
 */
public class NextDoc4jGatewayServiceContextPathResolver {

    private static final Duration DISCOVERY_TIMEOUT = Duration.ofMillis(1200);

    private final GatewayDocProperties properties;
    private final ReactiveDiscoveryClient reactiveDiscoveryClient;
    private final DiscoveryClient discoveryClient;
    private final Map<String, String> contextPathCache = new ConcurrentHashMap<>();

    public NextDoc4jGatewayServiceContextPathResolver(GatewayDocProperties properties,
                                                      ObjectProvider<ReactiveDiscoveryClient> reactiveDiscoveryClientProvider,
                                                      ObjectProvider<DiscoveryClient> discoveryClientProvider) {
        this.properties = properties;
        this.reactiveDiscoveryClient = reactiveDiscoveryClientProvider.getIfAvailable();
        this.discoveryClient = discoveryClientProvider.getIfAvailable();
    }

    /**
     * 解析服务 context-path
     *
     * @param route 网关路由
     * @return context-path（如 /bdca），若不存在返回空字符串
     */
    public String resolveContextPath(RouteDefinition route) {
        if (route == null) {
            return "";
        }

        String metadataContextPath = resolveFromRouteMetadata(route.getMetadata());
        String serviceId = extractServiceId(route);
        if (!StringUtils.hasText(serviceId)) {
            return StringUtils.hasText(metadataContextPath) ? metadataContextPath : "";
        }

        String cachedContextPath = contextPathCache.get(serviceId);
        String resolvedContextPath = resolveFromDiscovery(serviceId);
        String latestContextPath = pickLatestContextPath(resolvedContextPath, metadataContextPath, cachedContextPath);
        if (StringUtils.hasText(latestContextPath)) {
            if (!latestContextPath.equals(cachedContextPath)) {
                contextPathCache.put(serviceId, latestContextPath);
            }
            return latestContextPath;
        }

        return cachedContextPath != null ? cachedContextPath : "";
    }

    /**
     * 判断服务是否可用（注册中心存在实例）
     *
     * @param serviceId 服务 ID
     * @return 是否可用
     */
    public boolean isServiceAvailable(String serviceId) {
        if (!StringUtils.hasText(serviceId)) {
            return false;
        }
        try {
            if (!getInstances(serviceId).isEmpty()) {
                return true;
            }

            String lowerCaseServiceId = serviceId.toLowerCase();
            if (!serviceId.equals(lowerCaseServiceId)) {
                return !getInstances(lowerCaseServiceId).isEmpty();
            }
            return false;
        } catch (Exception ignored) {
            return false;
        }
    }

    /**
     * 从路由定义提取服务 ID
     *
     * @param route 网关路由
     * @return 服务 ID
     */
    public String extractServiceId(RouteDefinition route) {
        if (route == null) {
            return null;
        }
        URI uri = route.getUri();
        if (uri == null || !StringUtils.hasText(uri.getScheme())) {
            return null;
        }

        if ("lb".equalsIgnoreCase(uri.getScheme())) {
            if (StringUtils.hasText(uri.getHost())) {
                return uri.getHost();
            }
            String ssp = uri.getSchemeSpecificPart();
            if (StringUtils.hasText(ssp) && ssp.startsWith("//")) {
                return ssp.substring(2);
            }
        }
        return null;
    }

    private String resolveFromRouteMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return "";
        }

        String metadataKey = properties.getContextPath().getMetadataKey();
        String contextPath = toStringValue(metadata.get(metadataKey));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = toStringValue(metadata.get(GatewayMetadataConstants.NEXTDOC4J_CONTEXT_PATH));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = toStringValue(metadata.get(GatewayMetadataConstants.CONTEXT_PATH));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = toStringValue(metadata.get(GatewayMetadataConstants.CONTEXT_PATH_CAMEL));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = toStringValue(metadata.get(GatewayMetadataConstants.CONTEXT_PATH_UNDERSCORE));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = toStringValue(metadata.get(GatewayMetadataConstants.SERVER_SERVLET_CONTEXT_PATH));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = toStringValue(metadata.get(GatewayMetadataConstants.SERVER_SERVLET_CONTEXT_PATH_CAMEL));
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        contextPath = GatewayMetadataConstants
            .getNestedValue(metadata, GatewayMetadataConstants.NEXTDOC4J_PREFIX, GatewayMetadataConstants.CONTEXT_PATH);
        if (StringUtils.hasText(contextPath)) {
            return normalizeContextPath(contextPath);
        }

        return "";
    }

    private String resolveFromDiscovery(String serviceId) {
        if (!StringUtils.hasText(serviceId)) {
            return "";
        }

        try {
            List<ServiceInstance> instances = getInstances(serviceId);
            if (instances.isEmpty() && !serviceId.equals(serviceId.toLowerCase())) {
                instances = getInstances(serviceId.toLowerCase());
            }
            if (instances == null || instances.isEmpty()) {
                return "";
            }

            for (ServiceInstance instance : instances) {
                Map<String, String> metadata = instance.getMetadata();
                if (metadata == null || metadata.isEmpty()) {
                    continue;
                }
                String contextPath = extractContextPathFromMetadata(metadata);
                if (StringUtils.hasText(contextPath)) {
                    return contextPath;
                }
            }
        } catch (Exception ignored) {
            return "";
        }

        return "";
    }

    private List<ServiceInstance> getInstances(String serviceId) {
        if (!StringUtils.hasText(serviceId)) {
            return Collections.emptyList();
        }

        if (reactiveDiscoveryClient != null) {
            try {
                List<ServiceInstance> instances = reactiveDiscoveryClient.getInstances(serviceId)
                    .collectList()
                    .block(DISCOVERY_TIMEOUT);
                if (instances != null) {
                    return instances;
                }
            } catch (Exception ignored) {
                // 尝试阻塞客户端兜底
            }
        }

        if (discoveryClient != null) {
            try {
                List<ServiceInstance> instances = discoveryClient.getInstances(serviceId);
                return instances != null ? instances : Collections.emptyList();
            } catch (Exception ignored) {
                return Collections.emptyList();
            }
        }

        return Collections.emptyList();
    }

    private String pickLatestContextPath(String discoveredContextPath,
                                         String metadataContextPath,
                                         String cachedContextPath) {
        if (StringUtils.hasText(discoveredContextPath)) {
            return discoveredContextPath;
        }
        if (StringUtils.hasText(metadataContextPath)) {
            return metadataContextPath;
        }
        if (StringUtils.hasText(cachedContextPath)) {
            return cachedContextPath;
        }
        return "";
    }

    private String extractContextPathFromMetadata(Map<String, String> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return "";
        }

        String metadataKey = properties.getContextPath().getMetadataKey();
        String value = metadata.get(metadataKey);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        value = metadata.get(GatewayMetadataConstants.NEXTDOC4J_CONTEXT_PATH);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        value = metadata.get(GatewayMetadataConstants.SERVER_SERVLET_CONTEXT_PATH);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        value = metadata.get(GatewayMetadataConstants.CONTEXT_PATH);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        value = metadata.get(GatewayMetadataConstants.CONTEXT_PATH_CAMEL);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        value = metadata.get(GatewayMetadataConstants.CONTEXT_PATH_UNDERSCORE);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        value = metadata.get(GatewayMetadataConstants.SERVER_SERVLET_CONTEXT_PATH_CAMEL);
        if (StringUtils.hasText(value)) {
            return normalizeContextPath(value);
        }

        return "";
    }

    private String normalizeContextPath(String contextPath) {
        if (!StringUtils.hasText(contextPath) || "/".equals(contextPath)) {
            return "";
        }
        String normalized = contextPath.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
    }
}
