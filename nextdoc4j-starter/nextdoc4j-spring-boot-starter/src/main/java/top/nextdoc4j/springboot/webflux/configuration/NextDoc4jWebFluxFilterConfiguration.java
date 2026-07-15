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
package top.nextdoc4j.springboot.webflux.configuration;

import org.springframework.boot.autoconfigure.AutoConfiguration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;

import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ResourceLoader;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import org.springframework.web.server.WebFilter;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.spring.common.webflux.filter.NextDoc4jWebFluxBasicAuthFilter;
import top.nextdoc4j.spring.common.webflux.filter.NextDoc4jWebFluxProductionFilter;
import top.nextdoc4j.spring.common.webflux.filter.NextDoc4jWebFluxResourceFilter;
import top.nextdoc4j.springboot.configuration.NextDoc4jFilterConfiguration;
import top.nextdoc4j.springboot.configuration.NextDoc4jPropertiesConfiguration;

/**
 * NextDoc4j WebFlux 过滤器配置。
 */
@AutoConfiguration(after = NextDoc4jPropertiesConfiguration.class)
@ConditionalOnClass(name = "org.springframework.web.server.WebFilter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class NextDoc4jWebFluxFilterConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "false", matchIfMissing = true)
    public WebFilter nextdoc4jWebFluxResourceFilter(ObjectProvider<NextDoc4jProperties> propertiesProvider,
                                                    Environment environment) {
        return new NextDoc4jWebFluxResourceFilter(
            NextDoc4jFilterConfiguration.resolveDocPath(propertiesProvider, environment));
    }

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.PRODUCTION, havingValue = "true")
    public WebFilter nextdoc4jWebFluxProductionFilter(ObjectProvider<NextDoc4jProperties> propertiesProvider,
                                                      Environment environment) {
        return new NextDoc4jWebFluxProductionFilter(
            NextDoc4jFilterConfiguration.resolveDocPath(propertiesProvider, environment));
    }

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "true")
    @ConditionalOnProperty(prefix = NextDoc4jConstants.AUTH, name = NextDoc4jConstants.ENABLED, havingValue = "true")
    public WebFilter nextdoc4jWebFluxBasicAuthFilter(NextDoc4jProperties properties,
                                                     ResourceLoader resourceLoader,
                                                     ObjectProvider<OpenAPI> openAPIProvider) {
        return new NextDoc4jWebFluxBasicAuthFilter(properties, resourceLoader, openAPIProvider.getIfAvailable());
    }
}
