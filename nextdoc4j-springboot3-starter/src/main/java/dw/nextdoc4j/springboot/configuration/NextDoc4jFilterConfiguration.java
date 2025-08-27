package dw.nextdoc4j.springboot.configuration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import dw.nextdoc4j.core.constant.NextDoc4jBaseConstant;
import dw.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import dw.nextdoc4j.springboot.filter.NextDoc4jProductionFilter;
import dw.nextdoc4j.springboot.filter.NextDoc4jResourceFilter;

/**
 * 过滤器自动配置
 *
 * @author echo
 * @since 1.0.0
 */

public class NextDoc4jFilterConfiguration {

    /**
     * NextDoc4j 资源过滤器 - 当 enabled=false 时生效
     *
     * @return {@link FilterRegistrationBean }<{@link NextDoc4jResourceFilter }>
     */
    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jBaseConstant.NEXTDOC4J, name = NextDoc4jBaseConstant.ENABLED, havingValue = "false", matchIfMissing = true)
    public FilterRegistrationBean<NextDoc4jResourceFilter> nextdoc4jResourceFilter() {
        FilterRegistrationBean<NextDoc4jResourceFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new NextDoc4jResourceFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        // 只过滤 NextDoc4j 相关资源
        bean.addUrlPatterns(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML, NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX + "*");
        return bean;
    }

    /**
     * 生产环境资源过滤器 - 当 production=true 时生效
     *
     * @return {@link FilterRegistrationBean }<{@link NextDoc4jProductionFilter }>
     */
    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jBaseConstant.NEXTDOC4J, name = NextDoc4jBaseConstant.PRODUCTION, havingValue = "true")
    public FilterRegistrationBean<NextDoc4jProductionFilter> nextdoc4jProductionFilter() {
        FilterRegistrationBean<NextDoc4jProductionFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new NextDoc4jProductionFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        // 使用统一配置的URL路径
        bean.addUrlPatterns(NextDoc4jFilterConstant.BlockedPaths.URL_PATTERNS);
        return bean;
    }

}
