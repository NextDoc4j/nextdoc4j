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
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;

import java.net.URI;

/**
 * NextDoc4j 网关路由元数据解析器接口
 * <p>
 * 用于从路由定义中提取文档路径和显示名称
 * </p>
 *
 * @author echo
 * @since 1.2.0
 */
public interface NextDoc4jGatewayRouteMetadataResolver {

    /**
     * 从路由定义中提取文档路径
     *
     * @param route 路由定义
     * @return 文档路径（如 /user/v3/api-docs）
     */
    String extractDocPath(RouteDefinition route);

    /**
     * 从路由定义中解析显示名称
     *
     * @param route 路由定义
     * @return 显示名称
     */
    String resolveDisplayName(RouteDefinition route);

    /**
     * 从 URI 提取服务名
     *
     * @param route 路由定义
     * @return 服务名（如 user-service）
     */
    default String extractServiceNameFromUri(RouteDefinition route) {
        URI uri = route.getUri();
        if (uri == null) {
            return null;
        }

        String schemeSpecificPart = uri.getSchemeSpecificPart();
        // lb://USER-SERVICE → USER-SERVICE
        if (schemeSpecificPart != null && schemeSpecificPart.startsWith("lb://")) {
            return schemeSpecificPart.substring(5);
        }
        return null;
    }

    /**
     * 格式化显示名称（首字母大写，移除常见后缀）
     *
     * @param routeId 路由 ID
     * @return 格式化后的显示名称
     */
    default String formatDisplayName(String routeId) {
        if (routeId == null || routeId.isEmpty()) {
            return "";
        }

        // 移除常见后缀
        String name = routeId.replace("-service", "")
            .replace("-Service", "")
            .replace("_service", "")
            .replace("-api", "")
            .replace("-Api", "")
            .replace("-API", "")
            .replace("-", " ")
            .replace("_", " ");

        // 首字母大写
        if (!name.isEmpty()) {
            name = Character.toUpperCase(name.charAt(0)) + name.substring(1);
        }
        return name;
    }

    /**
     * 获取配置属性
     */
    GatewayDocProperties getProperties();
}
