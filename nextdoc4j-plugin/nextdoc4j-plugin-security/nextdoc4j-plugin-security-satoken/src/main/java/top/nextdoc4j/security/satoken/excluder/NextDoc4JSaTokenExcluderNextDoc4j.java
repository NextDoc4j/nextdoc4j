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

import cn.hutool.extra.spring.SpringUtil;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import top.nextdoc4j.security.core.enhancer.NextDoc4jPathExcluder;
import org.springframework.web.method.HandlerMethod;
import top.nextdoc4j.security.satoken.constant.NextDoc4jSaTokenConstant;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Sa-Token 路径排除器
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4JSaTokenExcluderNextDoc4j implements NextDoc4jPathExcluder {

    @Override
    public Set<String> getExcludedPaths() {
        Set<String> paths = new HashSet<>();
        RequestMappingHandlerMapping handlerMapping = SpringUtil.getBean(RequestMappingHandlerMapping.class);
        if (handlerMapping == null) {
            return paths;
        }

        Map<RequestMappingInfo, HandlerMethod> handlerMethods = handlerMapping.getHandlerMethods();

        handlerMethods.forEach((info, method) -> {
            if (method.hasMethodAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS) || method.getBeanType()
                .isAnnotationPresent(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS)) {
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
