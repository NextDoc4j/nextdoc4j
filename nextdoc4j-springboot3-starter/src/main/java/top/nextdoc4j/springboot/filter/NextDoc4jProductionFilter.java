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
import org.springframework.web.filter.OncePerRequestFilter;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;

import java.io.IOException;

/**
 * 生产环境过滤器
 *
 * @author echo
 * @date 2025/05/27
 */
public class NextDoc4jProductionFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();

        // 检查是否为需要过滤的路径
        if (shouldBlock(uri)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Resource not available in production environment");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 判断是否应该阻止访问
     *
     * @param uri 请求URI
     * @return true-阻止访问，false-允许访问
     */
    private boolean shouldBlock(String uri) {
        // 精确匹配
        for (String exactPath : NextDoc4jFilterConstant.BlockedPaths.EXACT_PATHS) {
            if (uri.equals(exactPath)) {
                return true;
            }
        }

        // 前缀匹配
        for (String prefix : NextDoc4jFilterConstant.BlockedPaths.PREFIX_PATHS) {
            if (uri.startsWith(prefix)) {
                return true;
            }
        }

        // 正则匹配（处理动态路径）
        for (String pattern : NextDoc4jFilterConstant.BlockedPaths.REGEX_PATTERNS) {
            if (uri.matches(pattern)) {
                return true;
            }
        }

        return false;
    }

}
