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
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.security.core.autoconfigure.NextDoc4jSecurityProperties;
import top.nextdoc4j.security.core.enhancer.NextDoc4jPathExcluder;
import top.nextdoc4j.security.core.enhancer.NextDoc4jSecurityMetadataResolver;
import top.nextdoc4j.security.satoken.customizer.NextDoc4jSaTokenSecurityMetadataCustomizer;
import top.nextdoc4j.security.satoken.excluder.NextDoc4JSaTokenExcluderNextDoc4j;
import top.nextdoc4j.security.satoken.resolver.NextDoc4jSaTokenAnnotationResolver;

import java.util.List;

/**
 * Sa-Token 安全插件自动配置
 * <p>
 * 自动配置 Sa-Token 注解解析器，实现 NextDoc4jSecurityMetadataResolver 接口，
 * 由 core 模块统一管理并应用到 OpenAPI 文档生成过程中
 *
 * @author echo
 * @since 1.1.3
 */
@AutoConfiguration
@ConditionalOnClass(name = {"cn.dev33.satoken.annotation.SaCheckPermission", "cn.dev33.satoken.annotation.SaCheckRole",
    "cn.dev33.satoken.annotation.SaIgnore"})
@ConditionalOnProperty(prefix = NextDoc4jConstants.PLUGIN_SECURITY, name = NextDoc4jConstants.ENABLED, havingValue = "true")
public class NextDoc4jSaTokenAutoConfiguration {

    /**
     * 安全插件配置属性绑定。
     */
    @Bean
    @ConditionalOnMissingBean(NextDoc4jSecurityProperties.class)
    @ConfigurationProperties(prefix = NextDoc4jConstants.PLUGIN_SECURITY)
    public NextDoc4jSecurityProperties nextDoc4jSecurityProperties() {
        return new NextDoc4jSecurityProperties();
    }

    /**
     * Sa-Token 注解解析器
     * <p>
     * 实现 NextDoc4jSecurityMetadataResolver 接口，由 core 模块统一调用
     *
     * @return 注解解析器实例
     */
    @Bean
    @Order(100)
    public NextDoc4jSecurityMetadataResolver saTokenAnnotationResolver() {
        return new NextDoc4jSaTokenAnnotationResolver();
    }

    /**
     * 路径排除器
     *
     * @return 路径排除器实例
     */
    @Bean
    @Order(100)
    public NextDoc4jPathExcluder saTokenPathExcluder() {
        return new NextDoc4JSaTokenExcluderNextDoc4j();
    }

    /**
     * Sa-Token 安全元数据操作定制器。
     *
     * @param resolvers 安全元数据解析器
     * @return 操作定制器
     */
    @Bean
    @ConditionalOnMissingBean(name = "securityMetadataOperationCustomizer")
    public NextDoc4jSaTokenSecurityMetadataCustomizer securityMetadataOperationCustomizer(
        List<NextDoc4jSecurityMetadataResolver> resolvers) {
        return new NextDoc4jSaTokenSecurityMetadataCustomizer(resolvers);
    }
}
