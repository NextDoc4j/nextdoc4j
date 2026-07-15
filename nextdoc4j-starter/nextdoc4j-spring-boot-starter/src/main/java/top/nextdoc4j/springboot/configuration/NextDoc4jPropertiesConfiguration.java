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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.spring.common.configuration.properties.NextDoc4jPropertiesMetadata;

/**
 * NextDoc4j 配置属性注册（Servlet / WebFlux 共用，避免重复 @ConfigurationProperties）。
 */
@AutoConfiguration
@ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "true")
public class NextDoc4jPropertiesConfiguration {

    /**
     * 基础配置 Bean。
     */
    @Bean
    @ConditionalOnMissingBean(NextDoc4jPropertiesMetadata.class)
    @ConfigurationProperties(prefix = NextDoc4jConstants.NEXTDOC4J)
    public NextDoc4jPropertiesMetadata getNextDoc4jProperties() {
        return new NextDoc4jPropertiesMetadata();
    }
}
