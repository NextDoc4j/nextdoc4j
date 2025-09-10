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
package top.nextdoc4j.core.extension;

import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;

import java.util.Map;

/**
 * openapi 扩展处理
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jExtensionOpenApiCustomizer implements GlobalOpenApiCustomizer {

    private static final Logger log = LoggerFactory.getLogger(NextDoc4jExtensionOpenApiCustomizer.class);

    /**
     * springdoc 扩展属性 key 值
     */
    public static final String X_EXPAND = "x-nextdoc4j";

    private final NextDoc4jProperties properties;
    private final NextDoc4jExtensionResolver resolver;

    public NextDoc4jExtensionOpenApiCustomizer(NextDoc4jProperties properties, NextDoc4jExtensionResolver resolver) {
        this.properties = properties;
        this.resolver = resolver;
    }

    @Override
    public void customise(OpenAPI openApi) {
        try {
            NextDoc4jExtension extension = properties.getExtension();
            // 直接构建扩展数据
            Map<String, Object> extensionData = resolver.buildExtensionData(extension);
            if (!extensionData.isEmpty()) {
                // 添加到 OpenAPI 的扩展属性中
                openApi.addExtension(X_EXPAND, extensionData);
            }
        } catch (Exception e) {
            log.error("Failed to customize OpenAPI with NextDoc4j extensions", e);
        }
    }
}
