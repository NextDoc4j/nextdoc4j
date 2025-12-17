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
package top.nextdoc4j.security.satoken.excluder;

import cn.dev33.satoken.annotation.SaIgnore;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import top.nextdoc4j.security.core.enhancer.PathExcluder;
import org.springframework.web.method.HandlerMethod;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Sa-Token 路径排除器
 *
 * @author echo
 * @since 1.1.3
 */
public class SaTokenPathExcluder implements PathExcluder {

    private final RequestMappingHandlerMapping handlerMapping;

    public SaTokenPathExcluder(RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    @Override
    public Set<String> getExcludedPaths() {
        Set<String> paths = new HashSet<>();

        if (handlerMapping == null) {
            return paths;
        }

        Map<RequestMappingInfo, HandlerMethod> handlerMethods = handlerMapping.getHandlerMethods();

        handlerMethods.forEach((info, method) -> {
            // 检查方法或类上是否有 @SaIgnore 注解
            if (method.hasMethodAnnotation(SaIgnore.class) || method.getBeanType()
                .isAnnotationPresent(SaIgnore.class)) {
                // 获取路径模式并添加到集合
                Set<String> patterns = info.getPatternValues();
                if (!patterns.isEmpty()) {
                    paths.addAll(patterns);
                }
            }
        });

        return paths;
    }

    @Override
    public int getOrder() {
        return 100;
    }
}
