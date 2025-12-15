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

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
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
@EnableConfigurationProperties(NextDoc4jEnumPluginProperties.class)
public class NextDoc4jEnumPluginAutoConfiguration {

    /**
     * 注册枚举处理器
     * <p>
     * 该 Bean 会自动被 SpringDoc 扫描并应用到 API 文档生成过程中
     * 同时处理参数和模型字段中的枚举类型
     * </p>
     * <p>
     * 支持多个解析器，按照注入顺序依次尝试，第一个支持的解析器生效
     * 如果没有自定义解析器支持，会自动降级到内置的默认解析器
     * </p>
     *
     * @param resolvers    所有的枚举元数据解析器（可以为空）
     * @param objectMapper ObjectMapper 实例
     * @return NextDoc4jEnumParameterHandler 实例
     */
    @Bean
    public NextDoc4jEnumParameterHandler enumValueHandler(List<EnumMetadataResolver> resolvers, ObjectMapper objectMapper) {
        return new NextDoc4jEnumParameterHandler(resolvers, objectMapper);
    }
}
