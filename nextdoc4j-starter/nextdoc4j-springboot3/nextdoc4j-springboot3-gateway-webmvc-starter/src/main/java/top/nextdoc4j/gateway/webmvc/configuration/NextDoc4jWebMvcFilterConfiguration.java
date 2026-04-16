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

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import top.nextdoc4j.springboot.common.filter.NextDoc4jProductionFilter;
import top.nextdoc4j.springboot.common.filter.NextDoc4jResourceFilter;

/**
 * Gateway WebMvc 基础过滤器桥接配置。
 *
 * @author echo
 * @since 1.2.1
 */
public class NextDoc4jWebMvcFilterConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.ENABLED, havingValue = "false", matchIfMissing = true)
    public FilterRegistrationBean<NextDoc4jResourceFilter> nextdoc4jResourceFilter() {
        FilterRegistrationBean<NextDoc4jResourceFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new NextDoc4jResourceFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        bean.addUrlPatterns(NextDoc4jFilterConstant.BlockedPaths.URL_PATTERNS);
        return bean;
    }

    @Bean
    @ConditionalOnProperty(prefix = NextDoc4jConstants.NEXTDOC4J, name = NextDoc4jConstants.PRODUCTION, havingValue = "true")
    public FilterRegistrationBean<NextDoc4jProductionFilter> nextdoc4jProductionFilter() {
        FilterRegistrationBean<NextDoc4jProductionFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new NextDoc4jProductionFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        bean.addUrlPatterns(NextDoc4jFilterConstant.BlockedPaths.URL_PATTERNS);
        return bean;
    }
}
