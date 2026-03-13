package top.nextdoc4j.webflux.configuration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.web.server.WebFilter;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.webflux.filter.NextDoc4jWebFluxProductionFilter;
import top.nextdoc4j.webflux.filter.NextDoc4jWebFluxResourceFilter;

/**
 * NextDoc4j WebFlux 过滤器配置。
 */
public class NextDoc4jWebFluxFilterConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J,
        name = NextDoc4jConstants.ENABLED,
        havingValue = "false",
        matchIfMissing = true)
    public WebFilter nextdoc4jWebFluxResourceFilter() {
        return new NextDoc4jWebFluxResourceFilter();
    }

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J,
        name = NextDoc4jConstants.PRODUCTION,
        havingValue = "true")
    public WebFilter nextdoc4jWebFluxProductionFilter() {
        return new NextDoc4jWebFluxProductionFilter();
    }
}
