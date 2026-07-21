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
package top.nextdoc4j.spring.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.util.NextDoc4jDocPathSupport;

import java.io.IOException;

/**
 * 自定义 {@code nextdoc4j.doc-path} 时，使默认 {@code /doc.html} 失效（404）。
 * <p>
 * 生效入口由 ResourceHandler + {@code NextDoc4jDocHtmlResourceResolver} 映射到物理 {@code doc.html}。
 * 未配置自定义路径时本过滤器不拦截。
 *
 * @author echo
 * @since 1.4.0
 */
public class NextDoc4jDocPathFilter extends OncePerRequestFilter {

    private final boolean customPath;
    private final String configuredDocPath;

    public NextDoc4jDocPathFilter(NextDoc4jProperties properties) {
        String docPath = properties == null ? null : properties.getDocPath();
        this.configuredDocPath = docPath;
        this.customPath = NextDoc4jDocPathSupport.isCustomDocPath(docPath);
    }

    public NextDoc4jDocPathFilter(String configuredDocPath) {
        this.configuredDocPath = configuredDocPath;
        this.customPath = NextDoc4jDocPathSupport.isCustomDocPath(configuredDocPath);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (customPath && NextDoc4jDocPathSupport.matchesDefaultDocPath(request.getRequestURI())) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "NextDoc4j default /doc.html is disabled; use "
                + NextDoc4jDocPathSupport.effectiveDocPath(configuredDocPath));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
