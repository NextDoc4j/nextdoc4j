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

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.client.discovery.ReactiveDiscoveryClient;
import top.nextdoc4j.core.gateway.enums.DocPathStrategy;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.model.GatewayFilterDefinition;
import top.nextdoc4j.plugin.gateway.model.GatewayPredicateDefinition;
import top.nextdoc4j.plugin.gateway.model.GatewayRouteDefinition;

import java.net.URI;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NextDoc4jDefaultGatewayRouteMetadataResolverTest {

    @Test
    void shouldKeepContextPathWhenStripPrefixIsZero() {
        assertDocPath("/api/admin/**", 0, "/api/admin", "/api/admin/v3/api-docs");
    }

    @Test
    void shouldRestoreRemovedPrefixWhenStripPrefixIsOne() {
        assertDocPath("/api/admin/**", 1, "/admin", "/api/admin/v3/api-docs");
    }

    @Test
    void shouldRestoreRemovedPrefixWhenStripPrefixIsTwo() {
        assertDocPath("/api/admin/**", 2, null, "/api/admin/v3/api-docs");
    }

    @Test
    void shouldAppendDifferentContextPathAfterRemovedPrefix() {
        assertDocPath("/api/**", 1, "/admin", "/api/admin/v3/api-docs");
    }

    @Test
    void shouldAvoidDuplicateContextPathWithoutStripPrefix() {
        assertDocPath("/api/admin/**", null, "/api/admin", "/api/admin/v3/api-docs");
    }

    /**
     * 创建指定路由场景并断言自动解析出的网关外部文档路径。
     *
     * @param routePath         Path 谓词路径
     * @param stripPrefixParts StripPrefix 参数；为空表示未配置
     * @param contextPath       下游服务 context-path；为空表示未配置
     * @param expected          预期网关外部文档路径
     */
    private void assertDocPath(String routePath,
                               Integer stripPrefixParts,
                               String contextPath,
                               String expected) {
        GatewayDocProperties properties = new GatewayDocProperties();
        properties.setDocPathStrategy(DocPathStrategy.ROUTE_PREDICATE);

        GatewayRouteDefinition route = new GatewayRouteDefinition();
        route.setId("admin-service");
        route.setUri(URI.create("lb://admin-service"));
        route.setPredicates(List.of(new GatewayPredicateDefinition("Path", Map.of("_genkey_0", routePath))));
        if (stripPrefixParts != null) {
            route.setFilters(List.of(new GatewayFilterDefinition("StripPrefix", Map
                .of("_genkey_0", stripPrefixParts.toString()))));
        }
        if (contextPath != null) {
            route.setMetadata(Map.of("nextdoc4j.context-path", contextPath));
        }

        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        NextDoc4jGatewayServiceContextPathResolver contextPathResolver = new NextDoc4jGatewayServiceContextPathResolver(
            properties,
            beanFactory.getBeanProvider(ReactiveDiscoveryClient.class),
            beanFactory.getBeanProvider(DiscoveryClient.class));
        NextDoc4jDefaultGatewayRouteMetadataResolver resolver = new NextDoc4jDefaultGatewayRouteMetadataResolver(
            properties,
            contextPathResolver);

        assertEquals(expected, resolver.extractDocPath(route));
    }
}
