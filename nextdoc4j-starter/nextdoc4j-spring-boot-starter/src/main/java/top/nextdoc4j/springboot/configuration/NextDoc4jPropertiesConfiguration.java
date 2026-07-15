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
package top.nextdoc4j.springboot.configuration;

import org.springframework.boot.autoconfigure.AutoConfiguration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.spring.common.configuration.properties.NextDoc4jPropertiesMetadata;

/**
 * NextDoc4j 配置属性注册（Servlet / WebFlux 共用）。
 * <p>
 * 不依赖 {@code nextdoc4j.enabled=true}：禁用/生产过滤器也需要绑定 {@code doc-path}，
 * 以便拦截自定义入口路径。
 */
@AutoConfiguration
public class NextDoc4jPropertiesConfiguration {

    /**
     * 基础配置 Bean（始终注册，绑定 {@code nextdoc4j.*}）。
     */
    @Bean
    @ConditionalOnMissingBean(NextDoc4jPropertiesMetadata.class)
    @ConfigurationProperties(prefix = NextDoc4jConstants.NEXTDOC4J)
    public NextDoc4jPropertiesMetadata getNextDoc4jProperties() {
        return new NextDoc4jPropertiesMetadata();
    }

    /**
     * 启动期校验 doc-path（单段 fail-fast）；可被用户自定义 Bean 覆盖。
     */
    @Bean
    @ConditionalOnMissingBean(NextDoc4jDocPathValidator.class)
    public NextDoc4jDocPathValidator nextdoc4jDocPathValidator(NextDoc4jProperties properties) {
        return new NextDoc4jDocPathValidator(properties);
    }
}
