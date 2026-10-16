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
package top.nextdoc4j.enums.configuration;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.enums.handler.NextDoc4jEnumParameterHandler;
import top.nextdoc4j.enums.resolver.EnumMetadataResolver;

import java.util.List;

/**
 * 枚举插件自动配置类
 *
 * @author echo
 * @since 1.1.2
 */
@AutoConfiguration
@ConditionalOnProperty(prefix = NextDoc4jConstants.PLUGIN_ENUM, name = NextDoc4jConstants.ENABLED, havingValue = "true")
@EnableConfigurationProperties(NextDoc4jEnumProperties.class)
public class NextDoc4jEnumAutoConfiguration {

    /**
     * 注册枚举处理器
     * <p>
     * 该 Bean 会自动被 SpringDoc 扫描并应用到 API 文档生成过程中
     * 同时处理参数和模型字段中的枚举类型
     * <p>
     * 支持多个解析器，按照注入顺序依次尝试，第一个支持的解析器生效
     * 如果没有自定义解析器支持，会自动降级到内置的默认解析器
     *
     * @param resolvers          所有的枚举元数据解析器（可以为空）
     * @param applicationContext Spring 应用上下文，用于解析宿主 ObjectMapper
     * @return NextDoc4jEnumParameterHandler 实例
     */
    @Bean
    public NextDoc4jEnumParameterHandler enumValueHandler(List<EnumMetadataResolver> resolvers,
                                                          ApplicationContext applicationContext) {
        return new NextDoc4jEnumParameterHandler(resolvers, resolveObjectMapper(applicationContext));
    }

    /**
     * 从容器解析宿主 ObjectMapper（优先 Jackson 3，其次 Jackson 2）。
     *
     * @param applicationContext Spring 应用上下文
     * @return 宿主 ObjectMapper 实例；容器中均不存在时返回 {@code null}
     */
    private static Object resolveObjectMapper(ApplicationContext applicationContext) {
        Object mapper = findBeanByClassName(applicationContext, "tools.jackson.databind.ObjectMapper");
        if (mapper != null) {
            return mapper;
        }
        return findBeanByClassName(applicationContext, "com.fasterxml.jackson.databind.ObjectMapper");
    }

    /**
     * 按全限定类名查找容器中的 Bean。
     *
     * @param applicationContext Spring 应用上下文
     * @param className          Bean 类型全限定名
     * @return 匹配到的首个 Bean；类不存在或无 Bean 时返回 {@code null}
     */
    private static Object findBeanByClassName(ApplicationContext applicationContext, String className) {
        try {
            Class<?> type = Class.forName(className);
            String[] names = applicationContext.getBeanNamesForType(type);
            if (names.length == 0) {
                return null;
            }
            return applicationContext.getBean(names[0], type);
        } catch (ClassNotFoundException | NoClassDefFoundError ex) {
            return null;
        }
    }
}
