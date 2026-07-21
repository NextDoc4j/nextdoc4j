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

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.model.GatewayDocRouteEntry;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 回归：Gateway MVC 宿主无 WebFlux 时，plugin-gateway 仍须传递 reactor-core，
 * 否则加载 {@link GatewayRouteDocProvider}（返回 {@link Flux}）会 NoClassDefFoundError: Publisher。
 */
class GatewayRouteDocProviderReactorClasspathTest {

    @Test
    void reactorPublisherTypesAreLoadable() {
        // 历史回归：纯 MVC 宿主缺 reactive-streams/reactor 时，GatewayRouteDocProvider 类加载失败
        assertDoesNotThrow(() -> Class.forName("org.reactivestreams.Publisher"));
        assertDoesNotThrow(() -> Class.forName("reactor.core.publisher.Flux"));
        assertDoesNotThrow(() -> Class.forName(GatewayRouteDocProvider.class.getName()));
    }

    @Test
    void getAutoDiscoveredDocEntries_usesFluxWithoutMissingPublisher() {
        GatewayDocProperties properties = new GatewayDocProperties();
        properties.setAutoDiscovery(true);

        NextDoc4jGatewayRouteDefinitionLocator emptyLocator = Collections::emptyList;
        GatewayRouteDocProvider provider = new GatewayRouteDocProvider(emptyLocator, properties);

        Flux<GatewayDocRouteEntry> flux = assertDoesNotThrow(provider::getAutoDiscoveredDocEntries);
        assertNotNull(flux);
        List<GatewayDocRouteEntry> entries = assertDoesNotThrow(() -> flux.collectList().block());
        assertNotNull(entries);
        assertEquals(0, entries.size());
    }
}
