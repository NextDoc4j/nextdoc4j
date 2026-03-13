package top.nextdoc4j.webflux.configuration;

import org.springframework.http.CacheControl;
import org.springframework.web.reactive.config.ResourceHandlerRegistry;
import org.springframework.web.reactive.config.WebFluxConfigurer;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;

import java.util.concurrent.TimeUnit;

/**
 * NextDoc4j WebFlux 资源映射配置。
 */
public class NextDoc4jWebFluxResourceConfigurer implements WebFluxConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML)
            .addResourceLocations("classpath:/META-INF/resources/");

        registry.addResourceHandler(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX + "**")
            .addResourceLocations("classpath:/META-INF/resources/nextdoc/")
            .setCacheControl(CacheControl.maxAge(5, TimeUnit.HOURS).cachePublic());
    }
}
