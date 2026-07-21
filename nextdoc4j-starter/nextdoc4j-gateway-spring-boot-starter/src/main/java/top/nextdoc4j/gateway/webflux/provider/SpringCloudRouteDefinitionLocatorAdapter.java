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
package top.nextdoc4j.gateway.webflux.provider;

import org.springframework.cloud.gateway.filter.FilterDefinition;
import org.springframework.cloud.gateway.handler.predicate.PredicateDefinition;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import top.nextdoc4j.plugin.gateway.model.GatewayFilterDefinition;
import top.nextdoc4j.plugin.gateway.model.GatewayPredicateDefinition;
import top.nextdoc4j.plugin.gateway.model.GatewayRouteDefinition;
import top.nextdoc4j.plugin.gateway.provider.NextDoc4jGatewayRouteDefinitionLocator;

import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * 将 Spring Cloud Gateway 的路由定义适配为 NextDoc4j 中立模型。
 *
 * @author echo
 * @since 1.2.1
 */
public class SpringCloudRouteDefinitionLocatorAdapter implements NextDoc4jGatewayRouteDefinitionLocator {

    private static final Duration ROUTE_DISCOVERY_TIMEOUT = Duration.ofSeconds(5);

    private final RouteDefinitionLocator routeDefinitionLocator;

    public SpringCloudRouteDefinitionLocatorAdapter(RouteDefinitionLocator routeDefinitionLocator) {
        this.routeDefinitionLocator = routeDefinitionLocator;
    }

    @Override
    public List<GatewayRouteDefinition> getRouteDefinitions() {
        try {
            List<GatewayRouteDefinition> routeDefinitions = routeDefinitionLocator.getRouteDefinitions()
                .map(this::convert)
                .collectList()
                .block(ROUTE_DISCOVERY_TIMEOUT);
            return routeDefinitions == null ? Collections.emptyList() : routeDefinitions;
        } catch (Exception ignored) {
            return Collections.emptyList();
        }
    }

    private GatewayRouteDefinition convert(RouteDefinition source) {
        GatewayRouteDefinition target = new GatewayRouteDefinition();
        target.setId(source.getId());
        target.setUri(source.getUri());
        target.setMetadata(source.getMetadata());
        target.setPredicates(source.getPredicates() == null
            ? Collections.emptyList()
            : source.getPredicates().stream().map(this::convertPredicate).toList());
        target.setFilters(source.getFilters() == null
            ? Collections.emptyList()
            : source.getFilters().stream().map(this::convertFilter).toList());
        return target;
    }

    private GatewayPredicateDefinition convertPredicate(PredicateDefinition source) {
        GatewayPredicateDefinition target = new GatewayPredicateDefinition();
        target.setName(source.getName());
        target.setArgs(source.getArgs() == null ? Collections.emptyMap() : new LinkedHashMap<>(source.getArgs()));
        return target;
    }

    /**
     * 将 Spring Cloud Gateway 过滤器转换为中立过滤器定义。
     *
     * @param source Spring Cloud Gateway 过滤器定义
     * @return NextDoc4j 中立过滤器定义
     */
    private GatewayFilterDefinition convertFilter(FilterDefinition source) {
        GatewayFilterDefinition target = new GatewayFilterDefinition();
        target.setName(source.getName());
        target.setArgs(source.getArgs() == null ? Collections.emptyMap() : new LinkedHashMap<>(source.getArgs()));
        return target;
    }
}
