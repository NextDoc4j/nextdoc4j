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
package top.nextdoc4j.spring.common.webflux.filter;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * {@link NextDoc4jWebFluxDocPathFilter} 与 Servlet 版对称：自定义 path 时默认 /doc.html → 404。
 */
class NextDoc4jWebFluxDocPathFilterTest {

    @Test
    void customPath_defaultDocHtmlReturns404() {
        NextDoc4jProperties properties = new NextDoc4jProperties();
        properties.setDocPath("/internal-docs.html");
        NextDoc4jWebFluxDocPathFilter filter = new NextDoc4jWebFluxDocPathFilter(properties);

        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/doc.html"));
        AtomicInteger chain = new AtomicInteger();
        WebFilterChain webFilterChain = e -> {
            chain.incrementAndGet();
            return Mono.empty();
        };

        filter.filter(exchange, webFilterChain).block();

        assertEquals(HttpStatus.NOT_FOUND, exchange.getResponse().getStatusCode());
        assertEquals(0, chain.get());
    }

    @Test
    void customPath_effectiveEntryPassesThrough() {
        NextDoc4jWebFluxDocPathFilter filter = new NextDoc4jWebFluxDocPathFilter("/internal-docs.html");
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/internal-docs.html"));
        AtomicInteger chain = new AtomicInteger();

        filter.filter(exchange, e -> {
            chain.incrementAndGet();
            return Mono.empty();
        }).block();

        assertNull(exchange.getResponse().getStatusCode());
        assertEquals(1, chain.get());
    }

    @Test
    void defaultPath_noOpOnDocHtml() {
        NextDoc4jWebFluxDocPathFilter filter = new NextDoc4jWebFluxDocPathFilter((String)null);
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/doc.html"));
        AtomicInteger chain = new AtomicInteger();

        filter.filter(exchange, e -> {
            chain.incrementAndGet();
            return Mono.empty();
        }).block();

        assertEquals(1, chain.get());
    }
}
