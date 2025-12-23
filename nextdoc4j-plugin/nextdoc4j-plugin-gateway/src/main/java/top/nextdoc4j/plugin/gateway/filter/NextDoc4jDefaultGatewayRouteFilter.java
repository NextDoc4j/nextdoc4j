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

import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.util.AntPathMatcher;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;

import java.util.List;

/**
 * NextDoc4j 默认路由过滤器实现
 *
 * @author echo
 * @since 1.2.0
 */
public class NextDoc4jDefaultGatewayRouteFilter implements NextDoc4jGatewayRouteFilter {

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    public boolean test(RouteDefinition route, GatewayDocProperties properties) {
        String routeId = route.getId();

        // 1. 检查排除列表（支持通配符）
        if (isExcluded(routeId, properties.getExcludeRoutes())) {
            return false;
        }

        // 2. 排除注册中心自动生成的路由
        if (isDiscoveryClientRoute(routeId)) {
            return false;
        }

        // 3. 必须有 Path 谓词
        boolean hasPathPredicate = route.getPredicates().stream().anyMatch(p -> "Path".equalsIgnoreCase(p.getName()));
        if (!hasPathPredicate) {
            return false;
        }

        // 4. 包含模式匹配（如果配置了）
        List<String> includePatterns = properties.getIncludePatterns();
        if (!includePatterns.isEmpty()) {
            return includePatterns.stream().anyMatch(pattern -> pathMatcher.match(pattern, routeId));
        }
        return true;
    }

    /**
     * 检查路由是否被排除（支持通配符匹配）
     */
    private boolean isExcluded(String routeId, List<String> excludePatterns) {
        if (excludePatterns.isEmpty()) {
            return false;
        }

        return excludePatterns.stream().anyMatch(pattern -> {
            if (pattern.contains("*")) {
                return pathMatcher.match(pattern, routeId);
            }
            return pattern.equals(routeId);
        });
    }

    /**
     * 判断是否为注册中心自动生成的路由
     */
    private boolean isDiscoveryClientRoute(String routeId) {
        return routeId != null && (routeId.startsWith("CompositeDiscoveryClient_") || routeId
            .startsWith("ReactiveCompositeDiscoveryClient_"));
    }
}
