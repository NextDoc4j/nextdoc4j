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
package top.nextdoc4j.springboot.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;
import top.nextdoc4j.core.util.NextDoc4jPathMatcherUtils;

import java.io.IOException;

/**
 * 资源过滤器
 *
 * @author echo
 * @since 1.0.0
 */
public class NextDoc4jResourceFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();

        // 使用统一的路径匹配工具类，只过滤 NextDoc4j 资源（自动适配 context-path）
        if (NextDoc4jPathMatcherUtils.isNextDoc4jResource(uri)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "NextDoc4j is disabled");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
