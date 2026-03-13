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
package top.nextdoc4j.security.core.enhancer;

import top.nextdoc4j.security.core.model.NextDoc4jSecurityMetadata;

import java.lang.reflect.Method;

/**
 * 安全元数据解析器接口（中立 SPI，不依赖 Spring）。
 *
 * @author echo
 * @since 1.1.3
 */
public interface NextDoc4jSecurityMetadataResolver {

    /**
     * 解析权限注解，填充元数据。
     */
    void resolve(Class<?> beanType, Method method, NextDoc4jSecurityMetadata metadata);

    /**
     * 判断是否支持该方法。
     */
    default boolean supports(Class<?> beanType, Method method) {
        return true;
    }

    /**
     * 解析器优先级（值越小优先级越高）。
     */
    default int getOrder() {
        return 0;
    }

    /**
     * 解析器名称。
     */
    default String getName() {
        return this.getClass().getSimpleName();
    }
}
