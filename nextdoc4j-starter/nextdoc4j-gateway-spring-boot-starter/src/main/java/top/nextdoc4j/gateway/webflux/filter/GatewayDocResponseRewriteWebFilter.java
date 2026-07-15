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
package top.nextdoc4j.gateway.webflux.filter;

import org.reactivestreams.Publisher;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonMapperLoader;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.customizer.GatewaySwaggerConfigCustomizer;
import top.nextdoc4j.plugin.gateway.rewrite.GatewayDocOpenApiRewriter;

import java.nio.charset.StandardCharsets;

/**
 * 网关文档响应重写过滤器（WebFlux），JSON 经 {@link DocJsonMapper} 处理。
 */
public class GatewayDocResponseRewriteWebFilter implements WebFilter {

    private final GatewayDocOpenApiRewriter rewriter;
    private final ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider;

    public GatewayDocResponseRewriteWebFilter(GatewayDocProperties properties,
                                              ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        this(properties, DocJsonMapperLoader.get(), swaggerConfigCustomizerProvider);
    }

    public GatewayDocResponseRewriteWebFilter(GatewayDocProperties properties,
                                              DocJsonMapper jsonMapper,
                                              ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        this.swaggerConfigCustomizerProvider = swaggerConfigCustomizerProvider;
        this.rewriter = new GatewayDocOpenApiRewriter(properties, jsonMapper, path -> {
            GatewaySwaggerConfigCustomizer customizer = swaggerConfigCustomizerProvider.getIfAvailable();
            return customizer != null ? customizer.resolveServiceIdByDocPath(path) : null;
        });
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (rewriter.isSwaggerConfig(path)) {
            GatewaySwaggerConfigCustomizer customizer = swaggerConfigCustomizerProvider.getIfAvailable();
            Mono<Void> refreshMono = customizer != null ? customizer.refreshUrlsAsync() : Mono.empty();
            return refreshMono.then(chain.filter(exchange));
        }

        if (!rewriter.shouldRewrite(path)) {
            return chain.filter(exchange);
        }

        ServerHttpResponse originalResponse = exchange.getResponse();
        DataBufferFactory dataBufferFactory = originalResponse.bufferFactory();

        ServerHttpResponseDecorator decoratedResponse = new ServerHttpResponseDecorator(originalResponse) {
            @Override
            public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
                if (!isJsonContent(getHeaders().getContentType())) {
                    return super.writeWith(body);
                }

                Flux<? extends DataBuffer> fluxBody = Flux.from(body);
                return DataBufferUtils.join(fluxBody).flatMap(dataBuffer -> {
                    byte[] content = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(content);
                    DataBufferUtils.release(dataBuffer);

                    String sourceBody = new String(content, StandardCharsets.UTF_8);
                    String rewrittenBody = rewriter.rewriteBody(path, sourceBody);
                    byte[] rewrittenBytes = rewrittenBody.getBytes(StandardCharsets.UTF_8);
                    getHeaders().setContentLength(rewrittenBytes.length);
                    return super.writeWith(Mono.just(dataBufferFactory.wrap(rewrittenBytes)));
                });
            }

            @Override
            public Mono<Void> writeAndFlushWith(Publisher<? extends Publisher<? extends DataBuffer>> body) {
                return writeWith(Flux.from(body).flatMapSequential(publisher -> publisher));
            }
        };

        return chain.filter(exchange.mutate().response(decoratedResponse).build());
    }

    /**
     * 判断响应是否是 JSON 类型。
     */
    private boolean isJsonContent(MediaType mediaType) {
        if (mediaType == null) {
            return true;
        }
        return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType) || mediaType.getSubtype().contains("json");
    }
}
