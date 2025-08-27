package dw.nextdoc4j.springboot.configuration;

import dw.nextdoc4j.core.configuration.NextDoc4jProperties;
import dw.nextdoc4j.core.constant.NextDoc4jBaseConstant;
import dw.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import dw.nextdoc4j.core.extension.NextDoc4jExtensionOpenApiCustomizer;
import dw.nextdoc4j.core.extension.NextDoc4jExtensionResolver;
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

import java.util.concurrent.TimeUnit;

/**
 * 自动配置
 *
 * @author echo
 * @since 1.0.0
 **/
@ConditionalOnProperty(prefix = NextDoc4jBaseConstant.NEXTDOC4J, name = NextDoc4jBaseConstant.ENABLED, havingValue = "true")
public class NextDoc4jAutoConfiguration {

    /**
     * 获取基础配置bean
     *
     * @return {@link NextDoc4jProperties }
     */
    @Bean
    @ConfigurationProperties(prefix = NextDoc4jBaseConstant.NEXTDOC4J)
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
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                registry.addResourceHandler("/favicon.ico").addResourceLocations("classpath:/");
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
    @ConditionalOnProperty(prefix = NextDoc4jBaseConstant.NEXTDOC4J, name = "cors", havingValue = "true")
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
     *
     * @param resourceLoader 资源加载器
     * @return {@link NextDoc4jExtensionResolver }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = NextDoc4jBaseConstant.EXTENSION, name = NextDoc4jBaseConstant.ENABLED, havingValue = "true")
    public NextDoc4jExtensionResolver nextdoc4jExtensionResolver(ResourceLoader resourceLoader,
                                                                 ApplicationContext applicationContext) {
        return new NextDoc4jExtensionResolver(resourceLoader, applicationContext);
    }

    /**
     * 全局 openapi 定制器
     *
     * @param resolver 旋转变压器
     * @return {@link NextDoc4jExtensionOpenApiCustomizer }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = NextDoc4jBaseConstant.EXTENSION, name = NextDoc4jBaseConstant.ENABLED, havingValue = "true")
    public NextDoc4jExtensionOpenApiCustomizer nextdoc4jExtensionOpenApiCustomizer(NextDoc4jProperties properties,
                                                                                   NextDoc4jExtensionResolver resolver) {
        return new NextDoc4jExtensionOpenApiCustomizer(properties, resolver);
    }

}
