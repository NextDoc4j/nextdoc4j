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

import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.client.discovery.ReactiveDiscoveryClient;
import org.springframework.cloud.gateway.server.mvc.config.GatewayMvcProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.scheduling.annotation.EnableAsync;
import tools.jackson.databind.ObjectMapper;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.customizer.GatewayAggregationCustomizer;
import top.nextdoc4j.plugin.gateway.customizer.GatewaySwaggerConfigCustomizer;
import top.nextdoc4j.springboot.common.configuration.NextDoc4jWebMvcResourceConfigurer;
import top.nextdoc4j.gateway.webmvc.filter.GatewayDocResponseRewriteFilter;
import top.nextdoc4j.plugin.gateway.filter.NextDoc4jDefaultGatewayRouteFilter;
import top.nextdoc4j.plugin.gateway.filter.NextDoc4jGatewayRouteFilter;
import top.nextdoc4j.gateway.webmvc.provider.GatewayMvcRouteDefinitionLocator;
import top.nextdoc4j.plugin.gateway.provider.GatewayRouteDocProvider;
import top.nextdoc4j.plugin.gateway.provider.NextDoc4jGatewayRouteDefinitionLocator;
import top.nextdoc4j.plugin.gateway.resolver.NextDoc4jDefaultGatewayRouteMetadataResolver;
import top.nextdoc4j.plugin.gateway.resolver.NextDoc4jGatewayRouteMetadataResolver;
import top.nextdoc4j.plugin.gateway.resolver.NextDoc4jGatewayServiceContextPathResolver;

/**
 * Gateway WebMvc 聚合文档自动配置。
 *
 * @author echo
 * @since 1.2.0
 */
@AutoConfiguration
@EnableAsync
@ConditionalOnClass({GatewayMvcProperties.class, SwaggerUiConfigProperties.class})
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "true")
public class NextDoc4jGatewayWebMvcAutoConfiguration {

    @Bean
    @ConfigurationProperties(prefix = NextDoc4jConstants.GATEWAY)
    public GatewayDocProperties gatewayDocProperties() {
        return new GatewayDocProperties();
    }

    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jGatewayRouteFilter gatewayRouteFilter() {
        return new NextDoc4jDefaultGatewayRouteFilter();
    }

    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jGatewayServiceContextPathResolver gatewayServiceContextPathResolver(GatewayDocProperties properties,
                                                                                        ObjectProvider<ReactiveDiscoveryClient> reactiveDiscoveryClientProvider,
                                                                                        ObjectProvider<DiscoveryClient> discoveryClientProvider) {
        return new NextDoc4jGatewayServiceContextPathResolver(properties, reactiveDiscoveryClientProvider, discoveryClientProvider);
    }

    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jGatewayRouteMetadataResolver routeMetadataResolver(GatewayDocProperties properties,
                                                                       NextDoc4jGatewayServiceContextPathResolver contextPathResolver) {
        return new NextDoc4jDefaultGatewayRouteMetadataResolver(properties, contextPathResolver);
    }

    @Bean
    @ConditionalOnMissingBean(NextDoc4jGatewayRouteDefinitionLocator.class)
    @ConditionalOnBean(GatewayMvcProperties.class)
    public NextDoc4jGatewayRouteDefinitionLocator gatewayMvcRouteDefinitionLocator(GatewayMvcProperties gatewayMvcProperties) {
        return new GatewayMvcRouteDefinitionLocator(gatewayMvcProperties);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnBean(NextDoc4jGatewayRouteDefinitionLocator.class)
    public GatewayRouteDocProvider gatewayRouteDocProvider(NextDoc4jGatewayRouteDefinitionLocator routeDefinitionLocator,
                                                           GatewayDocProperties properties,
                                                           NextDoc4jGatewayRouteFilter routeFilter,
                                                           NextDoc4jGatewayRouteMetadataResolver metadataResolver) {
        return new GatewayRouteDocProvider(routeDefinitionLocator, properties, routeFilter, metadataResolver);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnBean(GatewayRouteDocProvider.class)
    public GatewayAggregationCustomizer gatewayAggregationCustomizer(GatewayDocProperties properties) {
        return new GatewayAggregationCustomizer(properties);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnBean(GatewayRouteDocProvider.class)
    public GatewaySwaggerConfigCustomizer gatewaySwaggerConfigCustomizer(SwaggerUiConfigProperties swaggerUiConfigProperties,
                                                                         GatewayRouteDocProvider routeDocProvider) {
        return new GatewaySwaggerConfigCustomizer(swaggerUiConfigProperties, routeDocProvider);
    }

    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jWebMvcResourceConfigurer gatewayDocWebMvcConfigurer() {
        return new NextDoc4jWebMvcResourceConfigurer();
    }

    @Bean
    @ConditionalOnMissingBean
    public FilterRegistrationBean<GatewayDocResponseRewriteFilter> gatewayDocResponseRewriteFilterRegistration(
        GatewayDocProperties properties,
        ObjectMapper objectMapper,
        ObjectProvider<GatewaySwaggerConfigCustomizer> swaggerConfigCustomizerProvider) {
        FilterRegistrationBean<GatewayDocResponseRewriteFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new GatewayDocResponseRewriteFilter(properties, objectMapper, swaggerConfigCustomizerProvider));
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        return registration;
    }
}
