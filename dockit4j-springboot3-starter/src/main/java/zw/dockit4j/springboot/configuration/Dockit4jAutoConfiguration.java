package zw.dockit4j.springboot.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import org.springdoc.core.customizers.OpenApiBuilderCustomizer;
import org.springdoc.core.customizers.ServerBaseUrlCustomizer;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.providers.JavadocProvider;
import org.springdoc.core.service.OpenAPIService;
import org.springdoc.core.service.SecurityService;
import org.springdoc.core.utils.PropertyResolverUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.CacheControl;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import zw.dockit4j.core.configuration.Dockit4jProperties;
import zw.dockit4j.core.constant.Dockit4jBaseConstant;
import zw.dockit4j.core.constant.Dockit4jFilterConstant;
import zw.dockit4j.core.extension.Dockit4jExtensionOpenApiCustomizer;
import zw.dockit4j.core.extension.Dockit4jExtensionResolver;
import zw.dockit4j.core.handler.OpenApiHandler;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * 自动配置
 *
 * @author echo
 * @since 1.0.0
 **/
@ConditionalOnProperty(prefix = Dockit4jBaseConstant.DOCKIT4J, name = Dockit4jBaseConstant.ENABLED, havingValue = "true", matchIfMissing = true)
public class Dockit4jAutoConfiguration {

    /**
     * 获取基础配置bean
     *
     * @return {@link Dockit4jProperties }
     */
    @Bean
    @ConfigurationProperties(prefix = Dockit4jBaseConstant.DOCKIT4J)
    public Dockit4jProperties getDockit4jProperties() {
        return new Dockit4jProperties();
    }

    /**
     * dockit4j web mvc配置器
     *
     * @return {@link WebMvcConfigurer }
     */
    @Bean
    public WebMvcConfigurer dockit4jWebMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                registry.addResourceHandler("/favicon.ico").addResourceLocations("classpath:/");
                registry.addResourceHandler(Dockit4jFilterConstant.BlockedPaths.DOCKIT_HTML)
                    .addResourceLocations("classpath:/META-INF/resources/");
                registry.addResourceHandler(Dockit4jFilterConstant.BlockedPaths.DOCKIT4J_PREFIX + "**")
                    .addResourceLocations("classpath:/META-INF/resources/dk/")
                    .setCacheControl(CacheControl.maxAge(5, TimeUnit.HOURS).cachePublic());
            }
        };
    }

    /**
     * dockit4j 跨域配置
     *
     * @return {@link CorsFilter }
     */
    @Bean
    @ConditionalOnMissingBean(CorsFilter.class)
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.DOCKIT4J, name = "cors", havingValue = "true")
    public CorsFilter dockit4jCorsFilter() {
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
     *
     * @param resourceLoader 资源加载器
     * @return {@link Dockit4jExtensionResolver }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.EXTENSION, name = Dockit4jBaseConstant.ENABLED, havingValue = "true", matchIfMissing = true)
    public Dockit4jExtensionResolver dockit4jExtensionResolver(ResourceLoader resourceLoader,
                                                               ApplicationContext applicationContext) {
        return new Dockit4jExtensionResolver(resourceLoader, applicationContext);
    }

    /**
     * 全局 openapi 定制器
     *
     * @param resolver 旋转变压器
     * @return {@link Dockit4jExtensionOpenApiCustomizer }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.EXTENSION, name = Dockit4jBaseConstant.ENABLED, havingValue = "true", matchIfMissing = true)
    public Dockit4jExtensionOpenApiCustomizer dockit4jExtensionOpenApiCustomizer(Dockit4jProperties properties,
                                                                                 Dockit4jExtensionResolver resolver) {
        return new Dockit4jExtensionOpenApiCustomizer(properties, resolver);
    }

    /**
     * 自定义 OpenApi 处理器
     */
    @Bean
    @ConditionalOnMissingBean
    public OpenAPIService openApiBuilder(Optional<OpenAPI> openAPI,
                                         SecurityService securityParser,
                                         SpringDocConfigProperties springDocConfigProperties,
                                         PropertyResolverUtils propertyResolverUtils,
                                         Optional<List<OpenApiBuilderCustomizer>> openApiBuilderCustomisers,
                                         Optional<List<ServerBaseUrlCustomizer>> serverBaseUrlCustomisers,
                                         Optional<JavadocProvider> javadocProvider) {
        return new OpenApiHandler(openAPI, securityParser, springDocConfigProperties, propertyResolverUtils, openApiBuilderCustomisers, serverBaseUrlCustomisers, javadocProvider);
    }

}
