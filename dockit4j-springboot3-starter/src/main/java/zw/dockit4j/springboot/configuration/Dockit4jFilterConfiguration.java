package zw.dockit4j.springboot.configuration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import zw.dockit4j.core.constant.Dockit4jBaseConstant;
import zw.dockit4j.core.constant.Dockit4jFilterConstant;
import zw.dockit4j.springboot.filter.Dockit4jProductionFilter;
import zw.dockit4j.springboot.filter.Dockit4jResourceFilter;

/**
 * 资源过滤器配置
 *
 * @author echo
 * @since 1.0.0
 */

public class Dockit4jFilterConfiguration {

    /**
     * dockit4j 资源过滤器 - 当 enabled=false 时生效
     *
     * @return {@link FilterRegistrationBean }<{@link Dockit4jResourceFilter }>
     */
    @Bean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.DOCKIT4J, name = Dockit4jBaseConstant.ENABLED, havingValue = "false", matchIfMissing = true)
    public FilterRegistrationBean<Dockit4jResourceFilter> dockit4jResourceFilter() {
        FilterRegistrationBean<Dockit4jResourceFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new Dockit4jResourceFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        // 只过滤 dockit4j 相关资源
        bean.addUrlPatterns(Dockit4jFilterConstant.BlockedPaths.DOCKIT_HTML, Dockit4jFilterConstant.BlockedPaths.DOCKIT4J_PREFIX + "*");
        return bean;
    }

    /**
     * 生产环境资源过滤器 - 当 production=true 时生效
     *
     * @return {@link FilterRegistrationBean }<{@link Dockit4jProductionFilter }>
     */
    @Bean
    @ConditionalOnProperty(prefix = Dockit4jBaseConstant.DOCKIT4J, name = Dockit4jBaseConstant.PRODUCTION, havingValue = "true")
    public FilterRegistrationBean<Dockit4jProductionFilter> dockit4jProductionFilter() {
        FilterRegistrationBean<Dockit4jProductionFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new Dockit4jProductionFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        // 使用统一配置的URL路径
        bean.addUrlPatterns(Dockit4jFilterConstant.BlockedPaths.URL_PATTERNS);
        return bean;
    }

}
