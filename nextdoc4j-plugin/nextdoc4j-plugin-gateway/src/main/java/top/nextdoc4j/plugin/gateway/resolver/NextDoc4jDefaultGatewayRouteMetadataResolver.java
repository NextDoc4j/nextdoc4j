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

import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.util.StringUtils;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.constant.GatewayMetadataConstants;
import top.nextdoc4j.plugin.gateway.enums.DocPathStrategy;
import top.nextdoc4j.plugin.gateway.enums.NameResolveStrategy;

import java.util.Map;

/**
 * NextDoc4j 默认路由元数据解析器实现
 *
 * @author echo
 * @since 1.2.0
 */
public class NextDoc4jDefaultGatewayRouteMetadataResolver implements NextDoc4jGatewayRouteMetadataResolver {

    private final GatewayDocProperties properties;
    private final NextDoc4jGatewayServiceContextPathResolver serviceContextPathResolver;

    public NextDoc4jDefaultGatewayRouteMetadataResolver(GatewayDocProperties properties) {
        this(properties, null);
    }

    public NextDoc4jDefaultGatewayRouteMetadataResolver(GatewayDocProperties properties,
                                                        NextDoc4jGatewayServiceContextPathResolver serviceContextPathResolver) {
        this.properties = properties;
        this.serviceContextPathResolver = serviceContextPathResolver;
    }

    @Override
    public String extractDocPath(RouteDefinition route) {
        DocPathStrategy strategy = properties.getDocPathStrategy();

        return switch (strategy) {
            case METADATA -> extractFromMetadata(route);
            case ROUTE_PREDICATE -> extractFromPathPredicate(route);
            case MANUAL_ONLY -> null;
            case AUTO -> extractAuto(route);
        };
    }

    @Override
    public String resolveDisplayName(RouteDefinition route) {
        String routeId = route.getId();
        NameResolveStrategy strategy = properties.getNameResolveStrategy();

        return switch (strategy) {
            case METADATA -> resolveFromMetadata(route);
            case URI -> resolveFromUri(route);
            case ROUTE_ID -> formatDisplayName(routeId);
            case AUTO -> resolveAuto(route);
        };
    }

    @Override
    public GatewayDocProperties getProperties() {
        return properties;
    }

    /**
     * 自动模式提取文档路径
     */
    private String extractAuto(RouteDefinition route) {
        Map<String, Object> metadata = route.getMetadata();

        // 1. 优先从 metadata.nextdoc4j.doc-path 获取
        String docPath = getNextDoc4jDocPath(metadata);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        // 2. 从 metadata.springdoc.path 获取
        docPath = getMetadataValue(metadata, GatewayMetadataConstants.SPRINGDOC_PATH);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        // 3. 从 Path 谓词提取（这是网关实际的路由路径）
        docPath = extractFromPathPredicate(route);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        // 4. 尝试从 URI 提取服务名
        String serviceName = extractServiceNameFromUri(route);
        if (StringUtils.hasText(serviceName)) {
            return appendPathSegments("/" + serviceName, resolveServiceContextPath(route), properties.getDocPath());
        }

        // 5. 从路由 ID 推断
        return appendPathSegments("/" + route.getId(), resolveServiceContextPath(route), properties.getDocPath());
    }

    /**
     * 从 metadata 提取文档路径
     */
    private String extractFromMetadata(RouteDefinition route) {
        Map<String, Object> metadata = route.getMetadata();

        String docPath = getNextDoc4jDocPath(metadata);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        docPath = getMetadataValue(metadata, GatewayMetadataConstants.SPRINGDOC_PATH);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        return null;
    }

    /**
     * 从 Path 谓词提取文档路径
     */
    private String extractFromPathPredicate(RouteDefinition route) {
        String serviceContextPath = resolveServiceContextPath(route);
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
            .map(contextPath -> appendPathSegments(contextPath, serviceContextPath, properties.getDocPath()))
            .orElse(null);
    }

