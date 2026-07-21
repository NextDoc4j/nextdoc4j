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
package top.nextdoc4j.spring.common.webflux.resource;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.reactive.resource.ResourceResolverChain;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.util.NextDoc4jDocPathSupport;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 驱动真实 {@link NextDoc4jWebFluxDocHtmlResourceResolver}。
 */
class NextDoc4jWebFluxDocHtmlResourceResolverTest {

    @Test
    void resolveResource_alwaysReturnsPhysicalDocHtml() {
        NextDoc4jWebFluxDocHtmlResourceResolver resolver = new NextDoc4jWebFluxDocHtmlResourceResolver();
        List<Resource> locations = List.of(new ClassPathResource("META-INF/resources/"));
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/secret.html"));
        ResourceResolverChain chain = new ResourceResolverChain() {
            @Override
            public Mono<Resource> resolveResource(ServerWebExchange ex, String requestPath,
                                                  List<? extends Resource> locs) {
                return Mono.empty();
            }

            @Override
            public Mono<String> resolveUrlPath(String resourcePath, List<? extends Resource> locs) {
                return Mono.empty();
            }
        };

        Resource resolved = resolver.resolveResource(exchange, "secret.html", locations, chain).block();

        assertNotNull(resolved);
        assertTrue(resolved.exists());
        assertEquals(NextDoc4jDocPathSupport.PHYSICAL_DOC_HTML,
            resolver.resolveUrlPath("anything", locations, chain).block());
    }
}
