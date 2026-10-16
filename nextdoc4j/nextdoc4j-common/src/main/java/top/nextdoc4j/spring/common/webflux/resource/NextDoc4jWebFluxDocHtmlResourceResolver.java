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

import org.springframework.core.io.Resource;
import org.springframework.web.reactive.resource.ResourceResolver;
import org.springframework.web.reactive.resource.ResourceResolverChain;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.util.NextDoc4jDocPathSupport;

import java.io.IOException;
import java.util.List;

/**
 * 将任意对外文档入口路径解析为固定物理资源 {@code doc.html}（WebFlux）。
 *
 * @author echo
 * @since 1.4.0
 */
public class NextDoc4jWebFluxDocHtmlResourceResolver implements ResourceResolver {

    @Override
    public Mono<Resource> resolveResource(ServerWebExchange exchange,
                                          String requestPath,
                                          List<? extends Resource> locations,
                                          ResourceResolverChain chain) {
        Resource resource = resolveDocHtml(locations);
        return resource != null ? Mono.just(resource) : Mono.empty();
    }

    @Override
    public Mono<String> resolveUrlPath(String resourcePath,
                                       List<? extends Resource> locations,
                                       ResourceResolverChain chain) {
        Resource resource = resolveDocHtml(locations);
        return resource != null ? Mono.just(NextDoc4jDocPathSupport.PHYSICAL_DOC_HTML) : Mono.empty();
    }

    private static Resource resolveDocHtml(List<? extends Resource> locations) {
        for (Resource location : locations) {
            try {
                Resource resource = location.createRelative(NextDoc4jDocPathSupport.PHYSICAL_DOC_HTML);
                if (resource.exists() && resource.isReadable()) {
                    return resource;
                }
            } catch (IOException ignored) {
                // try next location
            }
        }
        return null;
    }
}