    /**
     * 自动模式解析显示名称
     */
    private String resolveAuto(RouteDefinition route) {
        String routeId = route.getId();
        Map<String, Object> metadata = route.getMetadata();

        // 1. 优先使用配置的映射
        String mappedName = properties.getNameMappings().get(routeId);
        if (StringUtils.hasText(mappedName)) {
            return mappedName;
        }

        // 2. 从 metadata.nextdoc4j.name 获取
        String metaName = getNextDoc4jName(metadata);
        if (StringUtils.hasText(metaName)) {
            return metaName;
        }

        // 3. 从 metadata.name 获取
        metaName = getMetadataValue(metadata, GatewayMetadataConstants.NAME);
        if (StringUtils.hasText(metaName)) {
            return metaName;
        }

        // 4. 从 URI 提取
        String nameFromUri = resolveFromUri(route);
        if (StringUtils.hasText(nameFromUri)) {
            return nameFromUri;
        }

        // 5. 格式化路由 ID
        return formatDisplayName(routeId);
    }

    /**
     * 从 metadata 解析显示名称
     */
    private String resolveFromMetadata(RouteDefinition route) {
        Map<String, Object> metadata = route.getMetadata();

        String name = getNextDoc4jName(metadata);
        if (StringUtils.hasText(name)) {
            return name;
        }

        name = getMetadataValue(metadata, GatewayMetadataConstants.NAME);
        if (StringUtils.hasText(name)) {
            return name;
        }

        return formatDisplayName(route.getId());
    }

    /**
     * 从 URI 解析显示名称
     */
    private String resolveFromUri(RouteDefinition route) {
        String serviceName = extractServiceNameFromUri(route);
        if (StringUtils.hasText(serviceName)) {
            return formatDisplayName(serviceName);
        }
        return null;
    }

    /**
     * 获取 nextdoc4j.doc-path（支持嵌套结构）
     * <p>
     * 支持两种 YAML 配置格式：
     * <pre>
     * # 扁平结构
     * metadata:
     * nextdoc4j.doc-path: /file/v3/api-docs
     *
     * # 嵌套结构
     * metadata:
     * nextdoc4j:
     * doc-path: /file/v3/api-docs
     * </pre>
     */
    private String getNextDoc4jDocPath(Map<String, Object> metadata) {
        // 先尝试扁平结构：metadata["nextdoc4j.doc-path"]
        String value = getMetadataValue(metadata, GatewayMetadataConstants.NEXTDOC4J_DOC_PATH);
        if (StringUtils.hasText(value)) {
            return value;
        }

        // 再尝试嵌套结构：metadata["nextdoc4j"]["doc-path"]
        return GatewayMetadataConstants.getNestedValue(metadata, GatewayMetadataConstants.NEXTDOC4J_PREFIX, "doc-path");
    }

    /**
     * 获取 nextdoc4j.name（支持嵌套结构）
     * <p>
     * 支持两种 YAML 配置格式：
     * <pre>
     * # 扁平结构
     * metadata:
     * nextdoc4j.name: 文件服务
     *
     * # 嵌套结构
     * metadata:
     * nextdoc4j:
     * name: 文件服务
     * </pre>
     */
    private String getNextDoc4jName(Map<String, Object> metadata) {
        // 先尝试扁平结构：metadata["nextdoc4j.name"]
        String value = getMetadataValue(metadata, GatewayMetadataConstants.NEXTDOC4J_NAME);
        if (StringUtils.hasText(value)) {
            return value;
        }

        // 再尝试嵌套结构：metadata["nextdoc4j"]["name"]
        return GatewayMetadataConstants
            .getNestedValue(metadata, GatewayMetadataConstants.NEXTDOC4J_PREFIX, GatewayMetadataConstants.NAME);
    }

    /**
     * 从 metadata 直接获取值（扁平结构）
     */
    private String getMetadataValue(Map<String, Object> metadata, String key) {
        if (metadata == null) {
            return null;
        }
        Object value = metadata.get(key);
        return value != null ? value.toString() : null;
    }

    private String resolveServiceContextPath(RouteDefinition route) {
        if (serviceContextPathResolver == null) {
            return "";
        }
        return serviceContextPathResolver.resolveContextPath(route);
    }

    private String appendPathSegments(String... segments) {
        StringBuilder pathBuilder = new StringBuilder();
        for (String segment : segments) {
            if (!StringUtils.hasText(segment)) {
                continue;
            }
            String value = segment.trim();
            if (!value.startsWith("/")) {
                value = "/" + value;
            }
            if (value.endsWith("/") && value.length() > 1) {
                value = value.substring(0, value.length() - 1);
            }
            pathBuilder.append(value);
        }
        String mergedPath = pathBuilder.toString().replaceAll("/{2,}", "/");
        return StringUtils.hasText(mergedPath) ? mergedPath : "/";
    }
}
