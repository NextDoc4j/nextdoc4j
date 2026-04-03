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
import org.springframework.context.ApplicationContext;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.constant.NextDoc4jOpenApiExtensionConstants;
import top.nextdoc4j.core.version.NextDoc4jVersionProvider;

import java.util.Map;

/**
 * openApi 扩展处理
 *
 * @author echo
 * @since 1.0.0
 **/
@SuppressWarnings("ClassCanBeRecord")
public class NextDoc4jExtensionOpenApiCustomizer implements GlobalOpenApiCustomizer {

    private static final Logger log = LoggerFactory.getLogger(NextDoc4jExtensionOpenApiCustomizer.class);

    private final NextDoc4jProperties properties;
    private final ApplicationContext applicationContext;

    public NextDoc4jExtensionOpenApiCustomizer(NextDoc4jProperties properties, ApplicationContext applicationContext) {
        this.properties = properties;
        this.applicationContext = applicationContext;
    }

    @Override
    public void customise(OpenAPI openApi) {
        try {
            Map<String, Object> extensionData = new java.util.HashMap<>();

            // 始终添加基础版本信息
            extensionData.put("version", NextDoc4jVersionProvider.getVersion());

            // 尝试获取扩展解析器（如果已启用扩展功能）
            NextDoc4jExtensionResolver resolver = getExtensionResolver();
            if (resolver != null) {
                NextDoc4jExtension extension = properties.getExtension();
                if (extension != null && extension.isEnabled()) {
                    Map<String, Object> extensionConfig = resolver.buildExtensionConfig(extension);
                    extensionData.putAll(extensionConfig);
                }
            }

            // 添加到 OpenAPI 的扩展属性中
            if (!extensionData.isEmpty()) {
                openApi.addExtension(NextDoc4jOpenApiExtensionConstants.X_NEXTDOC4J, extensionData);
            }
        } catch (Exception e) {
            log.error("Failed to customize OpenAPI with NextDoc4j extensions", e);
        }
    }

    /**
     * 尝试从 Spring 容器获取扩展解析器
     *
     * @return 扩展解析器，如果未注入则返回 null
     */
    private NextDoc4jExtensionResolver getExtensionResolver() {
        try {
            return applicationContext.getBean(NextDoc4jExtensionResolver.class);
        } catch (Exception e) {
            return null;
        }
    }
}
