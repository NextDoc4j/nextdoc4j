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
package top.nextdoc4j.plugin.gateway.provider;

import org.springdoc.core.properties.AbstractSwaggerUiConfigProperties;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.enums.DocPathStrategy;
import top.nextdoc4j.plugin.gateway.filter.NextDoc4jGatewayRouteFilter;
import top.nextdoc4j.plugin.gateway.model.ServiceConfig;
import top.nextdoc4j.plugin.gateway.resolver.NextDoc4jGatewayRouteMetadataResolver;

import java.util.Collections;
import java.util.List;

/**
 * Gateway 路由文档提供者
 * <p>
 * 从 RouteDefinitionLocator 中自动发现网关配置的路由，
 * 转换为 SwaggerUrl 供 SpringDoc 使用
 * </p>
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewayRouteDocProvider {

    private final RouteDefinitionLocator routeDefinitionLocator;
    private final GatewayDocProperties properties;
    private final NextDoc4jGatewayRouteFilter routeFilter;
    private final NextDoc4jGatewayRouteMetadataResolver metadataResolver;

    public GatewayRouteDocProvider(RouteDefinitionLocator routeDefinitionLocator, GatewayDocProperties properties) {
        this(routeDefinitionLocator, properties, null, null);
    }

    public GatewayRouteDocProvider(RouteDefinitionLocator routeDefinitionLocator,
                                   GatewayDocProperties properties,
                                   NextDoc4jGatewayRouteFilter routeFilter,
                                   NextDoc4jGatewayRouteMetadataResolver metadataResolver) {
        this.routeDefinitionLocator = routeDefinitionLocator;
        this.properties = properties;
        this.routeFilter = routeFilter;
        this.metadataResolver = metadataResolver;
    }

    /**
     * 获取自动发现的服务 Swagger URL（响应式）
     *
     * @return Swagger URL 流
     */
    public Flux<AbstractSwaggerUiConfigProperties.SwaggerUrl> getAutoDiscoveredUrls() {
        if (!properties.isAutoDiscovery()) {
            return Flux.empty();
        }

        if (properties.getDocPathStrategy() == DocPathStrategy.MANUAL_ONLY) {
            return Flux.empty();
        }

        return routeDefinitionLocator.getRouteDefinitions()
            .filter(route -> routeFilter != null ? routeFilter.test(route, properties) : isValidRoute(route))
            .map(this::convertToSwaggerUrl);
    }

    /**
     * 获取自动发现的服务 Swagger URL（阻塞）
     *
     * @return Swagger URL 列表
     */
    public List<AbstractSwaggerUiConfigProperties.SwaggerUrl> getAutoDiscoveredUrlsBlocking() {
        return getAutoDiscoveredUrls().collectList().block();
    }

    /**
     * 获取手动配置的服务 Swagger URL
     *
     * @return Swagger URL 列表
     */
    public List<AbstractSwaggerUiConfigProperties.SwaggerUrl> getManualConfiguredUrls() {
        List<ServiceConfig> services = properties.getServices();
        if (CollectionUtils.isEmpty(services)) {
            return Collections.emptyList();
        }

        return services.stream()
            .filter(this::isValidServiceConfig)
            .map(this::convertServiceConfigToSwaggerUrl)
            .toList();
    }

    /**
     * 判断手动配置是否有效
     */
    private boolean isValidServiceConfig(ServiceConfig config) {
        return StringUtils.hasText(config.getName()) && StringUtils.hasText(config.getUrl());
    }

    /**
     * 将手动配置转换为 SwaggerUrl
     */
    private AbstractSwaggerUiConfigProperties.SwaggerUrl convertServiceConfigToSwaggerUrl(ServiceConfig config) {
        AbstractSwaggerUiConfigProperties.SwaggerUrl swaggerUrl = new AbstractSwaggerUiConfigProperties.SwaggerUrl();
        swaggerUrl.setName(config.getName());
        swaggerUrl.setUrl(config.getUrl());
        return swaggerUrl;
    }

    /**
     * 判断路由是否有效（兼容旧版本）
     */
    private boolean isValidRoute(RouteDefinition route) {
        String routeId = route.getId();

        if (properties.getExcludeRoutes().contains(routeId)) {
            return false;
        }

        if (routeId.startsWith("CompositeDiscoveryClient_")) {
            return false;
        }

        if (routeId.startsWith("ReactiveCompositeDiscoveryClient_")) {
            return false;
        }

        boolean hasPathPredicate = route.getPredicates().stream().anyMatch(p -> "Path".equalsIgnoreCase(p.getName()));

        if (!hasPathPredicate) {
            return false;
        }

        return true;
    }

    /**
     * 将路由定义转换为 SwaggerUrl
     */
    private AbstractSwaggerUiConfigProperties.SwaggerUrl convertToSwaggerUrl(RouteDefinition route) {
        String displayName;
        String docUrl;

        if (metadataResolver != null) {
            displayName = metadataResolver.resolveDisplayName(route);
            docUrl = metadataResolver.extractDocPath(route);
        } else {
            // 兼容旧版本逻辑
            String routeId = route.getId();
            displayName = formatDisplayName(routeId);
            docUrl = extractContextPath(route) + properties.getDocPath();
        }

        AbstractSwaggerUiConfigProperties.SwaggerUrl swaggerUrl = new AbstractSwaggerUiConfigProperties.SwaggerUrl();
        swaggerUrl.setName(displayName);
        swaggerUrl.setUrl(docUrl);
        return swaggerUrl;
    }

    /**
     * 从路由定义中提取上下文路径（兼容旧版本）
     */
    private String extractContextPath(RouteDefinition route) {
        return route.getPredicates()
            .stream()
            .filter(p -> "Path".equalsIgnoreCase(p.getName()))
            .flatMap(p -> p.getArgs().values().stream())
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
            .orElse("");
    }

    /**
     * 格式化显示名称（兼容旧版本）
     */
    private String formatDisplayName(String routeId) {
        String name = routeId.replace("-service", "").replace("-", " ").replace("_", " ");
        if (!name.isEmpty()) {
            name = Character.toUpperCase(name.charAt(0)) + name.substring(1);
        }
        return name;
    }

    public NextDoc4jGatewayRouteFilter getRouteFilter() {
        return routeFilter;
    }

    public NextDoc4jGatewayRouteMetadataResolver getMetadataResolver() {
        return metadataResolver;
    }
}
