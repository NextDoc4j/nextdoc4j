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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.util.StringUtils;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;

import java.util.Map;

/**
 * 默认路由元数据解析器实现
 *
 * @author echo
 * @since 1.2.0
 */
public class DefaultRouteMetadataResolver implements RouteMetadataResolver {

    private static final Logger log = LoggerFactory.getLogger(DefaultRouteMetadataResolver.class);

    private static final String METADATA_DOC_PATH = "nextdoc4j.doc-path";
    private static final String METADATA_NAME = "nextdoc4j.name";
    private static final String METADATA_SPRINGDOC_PATH = "springdoc.path";
    private static final String METADATA_NAME_ALT = "name";

    private final GatewayDocProperties properties;

    public DefaultRouteMetadataResolver(GatewayDocProperties properties) {
        this.properties = properties;
    }

    @Override
    public String extractDocPath(RouteDefinition route) {
        GatewayDocProperties.DocPathStrategy strategy = properties.getDocPathStrategy();

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
        GatewayDocProperties.NameResolveStrategy strategy = properties.getNameResolveStrategy();

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
        // 1. 优先从 metadata.nextdoc4j.doc-path 获取
        String docPath = getMetadataValue(route, METADATA_DOC_PATH);
        if (StringUtils.hasText(docPath)) {
            log.debug("DocPath from metadata.nextdoc4j.doc-path: {}", docPath);
            return docPath;
        }

        // 2. 从 metadata.springdoc.path 获取
        docPath = getMetadataValue(route, METADATA_SPRINGDOC_PATH);
        if (StringUtils.hasText(docPath)) {
            log.debug("DocPath from metadata.springdoc.path: {}", docPath);
            return docPath;
        }

        // 3. 从 Path 谓词提取（这是网关实际的路由路径）
        docPath = extractFromPathPredicate(route);
        if (StringUtils.hasText(docPath)) {
            log.debug("DocPath from Path predicate: {}", docPath);
            return docPath;
        }

        // 4. 尝试从 URI 提取服务名
        String serviceName = extractServiceNameFromUri(route);
        if (StringUtils.hasText(serviceName)) {
            String path = "/" + serviceName + properties.getDocPath();
            log.debug("DocPath from URI: {}", path);
            return path;
        }

        // 5. 从路由 ID 推断
        String path = "/" + route.getId() + properties.getDocPath();
        log.debug("DocPath from routeId: {}", path);
        return path;
    }

    /**
     * 从 metadata 提取文档路径
     */
    private String extractFromMetadata(RouteDefinition route) {
        String docPath = getMetadataValue(route, METADATA_DOC_PATH);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        docPath = getMetadataValue(route, METADATA_SPRINGDOC_PATH);
        if (StringUtils.hasText(docPath)) {
            return docPath;
        }

        return null;
    }

    /**
     * 从 Path 谓词提取文档路径
     */
    private String extractFromPathPredicate(RouteDefinition route) {
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
            .map(contextPath -> contextPath + properties.getDocPath())
            .orElse(null);
    }

    /**
     * 自动模式解析显示名称
     */
    private String resolveAuto(RouteDefinition route) {
        String routeId = route.getId();

        // 1. 优先使用配置的映射
        String mappedName = properties.getNameMappings().get(routeId);
        if (StringUtils.hasText(mappedName)) {
            log.debug("Name from nameMappings: {} -> {}", routeId, mappedName);
            return mappedName;
        }

        // 2. 从 metadata.nextdoc4j.name 获取
        String metaName = getMetadataValue(route, METADATA_NAME);
        if (StringUtils.hasText(metaName)) {
            log.debug("Name from metadata.nextdoc4j.name: {}", metaName);
            return metaName;
        }

        // 3. 从 metadata.name 获取
        metaName = getMetadataValue(route, METADATA_NAME_ALT);
        if (StringUtils.hasText(metaName)) {
            log.debug("Name from metadata.name: {}", metaName);
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
        String name = getMetadataValue(route, METADATA_NAME);
        if (StringUtils.hasText(name)) {
            return name;
        }

        name = getMetadataValue(route, METADATA_NAME_ALT);
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
     * 从 metadata 获取值
     */
    private String getMetadataValue(RouteDefinition route, String key) {
        Map<String, Object> metadata = route.getMetadata();
        if (metadata == null) {
            return null;
        }
        Object value = metadata.get(key);
        return value != null ? value.toString() : null;
    }
}
