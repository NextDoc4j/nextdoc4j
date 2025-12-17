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
package top.nextdoc4j.security.satoken.autoconfigure;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.security.core.enhancer.NextDoc4jPathExcluder;
import top.nextdoc4j.security.core.enhancer.NextDoc4jSecurityMetadataResolver;
import top.nextdoc4j.security.satoken.excluder.NextDoc4JSaTokenExcluderNextDoc4j;
import top.nextdoc4j.security.satoken.resolver.NextDoc4jSaTokenAnnotationResolver;

/**
 * Sa-Token 安全插件自动配置
 * <p>
 * 自动配置 Sa-Token 注解解析器，实现 NextDoc4jSecurityMetadataResolver 接口，
 * 由 core 模块统一管理并应用到 OpenAPI 文档生成过程中
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
@AutoConfiguration
@ConditionalOnProperty(prefix = NextDoc4jConstants.PLUGIN_SECURITY, name = NextDoc4jConstants.ENABLED, havingValue = "true")
public class NextDoc4jSaTokenAutoConfiguration {

    /**
     * Sa-Token 注解解析器
     * <p>
     * 实现 NextDoc4jSecurityMetadataResolver 接口，由 core 模块统一调用
     * </p>
     *
     * @return 注解解析器实例
     */
    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jSecurityMetadataResolver saTokenAnnotationResolver() {
        return new NextDoc4jSaTokenAnnotationResolver();
    }

    /**
     * 路径排除器
     *
     * @param handlerMapping 请求映射处理器
     * @return 路径排除器实例
     */
    @Bean
    @Order(100)
    public NextDoc4jPathExcluder saTokenPathExcluder(RequestMappingHandlerMapping handlerMapping) {
        return new NextDoc4JSaTokenExcluderNextDoc4j(handlerMapping);
    }
}
