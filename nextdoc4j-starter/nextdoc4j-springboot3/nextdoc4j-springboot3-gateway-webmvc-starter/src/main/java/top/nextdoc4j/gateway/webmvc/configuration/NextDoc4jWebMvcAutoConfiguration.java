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
package top.nextdoc4j.gateway.webmvc.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.io.ResourceLoader;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import top.nextdoc4j.gateway.webmvc.configuration.properties.NextDoc4jPropertiesMetadata;
import top.nextdoc4j.springboot.common.configuration.NextDoc4jWebMvcResourceConfigurer;
import top.nextdoc4j.springboot.common.core.extension.NextDoc4jExtensionOpenApiCustomizer;
import top.nextdoc4j.springboot.common.core.extension.NextDoc4jExtensionResolver;
import top.nextdoc4j.springboot.common.filter.NextDoc4jBasicAuthFilter;

/**
 * Gateway WebMvc 基础自动配置桥接。
 *
 * @author echo
 * @since 1.2.1
 */
@ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "true")
public class NextDoc4jWebMvcAutoConfiguration {

    @Bean
    @ConfigurationProperties(prefix = NextDoc4jConstants.NEXTDOC4J)
    public NextDoc4jPropertiesMetadata getNextDoc4jProperties() {
        return new NextDoc4jPropertiesMetadata();
    }

    @Bean
    public NextDoc4jWebMvcResourceConfigurer nextdoc4jWebMvcConfigurer() {
        return new NextDoc4jWebMvcResourceConfigurer();
    }

    @Bean
    @ConditionalOnMissingBean(CorsFilter.class)
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = "cors", havingValue = "true")
    public CorsFilter nextdoc4jCorsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setAllowCredentials(true);
        config.setMaxAge(1800L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.EXTENSION, name = NextDoc4jConstants.ENABLED, havingValue = "true")
    public NextDoc4jExtensionResolver nextdoc4jExtensionResolver(ResourceLoader resourceLoader,
                                                                 ApplicationContext applicationContext) {
        return new NextDoc4jExtensionResolver(resourceLoader, applicationContext);
    }

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.AUTH, name = NextDoc4jConstants.ENABLED, havingValue = "true")
    public FilterRegistrationBean<NextDoc4jBasicAuthFilter> nextdoc4jBasicAuthFilter(NextDoc4jProperties properties,
                                                                                      ResourceLoader resourceLoader,
                                                                                      OpenAPI openAPI) {
        FilterRegistrationBean<NextDoc4jBasicAuthFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new NextDoc4jBasicAuthFilter(properties, resourceLoader, openAPI));
        registration.addUrlPatterns(NextDoc4jFilterConstant.BlockedPaths.URL_PATTERNS);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        registration.setEnabled(properties.isEnabled() && properties.getAuth().isEnabled());
        return registration;
    }

    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jExtensionOpenApiCustomizer nextdoc4jExtensionOpenApiCustomizer(NextDoc4jProperties properties,
                                                                                    ApplicationContext applicationContext) {
        return new NextDoc4jExtensionOpenApiCustomizer(properties, applicationContext);
    }
}
