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

import io.swagger.v3.oas.models.OpenAPI;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.CacheControl;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import top.nextdoc4j.core.extension.NextDoc4jExtensionOpenApiCustomizer;
import top.nextdoc4j.core.extension.NextDoc4jExtensionResolver;
import top.nextdoc4j.springboot.filter.NextDoc4jBasicAuthFilter;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 自动配置
 *
 * @author echo
 * @since 1.0.0
 **/
@ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "true")
public class NextDoc4jAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(NextDoc4jAutoConfiguration.class);

    /**
     * 获取基础配置bean
     *
     * @return {@link NextDoc4jProperties }
     */
    @Bean
    @ConfigurationProperties(prefix = NextDoc4jConstants.NEXTDOC4J)
    public NextDoc4jProperties getNextDoc4jProperties() {
        return new NextDoc4jProperties();
    }

    /**
     * NextDoc4j web mvc配置器
     *
     * @return {@link WebMvcConfigurer }
     */
    @Bean
    public WebMvcConfigurer nextdoc4jWebMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
                registry.addResourceHandler(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML)
                    .addResourceLocations("classpath:/META-INF/resources/");
                registry.addResourceHandler(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX + "**")
                    .addResourceLocations("classpath:/META-INF/resources/nextdoc/")
                    .setCacheControl(CacheControl.maxAge(5, TimeUnit.HOURS).cachePublic());
            }
        };
    }

    /**
     * NextDoc4j 跨域配置
     *
     * @return {@link CorsFilter }
     */
    @Bean
    @ConditionalOnMissingBean(CorsFilter.class)
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = "cors", havingValue = "true")
    public CorsFilter nextdoc4jCorsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // 允许所有来源
        config.addAllowedOriginPattern("*");
        // 允许所有请求头
        config.addAllowedHeader("*");
        // 允许所有方法
        config.addAllowedMethod("*");
        // 允许携带 Cookie
        config.setAllowCredentials(true);
        // 设置跨域允许时间
        config.setMaxAge(1800L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    /**
     * 扩展解析器
     * <p>
     * 只在 nextdoc4j.extension.enabled=true 时注入
     * </p>
     *
     * @param resourceLoader 资源加载器
     * @return {@link NextDoc4jExtensionResolver }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.EXTENSION, name = NextDoc4jConstants.ENABLED, havingValue = "true")
    public NextDoc4jExtensionResolver nextdoc4jExtensionResolver(ResourceLoader resourceLoader,
                                                                 ApplicationContext applicationContext) {
        return new NextDoc4jExtensionResolver(resourceLoader, applicationContext);
    }

    /**
     * NextDoc4j 基础认证 过滤
     *
     * @param properties 属性
     * @return {@link FilterRegistrationBean }<{@link NextDoc4jBasicAuthFilter }>
     */
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

    /**
     * 全局 openapi 定制器
     * <p>
     * 始终注入，负责添加基础版本信息和扩展配置（如果启用）
     * </p>
     *
     * @param applicationContext 应用上下文
     * @return {@link NextDoc4jExtensionOpenApiCustomizer }
     */
    @Bean
    @ConditionalOnMissingBean
    public NextDoc4jExtensionOpenApiCustomizer nextdoc4jExtensionOpenApiCustomizer(NextDoc4jProperties properties,
                                                                                   ApplicationContext applicationContext) {
        return new NextDoc4jExtensionOpenApiCustomizer(properties, applicationContext);
    }

    /**
     * 自动将 server.servlet.context-path 发布到注册中心 metadata
     * <p>
     * 使用反射避免对 Spring Cloud 的编译时强依赖：
     * 仅在项目引入服务注册时生效，否则自动跳过
     * </p>
     */
    @Bean
    @ConditionalOnMissingBean(name = "nextdoc4jContextPathMetadataPublisher")
    public ApplicationRunner nextdoc4jContextPathMetadataPublisher(ApplicationContext applicationContext) {
        return args -> {
            try {
                String contextPath = applicationContext.getEnvironment().getProperty("server.servlet.context-path", "");
                contextPath = normalizeContextPath(contextPath);
                applyContextPathMetadataToRegistration(applicationContext, contextPath);
            } catch (ClassNotFoundException ignored) {
                // 当前应用未引入服务注册能力，直接跳过
            } catch (Exception e) {
                log.debug("Failed to publish NextDoc4j context-path metadata: {}", e.getMessage());
            }
        };
    }

    /**
     * 提前注入 context-path 到 DiscoveryProperties metadata，确保注册前可见
     */
    @Bean
    @ConditionalOnMissingBean(name = "nextdoc4jContextPathMetadataBeanPostProcessor")
    public BeanPostProcessor nextdoc4jContextPathMetadataBeanPostProcessor(ApplicationContext applicationContext) {
        String contextPath = applicationContext.getEnvironment().getProperty("server.servlet.context-path", "");
        String normalizedContextPath = normalizeContextPath(contextPath);
        return new BeanPostProcessor() {
            @Override
            public Object postProcessBeforeInitialization(@NonNull Object bean, @NonNull String beanName) {
                try {
                    Method getMetadataMethod = bean.getClass().getMethod("getMetadata");
                    Object metadataObject = getMetadataMethod.invoke(bean);
                    if (!(metadataObject instanceof Map<?, ?> map)) {
                        return bean;
                    }

                    @SuppressWarnings("unchecked") Map<String, String> metadata = (Map<String, String>)map;

                    if (!metadata.containsKey(NextDoc4jConstants.CONTEXT_PATH_METADATA_KEY)) {
                        metadata.put(NextDoc4jConstants.CONTEXT_PATH_METADATA_KEY, normalizedContextPath);
                    }

                    // 某些 DiscoveryProperties 使用不可变 Map，这里主动回填 setMetadata
                    try {
                        Method setMetadataMethod = bean.getClass().getMethod("setMetadata", Map.class);
                        setMetadataMethod.invoke(bean, new LinkedHashMap<>(metadata));
                    } catch (NoSuchMethodException ignored) {
                        // ignore
                    }
                } catch (NoSuchMethodException ignored) {
                    // 当前 bean 无 metadata 能力，忽略
                } catch (Exception e) {
                    log.debug("Failed to inject NextDoc4j context-path metadata before registration: {}", e
                        .getMessage());
                }
                return bean;
            }
        };
    }

    private void applyContextPathMetadataToRegistration(ApplicationContext applicationContext,
                                                        String contextPath) throws Exception {
        Class<?> registrationClass = Class.forName("org.springframework.cloud.client.serviceregistry.Registration");
        String[] beanNames = applicationContext.getBeanNamesForType(registrationClass);
        if (beanNames.length == 0) {
            return;
        }

        Object registration = applicationContext.getBean(beanNames[0]);
        Method getMetadataMethod = registrationClass.getMethod("getMetadata");
        Object metadataObject = getMetadataMethod.invoke(registration);

        if (!(metadataObject instanceof Map<?, ?> map)) {
            return;
        }

        @SuppressWarnings("unchecked") Map<String, String> metadata = (Map<String, String>)map;
        metadata.putIfAbsent(NextDoc4jConstants.CONTEXT_PATH_METADATA_KEY, contextPath);
    }

    private String normalizeContextPath(String contextPath) {
        if (!org.springframework.util.StringUtils.hasText(contextPath) || "/".equals(contextPath)) {
            return "";
        }
        String normalized = contextPath.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

}
