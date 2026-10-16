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

import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.util.NextDoc4jDocPathSupport;

/**
 * WebFlux：自定义 doc-path 时禁用默认 {@code /doc.html}。
 *
 * @author echo
 * @since 1.4.0
 */
public class NextDoc4jWebFluxDocPathFilter implements WebFilter, Ordered {

    private final boolean customPath;
    private final String configuredDocPath;

    public NextDoc4jWebFluxDocPathFilter(NextDoc4jProperties properties) {
        String docPath = properties == null ? null : properties.getDocPath();
        this.configuredDocPath = docPath;
        this.customPath = NextDoc4jDocPathSupport.isCustomDocPath(docPath);
    }

    public NextDoc4jWebFluxDocPathFilter(String configuredDocPath) {
        this.configuredDocPath = configuredDocPath;
        this.customPath = NextDoc4jDocPathSupport.isCustomDocPath(configuredDocPath);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if (customPath) {
            String path = exchange.getRequest().getURI().getPath();
            if (NextDoc4jDocPathSupport.matchesDefaultDocPath(path)) {
                exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
                return exchange.getResponse().setComplete();
            }
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1;
    }
}
