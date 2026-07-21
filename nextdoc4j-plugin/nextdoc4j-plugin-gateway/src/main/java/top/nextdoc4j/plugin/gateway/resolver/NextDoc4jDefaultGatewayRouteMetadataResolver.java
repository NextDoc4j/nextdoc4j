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

import org.springframework.util.StringUtils;
import top.nextdoc4j.core.gateway.enums.DocPathStrategy;
import top.nextdoc4j.core.gateway.enums.NameResolveStrategy;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.constant.GatewayMetadataConstants;
import top.nextdoc4j.plugin.gateway.model.GatewayFilterDefinition;
import top.nextdoc4j.plugin.gateway.model.GatewayRouteDefinition;

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
    public String extractDocPath(GatewayRouteDefinition route) {
        DocPathStrategy strategy = properties.getDocPathStrategy();

        return switch (strategy) {
            case METADATA -> extractFromMetadata(route);
            case ROUTE_PREDICATE -> extractFromPathPredicate(route);
            case MANUAL_ONLY -> null;
            case AUTO -> extractAuto(route);
        };
    }

    @Override
    public String resolveDisplayName(GatewayRouteDefinition route) {
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
    private String extractAuto(GatewayRouteDefinition route) {
        Map<String, Object> metadata = route.getMetadata();
        String serviceContextPath = resolveServiceContextPath(route);

        // 1. 优先从 metadata.nextdoc4j.doc-path 获取
        String docPath = getNextDoc4jDocPath(metadata);
        if (StringUtils.hasText(docPath)) {
            return mergeContextPathIntoDocPath(docPath, serviceContextPath);
        }

        // 2. 从 metadata.springdoc.path 获取
        docPath = getMetadataValue(metadata, GatewayMetadataConstants.SPRINGDOC_PATH);
        if (StringUtils.hasText(docPath)) {
            return mergeContextPathIntoDocPath(docPath, serviceContextPath);
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
    private String extractFromMetadata(GatewayRouteDefinition route) {
        Map<String, Object> metadata = route.getMetadata();
        String serviceContextPath = resolveServiceContextPath(route);

        String docPath = getNextDoc4jDocPath(metadata);
        if (StringUtils.hasText(docPath)) {
            return mergeContextPathIntoDocPath(docPath, serviceContextPath);
        }

        docPath = getMetadataValue(metadata, GatewayMetadataConstants.SPRINGDOC_PATH);
        if (StringUtils.hasText(docPath)) {
            return mergeContextPathIntoDocPath(docPath, serviceContextPath);
        }

        return null;
    }

    /**
     * 从 Path 谓词提取文档路径
     */
    private String extractFromPathPredicate(GatewayRouteDefinition route) {
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
            .map(routePrefix -> resolveRoutePredicateDocPath(route, routePrefix, serviceContextPath))
            .orElse(null);
    }

    /**
     * 根据路由前缀、StripPrefix 和服务 context-path 推导网关外部文档路径。
     *
     * @param route              网关路由定义
     * @param routePrefix        Path 谓词提取出的静态路由前缀
     * @param serviceContextPath 下游服务 context-path
     * @return 浏览器通过网关访问的文档路径
     */
    private String resolveRoutePredicateDocPath(GatewayRouteDefinition route,
                                                String routePrefix,
                                                String serviceContextPath) {
        Integer stripPrefixParts = resolveStripPrefixParts(route);
        if (stripPrefixParts == null) {
            return appendPathSegments(mergeRoutePrefixAndContextPath(routePrefix, serviceContextPath), properties
                .getDocPath());
        }

        String removedPrefix = extractLeadingPathSegments(routePrefix, stripPrefixParts);
        String candidate = appendPathSegments(removedPrefix, serviceContextPath, properties.getDocPath());
        if (matchesRoutePrefix(candidate, routePrefix)) {
            return candidate;
        }
        return appendPathSegments(mergeRoutePrefixAndContextPath(routePrefix, serviceContextPath), properties
            .getDocPath());
    }

    /**
     * 从路由过滤器中解析 StripPrefix 的 parts 参数。
     *
     * @param route 网关路由定义
     * @return 非负 parts；未配置或配置非法时返回 {@code null}
     */
    private Integer resolveStripPrefixParts(GatewayRouteDefinition route) {
        if (route == null || route.getFilters() == null) {
            return null;
        }
        for (GatewayFilterDefinition filter : route.getFilters()) {
            if (filter == null || !"StripPrefix".equalsIgnoreCase(filter.getName()) || filter.getArgs() == null) {
                continue;
            }
            String value = filter.getArgs().get("parts");
            if (!StringUtils.hasText(value)) {
                value = filter.getArgs().get("_genkey_0");
            }
            if (!StringUtils.hasText(value) && !filter.getArgs().isEmpty()) {
                value = filter.getArgs().values().iterator().next();
            }
            try {
                int parts = Integer.parseInt(value);
                return parts >= 0 ? parts : null;
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    /**
     * 提取路径开头指定数量的路径段，用于还原 StripPrefix 删除的网关外部前缀。
     *
     * @param path  路由静态前缀
     * @param count 需要提取的路径段数量
     * @return 提取后的路径前缀；数量为零时返回空字符串
     */
    private String extractLeadingPathSegments(String path, int count) {
        if (count <= 0 || !StringUtils.hasText(path)) {
            return "";
        }
        String normalizedPath = appendPathSegments(path);
        String[] segments = normalizedPath.substring(1).split("/");
        int segmentCount = Math.min(count, segments.length);
        StringBuilder prefix = new StringBuilder();
        for (int index = 0; index < segmentCount; index++) {
            prefix.append('/').append(segments[index]);
        }
        return prefix.toString();
    }

    /**
     * 合并路由前缀与服务 context-path，并避免相同路径被重复追加。
     *
     * @param routePrefix        网关 Path 谓词前缀
     * @param serviceContextPath 下游服务 context-path
     * @return 合并后的外部服务路径前缀
     */
    private String mergeRoutePrefixAndContextPath(String routePrefix, String serviceContextPath) {
        String normalizedRoutePrefix = appendPathSegments(routePrefix);
        if (!StringUtils.hasText(serviceContextPath)) {
            return normalizedRoutePrefix;
        }
        String normalizedContextPath = appendPathSegments(serviceContextPath);
        if (normalizedRoutePrefix.equals(normalizedContextPath) || normalizedRoutePrefix
            .endsWith(normalizedContextPath)) {
            return normalizedRoutePrefix;
        }
        return appendPathSegments(normalizedRoutePrefix, normalizedContextPath);
    }

    /**
     * 判断候选文档路径是否仍位于 Path 谓词的静态路由前缀下。
     *
     * @param candidate   候选网关外部文档路径
     * @param routePrefix Path 谓词静态前缀
     * @return 候选路径匹配路由前缀时返回 {@code true}
     */
    private boolean matchesRoutePrefix(String candidate, String routePrefix) {
        String normalizedCandidate = appendPathSegments(candidate);
        String normalizedRoutePrefix = appendPathSegments(routePrefix);
        return normalizedCandidate.equals(normalizedRoutePrefix) || normalizedCandidate
            .startsWith(normalizedRoutePrefix + "/");
    }

    /**
     * 自动模式解析显示名称
     */
    private String resolveAuto(GatewayRouteDefinition route) {
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
    private String resolveFromMetadata(GatewayRouteDefinition route) {
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
    private String resolveFromUri(GatewayRouteDefinition route) {
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

    private String resolveServiceContextPath(GatewayRouteDefinition route) {
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
        String mergedPath = pathBuilder.toString().replaceAll(GatewayMetadataConstants.MULTIPLE_SLASH_PATTERN, "/");
        return StringUtils.hasText(mergedPath) ? mergedPath : "/";
    }

    /**
     * 将服务 context-path 合并到文档路径中（保持已有路径结构，不改变响应字段结构）
     * <p>
     * 示例：
     * /file/v3/api-docs + /bdca -> /file/bdca/v3/api-docs
     * /v3/api-docs + /bdca -> /bdca/v3/api-docs
     */
    private String mergeContextPathIntoDocPath(String docPath, String serviceContextPath) {
        if (!StringUtils.hasText(docPath)) {
            return docPath;
        }
        if (!StringUtils.hasText(serviceContextPath)) {
            return appendPathSegments(docPath);
        }

        String normalizedDocPath = appendPathSegments(docPath);
        String normalizedServiceContextPath = appendPathSegments(serviceContextPath);
        if ("/".equals(normalizedServiceContextPath) || normalizedDocPath
            .contains(normalizedServiceContextPath + "/") || normalizedDocPath.equals(normalizedServiceContextPath)) {
            return normalizedDocPath;
        }

        String normalizedDocSuffix = appendPathSegments(properties.getDocPath());
        if (normalizedDocPath.endsWith(normalizedDocSuffix)) {
            String prefix = normalizedDocPath.substring(0, normalizedDocPath.length() - normalizedDocSuffix.length());
            return appendPathSegments(prefix, normalizedServiceContextPath, normalizedDocSuffix);
        }

        return appendPathSegments(normalizedDocPath, normalizedServiceContextPath);
    }
}
