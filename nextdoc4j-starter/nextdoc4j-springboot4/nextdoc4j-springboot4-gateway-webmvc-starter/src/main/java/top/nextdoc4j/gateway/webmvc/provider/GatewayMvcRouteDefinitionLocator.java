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
package top.nextdoc4j.gateway.webmvc.provider;

import org.springframework.cloud.gateway.server.mvc.config.GatewayMvcProperties;
import org.springframework.cloud.gateway.server.mvc.config.PredicateProperties;
import org.springframework.cloud.gateway.server.mvc.config.RouteProperties;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import top.nextdoc4j.plugin.gateway.model.GatewayPredicateDefinition;
import top.nextdoc4j.plugin.gateway.model.GatewayRouteDefinition;
import top.nextdoc4j.plugin.gateway.provider.NextDoc4jGatewayRouteDefinitionLocator;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * WebMvc 路由定义适配器。
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewayMvcRouteDefinitionLocator implements NextDoc4jGatewayRouteDefinitionLocator {

    private static final URI DEFAULT_ROUTE_URI = URI.create("lb://unknown-service");

    private final GatewayMvcProperties gatewayMvcProperties;

    public GatewayMvcRouteDefinitionLocator(GatewayMvcProperties gatewayMvcProperties) {
        this.gatewayMvcProperties = gatewayMvcProperties;
    }

    @Override
    public List<GatewayRouteDefinition> getRouteDefinitions() {
        List<GatewayRouteDefinition> routeDefinitions = new ArrayList<>();

        if (gatewayMvcProperties == null) {
            return routeDefinitions;
        }

        List<RouteProperties> routes = gatewayMvcProperties.getRoutes();
        if (!CollectionUtils.isEmpty(routes)) {
            routes.stream().map(this::convert).forEach(routeDefinitions::add);
        }

        Map<String, RouteProperties> routesMap = gatewayMvcProperties.getRoutesMap();
        if (!CollectionUtils.isEmpty(routesMap)) {
            routesMap.values().stream().map(this::convert).forEach(routeDefinitions::add);
        }

        return routeDefinitions;
    }

    private GatewayRouteDefinition convert(RouteProperties routeProperties) {
        GatewayRouteDefinition routeDefinition = new GatewayRouteDefinition();
        routeDefinition.setId(resolveRouteId(routeProperties));
        routeDefinition.setUri(routeProperties != null && routeProperties.getUri() != null
            ? routeProperties.getUri()
            : DEFAULT_ROUTE_URI);

        Map<String, Object> metadata = routeProperties != null && routeProperties.getMetadata() != null
            ? new LinkedHashMap<>(routeProperties.getMetadata())
            : Collections.emptyMap();
        routeDefinition.setMetadata(metadata);

        List<GatewayPredicateDefinition> predicates = convertPredicates(routeProperties != null ? routeProperties.getPredicates() : null);
        routeDefinition.setPredicates(predicates);
        return routeDefinition;
    }

    private List<GatewayPredicateDefinition> convertPredicates(List<PredicateProperties> predicatePropertiesList) {
        if (CollectionUtils.isEmpty(predicatePropertiesList)) {
            return Collections.emptyList();
        }

        List<GatewayPredicateDefinition> predicateDefinitions = new ArrayList<>();
        for (PredicateProperties predicateProperties : predicatePropertiesList) {
            if (predicateProperties == null || !StringUtils.hasText(predicateProperties.getName())) {
                continue;
            }
            GatewayPredicateDefinition predicateDefinition = new GatewayPredicateDefinition();
            predicateDefinition.setName(predicateProperties.getName());
            Map<String, String> args = new LinkedHashMap<>();
            if (predicateProperties.getArgs() != null) {
                predicateProperties.getArgs().forEach((key, value) -> args.put(key, value == null ? null : value.toString()));
            }
            predicateDefinition.setArgs(args);
            predicateDefinitions.add(predicateDefinition);
        }
        return predicateDefinitions;
    }

    private String resolveRouteId(RouteProperties routeProperties) {
        if (routeProperties != null && StringUtils.hasText(routeProperties.getId())) {
            return routeProperties.getId();
        }
        return "mvc-route-" + UUID.randomUUID();
    }
}
