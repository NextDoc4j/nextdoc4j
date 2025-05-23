package zw.dockit4j.springboot.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springdoc.core.customizers.OpenApiBuilderCustomizer;
import org.springdoc.core.customizers.ServerBaseUrlCustomizer;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.providers.JavadocProvider;
import org.springdoc.core.service.OpenAPIService;
import org.springdoc.core.service.SecurityService;
import org.springdoc.core.utils.PropertyResolverUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import zw.dockit4j.core.configuration.Dockit4jBasicAuth;
import zw.dockit4j.core.configuration.Dockit4jExpand;
import zw.dockit4j.core.configuration.Dockit4jProperties;
import zw.dockit4j.core.constant.Dockit4jBaseConstant;
import zw.dockit4j.core.handler.OpenApiHandler;

import java.util.List;
import java.util.Optional;

/**
 * 自动配置
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(Dockit4jAutoConfiguration.class);

    /**
     * 获取基础配置bean
     *
     * @return {@link Dockit4jProperties }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.DOCKIT4J, name = Dockit4jBaseConstant.ENABLED, havingValue = "true")
    public Dockit4jProperties getDockit4jProperties() {
        return new Dockit4jProperties();
    }

    /**
     * 获取基础认证 bean
     *
     * @return {@link Dockit4jBasicAuth }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.BASIC_AUTH, name = Dockit4jBaseConstant.ENABLED, havingValue = "true")
    public Dockit4jBasicAuth getBasicAuth() {
        return new Dockit4jBasicAuth();
    }

    /**
     * 获取扩展属性 bean
     *
     * @return {@link Dockit4jExpand }
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.EXPAND, name = Dockit4jBaseConstant.ENABLED, havingValue = "true")
    public Dockit4jExpand getExpand() {
        return new Dockit4jExpand();
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
