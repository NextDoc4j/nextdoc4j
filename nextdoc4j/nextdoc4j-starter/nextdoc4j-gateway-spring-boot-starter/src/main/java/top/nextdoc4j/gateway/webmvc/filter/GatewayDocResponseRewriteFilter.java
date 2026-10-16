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
package top.nextdoc4j.gateway.webmvc.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonMapperLoader;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.customizer.GatewaySwaggerConfigCustomizer;
import top.nextdoc4j.plugin.gateway.rewrite.GatewayDocOpenApiRewriter;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * 网关文档响应重写过滤器（WebMvc），JSON 经 {@link DocJsonMapper} 处理。
 */
public class GatewayDocResponseRewriteFilter extends OncePerRequestFilter {

    private final GatewayDocOpenApiRewriter rewriter;
    private final ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider;

    public GatewayDocResponseRewriteFilter(GatewayDocProperties properties,
                                           ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        this(properties, DocJsonMapperLoader.get(), swaggerConfigCustomizerProvider);
    }

    public GatewayDocResponseRewriteFilter(GatewayDocProperties properties,
                                           DocJsonMapper jsonMapper,
                                           ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        this.swaggerConfigCustomizerProvider = swaggerConfigCustomizerProvider;
        this.rewriter = new GatewayDocOpenApiRewriter(properties, jsonMapper, path -> {
            GatewaySwaggerConfigCustomizer customizer = swaggerConfigCustomizerProvider.getIfAvailable();
            return customizer != null ? customizer.resolveServiceIdByDocPath(path) : null;
        });
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        if (rewriter.isSwaggerConfig(path)) {
            GatewaySwaggerConfigCustomizer customizer = swaggerConfigCustomizerProvider.getIfAvailable();
            if (customizer != null) {
                customizer.refreshUrls();
            }
        }

        if (!rewriter.shouldRewrite(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);
        filterChain.doFilter(request, responseWrapper);

        if (!isJsonContent(responseWrapper.getContentType())) {
            responseWrapper.copyBodyToResponse();
            return;
        }

        byte[] responseBody = responseWrapper.getContentAsByteArray();
        if (responseBody.length == 0) {
            responseWrapper.copyBodyToResponse();
            return;
        }

        Charset charset = resolveCharset(responseWrapper.getCharacterEncoding());
        String sourceBody = new String(responseBody, charset);
        String rewrittenBody = rewriter.rewriteBody(path, sourceBody);
        byte[] rewrittenBytes = rewrittenBody.getBytes(charset);

        responseWrapper.resetBuffer();
        responseWrapper.setContentLength(rewrittenBytes.length);
        responseWrapper.getOutputStream().write(rewrittenBytes);
        responseWrapper.copyBodyToResponse();
    }

    /**
     * 判断响应是否是 JSON 类型。
     */
    private boolean isJsonContent(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return true;
        }
        try {
            MediaType mediaType = MediaType.parseMediaType(contentType);
            return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType) || mediaType.getSubtype().contains("json");
        } catch (Exception ignored) {
            return contentType.toLowerCase().contains("json");
        }
    }

    /**
     * 解析响应字符集。
     */
    private Charset resolveCharset(String charsetName) {
        if (!StringUtils.hasText(charsetName)) {
            return StandardCharsets.UTF_8;
        }
        try {
            return Charset.forName(charsetName);
        } catch (Exception ignored) {
            return StandardCharsets.UTF_8;
        }
    }
}
