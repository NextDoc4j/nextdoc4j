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
package top.nextdoc4j.plugin.gateway.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import top.nextdoc4j.plugin.gateway.customizer.GatewayAggregationCustomizer;
import top.nextdoc4j.plugin.gateway.customizer.GatewaySwaggerConfigCustomizer;
import top.nextdoc4j.plugin.gateway.filter.DefaultRouteFilter;
import top.nextdoc4j.plugin.gateway.filter.RouteFilter;
import top.nextdoc4j.plugin.gateway.provider.GatewayRouteDocProvider;
import top.nextdoc4j.plugin.gateway.resolver.DefaultRouteMetadataResolver;
import top.nextdoc4j.plugin.gateway.resolver.RouteMetadataResolver;

/**
 * Gateway 聚合文档自动配置
 *
 * @author echo
 * @since 1.2.0
 */
@AutoConfiguration
@EnableAsync
@ConditionalOnClass({RouteDefinitionLocator.class, SwaggerUiConfigProperties.class})
@ConditionalOnProperty(prefix = "nextdoc4j.gateway", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(GatewayDocProperties.class)
public class GatewayDocAutoConfiguration {

    /**
     * 默认的 OpenAPI Bean（如果用户没有配置）
     */
    @Bean
    @ConditionalOnMissingBean
    public OpenAPI gatewayOpenApi() {
        return new OpenAPI().info(new Info().title("API Gateway").description("API Gateway 聚合文档").version("1.0.0"));
    }

    /**
     * 路由过滤器
     */
    @Bean
    @ConditionalOnMissingBean
    public RouteFilter gatewayRouteFilter() {
        return new DefaultRouteFilter();
    }

    /**
     * 路由元数据解析器
     */
    @Bean
    @ConditionalOnMissingBean
    public RouteMetadataResolver routeMetadataResolver(GatewayDocProperties properties) {
        return new DefaultRouteMetadataResolver(properties);
    }

    /**
     * Gateway 路由文档提供者
     */
    @Bean
    @ConditionalOnMissingBean
    public GatewayRouteDocProvider gatewayRouteDocProvider(RouteDefinitionLocator routeDefinitionLocator,
                                                           GatewayDocProperties properties,
                                                           RouteFilter routeFilter,
                                                           RouteMetadataResolver metadataResolver) {
        return new GatewayRouteDocProvider(routeDefinitionLocator, properties, routeFilter, metadataResolver);
    }

    /**
     * Gateway 聚合扩展定制器
     */
    @Bean
    @ConditionalOnMissingBean
    public GatewayAggregationCustomizer gatewayAggregationCustomizer(GatewayDocProperties properties) {
        return new GatewayAggregationCustomizer(properties);
    }

    /**
     * Gateway Swagger 配置定制器
     */
    @Bean
    @ConditionalOnMissingBean
    public GatewaySwaggerConfigCustomizer gatewaySwaggerConfigCustomizer(SwaggerUiConfigProperties swaggerUiConfigProperties,
                                                                         GatewayRouteDocProvider routeDocProvider,
                                                                         GatewayDocProperties properties) {
        return new GatewaySwaggerConfigCustomizer(swaggerUiConfigProperties, routeDocProvider, properties);
    }

    /**
     * Gateway WebFlux 配置
     */
    @Bean
    @ConditionalOnMissingBean
    public GatewayDocWebFluxConfigurer gatewayDocWebFluxConfigurer() {
        return new GatewayDocWebFluxConfigurer();
    }
}